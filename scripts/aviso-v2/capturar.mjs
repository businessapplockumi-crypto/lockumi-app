// Pruebas en el navegador del aviso v2 (toast): pila de 3, deslizar para cerrar, tocar para cerrar, tiempos 5/8 s con pausa,
// pila abierta con el ratón en escritorio, movimiento reducido y la acción del aviso de pago. Corre sobre la app construida (vite preview).
// Uso: VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173 &  luego  OUT=/tmp/ux/ node scripts/aviso-v2/capturar.mjs  (GIF=1 guarda cuadros)
import { chromium } from 'playwright'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
const B = process.env.BASE || 'http://localhost:4173/', OUT = process.env.OUT || 'aviso-v2-'
const DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey(), hash = () => randomBytes(32).toString('hex')
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
const TERRACOTA = 'rgb(219, 59, 0)', T1 = 'rgb(227, 242, 232)', T2 = 'rgb(111, 191, 138)', CAFE = 'rgb(61, 42, 34)'

async function contexto(w, { reducir = false } = {}) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica', ...(reducir && { reducedMotion: 'reduce' }) })
  await ctx.addInitScript(() => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'kattmoresol@gmail.com', nombre: 'Katherine', metodo: 'google' })))
  await ctx.route(u => !/^https?:\/\/localhost/.test(u.href) && /stellar|horizon|soroban|cavos/i.test(u.hostname), r => r.abort())
  const retenidas = {}, falla = new Set()
  const soltar = a => { const r = retenidas[a]; delete retenidas[a]; r?.() }
  await ctx.route('**/api/solo', async r => {
    const a = JSON.parse(r.request().postData() || '{}').accion
    if (a === 'desplegar' || a === 'fondear-prueba') await new Promise(res => { retenidas[a] = res })
    if (falla.has(a)) { falla.delete(a); return r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Trustless Work respondió 502' }) }) }
    const cuerpo = { dueno: { dueno: DUENO, trustlineTx: null }, 'cuenta-prueba': { inquilino: INQ, trustlineTx: null, compraTx: null },
      desplegar: { escrow: StrKey.encodeContract(randomBytes(32)), tx: hash(), trustlineTx: null, compraTx: null }, 'fondear-prueba': { tx: hash(), compraTx: null } }[a]
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{"error":"no disponible en la captura"}' })
  })
  const p = await ctx.newPage(); p.on('pageerror', e => { console.log('  pageerror', e.message); fallas.push('pageerror ' + e.message) })
  const esperaRetenida = async a => { for (let i = 0; i < 300 && !retenidas[a]; i++) await p.waitForTimeout(50); return !!retenidas[a] }
  return { ctx, p, soltar, falla, esperaRetenida }
}

/** Aviso v2 (pila): cierra con Esc todos los avisos hasta que se haya visto `hasta` (título) y no quede ninguno. */
const cerrarAviso = async (p, hasta) => {
  const vistos = new Set(); const fin = Date.now() + 15000
  while (Date.now() < fin) {
    const ts = await p.$$eval('.tostada:not(.tostada--sale) .tostada__t', hs => hs.map(h => h.textContent)); ts.forEach(t => vistos.add(t))
    if (ts.length) { await p.keyboard.press('Escape'); await p.waitForTimeout(260); continue }
    if (vistos.size && (!hasta || vistos.has(hasta))) return [...vistos]
    await p.waitForTimeout(100)
  }
  throw new Error('no llegó el aviso ' + (hasta ?? ''))
}
const frente = p => p.locator('.tostada[data-i="0"]:not(.tostada--sale)')
/** Medidas del aviso v2 y lo que no puede tapar (cabecera, franja, título, paso y botones principales a la vista). */
const medir = (loc) => loc.evaluate(e => { const r = e.getBoundingClientRect(), l = e.querySelector('.aviso-pop__logo svg')?.getBoundingClientRect()
  let fijo = null; for (let x = e; x; x = x.parentElement) if (getComputedStyle(x).position === 'fixed') { fijo = x.className.split(' ')[0]; break }
  const h2 = [...document.querySelectorAll('body *')].find(h => !h.children.length && h.textContent.trim() === 'Fotos de entrada')
  const tapa = [...document.querySelectorAll('.aviso-red, header.barra, #contenido h1, .paso-cab, #contenido .boton--primario')].filter(x => !x.closest('.tostadas')).map(x => ({ q: x.getBoundingClientRect(), n: x.className || x.tagName }))
    .filter(({ q }) => q.height && q.bottom > r.top + .5 && q.top < r.bottom - .5 && q.right > r.left && q.left < r.right).map(x => x.n)
  const b = e.querySelector('.tostada__accion')?.getBoundingClientRect(), s = getComputedStyle(e)
  return { x: r.left, y: r.top, w: r.width, h: r.height, fijo, botones: e.querySelectorAll('button').length, accionAlto: b?.height ?? 0, accion: e.querySelector('.tostada__accion')?.textContent, etiqueta: e.querySelector('.tostada__accion')?.getAttribute('aria-label'),
    vb: e.querySelector('.aviso-pop__logo svg')?.getAttribute('viewBox'), logo: l?.width ?? 0, logoDentro: !!l && l.left >= r.left && l.right <= r.right && l.top >= r.top && l.bottom <= r.bottom,
    linea: e.querySelector('.tostada__l')?.textContent, tapa, h2: h2?.getBoundingClientRect().top + scrollY, alto: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight,
    fondo: s.backgroundColor, blur: s.backdropFilter || s.webkitBackdropFilter, zona: e.closest('[role]:not([role="group"])')?.getAttribute('role'), vivo: e.closest('[role="status"]')?.getAttribute('aria-live') } })
