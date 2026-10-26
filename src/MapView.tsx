import { useEffect, useRef } from "react";
import * as L from "leaflet";
import type { LatLngTuple, PathOptions } from "leaflet";
import type { ProvinceCollection } from "./map-data";
import type { Destination, MapCommand, Route, UserPosition } from "./navigation";

const COUNTRY_BOUNDS: [LatLngTuple, LatLngTuple] = [[-55.7, -73.7], [-21.6, -53.5]];

function provinceStyle(name: string): PathOptions {
  const highlighted = name === "Formosa" || name === "Córdoba" || name === "Buenos Aires";
  return {
    color: highlighted ? "#16877f" : "#68736d",
    weight: highlighted ? 1.2 : 0.7,
    opacity: highlighted ? 0.65 : 0.5,
    fillColor: highlighted ? "#16877f" : "#747d79",
    fillOpacity: 0.13,
    interactive: false,
  };
}

function destinationIcon(): L.DivIcon {
  return L.divIcon({
    html: '<span class="destination-pin"><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 29S1 17 1 12a11 11 0 1 1 22 0c0 5-11 17-11 17Z" fill="#253d35" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="white"/></svg></span>',
    className: "destination-icon",
    iconSize: [30, 38],
    iconAnchor: [15, 38],
  });
}

type Props = {
  data: ProvinceCollection;
  command: MapCommand | null;
  userPosition: UserPosition | null;
  followUser: boolean;
  destination: Destination | null;
  route: Route | null;
  markMode: boolean;
  onChooseDestination: (destination: Destination) => void;
  onFollowChange: (following: boolean) => void;
};

export function MapView(props: Props) {
  const { data, command, userPosition, followUser, destination, route, markMode } = props;
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });

  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, {
      minZoom: 1,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: true,
      worldCopyJump: true,
      wheelPxPerZoomLevel: 70,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    const provinces = instance.createPane("provinces");
    provinces.style.zIndex = "250";
    provinces.style.pointerEvents = "none";
    const gps = instance.createPane("user-location");
    gps.style.zIndex = "650";
    gps.style.pointerEvents = "none";
    for (const feature of data.features) {
      L.geoJSON(feature, { pane: "provinces", interactive: false, style: provinceStyle(feature.properties.name) }).addTo(instance);
    }
    L.control.zoom({ position: "topright" }).addTo(instance);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(instance);
    instance.fitBounds(COUNTRY_BOUNDS, { padding: [12, 12] });
    instance.on("click", (event: L.LeafletMouseEvent) => {
      if (!latest.current.markMode) return;
      const point = event.latlng.wrap();
      latest.current.onChooseDestination({ point: { lat: point.lat, lng: point.lng }, label: "Punto marcado" });
    });
    instance.on("dragstart", () => latest.current.onFollowChange(false));
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer.observe(element.current);
    map.current = instance;
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, [data]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !command) return;
    if (command.kind === "country") instance.fitBounds(COUNTRY_BOUNDS, { padding: [12, 12] });
    if (command.kind === "zoom") instance.setZoom(instance.getZoom() + command.amount);
    if (command.kind === "route" && latest.current.route) {
      const points: LatLngTuple[] = latest.current.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      instance.fitBounds(L.latLngBounds(points), { padding: [45, 60], maxZoom: 17 });
    }
  }, [command]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !userPosition) return;
    const accuracy = L.circle([userPosition.lat, userPosition.lng], {
      radius: userPosition.accuracy, color: "#3b82f6", weight: 1,
      fillColor: "#3b82f6", fillOpacity: 0.08, interactive: false,
    }).addTo(instance);
    const dot = L.circleMarker([userPosition.lat, userPosition.lng], {
      pane: "user-location", radius: 8, color: "white", weight: 3,
      fillColor: "#2563eb", fillOpacity: 1, interactive: false,
    }).addTo(instance);
    if (followUser) {
      if (instance.getZoom() < 15) instance.setView([userPosition.lat, userPosition.lng], 16, { animate: false });
      else instance.panTo([userPosition.lat, userPosition.lng], { animate: false });
    }
    return () => { instance.removeLayer(accuracy); instance.removeLayer(dot); };
  }, [userPosition, followUser, data]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !destination) return;
    const marker = L.marker([destination.point.lat, destination.point.lng], {
      icon: destinationIcon(), title: destination.label,
    }).addTo(instance);
    marker.bindTooltip(destination.label, { direction: "top", offset: [0, -30] });
    return () => { instance.removeLayer(marker); };
  }, [destination, data]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !route) return;
    const points: LatLngTuple[] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const background = L.polyline(points, { color: "white", weight: 9, opacity: 0.9, interactive: false }).addTo(instance);
    const line = L.polyline(points, { color: "#2563eb", weight: 5, opacity: 0.95, interactive: false }).addTo(instance);
    return () => { instance.removeLayer(background); instance.removeLayer(line); };
  }, [route, data]);

  return <div ref={element} className={`argentina-map${markMode ? " marking-point" : ""}`} aria-label="Mapa interactivo de Argentina" />;
}
