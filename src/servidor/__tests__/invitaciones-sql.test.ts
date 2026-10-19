// Invitaciones en los dos sentidos, probadas contra las migraciones reales (supabase/migrations/*.sql) en PGlite (Postgres en WASM).
// Simula lo mínimo de Supabase: roles anon/authenticated, auth.uid() desde request.jwt.claim.sub y storage.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
// Las migraciones se leen como texto con Vite (sin depender de los tipos de Node).
const MIGRACIONES = import.meta.glob('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, storage, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security; grant select, insert on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant execute on function storage.foldername(text) to authenticated;
create publication supabase_realtime;`

const DUENO = '11111111-1111-4111-8111-111111111111', INQ = '22222222-2222-4222-8222-222222222222', OTRO = '33333333-3333-4333-8333-333333333333'
const hoy = new Date().toISOString().slice(0, 10)
const fin = (() => { const x = new Date(); x.setUTCMonth(x.getUTCMonth() + 6); return x.toISOString().slice(0, 10) })()
let db: PGlite

async function como<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
  try { return (await db.query<T>(sql, params)).rows } finally { await db.exec('reset role') }
}
const crear = async (uid: string, rol: 'dueno' | 'inquilino', yo: string, otro: string, reglas = ['Sin mascotas']) => {
  const [r] = await como<{ r: { id: string; token: string; expira: string } }>(uid,
    `select public.lk_crear_contrato('Casa de prueba', 100, $1::date, $2::date, $3::text[], $4, $5, null, 60, $6) r`, [hoy, fin, reglas, otro, yo, rol])
  return r.r
}
const aceptar = (uid: string, id: string, token: string, email: string, reglas = false) =>
  como(uid, `select public.lk_aceptar_invitacion($1, $2, $3, null, $4) r`, [id, token, email, reglas])
const contrato = async (uid: string, id: string) =>
  (await como<{ rol_creador: string; reglas: string[]; reglas_ok_dueno: string | null; reglas_ok_inquilino: string | null; email_dueno: string; email_inquilino: string; invitacion_expira: string }>(uid,
    `select rol_creador, reglas, reglas_ok_dueno, reglas_ok_inquilino, email_dueno, email_inquilino, invitacion_expira from public.lk_contratos where id = $1`, [id]))[0]

beforeAll(async () => {
  db = new PGlite()
  await db.exec(STUB)
  const archivos = Object.keys(MIGRACIONES).sort()
  expect(archivos.length).toBeGreaterThanOrEqual(2)
  for (const f of archivos) await db.exec(MIGRACIONES[f])
}, 60_000)

describe('invitaciones: el dueño crea e invita al inquilino', () => {
  it('el link dura 7 días y el inquilino acepta las reglas al entrar', async () => {
    const { id, token, expira } = await crear(DUENO, 'dueno', 'dueno@x.cr', 'Inq@X.cr')
    const dias = (new Date(expira).getTime() - Date.now()) / 864e5
    expect(dias).toBeGreaterThan(6.9); expect(dias).toBeLessThanOrEqual(7)
    const [v] = await como<{ r: Record<string, unknown> }>(INQ, `select public.lk_ver_invitacion($1, $2) r`, [id, token])
    expect(v.r).toMatchObject({ rol_invitado: 'inquilino', email_invitado: 'inq@x.cr', email_creador: 'dueno@x.cr', reglas_por_confirmar: false, reglas: ['Sin mascotas'] })
    await expect(aceptar(INQ, id, token, 'inq@x.cr', false)).rejects.toThrow(/aceptas las reglas/)
    const [r] = await aceptar(INQ, id, token, 'INQ@x.cr', true)
    expect(r.r).toBe('inquilino')
    const c = await contrato(INQ, id)
    expect(c.reglas_ok_dueno).not.toBeNull(); expect(c.reglas_ok_inquilino).not.toBeNull()
    await como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id])
    const [f] = await como<{ e: string }>(INQ, `select public.lk_firmar($1, 'contrato') e`, [id])
    expect(f.e).toBe('pendiente_pago')
  })

  it('correo equivocado: explica para quién es y cómo arreglarlo', async () => {
    const { id, token } = await crear(DUENO, 'dueno', 'dueno@x.cr', 'inq@x.cr')
    await expect(aceptar(OTRO, id, token, 'otro@x.cr', true)).rejects.toThrow(/Esta invitación es para inq@x\.cr\. Sal de tu cuenta y entra con ese correo/)
  })

  it('papel equivocado: quien creó no puede aceptar su propio link', async () => {
    const { id, token } = await crear(DUENO, 'dueno', 'dueno@x.cr', 'inq@x.cr')
    await expect(aceptar(DUENO, id, token, 'inq@x.cr', true)).rejects.toThrow(/Tú creaste este alquiler como dueño\. Este link es para el inquilino/)
  })

  it('link vencido: pide reenviar; «Reenviar invitación» da otro link de 7 días y anula el anterior', async () => {
    const { id, token } = await crear(DUENO, 'dueno', 'dueno@x.cr', 'inq@x.cr')
    await db.exec(`update public.lk_contratos set invitacion_expira = now() - interval '1 minute' where id = '${id}'`)
    await expect(como(INQ, `select public.lk_ver_invitacion($1, $2)`, [id, token])).rejects.toThrow(/venció: dura 7 días.*Reenviar invitación/)
    await expect(aceptar(INQ, id, token, 'inq@x.cr', true)).rejects.toThrow(/venció/)
    await expect(como(INQ, `select public.lk_nueva_invitacion($1)`, [id])).rejects.toThrow(/No participas/)
    const [n] = await como<{ t: string }>(DUENO, `select public.lk_nueva_invitacion($1) t`, [id])
    expect(n.t).not.toBe(token)
    const dias = (new Date((await contrato(DUENO, id)).invitacion_expira).getTime() - Date.now()) / 864e5
    expect(dias).toBeGreaterThan(6.9)
    await expect(como(INQ, `select public.lk_ver_invitacion($1, $2)`, [id, token])).rejects.toThrow(/no es válido/)
    await aceptar(INQ, id, n.t, 'inq@x.cr', true)
    await expect(como(DUENO, `select public.lk_nueva_invitacion($1)`, [id])).rejects.toThrow(/ya aceptó/)
  })
})

describe('invitaciones: el inquilino crea e invita al dueño', () => {
  it('reglas en borrador: el dueño entra, las confirma y recién ahí se firma', async () => {
    const { id, token } = await crear(INQ, 'inquilino', 'inq@x.cr', 'dueno@x.cr', ['Sin fiestas'])
    let c = await contrato(INQ, id)
    expect(c).toMatchObject({ rol_creador: 'inquilino', email_dueno: 'dueno@x.cr', email_inquilino: 'inq@x.cr', reglas_ok_dueno: null })
    expect(c.reglas_ok_inquilino).not.toBeNull()
    const [v] = await como<{ r: Record<string, unknown> }>(DUENO, `select public.lk_ver_invitacion($1, $2) r`, [id, token])
    expect(v.r).toMatchObject({ rol_invitado: 'dueno', email_invitado: 'dueno@x.cr', reglas_por_confirmar: true })
    await expect(aceptar(INQ, id, token, 'dueno@x.cr')).rejects.toThrow(/Tú creaste este alquiler como inquilino\. Este link es para el dueño/)
    await expect(aceptar(OTRO, id, token, 'otro@x.cr')).rejects.toThrow(/es para dueno@x\.cr/)
    const [r] = await aceptar(DUENO, id, token, 'dueno@x.cr')
    expect(r.r).toBe('dueno')
    await expect(como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id])).rejects.toThrow(/el dueño tiene que confirmar las reglas/)
    await expect(como(INQ, `select public.lk_confirmar_reglas($1, $2::text[])`, [id, ['x']])).rejects.toThrow(/le corresponde al dueño/)
    await como(DUENO, `select public.lk_confirmar_reglas($1, $2::text[])`, [id, ['Sin fiestas']])
    c = await contrato(DUENO, id)
    expect(c.reglas_ok_dueno).not.toBeNull(); expect(c.reglas_ok_inquilino).not.toBeNull() // no cambió nada: sigue aceptada
    await como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id])
    const [f] = await como<{ e: string }>(INQ, `select public.lk_firmar($1, 'contrato') e`, [id])
    expect(f.e).toBe('pendiente_pago')
    await expect(como(DUENO, `select public.lk_confirmar_reglas($1, $2::text[])`, [id, ['otra']])).rejects.toThrow(/ya no se pueden cambiar/)
  })

  it('si el dueño cambia las reglas, el inquilino las vuelve a aceptar antes de firmar', async () => {
    const { id, token } = await crear(INQ, 'inquilino', 'inq@x.cr', 'dueno@x.cr', ['Sin fiestas'])
    await aceptar(DUENO, id, token, 'dueno@x.cr')
    await expect(como(INQ, `select public.lk_aceptar_reglas($1)`, [id])).rejects.toThrow(/Primero el dueño tiene que confirmar/)
    await como(DUENO, `select public.lk_confirmar_reglas($1, $2::text[])`, [id, ['Sin fiestas', 'Sin mascotas', '  ']])
    const c = await contrato(INQ, id)
    expect(c.reglas).toEqual(['Sin fiestas', 'Sin mascotas']); expect(c.reglas_ok_inquilino).toBeNull()
    await como(DUENO, `select public.lk_firmar($1, 'contrato')`, [id]).catch(() => undefined)
    await expect(como(INQ, `select public.lk_firmar($1, 'contrato')`, [id])).rejects.toThrow(/el inquilino tiene que aceptar las reglas/)
    await expect(como(DUENO, `select public.lk_aceptar_reglas($1)`, [id])).rejects.toThrow(/le corresponde al inquilino/)
    await como(INQ, `select public.lk_aceptar_reglas($1)`, [id])
    await expect(como(INQ, `select public.lk_firmar($1, 'contrato') e`, [id])).resolves.toBeDefined()
  })

  it('solo quien creó (aquí el inquilino) reenvía; los demás no ven el contrato', async () => {
    const { id } = await crear(INQ, 'inquilino', 'inq@x.cr', 'dueno@x.cr')
    await expect(como(DUENO, `select public.lk_nueva_invitacion($1)`, [id])).rejects.toThrow(/No participas/)
    await expect(como(INQ, `select public.lk_nueva_invitacion($1) t`, [id])).resolves.toHaveLength(1)
    expect(await como(OTRO, `select id from public.lk_contratos where id = $1`, [id])).toHaveLength(0)
    await expect(como(INQ, `select invitacion_hash from public.lk_contratos`)).rejects.toThrow()
  })

  it('no se puede invitar a uno mismo ni crear sin elegir papel', async () => {
    await expect(crear(INQ, 'inquilino', 'inq@x.cr', 'INQ@x.cr')).rejects.toThrow(/Ese es tu correo/)
    await expect(como(INQ, `select public.lk_crear_contrato('Casa', 100, $1::date, $2::date, '{}', 'd@x.cr', 'i@x.cr', null, 60, 'mediador')`, [hoy, fin])).rejects.toThrow(/Elige si eres/)
  })
})

describe('migración sobre datos existentes', () => {
  it('alquileres creados antes quedan como «creó el dueño» y sus reglas ya aprobadas (no se traban)', async () => {
    const viejo = new PGlite(); await viejo.exec(STUB)
    const [primera, ...resto] = Object.keys(MIGRACIONES).sort()
    await viejo.exec(MIGRACIONES[primera])
    const q = async (uid: string, sql: string, params: unknown[] = []) => {
      await viejo.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
      try { return (await viejo.query<Record<string, unknown>>(sql, params)).rows } finally { await viejo.exec('reset role') }
    }
    const [r] = await q(DUENO, `select public.lk_crear_contrato('Casa', 100, $1::date, $2::date, '{}', 'inq@x.cr', 'dueno@x.cr') r`, [hoy, fin])
    const { id, token } = r.r as { id: string; token: string }
    await q(INQ, `select public.lk_aceptar_invitacion($1, $2, 'inq@x.cr')`, [id, token])
    for (const f of resto) { await viejo.exec(MIGRACIONES[f]); await viejo.exec(MIGRACIONES[f]) } // idempotente
    const [c] = (await viejo.query<Record<string, unknown>>(`select rol_creador, email_dueno, reglas_ok_dueno, reglas_ok_inquilino from public.lk_contratos where id = $1`, [id])).rows
    expect(c.rol_creador).toBe('dueno'); expect(c.email_dueno).toBe('dueno@x.cr'); expect(c.reglas_ok_dueno).not.toBeNull(); expect(c.reglas_ok_inquilino).not.toBeNull()
    await q(DUENO, `select public.lk_firmar($1, 'contrato')`, [id])
    const [e] = await q(INQ, `select public.lk_firmar($1, 'contrato') e`, [id]); expect(e.e).toBe('pendiente_pago')
  }, 60_000)
})
