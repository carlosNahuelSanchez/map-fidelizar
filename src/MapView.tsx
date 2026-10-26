import { useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { Map, Camera, GeoJSONSource, Layer, TransformRequestManager, type CameraRef, type MapRef, type StyleSpecification } from '@maplibre/maplibre-react-native';
import type { FeatureCollection } from 'geojson';
import provinces from '../assets/provinces.json';
import type { Place } from './domain';
import type { Point, Route, UserPosition } from './navigation';

const mapStyle: StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'streets', type: 'raster', source: 'osm' }],
};
TransformRequestManager.addHeader({ id: 'fidelizar-osm-user-agent', match: '^https://tile\\.openstreetmap\\.org/', name: 'User-Agent', value: 'FidelizarPrototype/1.0 (com.fidelizar.equipo)' });

export type MapFocus = { serial: number; center?: Point; country?: boolean; zoomDelta?: number };
type Props = {
  places: Place[]; selectedId?: string; userPosition: UserPosition | null; focus: MapFocus | null;
  route: Route | null; destination: Point | null;
  onSelect: (id: string) => void; onPoint: (point: Point) => void; picking: boolean;
};
export function MapView({ places, selectedId, userPosition, focus, route, destination, onSelect, onPoint, picking }: Props) {
  const camera = useRef<CameraRef>(null);
  const map = useRef<MapRef>(null);
  const points = useMemo<FeatureCollection>(() => ({ type: 'FeatureCollection', features: places.map(place => ({ type: 'Feature', id: place.id, properties: { id: place.id }, geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] } })) }), [places]);
  useEffect(() => {
    if (focus?.country) camera.current?.fitBounds([-73.7, -55.7, -53.5, -21.6], { duration: 500, padding: { top: 25, right: 20, bottom: 40, left: 20 } });
    else if (focus?.center) camera.current?.flyTo({ center: [focus.center.lng, focus.center.lat], zoom: 16, duration: 600 });
    else if (focus?.zoomDelta) void map.current?.getZoom().then(zoom => camera.current?.zoomTo(zoom + focus.zoomDelta!, { duration: 250 }));
  }, [focus]);
  useEffect(() => {
    if (!route) return;
    const coordinates = route.geometry.coordinates;
    const bounds = coordinates.reduce<[number, number, number, number]>((box, [lng, lat]) => [Math.min(box[0], lng), Math.min(box[1], lat), Math.max(box[2], lng), Math.max(box[3], lat)], [Infinity, Infinity, -Infinity, -Infinity]);
    camera.current?.fitBounds(bounds, { duration: 600, padding: { top: 60, bottom: 80, left: 35, right: 35 } });
  }, [route]);
  return <><Map ref={map} style={StyleSheet.absoluteFill} mapStyle={mapStyle} attribution logo={false}
    onPress={event => { if (picking) { const [lng, lat] = event.nativeEvent.lngLat; onPoint({ lat, lng }); } }}
    onLongPress={event => { const [lng, lat] = event.nativeEvent.lngLat; onPoint({ lat, lng }); }}>
    <Camera ref={camera} initialViewState={{ center: [-64, -35], zoom: 3 }} minZoom={1} maxZoom={19} />
    <GeoJSONSource id="provinces" data={provinces as FeatureCollection}>
      <Layer id="province-lines" type="line" paint={{ 'line-color': '#496e60', 'line-width': 0.7, 'line-opacity': 0.5 }} />
    </GeoJSONSource>
    <GeoJSONSource id="places" data={points} onPress={event => {
      const id = event.nativeEvent.features[0]?.properties?.id;
      if (typeof id === 'string' && !picking) onSelect(id);
    }}>
      <Layer id="place-pins" type="circle" paint={{ 'circle-color': ['case', ['==', ['get', 'id'], selectedId ?? ''], '#c56a42', '#16877f'], 'circle-radius': 9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>
    {userPosition && <GeoJSONSource id="user" data={{ type: 'Point', coordinates: [userPosition.lng, userPosition.lat] }}>
      <Layer id="user-dot" type="circle" paint={{ 'circle-color': '#2773dd', 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>}
    {route && <GeoJSONSource id="route" data={route.geometry}>
      <Layer id="route-outline" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 8 }} />
      <Layer id="route-line" type="line" paint={{ 'line-color': '#2773dd', 'line-width': 4 }} />
    </GeoJSONSource>}
    {destination && <GeoJSONSource id="destination" data={{ type: 'Point', coordinates: [destination.lng, destination.lat] }}>
      <Layer id="destination-dot" type="circle" paint={{ 'circle-color': '#c56a42', 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>}
  </Map><Text accessibilityRole="link" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={{ position: 'absolute', bottom: 5, left: 7, fontSize: 10, color: '#233b31', backgroundColor: '#ffffffdf', paddingHorizontal: 5, paddingVertical: 2 }}>© OpenStreetMap · Límites: IGN</Text></>;
}
