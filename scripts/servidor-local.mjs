// Servidor compartido LOCAL para probar las invitaciones con dos personas SIN Supabase (Parte 4).
// Corre las migraciones reales (supabase/migrations/*.sql) en PGlite y responde lo mínimo de Supabase que usa la app:
//   POST /auth/v1/signup (sesión anónima)  ·  GET /auth/v1/user  ·  POST /rest/v1/rpc/<función>  ·  GET /rest/v1/<tabla>?select=…
// Cada consulta corre con el rol `authenticated` y auth.uid() de la sesión, así que RLS y los permisos son los de verdad.
// También sirve la app compilada (dist-local) y /api/invitacion-correo (la misma lógica de api/_lib/invitacion.ts).
// Sin RESEND_API_KEY, «Enviar por correo» responde el mensaje claro de siempre. Con RESEND_FALSO=1 el correo no sale: se anota en
// /tmp/lockumi-correos.jsonl para revisarlo. Realtime y fotos no están: la app se actualiza con su sondeo cada 8 s.
// Uso:
//   VITE_SUPABASE_URL=http://localhost:54329 VITE_SUPABASE_ANON_KEY=local npx vite build --outDir dist-local
//   node scripts/servidor-local.mjs            # → http://localhost:54329
import { createServer } from 'node:http'
import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { build } from 'rolldown'

const RAIZ = new URL('..', import.meta.url).pathname, PUERTO = Number(process.env.PUERTO || 54329), DIST = join(RAIZ, process.env.DIST || 'dist-local')
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
const db = new PGlite(); await db.exec(STUB)
for (const f of readdirSync(join(RAIZ, 'supabase/migrations')).sort()) await db.exec(readFileSync(join(RAIZ, 'supabase/migrations', f), 'utf8'))