/** Llega hasta el paso «Pagar». */
async function hastaPago(p) {
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.goto(B + '#/crear'); await p.waitForTimeout(800)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await cerrarAviso(p, 'Alquiler creado')
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
}
/** Textos del bloque de espera: alto en líneas (se mide cada texto con su line-height real). */
const lineas = p => p.evaluate(() => [...document.querySelectorAll('.envio .envio__boton > span:not(.envio__logo), .envio > .boton, .envio__nota, .envio__paso > span:nth-child(2), .error')].map(e => {
  // Alto del texto entre su line-height (el rango de texto da varias cajas por línea: no sirve contar cajas).
  const r = document.createRange(); r.selectNodeContents(e); const h = r.getBoundingClientRect().height, lh = parseFloat(getComputedStyle(e).lineHeight)
  return { t: e.textContent.trim(), n: Math.round(h / lh), nuevo: !e.classList.contains('error') }
}))
const fondoBoton = p => p.evaluate(() => { const b = document.querySelector('.envio .boton'); const s = getComputedStyle(b); return { bg: s.backgroundColor, color: s.color, busy: b.getAttribute('aria-busy'), td: s.transitionDuration, texto: b.textContent.trim() } })
const estado = p => p.evaluate(() => document.querySelector('.envio p.sr[role="status"]')?.textContent ?? '')

/** Hasta las firmas sin cerrar ningún aviso: quedan «Alquiler creado», «Firmaste el contrato» y «Contrato firmado por los dos» en la pila. */
async function hastaFirmas(p) {
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.goto(B + '#/crear'); await p.waitForTimeout(800)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.tostada').first().waitFor({ timeout: 15000 })
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  await p.waitForFunction(() => [...document.querySelectorAll('.tostada__t')].some(h => h.textContent === 'Contrato firmado por los dos'), null, { timeout: 15000 })
}
const pila = p => p.$$eval('.tostada:not(.tostada--sale)', ts => ts.map(t => { const r = t.getBoundingClientRect(); return { i: t.dataset.i, t: t.querySelector('.tostada__t').textContent, oculto: getComputedStyle(t.querySelector('.tostada__t')).visibility === 'hidden', top: r.top, bottom: r.bottom, h: r.height, x: r.left, w: r.width } }).sort((a, b) => a.i - b.i))
const cuenta = p => p.locator('.tostada:not(.tostada--sale)').count()
/** Un dedo por CDP: toca, mueve en `pasos` pasos durante `ms` y suelta. */
async function deslizar(p, cdp, desde, dx, dy, ms, pasos = 8) {
  const pt = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(desde.x, desde.y) })
  for (let i = 1; i <= pasos; i++) { await p.waitForTimeout(ms / pasos); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(desde.x + dx * i / pasos, desde.y + dy * i / pasos) }) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const fotos = []; const cuadro = async (p, n) => { if (process.env.GIF) { const f = `${OUT}gif-${String(fotos.length).padStart(3, '0')}.png`; await p.screenshot({ path: f }); fotos.push(f) } }

