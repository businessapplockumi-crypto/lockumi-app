// Respaldo de SOLO las tablas lk_* (esquema + filas en JSON), de las filas de storage.objects del bucket lk-fotos (solo
// metadatos, no los archivos) y de las definiciones lk_* (funciones con permisos, triggers, políticas de storage), por la
// Management API en modo solo lectura. No consulta ninguna otra tabla (ni waitlist*). Nunca imprime el token.
// Uso: SUPABASE_ACCESS_TOKEN=… CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly node scripts/espacios/exportar-lk.mjs
// Sale en /workspace/lockumi/respaldos/<fecha>/ (fuera del repo; RESPALDOS=… para otra carpeta). No se sube nunca.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exigir, consulta, tablasLk, huella, REF } from './api.mjs'

const uno = async q => { const f = await consulta(q, { soloLectura: true }); return (Array.isArray(f) ? f[0] : f).j ?? [] }
export async function exportar() {
  const raiz = resolve(process.env.RESPALDOS || '/workspace/lockumi/respaldos')
  const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  if (raiz === repo || raiz.startsWith(repo + '/')) throw new Error('El respaldo no puede quedar dentro del repo.')
  const dir = `${raiz}/${new Date().toISOString().replace(/[:.]/g, '-')}`
  mkdirSync(`${dir}/filas`, { recursive: true, mode: 0o700 }); mkdirSync(`${dir}/esquema`, { recursive: true, mode: 0o700 })
  const tablas = await tablasLk()
  const g = (n, d) => writeFileSync(`${dir}/${n}`, JSON.stringify(d, null, 1), { mode: 0o600 })
  g('tablas.json', tablas)
  for (const t of tablas) {
    g(`esquema/${t}.json`, {
      columnas: await uno(`select json_agg(c order by ordinal_position) j from information_schema.columns c where table_schema = 'public' and table_name = '${t}'`),
      restricciones: await uno(`select json_agg(json_build_object('nombre', conname, 'def', pg_get_constraintdef(oid)) order by conname) j from pg_constraint where conrelid = 'public."${t}"'::regclass`),
      indices: await uno(`select json_agg(json_build_object('nombre', indexname, 'def', indexdef) order by indexname) j from pg_indexes where schemaname = 'public' and tablename = '${t}'`),
      politicas: await uno(`select json_agg(p order by policyname) j from pg_policies p where schemaname = 'public' and tablename = '${t}'`),
      triggers: await uno(`select json_agg(json_build_object('nombre', tgname, 'def', pg_get_triggerdef(oid)) order by tgname) j from pg_trigger where tgrelid = 'public."${t}"'::regclass and not tgisinternal`),
      rls: (await consulta(`select relrowsecurity from pg_class where oid = 'public."${t}"'::regclass`, { soloLectura: true }))[0]?.relrowsecurity })
    g(`filas/${t}.json`, await uno(`select coalesce(json_agg(r), '[]'::json) j from public."${t}" r`))
  }
  g('storage-objects-lk-fotos.json', await uno(`select coalesce(json_agg(o order by o.name), '[]'::json) j from storage.objects o where o.bucket_id = 'lk-fotos'`))
  g('politicas-storage-lk.json', await uno(`select coalesce(json_agg(p order by policyname), '[]'::json) j from pg_policies p where schemaname = 'storage' and policyname like 'lk\\_%'`))
  g('funciones-lk.json', await uno(`select coalesce(json_agg(json_build_object('firma', p.oid::regprocedure::text, 'resultado', pg_get_function_result(p.oid), 'def', pg_get_functiondef(p.oid),
      'permisos', (select coalesce(json_agg(json_build_object('a', case when a.grantee = 0 then 'public' else pg_get_userbyid(a.grantee) end, 'p', a.privilege_type)), '[]'::json)
                   from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a)) order by p.oid::regprocedure::text), '[]'::json) j
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lk\\_%'`))
  const h = await huella(tablas)
  g('manifiesto.json', { proyecto: REF, fecha: new Date().toISOString(), tablas, huella: h })
  console.log(`Respaldo en ${dir}`); for (const [k, v] of Object.entries(h)) console.log(`  ${k}: ${v.n}`)
  return dir
}
if (import.meta.url === `file://${process.argv[1]}`) { exigir(); await exportar().catch(e => { console.error(e.message); process.exit(1) }) }
