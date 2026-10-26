import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinate, placeInputSchema, noteSchema } from '../src/domain.ts';

const input = { name: 'Local de prueba', category: 'Comercio', address: '', city: 'Formosa', province: 'Formosa', latitude: -26.18, longitude: -58.17, phone: '' };
test('no convierte coordenadas vacías en un punto 0,0', () => {
  assert.ok(Number.isNaN(parseCoordinate('')));
  assert.ok(Number.isNaN(parseCoordinate(' ')));
  assert.equal(parseCoordinate('-26,18'), -26.18);
  assert.ok(Number.isNaN(parseCoordinate('dirección')));
});
test('valida datos antes de enviarlos a la API', () => {
  assert.equal(placeInputSchema.parse({ ...input, name: '  Local de prueba  ' }).name, 'Local de prueba');
  for (const value of [{ ...input, latitude: 100 }, { ...input, longitude: -200 }, { ...input, name: ' ' }, { ...input, city: '' }, { ...input, latitude: NaN }]) assert.equal(placeInputSchema.safeParse(value).success, false);
});
test('las notas no admiten texto vacío ni más de 4000 caracteres', () => {
  assert.equal(noteSchema.safeParse('  ').success, false);
  assert.equal(noteSchema.safeParse('x'.repeat(4001)).success, false);
  assert.equal(noteSchema.parse(' Nota del equipo '), 'Nota del equipo');
});
