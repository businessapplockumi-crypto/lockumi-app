// Condición 1 de Legal: el bundle del cliente (dist/) no contiene LOCKUMI_DEMO_SEED (nombre ni valor), la API key, la secreta
// de la plataforma ni ninguna llave secreta de Stellar (S… de 56 caracteres). No imprime valores, solo nombres y conteos.
// Uso: npm run build && node scripts/revisar-bundle.mjs   (con las variables del servidor en el entorno, si se quieren buscar sus valores)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const archivos = []; const rec = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? rec(p) : archivos.push(p) } }; rec('dist')
const buscar = { 'nombre LOCKUMI_DEMO_SEED': 'LOCKUMI_DEMO_SEED', 'nombre LOCKUMI_TW_PLATAFORMA_SECRET': 'LOCKUMI_TW_PLATAFORMA_SECRET', 'nombre TRUSTLESS_WORK_API_KEY': 'TRUSTLESS_WORK_API_KEY' }
for (const k of ['LOCKUMI_DEMO_SEED', 'LOCKUMI_TW_PLATAFORMA_SECRET', 'TRUSTLESS_WORK_API_KEY']) if (process.env[k]) buscar['valor de ' + k] = process.env[k]
let fallas = 0, s = 0
for (const f of archivos) {
  const t = readFileSync(f, 'latin1'); s += (t.match(/(?<![A-Z2-7])S[A-Z2-7]{55}(?![A-Z2-7])/g) ?? []).length
  for (const [n, v] of Object.entries(buscar)) if (t.includes(v)) { console.log('✘', n, 'en', f); fallas++ }
}
console.log(`${archivos.length} archivos en dist/ · llaves S… encontradas: ${s} · valores buscados: ${Object.keys(buscar).length}`)
if (s || fallas) process.exit(1); console.log('✔ el bundle no contiene secretos')
