#!/usr/bin/env python3
"""Import sourced barber/hair records without replacing existing niches."""
import json, re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from import_readme_locals import parse_rows, md_url, identity_and_source, extract_image

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / 'RESEARCH' / 'sources' / 'README_Barberias_Peluquerias_Formosa_Cordoba_CABA_Conurbano.md'

def merge_hair_records(records):
    path = ROOT / 'RESEARCH/data/hair-locations.json'
    if not path.exists():
        return records
    return [record for record in records if not record['id'].startswith('hair-')] + json.loads(path.read_text())['businesses']

def main():
    cache_path = ROOT / 'RESEARCH/data/logo-sources.json'
    logos = json.loads(cache_path.read_text())
    records, requests = [], {}
    for index, (province, cells) in enumerate(parse_rows(README), 1):
        name, niche, city, lat, lng, web, ig, contact, status, sources = cells
        website, instagram = md_url(web), md_url(ig)
        brand, source = identity_and_source(website, instagram, name)
        records.append(dict(id=f'hair-{index:03d}', name=name, niche=niche,
            type='barbería' if niche == 'BAR' else 'peluquería', province=province,
            jurisdiction='Formosa capital' if city == 'Formosa' else city,
            latitude=float(lat), longitude=float(lng), website=website, instagram=instagram,
            contactType=contact, exaStatus=status, sources=re.findall(r'\]\((https?://[^)]+)\)', sources),
            brandId=brand, logo=None, logoSource=source, phone=None, whatsapp=None, email=None))
        if source and not logos.get(brand, {}).get('file'):
            requests[brand] = source
    print(f'Importing {len(records)} businesses; extracting {len(requests)} official avatars.', flush=True)
    with ThreadPoolExecutor(max_workers=12) as pool:
        jobs = {pool.submit(extract_image, url):(brand,url) for brand,url in requests.items()}
        for future in as_completed(jobs):
            brand, url = jobs[future]
            try: result = future.result()
            except Exception: result = None
            if result:
                image, mime, image_url = result
                ext = 'svg' if 'svg' in mime else 'png' if 'png' in mime else 'webp' if 'webp' in mime else 'jpg'
                file = f'/logos/{brand}.{ext}'
                (ROOT/'public'/file.lstrip('/')).write_bytes(image)
                logos[brand] = dict(file=file, source=url, imageSource=image_url, kind='official-profile-or-site-image')
            else:
                logos[brand] = dict(file=None, source=url, kind='unavailable')
    for record in records:
        record['logo'] = logos.get(record['brandId'], {}).get('file')
    cache_path.write_text(json.dumps(logos, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'RESEARCH/data/hair-locations.json').write_text(json.dumps(dict(source='RESEARCH/sources/'+README.name, businesses=records),ensure_ascii=False,indent=2)+'\n')
    path = ROOT/'public/data/locations.json'
    data = json.loads(path.read_text())
    data['businesses'] = merge_hair_records(data['businesses'])
    data['countGeolocated'] = sum(r['latitude'] is not None and r['longitude'] is not None for r in data['businesses'])
    data['countWithoutCoordinates'] = len(data['businesses']) - data['countGeolocated']
    data['logoCount'] = len({r['brandId'] for r in data['businesses'] if r['logo']})
    data['generatedAt'] = '2026-10-07'
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(f"Mapped: {data['countGeolocated']}. Pending: {data['countWithoutCoordinates']}.",flush=True)

if __name__ == '__main__': main()
