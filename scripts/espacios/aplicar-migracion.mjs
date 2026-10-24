// Aplica supabase/migrations/20261024000000_lk_espacios.sql al proyecto sddgjnuvxzkrhhuczuly por la Management API.
// ES UN CAMBIO DURADERO en la base real: necesita el OK de Katherine. Sin --aplicar-de-verdad no llama a la API (solo dice qué haría).
// Con el flag: respaldo (exportar-lk.mjs) → huella → `BEGIN; <migración>; COMMIT;` → revisa funciones, triggers y política.
// Uso: SUPABASE_ACCESS_TOKEN=… CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly node scripts/espacios/aplicar-migracion.mjs --aplicar-de-verdad
// Volver atrás: node scripts/espacios/revertir-migracion.mjs --respaldo <carpeta del respaldo> --revertir-de-verdad
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { exigir, consulta, REF } from './api.mjs'
import { exportar } from './exportar-lk.mjs'
const sql = readFileSync(new URL('../../supabase/migrations/20261024000000_lk_espacios.sql', import.meta.url), 'utf8')
if (!process.argv.includes('--aplicar-de-verdad')) {
  console.log(`Simulación (no se llamó a la API). Aplicaría 20261024000000_lk_espacios.sql (${sql.length} caracteres, sha256 ${createHash('sha256').update(sql).digest('hex').slice(0, 16)}…) a ${REF} en una transacción, después de un respaldo con exportar-lk.mjs.`)
  console.log('Es un cambio duradero en la base real: solo con el OK de Katherine. Para aplicarla, agrega --aplicar-de-verdad.')
  process.exit(0)
}
exigir()
const dir = await exportar()
await consulta(`BEGIN;\n${sql}\nCOMMIT;`)
const [v] = await consulta(`select to_regprocedure('public.lk_entrada_fija(uuid)') is not null as f, to_regprocedure('public.lk_agregar_cuarto(uuid,text,text[])') is not null as a,
  (select count(*)::int from pg_trigger where tgname = 'lk_proteger_entrada') as t, (select count(*)::int from pg_policies where schemaname = 'storage' and policyname = 'lk_fotos_borrar') as p,
  (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'lk_fotos' and column_name = 'cuarto_id') as c`, { soloLectura: true })
const bien = v.f && v.a && v.t === 3 && v.p === 1 && v.c === 1
console.log(bien ? '✓ Migración aplicada: funciones, 3 triggers lk_proteger_entrada, política lk_fotos_borrar y columna cuarto_id.' : `✗ Algo no quedó: ${JSON.stringify(v)}`)
console.log(`Respaldo previo: ${dir}. Para volver atrás: node scripts/espacios/revertir-migracion.mjs --respaldo ${dir} --revertir-de-verdad`)
process.exit(bien ? 0 : 1)
