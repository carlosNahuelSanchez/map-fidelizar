import { readFile, readdir } from 'node:fs/promises';

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !/^[a-z0-9]+$/.test(ref) || !token) {
  console.error('Completá SUPABASE_PROJECT_REF y SUPABASE_ACCESS_TOKEN en .env.admin. El token se obtiene en la cuenta de Supabase, no es la clave pública de la app.');
  process.exit(1);
}
async function request(path, method, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Supabase devolvió HTTP ${response.status} al preparar ${path}. Revisá el proyecto y los permisos del token.`);
  return response.json();
}
try {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    await request('database/query', 'POST', { query: await readFile(new URL(name, directory), 'utf8') });
    console.log(`Esquema aplicado: ${name}`);
  }
  await request('config/auth', 'PATCH', { disable_signup: false, external_anonymous_users_enabled: true, external_email_enabled: false });
  const result = await request('database/query', 'POST', { query: 'select access_code from private.team_settings where id = true;' });
  const code = Array.isArray(result) ? result[0]?.access_code : undefined;
  console.log('Base lista. Acceso automático sin correo ni contraseña habilitado.');
  if (code) console.log(`Código compartido del equipo: ${code}`);
  else console.log('Consultá el código en el SQL Editor: select access_code from private.team_settings where id = true;');
} catch (error) { console.error(error.message); process.exit(1); }
