// Deshace la migración de espacios con un respaldo de exportar-lk.mjs tomado ANTES de aplicarla: quita los triggers
// lk_proteger_entrada, la política lk_fotos_borrar, las funciones que no estaban y la columna cuarto_id (si no estaba), y
// vuelve a crear las funciones lk_* del respaldo con sus permisos. Todo en una transacción.
// También quita los ids que la migración agregó dentro de las listas (jsonb). No devuelve las fotos ni los archivos que se
// hayan quitado después de aplicarla (esos se borran de verdad): si hace falta, sus filas están en el respaldo (filas/*.json).
// Sin --revertir-de-verdad solo escribe el SQL en la carpeta del respaldo (revertir.sql) y no llama a la API.
// Uso: SUPABASE_ACCESS_TOKEN=… CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly node scripts/espacios/revertir-migracion.mjs --respaldo <carpeta> [--revertir-de-verdad]
import { readFileSync, writeFileSync } from 'node:fs'
import { exigir, consulta } from './api.mjs'
const i = process.argv.indexOf('--respaldo'), dir = i > 0 && process.argv[i + 1]
if (!dir) { console.error('Falta --respaldo <carpeta> (la del respaldo tomado antes de aplicar la migración).'); process.exit(2) }
const funciones = JSON.parse(readFileSync(`${dir}/funciones-lk.json`, 'utf8'))
const cols = JSON.parse(readFileSync(`${dir}/esquema/lk_fotos.json`, 'utf8')).columnas.map(c => c.column_name)
if (funciones.some(f => f.firma.startsWith('lk_entrada_fija('))) { console.error('Ese respaldo ya tiene la migración aplicada; usa uno de antes.'); process.exit(2) }
const priv = { EXECUTE: 'execute' }, rol = a => a === 'public' ? 'public' : `"${a.replace(/"/g, '""')}"`
const sql = ['BEGIN;',
  ...['lk_actas', 'lk_fotos', 'lk_firmas'].map(t => `drop trigger if exists lk_proteger_entrada on public.${t};`),
  'drop policy if exists lk_fotos_borrar on storage.objects;',
  `do $r$ declare f text; begin for f in select p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'lk\\_%'
     and p.oid::regprocedure::text <> all (array[${funciones.map(f => `'${f.firma.replace(/'/g, "''")}'`).join(', ') || "''"}]::text[]) loop execute 'drop function public.' || f; end loop; end $r$;`,
  // Se recrean con CREATE OR REPLACE (sin borrar: las políticas dependen de algunas). Solo se borra antes la que cambió de
  // tipo de retorno (lk_quitar_cuarto: void → text[]). Después, los permisos del respaldo.
  ...funciones.map(f => `do $r$ begin if exists (select 1 from pg_proc where oid = to_regprocedure('public.${f.firma}') and pg_get_function_result(oid) <> '${f.resultado.replace(/'/g, "''")}') then drop function public.${f.firma}; end if; end $r$;\n${f.def};\n` +
    `do $r$ declare r text; begin execute 'revoke all on function public.${f.firma.replace(/'/g, "''")} from public'; for r in select rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role') loop execute format('revoke all on function public.${f.firma.replace(/'/g, "''")} from %I', r); end loop; end $r$;\n` +
    f.permisos.filter(p => priv[p.p]).map(p => `grant ${priv[p.p]} on function public.${f.firma} to ${rol(p.a)};`).join('\n')),
  ...(cols.includes('cuarto_id') ? [] : ['alter table public.lk_fotos drop column if exists cuarto_id;']),
  // Los ids que la migración agregó a cada espacio dentro de las listas (jsonb) se quitan para que quede como antes.
  `update public.lk_actas set cuartos = coalesce((select jsonb_agg(c - 'id' order by o) from jsonb_array_elements(cuartos) with ordinality x(c, o)), '[]'::jsonb) where exists (select 1 from jsonb_array_elements(cuartos) c where c ? 'id');`,
  'COMMIT;'].join('\n')
writeFileSync(`${dir}/revertir.sql`, sql, { mode: 0o600 })
if (!process.argv.includes('--revertir-de-verdad')) { console.log(`SQL listo en ${dir}/revertir.sql (no se llamó a la API). Para correrlo: --revertir-de-verdad (con el OK de Katherine).`); process.exit(0) }
exigir()
await consulta(sql)
const [v] = await consulta(`select to_regprocedure('public.lk_entrada_fija(uuid)') is null as f, (select count(*)::int from pg_trigger where tgname = 'lk_proteger_entrada') = 0 as t,
  (select count(*)::int from pg_policies where schemaname = 'storage' and policyname = 'lk_fotos_borrar') = 0 as p`, { soloLectura: true })
console.log(v.f && v.t && v.p ? '✓ Migración revertida.' : `✗ No quedó como antes: ${JSON.stringify(v)}`); process.exit(v.f && v.t && v.p ? 0 : 1)
