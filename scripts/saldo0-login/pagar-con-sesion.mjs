// Reproduce «Pagar» con USDC de prueba de Lockumi y SESIÓN de Cavos (Google) simulada como la deja el login real:
//   lockumi.usuario (metodo google) + cavos-kit:identity:<APP_ID> (identidad pública que guarda @cavos/kit) en localStorage,
//   app compilada con VITE_CAVOS_APP_ID (modoReal). El perfil del navegador persiste entre corridas (misma cuenta de prueba).
// Uso: VITE_CAVOS_APP_ID=… BASE=http://localhost:5173/ PERFIL=dir OUT=ruta.png [ANCHO=390|1280] [SESION=0] [NUEVA=1] [MONTO=2] [CHROME=…] node pagar-con-sesion.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
const base = process.env.BASE || 'http://localhost:5173/', MONTO = process.env.MONTO || '2', ANCHO = Number(process.env.ANCHO || 390)
const APP_ID = (process.env.VITE_CAVOS_APP_ID || '').trim()   // App ID público de Cavos (el mismo con el que corre Vite)
const movil = ANCHO < 600
const ctx = await chromium.launchPersistentContext(process.env.PERFIL, { ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'],
  viewport: { width: ANCHO, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
const sesion = process.env.SESION !== '0'
await ctx.addInitScript(([appId, sesion]) => {
  const u = sesion ? { email: 'kattmoresol@gmail.com', nombre: 'Katherine', metodo: 'google' } : { email: 'katherine@ejemplo.cr', nombre: 'Katherine', metodo: 'correo' }
  localStorage.setItem('lockumi.usuario', JSON.stringify(u))
  if (sesion) localStorage.setItem('cavos-kit:identity:' + appId, JSON.stringify({ userId: 'google-oauth2|simulado-katherine', email: u.email, name: 'Katherine' }))
  else localStorage.removeItem('cavos-kit:identity:' + appId)
}, [APP_ID, sesion])
const p = ctx.pages()[0] ?? await ctx.newPage()
const api = []
p.on('response', async r => { if (r.url().includes('/api/solo')) { const b = await r.text().catch(() => ''); const a = (r.request().postData() || '').match(/"accion":"([^"]+)"/)?.[1]; api.push([a, r.status()]); console.log('  api', a, r.status(), b.slice(0, 200)) } })
p.on('pageerror', e => console.log('  pageerror', e.message))
await p.goto(base); await p.waitForTimeout(800)
if (process.env.NUEVA === '1') { await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('lockumi.testnet.') || k.startsWith('lockumi.alquileres')) localStorage.removeItem(k) }) }
const antes = await p.evaluate(() => ({ g: localStorage.getItem('lockumi.testnet.cuenta-prueba.g'), token: !!localStorage.getItem('lockumi.testnet.cuenta-prueba') }))
console.log('cuenta de prueba guardada antes:', antes.g ?? '(ninguna)', antes.token ? '(con identificador)' : '')
if (antes.g) { const h = await (await fetch('https://horizon-testnet.stellar.org/accounts/' + antes.g)).json(); console.log('  USDC antes en Horizon:', h.balances?.find(b => b.asset_code === 'USDC')?.balance ?? '(sin cuenta/trustline)') }
await p.goto(base + '#/crear'); await p.waitForTimeout(1200)
if (await p.getByRole('button', { name: 'Entendido' }).count()) await p.getByRole('button', { name: 'Entendido' }).click()
const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
await p.fill('#f-direccion', 'Apartamento en Escazú (prueba saldo 0)'); await p.fill('#f-monto', MONTO); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(190))
console.log('tarjeta «USDC de prueba de Lockumi» elegida:', await p.locator('.na-lockumi').getAttribute('aria-checked'))
await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.paso-cab').waitFor({ timeout: 20000 })
await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
const pagar = p.getByRole('button', { name: /^Pagar/ }); await pagar.waitFor({ timeout: 30000 })
console.log('botón:', await pagar.innerText()); await pagar.click()
const fin = await Promise.race([
  p.getByText('Paso 4 de 8').first().waitFor({ timeout: 240000 }).then(() => 'ok'),
  p.locator('.error[role="alert"]').first().waitFor({ timeout: 240000 }).then(() => 'error'),
])
await p.waitForTimeout(800)
const err = fin === 'error' ? await p.locator('.error[role="alert"]').first().innerText() : ''
if (fin === 'error') { await p.locator('.error[role="alert"]').first().scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -120)) }
else { await p.evaluate(() => scrollTo(0, 0)) }
await p.waitForTimeout(400)
await p.screenshot({ path: process.env.OUT, fullPage: !movil || fin === 'ok' })
const datos = await p.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('lockumi.alquileres')); const a = JSON.parse(localStorage.getItem(k) || '[]')[0]; return { estado: a?.estado, red: a?.red, g: localStorage.getItem('lockumi.testnet.cuenta-prueba.g') } })
console.log('RESULTADO:', fin, err ? '· ' + err : '')
console.log('llamadas API:', api.map(x => x.join(' ')).join(' → '))
console.log('alquiler:', JSON.stringify(datos))
await ctx.close()
