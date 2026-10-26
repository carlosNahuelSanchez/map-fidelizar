import { z } from 'zod';

export const placeInputSchema = z.object({
  name: z.string().trim().min(2, 'Escribí un nombre de al menos 2 caracteres.').max(120),
  category: z.string().trim().min(1, 'Indicá el rubro.').max(80),
  address: z.string().trim().max(250),
  city: z.string().trim().min(1, 'Indicá la localidad.').max(120),
  province: z.string().trim().min(1, 'Indicá la provincia.').max(100),
  latitude: z.number().min(-90, 'La latitud debe estar entre -90 y 90.').max(90, 'La latitud debe estar entre -90 y 90.'),
  longitude: z.number().min(-180, 'La longitud debe estar entre -180 y 180.').max(180, 'La longitud debe estar entre -180 y 180.'),
  phone: z.string().trim().max(50),
});
export type PlaceInput = z.infer<typeof placeInputSchema>;
export type Place = PlaceInput & { id: string; created_by: string; updated_by: string; created_at: string; updated_at: string };
export type Member = { user_id: string; display_name: string; active: boolean };
export type PlaceNote = { id: string; place_id: string; body: string; author_id: string; created_at: string; updated_at: string };
export const noteSchema = z.string().trim().min(1, 'Escribí una nota.').max(4000, 'La nota admite hasta 4000 caracteres.');

export function parseCoordinate(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

export function errorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'PGRST116') return 'El registro ya no existe o no tenés permiso para modificarlo. Actualizá los datos.';
  if (/anonymous.*disabled|Anonymous sign-ins are disabled/i.test(message)) return 'El acceso anónimo no está habilitado en Supabase. El responsable debe ejecutar la configuración del proyecto.';
  if (/Network request failed|Failed to fetch/i.test(message)) return 'No hay conexión con Supabase. Revisá internet y la URL del proyecto.';
  if (/row-level security|permission denied/i.test(message)) return 'Tu cuenta no tiene permiso para hacer este cambio.';
  if (/PGRST|schema cache|does not exist/i.test(message)) return 'Falta instalar o actualizar el esquema de la base. Ejecutá el SQL incluido en el proyecto.';
  return message || 'No se pudo completar la operación. Intentá nuevamente.';
}
