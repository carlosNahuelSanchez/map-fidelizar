import { useEffect, useRef } from "react";
import * as L from "leaflet";
import type { LatLngTuple, PathOptions } from "leaflet";
import type { Local } from "./locations";
import type { ProvinceCollection } from "./map-data";
import type { Destination, MapCommand, Route, UserPosition } from "./navigation";
import { gmailUrl, whatsappUrl } from "./contact-links";

const COUNTRY_BOUNDS: [LatLngTuple, LatLngTuple] = [[-55.7, -73.7], [-21.6, -53.5]];
export const HIGHLIGHT_COLORS: Record<string, string> = { Formosa: "#16877f", Córdoba: "#c86e52", "Buenos Aires": "#c39a36" };
const positionOf = (local: Local): LatLngTuple | null => local.latitude !== null && local.longitude !== null ? [local.latitude, local.longitude] : null;
const nicheColors = { PAN: "#16877f", HEL: "#c86e52", BAR: "#5367a0", PEL: "#5367a0" };
const colorOf = (local: Local) => nicheColors[local.niche];
function provinceStyle(name: string): PathOptions {
  const color = HIGHLIGHT_COLORS[name];
  return { color: color ?? "#68736d", weight: color ? 1.2 : 0.7, opacity: color ? 0.65 : 0.5, fillColor: color ?? "#747d79", fillOpacity: color ? 0.13 : 0.13, interactive: false };
}
function makeLink(label: string, href: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href; link.textContent = label; link.target = "_blank"; link.rel = "noreferrer";
  return link;
}
function popupContent(local: Local, navigate: (destination: Destination) => void): HTMLElement {
  const card = document.createElement("article"); card.className = "local-popup";
  const heading = document.createElement("div"); heading.className = "local-popup-heading";
  if (local.logo) { const image = document.createElement("img"); image.src = local.logo; image.alt = ""; image.className = "local-popup-logo"; heading.append(image); }
  const title = document.createElement("div");
  const name = document.createElement("h3"); name.textContent = local.name;
  const type = document.createElement("p"); type.textContent = local.type;
  title.append(name, type); heading.append(title); card.append(heading);
  const details = document.createElement("dl"); details.className = "local-popup-details";
  const fields: [string, string][] = [["Localidad", local.jurisdiction]];
  if (local.address) fields.push(["Dirección", local.address]);
  if (local.latitude !== null && local.longitude !== null) fields.push(["Coordenadas", `${local.latitude.toFixed(6)}, ${local.longitude.toFixed(6)}`]);
  for (const [label, value] of fields) { const dt = document.createElement("dt"); const dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value; details.append(dt, dd); }
  card.append(details);
  const contacts = document.createElement("div"); contacts.className = "local-popup-links";
  if (local.phone) contacts.append(makeLink(`WhatsApp · ${local.phone}`, whatsappUrl(local.phone)));
  if (local.whatsapp && local.whatsapp !== local.phone) contacts.append(makeLink(`WhatsApp · ${local.whatsapp}`, whatsappUrl(local.whatsapp)));
  if (local.email) contacts.append(makeLink(local.email, gmailUrl(local.email)));
  if (!local.phone && !local.whatsapp && !local.email) { const unavailable = document.createElement("p"); unavailable.className = "direct-contact-empty"; unavailable.textContent = "Sin contacto directo"; contacts.append(unavailable); }
  if (local.website) contacts.append(makeLink("Sitio web", local.website));
  if (local.instagram) contacts.append(makeLink("Instagram", local.instagram));
  const source = local.sources[0];
  if (source) contacts.append(makeLink("Fuente del punto", source));
  card.append(contacts);
  if (local.contactType === "Marca compartida") { const note = document.createElement("p"); note.className = "local-popup-contact"; note.textContent = "El contacto publicado es compartido por la marca."; card.append(note); }
  if (local.locationNote || local.businessStatus) { const note = document.createElement("p"); note.className = "local-popup-contact"; note.textContent = [local.locationNote, local.businessStatus].filter(Boolean).join(" · "); card.append(note); }
  const position = positionOf(local);
  if (position) {
    const button = document.createElement("button"); button.type = "button"; button.className = "popup-navigate"; button.textContent = "Cómo llegar";
    button.addEventListener("click", () => navigate({ point: { lat: position[0], lng: position[1] }, label: local.name }));
    card.append(button);
  }
  return card;
}
function logoIcon(local: Local): L.DivIcon {
  const wrapper = document.createElement("span"); wrapper.className = "local-logo-pin"; wrapper.style.setProperty("--pin-color", colorOf(local));
  const initials = local.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  const fallback = document.createElement("span"); fallback.className = "local-logo-initials"; fallback.textContent = initials;
  wrapper.append(fallback);
  if (local.logo) {
    const image = document.createElement("img"); image.src = local.logo; image.alt = ""; image.decoding = "async";
    image.addEventListener("error", () => image.remove(), { once: true });
    wrapper.append(image);
  }
  return L.divIcon({ html: wrapper, className: "local-logo-icon", iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -22] });
}
function destinationIcon(): L.DivIcon {
  return L.divIcon({ html: '<span class="destination-pin"><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 29S1 17 1 12a11 11 0 1 1 22 0c0 5-11 17-11 17Z" fill="#253d35" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="white"/></svg></span>', className: "destination-icon", iconSize: [30, 38], iconAnchor: [15, 38] });
}

