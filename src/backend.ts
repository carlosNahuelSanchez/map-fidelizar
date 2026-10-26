import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import type { BackendConfig } from './backend-config';
import { noteSchema, placeInputSchema, type Member, type Place, type PlaceInput, type PlaceNote } from './domain';

export function createBackend(config: BackendConfig): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      storage: { getItem: key => SecureStore.getItemAsync(key), setItem: (key, value) => SecureStore.setItemAsync(key, value), removeItem: key => SecureStore.deleteItemAsync(key) },
      autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock,
    },
    global: { fetch: async (url, init) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      init?.signal?.addEventListener('abort', abort, { once: true });
      if (init?.signal?.aborted) controller.abort();
      const timeout = setTimeout(abort, 20000);
      try { return await fetch(url, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timeout); init?.signal?.removeEventListener('abort', abort); }
    } },
  });
}

export async function getMembership(client: SupabaseClient, userId: string): Promise<Member | null> {
  const { data, error } = await client.from('team_members').select('user_id,display_name,active').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as Member | null;
}
export async function listMembers(client: SupabaseClient): Promise<Member[]> {
  const { data, error } = await client.from('team_members').select('user_id,display_name,active');
  if (error) throw error;
  return data as Member[];
}
export async function listPlaces(client: SupabaseClient): Promise<Place[]> {
  const places: Place[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('places').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) throw error;
    places.push(...data as Place[]);
    if (data.length < 500) return places;
  }
}
export async function savePlace(client: SupabaseClient, input: PlaceInput, userId: string, id?: string): Promise<Place> {
  const valid = placeInputSchema.parse(input);
  const query = id ? client.from('places').update(valid).eq('id', id) : client.from('places').insert({ ...valid, created_by: userId, updated_by: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as Place;
}
export async function deletePlace(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('places').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data.length) throw new Error('El local no existe o tu cuenta no puede eliminarlo.');
}
export async function listNotes(client: SupabaseClient, placeId: string): Promise<PlaceNote[]> {
  const notes: PlaceNote[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('place_notes').select('*').eq('place_id', placeId).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) throw error;
    notes.push(...data as PlaceNote[]);
    if (data.length < 500) return notes;
  }
}
export async function saveNote(client: SupabaseClient, placeId: string, body: string, userId: string, id?: string) {
  const valid = noteSchema.parse(body);
  const query = id ? client.from('place_notes').update({ body: valid }).eq('id', id) : client.from('place_notes').insert({ place_id: placeId, body: valid, author_id: userId });
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  return data;
}
export async function deleteNote(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('place_notes').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data.length) throw new Error('La nota no existe o solo su autor puede eliminarla.');
}
