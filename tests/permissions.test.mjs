import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const outsider = '33333333-3333-4333-8333-333333333333';
const placeId = '44444444-4444-4444-8444-444444444444';
const noteId = '55555555-5555-4555-8555-555555555555';
async function asUser(id, action) {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await action(); } finally { await db.exec('reset role'); }
}
before(async () => {
  await db.exec(`
    create schema auth;
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    grant usage on schema auth to authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('${alice}'), ('${bob}'), ('${outsider}');
  `);
  const migration = await readFile(new URL('../supabase/migrations/202610260001_team_map.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  await db.query('update private.team_settings set access_code=$1', ['prototype-team-code-123456']);
  await db.query('insert into public.team_members(user_id,display_name) values ($1,$2),($3,$4)', [alice, 'Ana', bob, 'Bruno']);
});
after(async () => { await db.close(); });
test('un anónimo no puede leer los locales', async () => {
  await db.exec('set role anon');
  try { await assert.rejects(db.query('select * from places'), /permission denied/); }
  finally { await db.exec('reset role'); }
});
test('un usuario autenticado ajeno al equipo tampoco accede ni se habilita solo', async () => {
  await asUser(outsider, async () => {
    assert.equal((await db.query('select * from places')).rows.length, 0);
    await assert.rejects(db.query('insert into team_members(user_id,display_name) values ($1,$2)', [outsider, 'Intruso']), /permission denied/);
    await assert.rejects(db.query("insert into places(name,category,city,province,latitude,longitude,created_by,updated_by) values ('Local', 'Comercio', 'Formosa','Formosa',-26,-58,$1,$1)", [outsider]), /row-level security/);
  });
});
test('un integrante crea un local y la base impide falsificar autoría', async () => {
  await asUser(alice, async () => {
    const result = await db.query("insert into places(id,name,category,city,province,latitude,longitude,created_by,updated_by) values ($1,'Local','Comercio','Formosa','Formosa',-26,-58,$2,$2) returning *", [placeId, bob]);
    assert.equal(result.rows[0].created_by, alice);
    assert.equal(result.rows[0].updated_by, alice);
  });
});
test('otro integrante ve y edita el local pero no cambia su autor ni puede borrarlo', async () => {
  await asUser(bob, async () => {
    assert.equal((await db.query('select * from places')).rows.length, 1);
    const { rows } = await db.query("update places set name='Nombre editado', created_by=$1 where id=$2 returning *", [bob, placeId]);
    assert.equal(rows[0].created_by, alice);
    assert.equal(rows[0].updated_by, bob);
    assert.equal((await db.query('delete from places where id=$1 returning id', [placeId])).rows.length, 0);
  });
});
test('las notas son visibles para el equipo pero solo el autor las edita', async () => {
  await asUser(alice, async () => {
    await db.query("insert into place_notes(id,place_id,body,author_id) values ($1,$2,'Nota compartida',$3)", [noteId, placeId, bob]);
    assert.equal((await db.query('select author_id from place_notes')).rows[0].author_id, alice);
  });
  await asUser(bob, async () => {
    assert.equal((await db.query('select * from place_notes')).rows.length, 1);
    assert.equal((await db.query("update place_notes set body='Cambio ajeno' returning id")).rows.length, 0);
    assert.equal((await db.query('delete from place_notes returning id')).rows.length, 0);
  });
  await asUser(alice, async () => {
    const { rows } = await db.query("update place_notes set body='Mi edición', author_id=$1 where id=$2 returning *", [bob, noteId]);
    assert.equal(rows[0].body, 'Mi edición'); assert.equal(rows[0].author_id, alice);
  });
});
test('los límites y el contenido también se validan en la base', async () => {
  await asUser(alice, async () => {
    await assert.rejects(db.query('update places set latitude=100 where id=$1', [placeId]), /check constraint/);
    await assert.rejects(db.query("update place_notes set body=' ' where id=$1", [noteId]), /check constraint/);
  });
});
test('desactivar un integrante le quita acceso sin borrar sus aportes', async () => {
  await db.query('update team_members set active=false where user_id=$1', [bob]);
  await asUser(bob, async () => {
    assert.equal((await db.query('select * from places')).rows.length, 0);
    assert.equal((await db.query('select * from place_notes')).rows.length, 0);
  });
});
test('el creador puede borrar su local y se eliminan las notas asociadas', async () => {
  await asUser(alice, async () => {
    assert.equal((await db.query('delete from places where id=$1 returning id', [placeId])).rows.length, 1);
    assert.equal((await db.query('select * from place_notes')).rows.length, 0);
  });
});
test('una sesión automática necesita el código compartido y no puede leerlo desde la API', async () => {
  await asUser(outsider, async () => {
    await assert.rejects(db.query('select * from private.team_settings'), /permission denied/);
    await assert.rejects(db.query('select public.join_team($1,$2)', ['incorrecto', 'Teléfono de prueba']), /código del equipo/);
    assert.equal((await db.query('select public.is_team_member() as allowed')).rows[0].allowed, false);
    await db.query('select public.join_team($1,$2)', ['prototype-team-code-123456', 'Teléfono de prueba']);
    assert.equal((await db.query('select public.is_team_member() as allowed')).rows[0].allowed, true);
  });
});
test('un teléfono deshabilitado no puede volver a habilitarse con el código', async () => {
  await asUser(bob, async () => {
    await assert.rejects(db.query('select public.join_team($1,$2)', ['prototype-team-code-123456', 'Teléfono de prueba']), /deshabilitado/);
  });
});