// La ruta de correo real, compilada al vuelo (TypeScript → JS) para no duplicar la lógica.
const salida = join(RAIZ, 'node_modules/.tmp/lockumi-invitacion-lib.mjs') // dentro del proyecto, para que encuentre sus dependencias
await build({ input: join(RAIZ, 'api/_lib/invitacion.ts'), output: { file: salida, format: 'esm' }, external: [/^@stellar\//], logLevel: 'silent' })
const { enviarInvitacion } = await import(salida + '?' + Date.now())

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = sub => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.local`
const sub = req => { try { return JSON.parse(Buffer.from((req.headers.authorization || '').split(' ')[1].split('.')[1], 'base64url')).sub } catch { return null } }
const usuario = id => ({ id, aud: 'authenticated', role: 'authenticated', is_anonymous: true, email: '', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() })
let cola = Promise.resolve()
async function como(uid, sql, params = []) {
  const corre = cola.then(async () => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${/^[0-9a-f-]{36}$/.test(uid ?? '') ? uid : ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
    try { return (await db.query(sql, params)).rows } finally { await db.exec('reset role') }
  })
  cola = corre.catch(() => {}); return corre
}
const lit = v => '{' + v.map(x => x === null ? 'NULL' : '"' + String(x).replace(/[\\"]/g, m => '\\' + m) + '"').join(',') + '}'
async function rpc(uid, fn, args) {
  if (!/^lk_[a-z_]+$/.test(fn)) throw Object.assign(new Error('Función desconocida'), { code: '42883' })
  const { rows: [p] } = await db.query(`select p.proargnames n, array(select format_type(t, null) from unnest(p.proargtypes::oid[]) t) t, p.prorettype = 'void'::regtype v
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = $1`, [fn])
  if (!p) throw Object.assign(new Error('Función desconocida'), { code: '42883' })
  const pares = Object.entries(args ?? {}).filter(([k]) => p.n.includes(k))
  const lista = pares.map(([k], i) => `${k} => $${i + 1}::${p.t[p.n.indexOf(k)]}`).join(', ')
  const valores = pares.map(([, v]) => v === null || v === undefined ? null : Array.isArray(v) ? lit(v) : typeof v === 'object' ? JSON.stringify(v) : String(v))
  const r = await como(uid, p.v ? `select public.${fn}(${lista})` : `select to_jsonb(public.${fn}(${lista})) r`, valores)
  return p.v ? null : r[0]?.r ?? null
}
async function tabla(uid, t, q) {
  if (!/^lk_[a-z_]+$/.test(t)) throw new Error('Tabla desconocida')
  const col = c => { if (!/^[a-z_0-9]+$/.test(c)) throw new Error('Columna inválida: ' + c); return c }
  const cols = (q.get('select') || '*').split(',').map(c => c.trim()).filter(Boolean).map(c => c === '*' ? '*' : col(c)).join(', ')
  const donde = [], params = []
  for (const [k, v] of q) {
    if (['select', 'order', 'limit'].includes(k)) continue
    const m = v.match(/^(eq|in)\.(.*)$/); if (!m) continue
    if (m[1] === 'eq') { params.push(m[2]); donde.push(`${col(k)}::text = $${params.length}`) }
    else { params.push(lit(m[2].replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, '')))); donde.push(`${col(k)}::text = any($${params.length}::text[])`) }
  }
  const orden = (q.get('order') || '').split(',').filter(Boolean).map(o => { const [c, d] = o.split('.'); return `${col(c)} ${d === 'desc' ? 'desc' : 'asc'}` })
  return como(uid, `select ${cols} from public.${t}${donde.length ? ' where ' + donde.join(' and ') : ''}${orden.length ? ' order by ' + orden.join(', ') : ''}`, params)
}
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.mp4': 'video/mp4' }
const cuerpo = req => new Promise(ok => { let s = ''; req.on('data', d => { s += d }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}) } catch { ok({}) } }) })
const fetchLocal = async (url, init) => {
  if (String(url) === 'https://api.resend.com/emails') {
    if (process.env.RESEND_FALSO !== '1') return fetch(url, init)
    appendFileSync('/tmp/lockumi-correos.jsonl', init.body + '\n'); return new Response('{"id":"falso"}', { status: 200 })
  }
  return fetch(url, init)
}

createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost'), envia = (s, j) => { res.writeHead(s, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(j === undefined ? '' : JSON.stringify(j)) }
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' }); return res.end() }
  try {
    if (u.pathname === '/auth/v1/signup' && req.method === 'POST') { await cuerpo(req); const id = randomUUID(); return envia(200, { access_token: jwt(id), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: 'r-' + id, user: usuario(id) }) }
    if (u.pathname === '/auth/v1/user') { const id = sub(req); return id ? envia(200, usuario(id)) : envia(401, { message: 'JWT inválido' }) }
    if (u.pathname.startsWith('/auth/v1/')) return envia(200, {})
    let m = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)
    if (m) { const r = await rpc(sub(req), m[1], await cuerpo(req)); return envia(200, r) }
    m = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)
    if (m && req.method === 'GET') return envia(200, await tabla(sub(req), m[1], u.searchParams))
    if (u.pathname.startsWith('/storage/v1/')) return envia(200, [])
    if (u.pathname === '/api/invitacion-correo' && req.method === 'POST') {
      try {
        const env = { ...process.env, SUPABASE_URL: `http://localhost:${PUERTO}`, SUPABASE_ANON_KEY: 'local' }
        return envia(200, await enviarInvitacion(env, await cuerpo(req), (req.headers.authorization || '').replace(/^Bearer\s+/i, ''), fetchLocal))
      } catch (e) { return envia(e.estado ?? 500, { error: e.message }) }
    }
    const archivo = join(DIST, u.pathname === '/' ? 'index.html' : u.pathname)
    const f = archivo.startsWith(DIST) && existsSync(archivo) && !archivo.endsWith('/') ? archivo : join(DIST, 'index.html')
    res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f))
  } catch (e) { envia(400, { message: e.message, code: e.code }) }
}).listen(PUERTO, () => console.log(`Servidor local de Lockumi (PGlite) en http://localhost:${PUERTO}`))
