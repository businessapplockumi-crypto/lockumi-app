// Corre scripts/espacios/prueba.sql (convertido a SQL plano; aplica la migración dos veces dentro de la prueba) contra el
// proyecto de PRUEBA sddgjnuvxzkrhhuczuly por la Management API, en UNA consulta `BEGIN; … ROLLBACK;`: no deja nada.
// Antes: (1) sonda que comprueba que la API respeta BEGIN/ROLLBACK, también cuando hay un error; (2) huella de las tablas
// lk_*, de storage.objects (lk-fotos) y de las definiciones lk_*. Después: la misma huella tiene que ser igual.
// Uso: SUPABASE_ACCESS_TOKEN=… CONFIRMO_PROYECTO=sddgjnuvxzkrhhuczuly node scripts/espacios/probar-sql-remoto.mjs
// Córrelo cuando nadie use la app de prueba (si alguien crea un alquiler en medio, la huella cambia y el script lo dice).
import { randomBytes } from 'node:crypto'
import { exigir, consulta, tablasLk, huella, compararHuellas, sqlPlano } from './api.mjs'
exigir()
const sonda = `lk__sonda_${randomBytes(4).toString('hex')}`
const existe = async () => (await consulta(`select to_regclass('public.${sonda}') is not null as e`, { soloLectura: true }))[0].e
try {
  await consulta(`BEGIN; create table public.${sonda}(x int); ROLLBACK;`)
  if (await existe()) { await consulta(`drop table if exists public.${sonda}`); throw new Error('La API NO respetó ROLLBACK (se borró la tabla de sonda). No se corre la prueba.') }
  let fallo = false; try { await consulta(`BEGIN; create table public.${sonda}(x int); select 1/0; ROLLBACK;`) } catch { fallo = true }
  if (!fallo) throw new Error('La API no informó el error de la sonda. No se corre la prueba.')
  if (await existe()) { await consulta(`drop table if exists public.${sonda}`); throw new Error('Con un error, la API dejó la transacción aplicada (se borró la sonda). No se corre la prueba.') }
  console.log('✓ sonda: la API respeta BEGIN … ROLLBACK, también con un error, y la conexión siguiente queda limpia')
} catch (e) { console.error(e.message); process.exit(1) }

const tablas = await tablasLk(), antes = await huella(tablas)
console.log(`Antes: ${Object.entries(antes).map(([k, v]) => `${k}=${v.n}`).join(', ')}`)
const ya = (await consulta(`select to_regprocedure('public.lk_entrada_fija(uuid)') is not null as a`, { soloLectura: true }))[0].a
console.log(ya ? 'La migración de espacios YA está aplicada: la prueba la vuelve a aplicar dentro de la transacción (es idempotente).' : 'La migración de espacios NO está aplicada: la prueba la aplica dentro de la transacción y se deshace al final.')
let ok = true
try {
  const r = await consulta(`BEGIN;\n${sqlPlano()}\nselect 'SQL TODO OK' as resultado;\nROLLBACK;`)
  console.log('✓ prueba.sql: todas las revisiones pasaron', Array.isArray(r) && r[0]?.resultado ? `(${r[0].resultado})` : '')
} catch (e) { ok = false; console.error('✗ prueba.sql falló:', e.message) }
const despues = await huella(await tablasLk()), dif = compararHuellas(antes, despues)
if (dif.length) { ok = false; console.error('✗ ¡Quedó algo distinto!', dif.join('; ')) } else console.log('✓ después: mismas filas y mismas definiciones que antes (no quedó nada)')
console.log(ok ? 'TODO OK' : 'HAY FALLAS'); process.exit(ok ? 0 : 1)
