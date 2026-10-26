import { View } from 'react-native';
import { Button, Field, Message, ModalPage } from './ui';

export type PlaceDraft = { id?: string; name: string; category: string; address: string; city: string; province: string; latitude: string; longitude: string; phone: string };
export const emptyDraft = (): PlaceDraft => ({ name: '', category: '', address: '', city: '', province: '', latitude: '', longitude: '', phone: '' });
export function PlaceForm({ visible, draft, onChange, onClose, onSave, onPick, onGPS, busy, error, gpsMessage }: {
  visible: boolean; draft: PlaceDraft; onChange: (draft: PlaceDraft) => void; onClose: () => void;
  onSave: () => void; onPick: () => void; onGPS: () => void; busy: boolean; error: string; gpsMessage: string;
}) {
  const field = (key: keyof PlaceDraft, label: string, maxLength: number) => <Field label={label} value={draft[key] ?? ''} onChangeText={value => onChange({ ...draft, [key]: value })} maxLength={maxLength} editable={!busy} />;
  return <ModalPage visible={visible} title={draft.id ? 'Editar local' : 'Nuevo local'} onClose={onClose} busy={busy}>
    {field('name', 'Nombre', 120)}{field('category', 'Rubro', 80)}
    {field('address', 'Dirección', 250)}{field('city', 'Localidad', 120)}{field('province', 'Provincia', 100)}
    <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Latitud" value={draft.latitude} onChangeText={value => onChange({ ...draft, latitude: value })} keyboardType="numbers-and-punctuation" editable={!busy} /></View><View style={{ flex: 1 }}><Field label="Longitud" value={draft.longitude} onChangeText={value => onChange({ ...draft, longitude: value })} keyboardType="numbers-and-punctuation" editable={!busy} /></View></View>
    <Button title="Elegir ubicación en el mapa" onPress={onPick} secondary disabled={busy} />
    <Button title="Usar mi ubicación GPS" onPress={onGPS} secondary disabled={busy} />
    <Message text={gpsMessage} />{field('phone', 'Teléfono (opcional)', 50)}
    <Message text={error} error /><Button title="Guardar local para el equipo" onPress={onSave} busy={busy} />
  </ModalPage>;
}
