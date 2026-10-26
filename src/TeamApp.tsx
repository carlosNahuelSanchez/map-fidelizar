import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { deletePlace, getMembership, listMembers, listPlaces, savePlace } from './backend';
import { errorMessage, parseCoordinate, placeInputSchema, type Member, type Place } from './domain';
import { distanceBetween, formatDistance, maneuverText, mapsNavigationUrl, type Destination, type Point } from './navigation';
import { MapView, type MapFocus } from './MapView';
import { PlaceForm, emptyDraft, type PlaceDraft } from './PlaceForm';
import { PlaceDetails } from './PlaceDetails';
import { useLocation } from './useLocation';
import { useRouting } from './useRouting';
import { Button, Message, ModalPage, Page, colors, s } from './ui';

export function TeamApp({ client, session, onChangeConnection }: { client: SupabaseClient; session: Session; onChangeConnection: () => Promise<void> }) {
  const [places, setPlaces] = useState<Place[]>([]); const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'blocked' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const [live, setLive] = useState(false); const [tab, setTab] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState(''); const [radius, setRadius] = useState<number | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null); const focusSerial = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null); const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState<PlaceDraft | null>(null); const [draftError, setDraftError] = useState('');
  const [saving, setSaving] = useState(false); const [picking, setPicking] = useState(false); const [gpsForDraft, setGpsForDraft] = useState(false);
  const [account, setAccount] = useState(false); const [accountMessage, setAccountMessage] = useState(''); const [accountBusy, setAccountBusy] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [gpsForMap, setGpsForMap] = useState(false);
  const location = useLocation(); const navigation = useRouting(destination, location.position);
  const refreshSerial = useRef(0);
  const mine = members.find(member => member.user_id === session.user.id);
  const selected = places.find(place => place.id === selectedId);

  const refresh = useCallback(async () => {
    const request = ++refreshSerial.current;
    setRefreshing(true);
    try {
      const member = await getMembership(client, session.user.id);
      if (request !== refreshSerial.current) return;
      if (!member?.active) { setPlaces([]); setMembers([]); setStatus('blocked'); return; }
      const [nextPlaces, nextMembers] = await Promise.all([listPlaces(client), listMembers(client)]);
      if (request !== refreshSerial.current) return;
      setPlaces(nextPlaces); setMembers(nextMembers); setError(''); setStatus('ready');
    } catch (cause) {
      if (request === refreshSerial.current) { setError(errorMessage(cause)); setStatus(current => current === 'ready' ? current : 'error'); }
    } finally { if (request === refreshSerial.current) setRefreshing(false); }
  }, [client, session.user.id]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    void refresh();
    const channel = client.channel('shared-places').on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    }).subscribe(state => { setLive(state === 'SUBSCRIBED'); if (state === 'SUBSCRIBED') void refresh(); });
    const interval = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { refreshSerial.current++; if (timer) clearTimeout(timer); clearInterval(interval); appState.remove(); void client.removeChannel(channel); };
  }, [client, refresh]);
  useEffect(() => {
    if (status !== 'ready') { setDetailsOpen(false); setDraft(null); setPicking(false); setDestination(null); location.disable(); }
  }, [status]);
  useEffect(() => {
    if (detailsOpen && !selected) { setDetailsOpen(false); setSelectedId(null); }
  }, [selected, detailsOpen]);
  useEffect(() => {
    if (gpsForDraft && location.position && draft) {
      setDraft(current => current ? { ...current, latitude: location.position!.lat.toFixed(6), longitude: location.position!.lng.toFixed(6) } : null);
      setGpsForDraft(false);
    }
  }, [gpsForDraft, location.position, draft !== null]);
  useEffect(() => {
    if (!picking) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setPicking(false); return true; });
    return () => subscription.remove();
  }, [picking]);
  useEffect(() => {
    if (!gpsForMap || !location.position) return;
    setFocus({ serial: ++focusSerial.current, center: location.position }); setGpsForMap(false);
  }, [gpsForMap, location.position]);
  useEffect(() => { if (location.busy) setGpsForMap(true); }, [location.busy]);

  const flyTo = (center: Point) => setFocus({ serial: ++focusSerial.current, center });
  const showPlace = (place: Place) => { setSelectedId(place.id); setDetailsOpen(true); flyTo({ lat: place.latitude, lng: place.longitude }); };
  const startDraft = (point?: Point) => {
    const coordinates = point ?? location.position;
    setDraft({ ...emptyDraft(), latitude: coordinates ? coordinates.lat.toFixed(6) : '', longitude: coordinates ? coordinates.lng.toFixed(6) : '' });
    setDraftError(''); setGpsForDraft(false); setDetailsOpen(false);
  };
  const routeTo = (point: Point, label: string) => {
    setDestination({ point, label }); setDetailsOpen(false); setTab('map');
    if (!location.position) void location.enable();
  };
  const onPoint = (point: Point) => {
    if (picking) { setDraft(current => current ? { ...current, latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) } : null); setPicking(false); return; }
    Alert.alert('Punto del mapa', `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, [
      { text: 'Agregar local aquí', onPress: () => startDraft(point) },
      { text: 'Cómo llegar aquí', onPress: () => routeTo(point, 'Punto marcado') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };
  const save = async () => {
    if (!draft) return;
    const latitude = parseCoordinate(draft.latitude); const longitude = parseCoordinate(draft.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { setDraftError('Elegí la ubicación en el mapa, usá el GPS o completá ambas coordenadas.'); return; }
    const result = placeInputSchema.safeParse({ ...draft, latitude, longitude });
    if (!result.success) { setDraftError(result.error.issues[0]?.message ?? 'Revisá los datos.'); return; }
    setSaving(true); setDraftError('');
    try {
      const saved = await savePlace(client, result.data, session.user.id, draft.id);
      setPlaces(current => [saved, ...current.filter(place => place.id !== saved.id)]);
      setSearch(''); setRadius(null);
      setDraft(null); setGpsForDraft(false); setSelectedId(saved.id); setTab('map'); flyTo({ lat: saved.latitude, lng: saved.longitude });
      void refresh();
    } catch (cause) { setDraftError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  const closeDraft = () => Alert.alert('Cerrar formulario', 'Los cambios sin guardar se descartarán.', [{ text: 'Continuar editando', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: () => { setDraft(null); setGpsForDraft(false); setPicking(false); } }]);
  const signOut = async () => {
    setAccountBusy(true);
    try { await onChangeConnection(); }
    catch (cause) { setAccountMessage(errorMessage(cause)); }
    finally { setAccountBusy(false); }
  };
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const query = normalize(search.trim());
    return places.filter(place => (!query || normalize(`${place.name} ${place.category} ${place.address} ${place.city} ${place.province}`).includes(query)) && (!radius || !location.position || distanceBetween(location.position, { lat: place.latitude, lng: place.longitude }) <= radius * 1000));
  }, [places, search, radius, location.position]);

  if (status === 'loading') return <Page title="Cargando equipo"><ActivityIndicator color={colors.teal} /></Page>;
  if (status === 'blocked' || status === 'error') return <Page title={status === 'blocked' ? 'Acceso pendiente' : 'No se pudo cargar el equipo'}>
    <Message text={status === 'blocked' ? 'Este teléfono no tiene acceso al equipo. Pedile acceso al responsable.' : error} error />
    <Button title="Reintentar" busy={refreshing} onPress={() => void refresh()} /><Button title="Cambiar conexión" onPress={() => void signOut()} secondary busy={accountBusy} /><Message text={accountMessage} error />
  </Page>;

  return <SafeAreaView style={s.page}>
    <View style={t.header}><View><Text style={s.sectionTitle}>Fidelizar</Text><Text style={s.small}>{filtered.length} locales · {live ? 'Equipo conectado' : 'Actualización periódica'}</Text></View><Pressable accessibilityRole="button" onPress={() => setAccount(true)} style={t.account}><Text style={s.link}>Equipo</Text></Pressable></View>
    <View style={t.search}><TextInput accessibilityLabel="Buscar locales" placeholder="Nombre, rubro, dirección o localidad" value={search} onChangeText={setSearch} placeholderTextColor={colors.muted} style={{ flex: 1, fontSize: 14, color: colors.ink }} /><Pressable accessibilityRole="button" onPress={() => void refresh()} style={{ padding: 9 }}>{refreshing ? <ActivityIndicator color={colors.teal} /> : <Text style={s.link}>Actualizar</Text>}</Pressable></View>
    {location.position && <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingBottom: 8 }} showsHorizontalScrollIndicator={false}>{[null, 1, 5, 10, 25].map(value => <Pressable key={value ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: radius === value }} onPress={() => setRadius(value)} style={[t.chip, radius === value && { backgroundColor: colors.ink }]}><Text style={{ color: radius === value ? colors.white : colors.ink, fontSize: 12 }}>{value ? `${value} km` : 'Todos'}</Text></Pressable>)}</ScrollView>}
    {error !== '' && <Message text={error} error />}
    {location.error !== '' && <Message text={location.error} error />}
    <View style={{ flex: 1 }}>
      {tab === 'map' ? <>
        <MapView places={filtered} selectedId={selectedId ?? undefined} userPosition={location.position} focus={focus} route={navigation.route} destination={destination?.point ?? null} onSelect={id => { const place = places.find(item => item.id === id); if (place) showPlace(place); }} onPoint={onPoint} picking={picking} />
        <View style={t.mapTools}><Button title={location.busy ? 'GPS…' : 'Mi ubicación'} secondary onPress={() => { if (location.position) flyTo(location.position); else void location.enable(); }} /><Button title="Argentina" secondary onPress={() => setFocus({ serial: ++focusSerial.current, country: true })} /><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button title="+" secondary onPress={() => setFocus({ serial: ++focusSerial.current, zoomDelta: 1 })} /></View><View style={{ flex: 1 }}><Button title="−" secondary onPress={() => setFocus({ serial: ++focusSerial.current, zoomDelta: -1 })} /></View></View></View>
        {picking && <View style={t.banner}><Text style={s.label}>Tocá el mapa para ubicar el local.</Text><Button title="Volver al formulario" secondary onPress={() => setPicking(false)} /></View>}
        {destination && !picking && <View style={t.banner}><Text style={s.label}>{destination.label}</Text><Text style={s.small}>{navigation.status.kind === 'loading' ? 'Calculando ruta…' : navigation.status.kind === 'error' ? navigation.status.message : !location.position ? 'Esperando ubicación GPS…' : navigation.arrived ? 'Llegaste al destino' : navigation.route ? `${formatDistance(navigation.route.distance)} · ${Math.max(1, Math.ceil(navigation.route.duration / 60))} min en auto` : 'Buscando recorrido…'}</Text>{navigation.progress?.nextStep && <Text style={s.small}>{maneuverText(navigation.progress.nextStep)}</Text>}<View style={{ flexDirection: 'row', gap: 12 }}><Pressable onPress={() => setDestination(null)} accessibilityRole="button"><Text style={s.link}>Terminar ruta</Text></Pressable>{navigation.status.kind === 'error' && <Pressable accessibilityRole="button" onPress={navigation.retry}><Text style={s.link}>Reintentar</Text></Pressable>}<Pressable accessibilityRole="link" onPress={() => void Linking.openURL(mapsNavigationUrl(destination)).catch(() => Alert.alert('No se pudo abrir la navegación externa.'))}><Text style={s.link}>Google Maps</Text></Pressable></View></View>}
        {!destination && !picking && !places.length && <View style={t.empty}><Text style={s.label}>El mapa está listo para el primer local.</Text><Text style={s.small}>Usá “Agregar local” o mantené presionado un punto.</Text></View>}
      </> : <FlatList data={filtered} keyExtractor={place => place.id} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }} refreshing={refreshing} onRefresh={() => void refresh()} ListEmptyComponent={<Text style={s.subtitle}>{places.length ? 'No hay locales con estos filtros.' : 'Todavía no hay locales. Agregá el primero.'}</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => showPlace(item)} style={s.card}><Text style={s.label}>{item.name}</Text><Text style={s.small}>{item.category} · {item.city}, {item.province}</Text><Text style={s.small}>{item.address || 'Sin dirección'}</Text></Pressable>} />}
    </View>
    <View style={t.footer}><Pressable accessibilityRole="button" onPress={() => setTab(tab === 'map' ? 'list' : 'map')} style={t.tab}><Text style={s.link}>{tab === 'map' ? 'Ver lista' : 'Ver mapa'}</Text></Pressable><View style={{ flex: 1 }}><Button title="Agregar local" onPress={() => startDraft()} disabled={picking} /></View></View>
    {draft && <PlaceForm visible={!picking} draft={draft} onChange={setDraft} onClose={closeDraft} onSave={() => void save()} onPick={() => { setPicking(true); setTab('map'); }} onGPS={() => { setGpsForDraft(true); if (!location.position) void location.enable(); }} busy={saving} error={draftError} gpsMessage={location.error || (gpsForDraft && !location.position ? 'Buscando ubicación GPS…' : '')} />}
    {selected && <PlaceDetails key={selected.id} visible={detailsOpen} client={client} place={selected} userId={session.user.id} members={members} onClose={() => setDetailsOpen(false)} onMap={() => { setDetailsOpen(false); setTab('map'); flyTo({ lat: selected.latitude, lng: selected.longitude }); }} onRoute={() => routeTo({ lat: selected.latitude, lng: selected.longitude }, selected.name)} onEdit={() => { setDraft({ ...selected, latitude: String(selected.latitude), longitude: String(selected.longitude) }); setDraftError(''); setDetailsOpen(false); }} onDelete={async () => { await deletePlace(client, selected.id); setDetailsOpen(false); setPlaces(current => current.filter(place => place.id !== selected.id)); setSelectedId(null); void refresh(); }} />}
    <ModalPage visible={account} title="Equipo" onClose={() => setAccount(false)} busy={accountBusy}>
      <Text style={s.sectionTitle}>{mine?.display_name}</Text><Text style={s.small}>Este teléfono entra automáticamente, sin correo ni contraseña. Todos ven y editan los locales. Las notas se identifican por el teléfono que las creó.</Text>
      <Message text={accountMessage} /><Button title="Cambiar conexión" onPress={() => void signOut()} busy={accountBusy} />
    </ModalPage>
  </SafeAreaView>;
}

const t = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, account: { padding: 10 },
  search: { marginHorizontal: 14, marginBottom: 10, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, minHeight: 46 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#e3ece5', borderRadius: 20 },
  mapTools: { position: 'absolute', right: 12, top: 12, width: 110, gap: 7 },
  banner: { position: 'absolute', left: 12, right: 12, bottom: 32, backgroundColor: colors.white, borderRadius: 14, padding: 14, gap: 10, elevation: 5 },
  empty: { position: 'absolute', bottom: 34, left: 12, right: 12, padding: 13, borderRadius: 12, backgroundColor: '#ffffffed', gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.line }, tab: { paddingHorizontal: 16, paddingVertical: 12 },
});
