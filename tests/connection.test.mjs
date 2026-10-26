import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackendConfig } from '../src/connection-validation.ts';

const url = 'https://example.supabase.co';
const key = 'sb_publishable_test_public_key';
const code = 'test-shared-code';
const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
test('rechaza claves administrativas en el cliente', () => {
  assert.throws(() => validateBackendConfig(url, 'sb_secret_private_admin_key', code, ''), /secreta/);
  assert.throws(() => validateBackendConfig(url, jwt('service_role'), code, ''), /clave pública/);
  assert.equal(validateBackendConfig(url, jwt('anon'), code, '').deviceName, 'Equipo');
});
test('solo permite la URL raíz HTTPS del proyecto', () => {
  for (const invalid of ['http://example.supabase.co', 'https://user:password@example.supabase.co', 'https://example.supabase.co/rest/v1', 'https://example.supabase.co?key=abc']) assert.throws(() => validateBackendConfig(invalid, key, code, ''));
  assert.equal(validateBackendConfig(`${url}/`, key, code, '').url, url);
});
test('no conecta sin código del equipo', () => {
  assert.throws(() => validateBackendConfig(url, key, '', ''), /código/);
});
test('un formulario vacío muestra una validación en español y no una excepción de URL', () => {
  assert.throws(() => validateBackendConfig('', '', '', ''), /Ingresá la URL del proyecto Supabase/);
});
