// Aplica supabase/migrations/*.sql al proyecto sddgjnuvxzkrhhuczuly con la Management API, activa el inicio de sesión
// anónimo (necesario para auth.uid() en cada aparato) y verifica. Nunca imprime secretos.
// Uso: SUPABASE_ACCESS_TOKEN=... node scripts/aplicar-supabase-e2e.mjs [--mediador <uuid> <nombre>]
// No toca las tablas waitlist* de lockumi.com: todo lleva prefijo lk_.
import { readFileSync, readdirSync } from 'node:fs'
const REF = 'sddgjnuvxzkrhhuczuly', TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('Falta SUPABASE_ACCESS_TOKEN.'); process.exit(2) }
const api = async (ruta, metodo = 'GET', cuerpo) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) })
  const t = await r.text(); if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${t.slice(0, 300)}`); try { return JSON.parse(t) } catch { return t }
}
const sql = q => api('/database/query', 'POST', { query: q })
const dir = new URL('../supabase/migrations/', import.meta.url)
for (const f of readdirSync(dir).sort()) { console.log('Aplicando', f); await sql(readFileSync(new URL(f, dir), 'utf8')) }
const auth = await api('/config/auth')
if (!auth.external_anonymous_users_enabled) { await api('/config/auth', 'PATCH', { external_anonymous_users_enabled: true }); console.log('Inicio de sesión anónimo: activado') }
else console.log('Inicio de sesión anónimo: ya estaba activo')
const i = process.argv.indexOf('--mediador'); if (i > 0) await sql(`insert into public.lk_mediadores values ('${process.argv[i + 1]}', $$${process.argv[i + 2] ?? 'Mediación'}$$) on conflict do nothing`)
console.table(await sql(`select c.relname tabla, c.relrowsecurity rls, (select count(*) from pg_policies p where p.tablename = c.relname)::int politicas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname like 'lk\\_%' and c.relkind = 'r' order by 1`))
console.table(await sql(`select id, public, file_size_limit from storage.buckets where id = 'lk-fotos'`))
console.table(await sql(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'lk\\_%'`))
const claves = await api('/api-keys'); const pub = claves.find(k => k.name === 'anon' || k.type === 'publishable')
console.log('Clave pública para VITE_SUPABASE_ANON_KEY:', pub ? 'disponible (no se imprime; cópiala del panel o con --mostrar-clave-publica)' : 'no encontrada')
if (process.argv.includes('--mostrar-clave-publica') && pub) console.log(pub.api_key) // la clave anon/publishable es pública por diseño
