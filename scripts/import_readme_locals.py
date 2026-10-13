#!/usr/bin/env python3
"""Convert the researched README tables into map data and local brand marks."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin
from urllib.request import Request, urlopen
import hashlib
import json
import re
import time

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "RESEARCH" / "sources" / "README_Formosa_Cordoba_CABA_Conurbano.md"
LOGO_DIR = ROOT / "public" / "logos"
OUTPUT = ROOT / "public" / "data" / "locations.json"

SECTIONS = {
    "Formosa capital": "Formosa",
    "Córdoba capital": "Córdoba",
    "Buenos Aires — CABA y conurbano": "Buenos Aires",
}
EXA_FOUND_LOGOS = {
    # Search and fetch were performed with Exa; these are official brand assets.
    "site-wollen-com-ar": ("https://wollen.com.ar/", "https://wollen.com.ar/wp-content/uploads/2023/03/logo2.svg"),
    "site-costumbres-com-ar": ("https://costumbres.com.ar/", "https://dcdn-us.mitiendanube.com/stores/004/853/235/themes/common/logo-109838053-1718815114-ab43f6f4e7687e60f948a3149296feeb1718815114.png?0"),
    "site-briochedoree-com-ar": ("https://www.briochedoree.com.ar/", "https://www.briochedoree.com.ar/img/logo-350.jpg"),
    "site-pandecasa-com-ar": ("https://pandecasa.com.ar/", "https://ss-cnt-001c.esmsv.com/r/content/host1/ee6dfb9d988b31268ef60f893068c94b/img/logo.png"),
}

class ImageRefs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = []
        self.links = []
        self.images = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta" and (a.get("property", "").lower() in ("og:image", "og:image:secure_url") or a.get("name", "").lower() == "twitter:image"):
            if a.get("content"): self.meta.append(a["content"])
        elif tag == "link" and a.get("href"):
            rel = a.get("rel", "").lower()
            if "icon" in rel: self.links.append((a["href"], 2 if "apple-touch" in rel or "192" in a["href"] or "512" in a["href"] else 1))
        elif tag == "img" and a.get("src"):
            label = (a.get("alt", "") + " " + a.get("class", "")).lower()
            if "logo" in label: self.images.append(a["src"])

def parse_rows(path=README):
    current = None
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            current = line[3:]
        elif current in SECTIONS and line.startswith("| ") and not re.match(r"\|\s*[-:]+", line):
            cells = [part.strip() for part in line.strip("|").split("|")]
            if len(cells) == 10 and cells[0] != "Nombre":
                rows.append((SECTIONS[current], cells))
    return rows

def md_url(value):
    found = re.search(r"\]\((https?://[^)]+)\)", value)
    return found.group(1) if found else None

def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or hashlib.sha1(value.encode()).hexdigest()[:10]

def identity_and_source(website, instagram, name):
    if website:
        host = urlparse(website).netloc.lower().removeprefix("www.")
        identity = "site-" + slug(host)
    elif instagram:
        handle = urlparse(instagram).path.strip("/").split("/")[0]
        identity = "ig-" + slug(handle)
    else:
        identity = "name-" + slug(name)
    # Official account imagery is the clearest logo/avatar for a local business.
    return identity, instagram or website

def extract_image(source):
    req = Request(source, headers={"User-Agent": "Mozilla/5.0 (compatible; RelevamientoMap/1.0)"})
    with urlopen(req, timeout=18) as response:
        ctype = response.headers.get("content-type", "")
        body = response.read(1_500_000)
        final = response.geturl()
    if ctype.startswith("image/"):
        return body, ctype, final
    if "html" not in ctype and b"<html" not in body[:1024].lower():
        return None
    parser = ImageRefs()
    parser.feed(body.decode("utf-8", "replace"))
    candidates = [urljoin(final, u) for u in parser.images[:4]]
    candidates += [urljoin(final, u) for u in parser.meta[:2]]
    candidates += [urljoin(final, u) for u, _ in sorted(parser.links, key=lambda x: -x[1])[:5]]
    # Skip generic social network imagery when a local profile does not expose its avatar.
    for image_url in candidates:
        try:
            req = Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=18) as response:
                image_type = response.headers.get("content-type", "")
                image = response.read(2_500_000)
            if image_type.startswith("image/") and len(image) > 500:
                return image, image_type, image_url
        except Exception:
            continue
    return None

def main():
    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    representative = {}
    aliases = {}
    for index, (province, cells) in enumerate(parse_rows(), 1):
        name, niche, jurisdiction, lat, lon, web_cell, ig_cell, contact, exa, source_cell = cells
        website, instagram = md_url(web_cell), md_url(ig_cell)
        if re.search("grido", " ".join([name, website or "", instagram or ""]), re.I):
            continue
        # Treat legacy display names from the same Formosa brand as the user's requested identity.
        if province == "Formosa" and name.strip().lower() in {"casa pan", "casapan", "pan de casa"}:
            name = "Pan de Casa"
        identity, logo_source = identity_and_source(website, instagram, name)
        if identity not in representative or (instagram and not representative[identity].startswith("https://www.instagram.com/")):
            representative[identity] = logo_source
        aliases.setdefault(identity, set()).add(name)
        sources = re.findall(r"\]\((https?://[^)]+)\)", source_cell)
        records.append({
            "id": f"loc-{index:03d}", "name": name,
            "type": "panadería" if niche == "PAN" else "heladería", "niche": niche,
            "province": province, "jurisdiction": jurisdiction,
            "latitude": float(lat), "longitude": float(lon),
            "website": website, "instagram": instagram,
            "contactType": contact, "exaStatus": exa,
            "sources": sources, "brandId": identity,
            "logo": f"/logos/{identity}.jpg", "logoSource": logo_source,
        })

    pending = {
        "id": "loc-pending-formosa-pandecasa", "name": "Pan de Casa",
        "type": "panadería", "niche": "PAN", "province": "Formosa",
        "jurisdiction": "Formosa", "address": "Av. Dr. Néstor Kirchner 4066",
        "latitude": None, "longitude": None,
        "website": "https://pandecasa.com.ar/",
        "instagram": "https://www.instagram.com/pandecasafsa/",
        "contactType": "Local/ficha", "exaStatus": "Sin coordenadas verificadas",
        "sources": ["https://turismo.formosatuciudad.gob.ar/vivi/gastronomia/196-panaderias-pastelerias", "https://pandecasa.com.ar/contacto-2"],
        "brandId": "site-pandecasa-com-ar", "logo": "/logos/site-pandecasa-com-ar.jpg",
        "logoSource": "https://www.instagram.com/pandecasafsa/",
    }
    for record in records:
        if record["province"] == "Formosa" and record["name"].lower() in {"pan de casa", "casa pan", "casapan"}:
            pending["brandId"] = record["brandId"]
            pending["logo"] = record["logo"]
            pending["logoSource"] = record["logoSource"]
            break
    representative.setdefault(pending["brandId"], pending["logoSource"])
    records.append(pending)

    cache = ROOT / "RESEARCH" / "data" / "logo-sources.json"
    if cache.exists():
        previous = json.loads(cache.read_text())
    else:
        previous = {}
    todo = {
        key: source
        for key, source in representative.items()
        if key not in previous
        or not previous[key].get("file")
        or not (ROOT / "public" / previous[key]["file"].lstrip("/")).exists()
    }
    print(f"Extracting official profile/site icons for {len(todo)} brands...")
    results = dict(previous)
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(extract_image, source): (key, source) for key, source in todo.items()}
        for future in as_completed(futures):
            key, source = futures[future]
            try:
                result = future.result()
            except Exception:
                result = None
            if not result:
                results[key] = {"file": None, "source": source, "kind": "unavailable"}
                continue
            image, ctype, image_url = result
            ext = "svg" if "svg" in ctype else "png" if "png" in ctype else "webp" if "webp" in ctype else "gif" if "gif" in ctype else "jpg"
            path = f"logos/{key}.{ext}"
            (ROOT / "public" / path).write_bytes(image)
            results[key] = {"file": "/" + path, "source": source, "imageSource": image_url, "kind": "official-profile-or-site-image"}
    for key, (official_page, image_url) in EXA_FOUND_LOGOS.items():
        try:
            req = Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=18) as response:
                image = response.read(2_500_000)
                ctype = response.headers.get("content-type", "")
            if not ctype.startswith("image/") or len(image) < 250:
                continue
            ext = "svg" if "svg" in ctype else "png" if "png" in ctype else "webp" if "webp" in ctype else "jpg"
            path = f"logos/{key}.{ext}"
            (ROOT / "public" / path).write_bytes(image)
            results[key] = {"file": "/" + path, "source": official_page, "imageSource": image_url, "kind": "exa-found-official-logo"}
        except Exception:
            continue
    cache.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for item in records:
        logo = results.get(item["brandId"], {}).get("file")
        item["logo"] = logo
        item["logoSource"] = results.get(item["brandId"], {}).get("source", item.get("logoSource"))
    from enrich_formosa import merge_enrichment
    records = merge_enrichment(records)
    from import_hair_locals import merge_hair_records
    records = merge_hair_records(records)
    geolocated = sum(item["latitude"] is not None and item["longitude"] is not None for item in records)
    pending_count = len(records) - geolocated
    logo_count = len({item["brandId"] for item in records if item.get("logo")})
    OUTPUT.write_text(json.dumps({"sourceReadme": "RESEARCH/sources/" + README.name, "generatedAt": "2026-10-06", "countGeolocated": geolocated, "countWithoutCoordinates": pending_count, "logoCount": logo_count, "businesses": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Records: {geolocated} geolocated + {pending_count} without coordinates; {logo_count} brand marks.")

if __name__ == "__main__": main()
