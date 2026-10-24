// Cliente mínimo de la Management API de Supabase (POST /v1/projects/{ref}/database/query) para los scripts de espacios.
// Solo el proyecto de prueba sddgjnuvxzkrhhuczuly. El token sale de process.env.SUPABASE_ACCESS_TOKEN y NUNCA se imprime.
// SUPABASE_API_URL solo se usa para el ensayo local (api-falsa.mjs en 127.0.0.1); si no, va a https://api.supabase.com.
import { readFileSync } from 'node:fs'
export const REF = 'sddgjnuvxzkrhhuczuly'
const BASE = process.env.SUPABASE_API_URL || 'https://api.supabase.com'
export const ensayo = BASE !== 'https://api.supabase.com'
if (ensayo && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE)) { console.error('SUPABASE_API_URL solo puede ser https://api.supabase.com o http://127.0.0.1:<puerto> (ensayo local).'); process.exit(2) }

export function exigir() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) { console.error('Falta SUPABASE_ACCESS_TOKEN (no se imprime nunca).'); process.exit(2) }
  if (process.env.CONFIRMO_PROYECTO !== REF) { console.error(`Pon CONFIRMO_PROYECTO=${REF} para confirmar que es el proyecto de prueba.`); process.exit(2) }
  console.log(ensayo ? `ENSAYO LOCAL: API falsa en ${BASE} (Postgres local)` : `Proyecto ${REF} (API real de Supabase)`)
}

/** Corre SQL con la API. Devuelve las filas que devuelve la API. Si falla, lanza un Error con el mensaje de la base (sin el token). */
export async function consulta(query, { soloLectura = false } = {}) {
  const r = await fetch(`${BASE}/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...(soloLectura && { read_only: true }) }) })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  if (!r.ok) { const e = new Error(`API ${r.status}: ${String(j?.message ?? t).slice(0, 800)}`); e.status = r.status; throw e }
  return j
}
const fila1 = async (q, o) => { const f = await consulta(q, o); return Array.isArray(f) ? f[0] : f }

export const NOMBRE_LK = /^lk_[a-z0-9_]+$/
/** Tablas lk_* de public, leídas de information_schema. Ninguna otra tabla se consulta. */
export async function tablasLk() {
  const f = await fila1(`select coalesce(json_agg(table_name order by table_name), '[]'::json) as t from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' and table_name like 'lk\\_%'`, { soloLectura: true })
  const t = f.t ?? []; for (const x of t) if (!NOMBRE_LK.test(x)) throw new Error(`nombre de tabla inesperado: ${x}`)
  return t
}

/** Huella de lo que hay: filas (cantidad + md5) de cada tabla lk_*, filas de storage.objects del bucket lk-fotos y
 *  definiciones lk_* (funciones, triggers de tablas lk_*, políticas lk_* de storage.objects, columnas de las tablas lk_*). */
export async function huella(tablas) {
  const partes = tablas.map(t => `select '${t}' as t, count(*)::int as n, md5(coalesce(string_agg(r::text, '|' order by r::text), '')) as h from public."${t}" r`)
  partes.push(`select 'storage.objects(lk-fotos)', count(*)::int, md5(coalesce(string_agg(o.name || ':' || coalesce((to_jsonb(o) -> 'metadata')::text, ''), '|' order by o.name), '')) from storage.objects o where o.bucket_id = 'lk-fotos'`)
  partes.push(`select 'funciones lk_*', count(*)::int, md5(coalesce(string_agg(pg_get_functiondef(p.oid) || coalesce(p.proacl::text, ''), '|' order by p.oid::regprocedure::text), '')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lk\\_%'`)
  partes.push(`select 'triggers lk_*', count(*)::int, md5(coalesce(string_agg(tg.tgname || pg_get_triggerdef(tg.oid), '|' order by tg.tgname, tg.tgrelid::regclass::text), '')) from pg_trigger tg join pg_class c on c.oid = tg.tgrelid where not tg.tgisinternal and c.relnamespace = 'public'::regnamespace and c.relname like 'lk\\_%'`)
  partes.push(`select 'políticas lk_* (storage)', count(*)::int, md5(coalesce(string_agg(policyname || coalesce(qual, '') || coalesce(with_check, ''), '|' order by policyname), '')) from pg_policies where schemaname = 'storage' and policyname like 'lk\\_%'`)
  partes.push(`select 'columnas lk_*', count(*)::int, md5(coalesce(string_agg(table_name || '.' || column_name || ':' || data_type, '|' order by table_name, column_name), '')) from information_schema.columns where table_schema = 'public' and table_name like 'lk\\_%'`)
  const f = await fila1(`select json_agg(x) as h from (${partes.join('\nunion all\n')}) x`, { soloLectura: true })
  return Object.fromEntries((f.h ?? []).map(x => [x.t, { n: x.n, h: x.h }]))
}
export function compararHuellas(a, b) {
  const dif = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) dif.push(`${k}: antes ${a[k]?.n ?? '—'} filas, después ${b[k]?.n ?? '—'}${a[k]?.n === b[k]?.n ? ' (mismo número, contenido distinto)' : ''}`)
  return dif
}

/** Convierte scripts/espacios/prueba.sql (psql) en SQL plano para la API: mete la migración en lugar de `\i :migracion`,
 *  cambia \set por su valor, \gset por variables de sesión (set_config 'prueba.*') y quita \echo. */
export function sqlPlano(prueba = readFileSync(new URL('./prueba.sql', import.meta.url), 'utf8'),
  migracion = readFileSync(new URL('../../supabase/migrations/20261024000000_lk_espacios.sql', import.meta.url), 'utf8')) {
  const vars = {}, gset = new Set(), out = [
    `create or replace function pg_temp.v(k text) returns text language sql stable as $v$ select current_setting('prueba.' || k) $v$;`,
    `create or replace function pg_temp.fijar(k text, val text) returns void language sql as $v$ select set_config('prueba.' || k, val, false) $v$;`]
  const sustituir = l => l.replace(/:'(\w+)'|:(\w+)\b/g, (m, q, s) => {
    const k = q ?? s
    if (gset.has(k)) return k === 'cid' ? `pg_temp.v('cid')::uuid` : `pg_temp.v('${k}')`
    if (q && k in vars) throw new Error(`:'${k}' con \\set no está soportado`)
    if (s && k in vars) return vars[k]
    return m })
  for (const l of prueba.split('\n')) {
    let m
    if (/^\\set ON_ERROR_STOP/.test(l) || /^\\echo/.test(l)) continue
    if ((m = l.match(/^\\set (\w+) '(.*)'$/))) { vars[m[1]] = m[2].replace(/''/g, "'"); continue }
    if (/^\\i :migracion$/.test(l)) { out.push(migracion); continue }
    if (l.startsWith('\\')) throw new Error(`comando psql no soportado: ${l}`)
    if ((m = l.match(/^select (.*) as (\w+) \\gset$/))) { const s = sustituir(m[1]); gset.add(m[2]); out.push(`select pg_temp.fijar('${m[2]}', (${s})::text);`); continue }
    out.push(sustituir(l))
  }
  const sql = out.join('\n')
  if (/:'\w+'/.test(sql.replace(/\$\$[\s\S]*?\$\$/g, ''))) throw new Error('quedó una variable de psql sin cambiar')
  return sql
}
