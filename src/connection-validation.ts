import { z } from 'zod';

const configSchema = z.object({
  url: z.url({ error: 'Ingresá la URL del proyecto Supabase.' }).refine(value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash; } catch { return false; } }, 'Usá la URL HTTPS raíz de tu proyecto Supabase.'),
  key: z.string().trim().min(20, 'Pegá la clave pública de Supabase.').refine(value => !value.startsWith('sb_secret_'), 'La clave secreta no debe cargarse en la app.'),
  teamCode: z.string().trim().min(8, 'Ingresá el código compartido del equipo.').max(100),
  deviceName: z.string().trim().max(80).default('Equipo'),
});
export type BackendConfig = z.infer<typeof configSchema>;
export function validateBackendConfig(url: string, key: string, teamCode: string, deviceName: string): BackendConfig {
  const result = configSchema.safeParse({ url: url.trim().replace(/\/$/, ''), key, teamCode, deviceName: deviceName.trim() || 'Equipo' });
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Configuración inválida.');
  if (result.data.key.startsWith('eyJ')) {
    try {
      const encoded = result.data.key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      if (claims.role !== 'anon') throw new Error('Clave privada.');
    } catch { throw new Error('Usá una clave sb_publishable o la clave pública anon válida.'); }
  } else if (!result.data.key.startsWith('sb_publishable_')) {
    throw new Error('Usá la clave pública sb_publishable o anon del proyecto.');
  }
  return result.data;
}
