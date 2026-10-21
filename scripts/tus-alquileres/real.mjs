// Crea UN alquiler real en la red de prueba con el flujo de la app (localhost:5173 → /api/solo de la vista previa) y lo lleva
// hasta el estado pedido. Uso: node real.mjs "<lugar>" <monto> <fotos_entrada|en_curso|reclamo|cerrado>
// Requiere: Vite en localhost:5173 con VITE_TRUSTLESS=1 (scripts/saldo0-login/vite.repro.config.ts) y /api/solo a una vista previa
// con scripts/saldo0-login/proxy-api.mjs. Sesión simulada por correo en localStorage (sin login de Cavos). PERFIL = carpeta del perfil
// del navegador (guarda los alquileres entre corridas). ID=<id> sigue un alquiler ya creado. Ver docs/testnet-e2e.md §9.
import { chromium } from 'playwright'
const [lugar, monto, objetivo] = process.argv.slice(2)
const ctx = await chromium.launchPersistentContext(process.env.PERFIL || 'perfil-tus-alquileres', { ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'],
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
await ctx.addInitScript(() => { localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'kattmoresol@gmail.com', nombre: 'Katherine', metodo: 'correo' })) })
const p = ctx.pages()[0] ?? await ctx.newPage()
p.on('response', async r => { if (r.url().includes('/api/solo')) { const a = (r.request().postData() || '').match(/"accion":"([^"]+)"/)?.[1]; console.log('  api', a, r.status(), (await r.text().catch(() => '')).slice(0, 160)) } })
p.on('pageerror', e => console.log('  pageerror', e.message))
const log = (...x) => console.log(new Date().toLocaleTimeString('es-CR'), ...x)
const B = 'http://localhost:5173/'
await p.goto(B); await p.waitForTimeout(800)
const entendido = async () => { const e = p.getByRole('button', { name: 'Entendido' }); if (await e.count()) await e.first().click().catch(() => {}) }
await entendido()
let id = process.env.ID
if (!id) {
await p.goto(B + '#/crear'); await p.waitForTimeout(1200); await entendido()
const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
await p.fill('#f-direccion', lugar); await p.fill('#f-monto', monto); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(190))
await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.paso-cab').waitFor({ timeout: 20000 })
id = (await p.evaluate(() => location.hash)).split('/').pop(); log('creado', id)
} else { await p.goto(B + '#/alquiler/' + id); await p.waitForTimeout(1500) }
const estado = () => p.evaluate(i => { const k = Object.keys(localStorage).find(x => x.startsWith('lockumi.alquileres')); return (JSON.parse(localStorage.getItem(k) || '[]').find(a => a.id === i) || {}).estado }, id)
const clic = async (loc, t = 2000) => { if (await loc.count() && await loc.first().isVisible()) { await loc.first().click(); await p.waitForTimeout(t); return true } return false }
const ORDEN = ['firmas', 'pendiente_pago', 'fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion', 'cerrado']
let ultimo = '', vueltas = 0
while (true) {
  const e = await estado(); if (e !== ultimo) { log('estado:', e); ultimo = e; vueltas = 0 }
  if (e === objetivo) break
  if (++vueltas > 400) { log('ATASCADO en', e); await p.screenshot({ path: 'atascado.png', fullPage: true }); break }
  await entendido()
  const err = p.locator('.error[role="alert"]'); if (await err.count() && await err.first().isVisible()) log('aviso:', (await err.first().innerText()).slice(0, 200))
  if (e === 'firmas') { const c = p.getByLabel('Leí el contrato y estoy de acuerdo.'); if (await c.count() && await c.isVisible() && !(await c.isChecked())) await c.check(); await clic(p.getByRole('button', { name: 'Firma como inquilino' }), 3000) }
  else if (e === 'pendiente_pago') { const b = p.getByRole('button', { name: /^Pagar/ }); if (await b.count() && await b.isEnabled()) { log('Pagar'); await b.click() } await p.waitForTimeout(5000) }
  else if (e === 'fotos_entrada' || e === 'salida') {
    const cas = p.getByLabel(/Las fotos muestran cómo/)
    if (await cas.count() && await cas.isVisible()) { if (await cas.isEnabled() && !(await cas.isChecked())) await cas.check(); await clic(p.getByRole('button', { name: 'Confirmar como inquilino' }), 4000); continue }
    const cuarto = p.locator('.cuarto')
    if (await cuarto.count()) {
      if (await p.getByText('Toma al menos una foto de este espacio.').count()) await clic(p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }), 800)
      const bien = p.locator('.seg button:has-text("Bien")[aria-pressed="false"]'); while (await bien.count()) { await bien.first().click(); await p.waitForTimeout(250) }
      await clic(p.getByRole('button', { name: /^(Siguiente espacio|Revisar y confirmar)$/ }), 800)
    } else await p.waitForTimeout(2000)
  }
  else if (e === 'en_curso') await clic(p.getByRole('button', { name: 'Empezar fotos de salida' }))
  else if (e === 'ventana_reclamo') {
    if (objetivo === 'reclamo' || objetivo === 'mediacion') {
      if (!(await clic(p.getByRole('button', { name: 'Hacer un reclamo como dueño de prueba' }), 800))) {
        const env = p.getByRole('button', { name: /Enviar reclamo/ })
        if (await env.count() && await env.isEnabled()) {
          await p.getByLabel(/¿Cuánto reclamas/).fill('1'); await p.getByLabel('¿Qué pasó?').fill('Mancha en la pared de la sala que no estaba al entrar')
          if (!(await p.locator('.pila img').count())) await clic(p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }), 500)
          log('Enviar reclamo'); await env.click()
        }
        await p.waitForTimeout(5000)
      }
    } else { if (!(await clic(p.getByRole('button', { name: 'Solo red de prueba: adelantar el plazo' }), 3000))) await p.waitForTimeout(5000) }
  }
  else if (e === 'reclamo' && objetivo === 'mediacion') await clic(p.getByRole('button', { name: 'No estoy de acuerdo' }), 3000)
  else await p.waitForTimeout(3000)
  if (ORDEN.indexOf(e) > ORDEN.indexOf(objetivo)) { log('se pasó del objetivo'); break }
}
const a = await p.evaluate(i => { const k = Object.keys(localStorage).find(x => x.startsWith('lockumi.alquileres')); return JSON.parse(localStorage.getItem(k) || '[]').find(a => a.id === i) }, id)
console.log('RESULTADO', JSON.stringify({ id, estado: a.estado, direccion: a.direccion, monto: a.monto, red: a.red, g: await p.evaluate(() => localStorage.getItem('lockumi.testnet.cuenta-prueba.g')) }))
await ctx.close()
