import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteNote, listNotes, saveNote } from './backend';
import { errorMessage, type Member, type Place, type PlaceNote } from './domain';
import { Button, Field, Message, ModalPage, s } from './ui';

export function PlaceDetails({ visible, client, place, userId, members, onClose, onEdit, onDelete, onRoute, onMap }: {
  visible: boolean; client: SupabaseClient; place: Place; userId: string; members: Member[];
  onClose: () => void; onEdit: () => void; onDelete: () => Promise<void>; onRoute: () => void; onMap: () => void;
}) {
  const [notes, setNotes] = useState<PlaceNote[]>([]); const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | undefined>(); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [noteLoading, setNoteLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const refresh = useCallback(async () => {
    try { setNotes(await listNotes(client, place.id)); setLoadError(''); }
    catch (cause) { setLoadError(errorMessage(cause)); }
    finally { setNoteLoading(false); }
  }, [client, place.id]);
  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    const update = () => { if (!disposed) void refresh(); };
    update();
    const channel = client.channel(`notes-${place.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'place_notes' }, update).subscribe();
    const timer = setInterval(update, 20000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { disposed = true; clearInterval(timer); subscription.remove(); void client.removeChannel(channel); };
  }, [visible, client, place.id, refresh]);
  const author = (id: string) => members.find(member => member.user_id === id)?.display_name ?? 'Integrante del equipo';
  const discardThen = (action: () => void) => {
    if (!body.trim()) { action(); return; }
    Alert.alert('Nota sin guardar', '¿Descartar el texto que estás escribiendo?', [{ text: 'Seguir escribiendo', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: () => { setBody(''); setEditing(undefined); action(); } }]);
  };
  const save = async () => {
    setBusy(true); setError('');
    try { await saveNote(client, place.id, body, userId, editing); setBody(''); setEditing(undefined); await refresh(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };
  const removeNote = (note: PlaceNote) => Alert.alert('Eliminar nota', 'La nota se eliminará para todo el equipo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => {
    setBusy(true); setError('');
    void deleteNote(client, note.id).then(async () => { if (editing === note.id) { setEditing(undefined); setBody(''); } await refresh(); }).catch(cause => setError(errorMessage(cause))).finally(() => setBusy(false));
  } }]);
  return <ModalPage visible={visible} title={place.name} onClose={() => discardThen(onClose)} busy={busy}>
    <Text style={s.subtitle}>{place.category} · {place.city}, {place.province}</Text>
    <Text style={s.subtitle}>{place.address || 'Sin dirección cargada'}</Text>
    <Text style={s.small}>{place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}</Text>
    <Text style={s.small}>Creó: {author(place.created_by)} · Editó: {author(place.updated_by)}</Text>
    {place.phone !== '' && <Text style={s.subtitle}>Teléfono: {place.phone}</Text>}
    <Button title="Ver en mapa" onPress={() => discardThen(onMap)} secondary disabled={busy} />
    <Button title="Cómo llegar" onPress={() => discardThen(onRoute)} secondary disabled={busy} />
    <Button title="Editar local" onPress={() => discardThen(onEdit)} secondary disabled={busy} />
    {place.created_by === userId && <Button title="Eliminar local" danger disabled={busy} onPress={() => Alert.alert('Eliminar local', 'Se borrará el local y todas sus notas para el equipo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { setBusy(true); void onDelete().catch(cause => setError(errorMessage(cause))).finally(() => setBusy(false)); } }])} />}
    <Text style={s.sectionTitle}>Notas compartidas</Text>
    <Message text={loadError} error />
    {loadError !== '' && <Button title="Volver a cargar notas" secondary onPress={() => void refresh()} />}
    {notes.map(note => <View style={s.card} key={note.id}>
      <Text style={s.label}>{author(note.author_id)}</Text><Text style={s.small}>{new Date(note.updated_at).toLocaleString('es-AR')}</Text><Text style={s.subtitle}>{note.body}</Text>
      {note.author_id === userId && <View style={{ gap: 8 }}><Button title="Editar mi nota" secondary disabled={busy} onPress={() => discardThen(() => { setEditing(note.id); setBody(note.body); })} /><Button title="Eliminar mi nota" danger disabled={busy} onPress={() => removeNote(note)} /></View>}
    </View>)}
    {!notes.length && <Text style={s.small}>{noteLoading ? 'Cargando notas…' : loadError ? 'No se pudieron cargar las notas.' : 'Todavía no hay notas de este local.'}</Text>}
    <Field label={editing ? 'Editar nota' : 'Agregar una nota'} multiline maxLength={4000} value={body} onChangeText={setBody} editable={!busy} />
    <Message text={error} error />
    <Button title={editing ? 'Guardar cambios de la nota' : 'Guardar nota'} onPress={() => void save()} busy={busy} disabled={!body.trim()} />
    {editing && <Button title="Cancelar edición de nota" secondary disabled={busy} onPress={() => { setEditing(undefined); setBody(''); }} />}
  </ModalPage>;
}
