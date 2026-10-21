// Capturas de «Tus alquileres» con los 4 alquileres REALES de la red de prueba (perfil del navegador de real.mjs).
// Uso: PERFIL=<mismo perfil de real.mjs> G=<cuenta de prueba guardada> OUT=<prefijo de archivo> node capturar.mjs
// La tarjeta «Tu cuenta para el depósito» usa el gancho de desarrollo lockumi.billetera.prueba (solo en Vite dev) con la cuenta
// de prueba REAL que pagó los depósitos: dirección y saldo leídos de Horizon testnet.
import { chromium } from 'playwright'
const G = process.env.G
const OUT = process.env.OUT || 'tus-alquileres-preview-'
for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) {
  const movil = w < 600
  const ctx = await chromium.launchPersistentContext(process.env.PERFIL || 'perfil-tus-alquileres', { ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'],
    viewport: { width: w, height: movil ? 844 : 800 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  await ctx.addInitScript(g => { localStorage.setItem('lockumi.billetera.prueba', g) }, G)
  const p = ctx.pages()[0] ?? await ctx.newPage(); p.on('pageerror', e => console.log('pageerror', e.message))
  await p.goto('http://localhost:5173/#/'); await p.waitForTimeout(800); await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(8000)
  const e = p.getByRole('button', { name: 'Entendido' }); if (await e.count()) { await e.first().click(); await p.waitForTimeout(500) }
  const revisar = () => p.evaluate(() => ({ ancho: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll('main *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + .5 || b.left < -.5) && !e.closest('.logo-escala') }).length,
    cortado: [...document.querySelectorAll('main *')].filter(e => !e.closest('.logo-escala') && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.className) }))
  console.log(n, JSON.stringify(await revisar()), await p.locator('.ta-tar').count(), 'tarjetas')
  await p.screenshot({ path: OUT + n + '.png', fullPage: true })
  await p.locator('.billetera__detalle summary').click(); await p.waitForTimeout(2500)
  console.log(n + ' detalles', JSON.stringify(await revisar()), (await p.locator('.billetera').innerText()).replace(/\n+/g, ' | '))
  await p.screenshot({ path: OUT + n + '-detalles.png', fullPage: true })
  if (n === 'movil') console.log((await p.locator('main').innerText()).replace(/\n+/g, ' | '))
  await ctx.close()
}