type Props = {
  data: ProvinceCollection; locals: Local[]; command: MapCommand | null;
  userPosition: UserPosition | null; followUser: boolean;
  destination: Destination | null; route: Route | null; markMode: boolean;
  onChooseDestination: (destination: Destination) => void;
  onFollowChange: (following: boolean) => void;
};
export function MapView(props: Props) {
  const { data, locals, command, userPosition, followUser, destination, route, markMode } = props;
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, { minZoom: 1, maxZoom: 19, zoomControl: false, preferCanvas: true, worldCopyJump: true, wheelPxPerZoomLevel: 70 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
    const provinces = instance.createPane("provinces"); provinces.style.zIndex = "250"; provinces.style.pointerEvents = "none";
    const gps = instance.createPane("user-location"); gps.style.zIndex = "650"; gps.style.pointerEvents = "none";
    for (const feature of data.features) L.geoJSON(feature, { pane: "provinces", interactive: false, style: provinceStyle(feature.properties.name) }).addTo(instance);
    L.control.zoom({ position: "topright" }).addTo(instance);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(instance);
    instance.fitBounds(COUNTRY_BOUNDS, { padding: [12, 12] });
    instance.on("click", (event: L.LeafletMouseEvent) => {
      const point = event.latlng.wrap();
      if (latest.current.markMode) latest.current.onChooseDestination({ point: { lat: point.lat, lng: point.lng }, label: "Punto marcado" });
    });
    instance.on("dragstart", () => latest.current.onFollowChange(false));
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer.observe(element.current);
    map.current = instance;
    return () => { observer.disconnect(); instance.remove(); map.current = null; markers.current.clear(); };
  }, [data]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const rebuild = () => {
      layer.clearLayers(); markers.current.clear();
      const zoom = instance.getZoom();
      const buckets = new Map<string, Local[]>();
      for (const local of locals) {
        const position = positionOf(local);
        if (!position) continue;
        const projected = instance.project(position, zoom);
        const cell = zoom < 11 ? 64 : 48;
        const key = zoom >= 17 ? local.id : `${Math.floor(projected.x / cell)}:${Math.floor(projected.y / cell)}`;
        const group = buckets.get(key);
        if (group) group.push(local); else buckets.set(key, [local]);
      }
      for (const bucket of buckets.values()) {
        const first = bucket[0]; if (!first) continue;
        const position = positionOf(first); if (!position) continue;
        if (bucket.length === 1) {
          const marker = L.marker(position, { icon: logoIcon(first), title: first.name, alt: first.name, bubblingMouseEvents: false });
          marker.bindPopup(() => popupContent(first, value => { instance.closePopup(); latest.current.onChooseDestination(value); }), { maxWidth: 300, minWidth: 230, autoPanPadding: [20, 65] });
          layer.addLayer(marker); markers.current.set(first.id, marker);
        } else {
          const points: LatLngTuple[] = bucket.flatMap(local => { const p = positionOf(local); return p ? [p] : []; });
          const center: LatLngTuple = [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length];
          const cluster = L.marker(center, { title: `${bucket.length} locales. Acercar`, bubblingMouseEvents: false, icon: L.divIcon({ html: `<span class="local-cluster">${bucket.length}</span>`, className: "local-cluster-icon", iconSize: [44, 44], iconAnchor: [22, 22] }) });
          cluster.on("click", () => { latest.current.onFollowChange(false); instance.fitBounds(L.latLngBounds(points), { padding: [65, 65], maxZoom: Math.min(19, zoom + 3) }); });
          layer.addLayer(cluster);
        }
      }
    };
    rebuild(); instance.on("zoomend", rebuild);
    return () => { instance.off("zoomend", rebuild); instance.removeLayer(layer); markers.current.clear(); };
  }, [locals, data]);

  useEffect(() => {
    const instance = map.current; if (!instance || !command) return;
    if (command.kind === "country") instance.fitBounds(COUNTRY_BOUNDS, { padding: [12, 12] });
    if (command.kind === "zoom") instance.setZoom(instance.getZoom() + command.amount);
    if (command.kind === "province") {
      const points: LatLngTuple[] = latest.current.locals.filter(local => local.province === command.province).flatMap(local => { const p = positionOf(local); return p ? [p] : []; });
      const feature = data.features.find(feature => feature.properties.name === command.province);
      if (points.length) instance.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
      else if (feature) instance.fitBounds(L.geoJSON(feature).getBounds(), { padding: [30, 30] });
    }
    if (command.kind === "local") {
      const local = latest.current.locals.find(local => local.id === command.localId);
      const position = local ? positionOf(local) : null;
      if (position) {
        instance.setView(position, 17, { animate: false });
        markers.current.get(command.localId)?.openPopup();
      }
    }
    if (command.kind === "route" && latest.current.route) {
      const points: LatLngTuple[] = latest.current.route.geometry.coordinates.map(coordinate => [coordinate[1], coordinate[0]]);
      instance.fitBounds(L.latLngBounds(points), { padding: [45, 60], maxZoom: 17 });
    }
  }, [command, data]);

  useEffect(() => {
    const instance = map.current; if (!instance || !userPosition) return;
    const accuracy = L.circle([userPosition.lat, userPosition.lng], { radius: userPosition.accuracy, color: "#3b82f6", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.08, interactive: false }).addTo(instance);
    const dot = L.circleMarker([userPosition.lat, userPosition.lng], { pane: "user-location", radius: 8, color: "white", weight: 3, fillColor: "#2563eb", fillOpacity: 1, interactive: false }).addTo(instance);
    if (followUser) {
      if (instance.getZoom() < 15) instance.setView([userPosition.lat, userPosition.lng], 16, { animate: false });
      else instance.panTo([userPosition.lat, userPosition.lng], { animate: false });
    }
    return () => { instance.removeLayer(accuracy); instance.removeLayer(dot); };
  }, [userPosition, followUser, data]);

  useEffect(() => {
    const instance = map.current; if (!instance || !destination) return;
    const marker = L.marker([destination.point.lat, destination.point.lng], { icon: destinationIcon(), title: destination.label }).addTo(instance);
    marker.bindTooltip(destination.label, { direction: "top", offset: [0, -30] });
    return () => { instance.removeLayer(marker); };
  }, [destination, data]);
  useEffect(() => {
    const instance = map.current; if (!instance || !route) return;
    const points: LatLngTuple[] = route.geometry.coordinates.map(coordinate => [coordinate[1], coordinate[0]]);
    const background = L.polyline(points, { color: "white", weight: 9, opacity: 0.9, interactive: false }).addTo(instance);
    const line = L.polyline(points, { color: "#2563eb", weight: 5, opacity: 0.95, interactive: false }).addTo(instance);
    return () => { instance.removeLayer(background); instance.removeLayer(line); };
  }, [route, data]);

  return <div ref={element} className={`argentina-map${markMode ? " marking-point" : ""}`} aria-label="Mapa interactivo de locales. Podés desplazarte libremente y usar dos dedos para acercar." />;
}