mkdirSync(OUT.replace(/[^/]*$/, '') || '.', { recursive: true })

// 1) Celular 390 px: pila de 3 al estilo Sonner, deslizar de lado y hacia abajo, tocar para cerrar.
{
  console.log('== pila y deslizar (390)')
  const { ctx, p } = await contexto(390); const cdp = await ctx.newCDPSession(p)
  if (process.env.GIF) { await hastaFirmasConCuadros(p) } else await hastaFirmas(p)
  await p.waitForTimeout(500)
  let s = await pila(p)
  ok(s.length === 3 && s.map(x => x.i).join() === '0,1,2', `pila: ${s.length} avisos (data-i ${s.map(x => x.i).join(',')})`)
  ok(s[0].t === 'Contrato firmado por los dos' && s[1].t === 'Firmaste el contrato' && s[2].t === 'Alquiler creado', `pila: el más nuevo al frente («${s.map(x => x.t).join('» › «')}»)`)
  ok(!s[0].oculto && s[1].oculto && s[2].oculto, 'pila: solo se lee el de adelante; los de atrás asoman sin texto')
  ok(s[1].top < s[0].top && s[2].top < s[1].top && s[0].top - s[2].top <= 30, `pila: los de atrás asoman ${Math.round(s[0].top - s[1].top)} y ${Math.round(s[0].top - s[2].top)} px por arriba`)
  const tapa = await p.evaluate(() => { const r = document.querySelector('.tostadas').getBoundingClientRect(); const t = [...document.querySelectorAll('.tostada')].map(x => x.getBoundingClientRect()); const top = Math.min(...t.map(q => q.top)), bot = Math.max(...t.map(q => q.bottom))
    return [...document.querySelectorAll('.aviso-red, header.barra, #contenido h1, .paso-cab, #contenido .boton--primario')].filter(x => { const q = x.getBoundingClientRect(); return q.height && q.bottom > top + .5 && q.top < bot - .5 && q.right > r.left && q.left < r.right }).map(x => x.className || x.tagName) })
  ok(!tapa.length, `pila: no tapa la cabecera, el título, el paso ni los botones principales${tapa.length ? ' (tapa ' + tapa.join(', ') + ')' : ''}`)
  await p.screenshot({ path: OUT + 'movil-pila.png' })
  const r = await p.locator('.tostada[data-i="0"]').boundingBox(), c = { x: r.x + 90, y: r.y + r.height / 2 }
  await deslizar(p, cdp, c, 40, 0, 700); await p.waitForTimeout(400)
  ok(await cuenta(p) === 3, 'deslizar: 40 px de lado, despacio, no cierra (vuelve a su lugar)')
  const vuelta = await p.locator('.tostada[data-i="0"]').evaluate(e => e.style.transform || getComputedStyle(e).transform)
  ok(!/translateX\((?!0)/.test(vuelta), `deslizar: vuelve sin desplazamiento (${vuelta || 'none'})`)
  await deslizar(p, cdp, c, 150, 0, 160, 6); await cuadro(p); await p.waitForTimeout(450); await cuadro(p)
  s = await pila(p); ok(s.length === 2 && s[0].t === 'Firmaste el contrato', `deslizar: 150 px de lado cierra el de adelante (quedan ${s.length})`)
  const r2 = await p.locator('.tostada[data-i="0"]').boundingBox()
  await deslizar(p, cdp, { x: r2.x + 90, y: r2.y + r2.height / 2 }, 0, 60, 200, 6); await cuadro(p); await p.waitForTimeout(450); await cuadro(p)
  s = await pila(p); ok(s.length === 1 && s[0].t === 'Alquiler creado', `deslizar: 60 px hacia abajo cierra el siguiente (quedan ${s.length})`)
  const r3 = await p.locator('.tostada[data-i="0"]').boundingBox()
  await p.touchscreen.tap(r3.x + 90, r3.y + 18); await p.waitForTimeout(450); await cuadro(p)
  ok(await cuenta(p) === 0, 'tocar: tocar el aviso (fuera del botón) lo cierra')
  ok(await p.locator('#contenido h1, .paso-cab').first().isVisible(), 'al cerrar, la pantalla sigue igual (sin saltos)')
  await ctx.close()
}

// 2) Tiempos: 5 s sin acción, 8 s con acción; con el dedo encima se pausa.
{
  console.log('== tiempos (390)')
  const { ctx, p } = await contexto(390); await hastaFirmas(p); const t0 = Date.now()
  await p.waitForTimeout(6500 - (Date.now() - t0))
  let s = await pila(p)
  ok(s.length === 1 && s[0].t === 'Contrato firmado por los dos', `tiempo: a los 6.5 s se fueron los avisos sin acción (5 s) y queda «${s[0]?.t}» (con acción, 8 s)`)
  const tl = await p.locator('.tostada[data-i="0"] .tostada__tiempo').evaluate(e => ({ h: e.getBoundingClientRect().height, d: getComputedStyle(e).animationDuration }))
  ok(Math.round(tl.h) === 2 && tl.d === '8s', `tiempo: línea de ${tl.h} px que corre ${tl.d}`)
  await p.waitForTimeout(9300 - (Date.now() - t0))
  ok(await cuenta(p) === 0, `tiempo: a los ${((Date.now() - t0) / 1000).toFixed(1)} s el aviso con acción ya se fue`)
  await ctx.close()
}

// 3) Escritorio 1280 px: el ratón encima abre la pila sin encimarse y pausa todos los tiempos.
{
  console.log('== escritorio (1280)')
  const { ctx, p } = await contexto(1280); await hastaFirmas(p)
  const r = await p.locator('.tostada[data-i="0"]').boundingBox(); await p.mouse.move(r.x + 200, r.y + r.height / 2); await p.waitForTimeout(500)
  let s = await pila(p)
  ok(await p.locator('.tostadas--abierta').count() === 1 && s.every(x => !x.oculto), 'escritorio: con el ratón encima la pila se abre y se leen los 3')
  ok(s.length === 3 && s[1].bottom <= s[0].top && s[2].bottom <= s[1].top, `escritorio: abiertos no se enciman (${s.map(x => Math.round(x.top) + '–' + Math.round(x.bottom)).join(', ')})`)
  ok(s.every(x => Math.round(x.w) === 360 && Math.round(x.x + x.w) === 1280 - 24), 'escritorio: 360 px, abajo a la derecha a 24 px')
  await p.screenshot({ path: OUT + 'escritorio-pila.png' })
  await p.waitForTimeout(8500); ok(await cuenta(p) === 3, 'escritorio: con el ratón encima no se va ninguno (pausa)')
  await p.mouse.move(40, 300); await p.waitForTimeout(600)
  ok(await p.locator('.tostadas--abierta').count() === 0, 'escritorio: al quitar el ratón la pila se cierra de nuevo')
  await ctx.close()
}

// 4) Movimiento reducido: solo fundido de 160 ms, sin deslizar ni girar.
{
  console.log('== movimiento reducido (390)')
  const { ctx, p } = await contexto(390, { reducir: true }); await hastaFirmas(p)
  const m = await p.locator('.tostada[data-i="0"]').evaluate(e => { const s = getComputedStyle(e); return { a: s.animationName, d: s.animationDuration, t: s.transitionDuration } })
  ok(m.a === 'aviso-fade' && m.d === '0.16s', `reducir: entra con fundido ${m.a} de ${m.d}`)
  ok(m.t.split(',').every(x => x.trim() === '0.16s'), `reducir: transiciones de ${m.t}`)
  await ctx.close()
}

await browser.close()
if (process.env.GIF) console.log('cuadros:', fotos.length)
if (fallas.length) { console.log('\nFALLAS:\n' + fallas.join('\n')); process.exit(1) } else console.log('\nTODO BIEN')

/** Igual que hastaFirmas, guardando cuadros mientras entran los avisos (para el GIF). */
async function hastaFirmasConCuadros(p) {
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.goto(B + '#/crear'); await p.waitForTimeout(800)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click(); await p.locator('.tostada').first().waitFor({ timeout: 15000 })
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  for (let i = 0; i < 40; i++) { await cuadro(p); if (await p.evaluate(() => [...document.querySelectorAll('.tostada__t')].some(h => h.textContent === 'Contrato firmado por los dos'))) break }
  for (let i = 0; i < 8; i++) await cuadro(p)
}
