// Estado de espera v2 del pago: revisión en el navegador (390 px y 1280 px) sobre la app construida (vite build + vite preview).
// /api/solo se responde AQUÍ (no se paga nada en la red de prueba) y cada etapa se RETIENE hasta que el script la suelta, para
// ver Firmando (cuenta segura en curso) y Enviando (depósito en curso). Las etapas las marca la app con su avance real.
// Uso: VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173   y luego   OUT=dir/ [CHROME=…] [GIF=1] node scripts/espera-pagar/capturar.mjs
import { chromium } from 'playwright'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { llenarFormulario } from '../_formulario.mjs'
const B = process.env.BASE || 'http://localhost:4173/', OUT = process.env.OUT || 'espera-pagar-'
const DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey(), hash = () => randomBytes(32).toString('hex')
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
const TERRACOTA = 'rgb(219, 59, 0)', T1 = 'rgb(227, 242, 232)', T2 = 'rgb(111, 191, 138)', CAFE = 'rgb(61, 42, 34)'

async function contexto(w, { reducir = false } = {}) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica', ...(reducir && { reducedMotion: 'reduce' }) })
  // El recorrido guiado ya «visto» (si no, se abre solo en Inicio y tapa la pantalla de la prueba).
  await ctx.addInitScript(() => localStorage.setItem('lockumi.recorrido.v1.059bcb6c5fd0cda5', 'captura'))
  await ctx.addInitScript(() => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' })))
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
  await p.goto(B + '#/crear'); await p.waitForTimeout(800)
  await llenarFormulario(p)
  await p.locator('.fz-pie').getByRole('button', { name: 'Crear alquiler', exact: true }).click(); await cerrarAviso(p, 'Alquiler creado')
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

async function recorrido(n, w) {
  console.log('==', n, w)
  const { ctx, p, soltar, esperaRetenida, falla } = await contexto(w)
  await hastaPago(p)
  // Avisos de las firmas (pila de 2, el más nuevo al frente): Tab desde «Saltar al contenido» llega al más nuevo; uno se cierra con Espacio, el otro con Esc.
  await p.waitForFunction(() => document.querySelectorAll('.tostada').length === 2, null, { timeout: 15000 }); await p.waitForTimeout(400)
  for (const [tecla, titulo] of [[' ', 'Contrato firmado por los dos'], ['Escape', 'Firmaste el contrato']]) {
    await p.locator('a.skip').focus(); await p.keyboard.press('Tab')
    const f = await p.evaluate(() => ({ en: document.activeElement?.matches('.tostada[data-i="0"]'), t: document.activeElement?.querySelector('.tostada__t')?.textContent }))
    ok(f.en && f.t === titulo, `${n}: «${f.t}» (el más nuevo) es la parada de Tab después de «Saltar al contenido»`)
    await p.keyboard.press(tecla); await p.waitForFunction(t => ![...document.querySelectorAll('.tostada__t')].some(h => h.textContent === t), titulo, { timeout: 3000 })
    ok(true, `${n}: «${titulo}» se cierra con ${tecla === ' ' ? 'Espacio' : 'Esc'}`)
  }
  await p.waitForFunction(() => !document.querySelector('.tostada'), null, { timeout: 4000 }).catch(() => {})
  const pagar = p.getByRole('button', { name: /^Pagar / }); await pagar.scrollIntoViewIfNeeded()
  const r0 = await fondoBoton(p); ok(r0.bg === TERRACOTA && r0.busy === null, `${n}: «${r0.texto}» en terracota en reposo (${r0.bg})`)
  // Las etapas que se vieron: se anota cada clase envio--tN que aparece (para saber si «Guardado» llega a pintarse).
  await p.evaluate(() => { window.__etapas = []; new MutationObserver(() => { const e = document.querySelector('.envio')?.className.match(/envio--t(\d)/)?.[1]; if (e && window.__etapas.at(-1) !== e) window.__etapas.push(e) }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] }) })
  await pagar.click()
  ok(await esperaRetenida('desplegar'), `${n}: la app pide crear la cuenta segura`)
  await p.waitForTimeout(700)
  const r1 = await fondoBoton(p), s1 = await estado(p)
  ok(r1.bg === T1 && r1.color === CAFE && r1.busy === 'true', `${n}: Firmando: botón salvia claro con café y aria-busy (${r1.bg}, «${r1.texto}»)`)
  ok(r1.td.split(',').some(x => x.trim() === '0.5s'), `${n}: fundido de 500 ms (${r1.td})`)
  ok(s1 === 'Paso 1 de 3: Firmando.', `${n}: role=status dice «${s1}»`)
  ok(await p.locator('.envio__nota').textContent() === 'Esto tarda unos segundos. No cierres la app.', `${n}: nota «Esto tarda unos segundos. No cierres la app.»`)
  ok(await p.locator('.envio__boton .aviso-logo__llave').count() === 1, `${n}: casita animada en el botón`)
  const foco = await p.evaluate(() => document.activeElement?.classList.contains('envio__boton')); ok(foco, `${n}: el foco sigue en el botón en espera (aria-disabled, no disabled)`)
  if (n === 'movil') await p.screenshot({ path: OUT + 'movil-firmando.png' })
  soltar('desplegar')
  ok(await esperaRetenida('fondear-prueba'), `${n}: la app envía el depósito`)
  await p.waitForTimeout(700)
  const r2 = await fondoBoton(p), s2 = await estado(p)
  ok(r2.bg === T2 && r2.color === CAFE, `${n}: Enviando: botón salvia medio con café (${r2.bg})`)
  ok(s2 === 'Paso 2 de 3: Enviando.', `${n}: role=status dice «${s2}»`)
  const ls = await lineas(p); const largos = ls.filter(x => x.n > 2); ok(largos.length === 0, `${n}: todos los textos en 2 líneas o menos (${ls.map(x => x.n).join('/')})${largos.length ? ' ' + JSON.stringify(largos) : ''}`)
  await p.locator('.envio').scrollIntoViewIfNeeded()
  if (n === 'movil') await p.screenshot({ path: OUT + 'movil-enviando.png' })
  if (n === 'movil' && process.env.GIF) { mkdirSync(OUT + 'cuadros', { recursive: true }); for (let i = 0; i < 26; i++) { await p.screenshot({ path: `${OUT}cuadros/b-${String(i).padStart(3, '0')}.png`, clip: await p.locator('.envio').boundingBox().then(b => ({ x: 0, y: b.y - 90, width: w, height: 300 })) }); await p.waitForTimeout(90) } }
  soltar('fondear-prueba')
  const pop = frente(p); await pop.waitFor({ timeout: 15000 }); const visto = Date.now()
  const t = await pop.locator('.tostada__t').textContent(), txt = await pop.locator('.tostada__l').textContent()
  ok(t === '¡Depósito guardado!' && txt === 'Ahora: fotos de entrada', `${n}: aviso v2 de logro «${t}» · «${txt}» (texto de Legal)`)
  const etapas = await p.evaluate(() => window.__etapas); console.log(`  · etapas pintadas: ${etapas.join(' → ')}`)
  ok(etapas[0] === '1' && etapas.includes('2'), `${n}: las etapas siguen el avance real (${etapas.join('→')})`)
  // Aviso v2 (toast): pila position:fixed, fuera del flujo, pastilla compacta abajo, casita completa de 32 px, un botón de acción de 44 px, sin X ni «Entendido».
  await p.waitForTimeout(450); await p.screenshot({ path: OUT + n + '-aviso.png' })
  const av = await medir(pop)
  ok(av.fijo === 'tostadas', `${n}: el aviso flota (pila position:fixed «${av.fijo}»), no va en el flujo`)
  ok(av.zona === 'status' && av.vivo === 'polite', `${n}: logro en role=status, aria-live=polite`)
  ok(av.botones === 1 && av.accion === 'Tomar fotos →' && av.etiqueta === 'Tomar fotos de entrada' && av.accionAlto >= 44 && !/Entendido|✕/.test(await pop.textContent()), `${n}: un botón «${av.accion}» (${av.accionAlto} px, «${av.etiqueta}»), sin X ni «Entendido»`)
  ok(av.vb === '419.5 65.25 420.25 408.25' && av.logoDentro && Math.round(av.logo) === 32, `${n}: casita completa de ${Math.round(av.logo)} px (viewBox ${av.vb}), sin recortar`)
  ok(av.fondo === 'rgba(255, 245, 238, 0.92)' && /blur\(18px\)/.test(av.blur), `${n}: vidrio crema al 92 % (${av.fondo}) con ${av.blur}`)
  const tam = n === 'movil' ? Math.round(av.w) === 358 && Math.round(av.x) === 16 && av.h <= 80 : Math.round(av.w) === 360 && Math.round(av.x + av.w) === av.vw - 24 && av.h <= 80
  ok(tam, `${n}: pastilla v2 ${Math.round(av.w)}×${Math.round(av.h)} en (${Math.round(av.x)}, ${Math.round(av.y)}), ${n === 'movil' ? 'abajo al centro' : 'abajo a la derecha'}`)
  ok(!av.tapa.length, `${n}: no tapa la cabecera, el título, el paso ni los botones principales${av.tapa.length ? ' (tapa ' + av.tapa.join(', ') + ')' : ''}`)
  // aviso-tab: Tab lo alcanza (2.ª parada), el foco pausa el conteo de 8 s, Tab pasa al botón y el botón navega al paso.
  await p.waitForTimeout(500); await p.locator('a.skip').focus(); await p.keyboard.press('Tab')
  ok(await pop.evaluate(e => e === document.activeElement), `${n}: el aviso de pago es la parada de Tab después de «Saltar al contenido»`)
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + n + '-aviso-foco.png' })
  await p.waitForTimeout(8000); ok(await pop.isVisible(), `${n}: con el foco no se esconde (pausa, ${((Date.now() - visto) / 1000).toFixed(1)} s)`)
  await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement?.classList.contains('tostada__accion')), `${n}: Tab pasa al botón de acción`)
  await p.keyboard.press('Enter'); await p.waitForFunction(() => !document.querySelector('.tostada'), null, { timeout: 3000 })
  const nav = await p.evaluate(() => { const a = document.activeElement, r = a?.getBoundingClientRect(); return { t: a?.textContent?.trim(), dentro: !!r && r.top >= 0 && r.bottom <= innerHeight, panel: !!a?.closest('.detalle__principal > .tarjeta') } })
  ok(nav.panel && nav.dentro && /Tomar foto/.test(nav.t), `${n}: «Tomar fotos →» navega al paso: foco en «${nav.t}», a la vista, y el aviso se cierra`)
  const des = await p.evaluate(() => ({ h2: [...document.querySelectorAll('body *')].find(h => !h.children.length && h.textContent.trim() === 'Fotos de entrada')?.getBoundingClientRect().top + scrollY, alto: document.documentElement.scrollHeight }))
  ok(des.h2 === av.h2 && des.alto === av.alto, `${n}: al cerrarse no se mueve nada (título del paso ${Math.round(av.h2)}→${Math.round(des.h2)}, alto ${av.alto}→${des.alto})`)
  await ctx.close()

  // Error: falla el envío del depósito. El error no se esconde solo y el botón ofrece «Volver a intentar el pago».
  const e = await contexto(w); await hastaPago(e.p); await cerrarAviso(e.p, 'Contrato firmado por los dos')
  e.falla.add('fondear-prueba'); await e.p.getByRole('button', { name: /^Pagar / }).click()
  await e.esperaRetenida('desplegar'); e.soltar('desplegar'); await e.esperaRetenida('fondear-prueba'); e.soltar('fondear-prueba')
  await e.p.locator('.tostada--error').waitFor({ timeout: 8000 }); await e.p.waitForTimeout(6000)
  const err = await e.p.locator('#contenido p.error').textContent(), te = e.p.locator('.tostada--error'), me = await medir(te)
  ok(await e.p.locator('#contenido p.error').isVisible(), `${n}: error escrito en la pantalla (sin role=alert: lo anuncia el aviso): «${err}»`)
  ok(await e.p.locator('#contenido p.error').getAttribute('role') === null && await e.p.locator('[role="alert"] .tostada--error').count() === 1, `${n}: un solo anuncio del error (el aviso v2, role=alert)`)
  ok(await te.isVisible() && await te.locator('.tostada__t').textContent() === 'No se pudo completar' && me.linea === 'La red de prueba está lenta o no respondió. Espera un minuto y vuelve a tocar el botón.',
    `${n}: aviso de error «No se pudo completar» con el texto A12 sin cambios, visible después de 6 s (no se esconde solo)`)
  ok(await te.locator('.tostada__tiempo').count() === 0 && me.botones === 0, `${n}: el error no tiene línea de tiempo ni botón de acción`)
  ok(!me.tapa.length, `${n}: el error no tapa la cabecera, el título ni «Volver a intentar el pago»${me.tapa.length ? ' (tapa ' + me.tapa.join(', ') + ')' : ''}`)
  if (n === 'movil') await e.p.screenshot({ path: OUT + 'movil-error-aviso.png' })
  const re = await fondoBoton(e.p); ok(re.texto === 'Volver a intentar el pago' && re.bg === TERRACOTA && re.busy === null, `${n}: botón activo «${re.texto}» en terracota, sin aria-busy`)
  ok(await e.p.locator('.envio__paso--error').textContent() === 'Enviando (no se pudo)', `${n}: paso «Enviando» marcado como «(no se pudo)»`)
  ok(!(await e.p.content()).includes('dos veces'), `${n}: no dice «no se paga dos veces»`)
  const le = await lineas(e.p); ok(le.filter(x => x.nuevo).every(x => x.n <= 2), `${n}: textos nuevos del error en 2 líneas o menos (${le.filter(x => x.nuevo).map(x => x.n).join('/')}); mensaje de error existente: ${le.find(x => !x.nuevo)?.n} líneas`)
  if (n === 'movil') { await e.p.locator('.envio').scrollIntoViewIfNeeded(); await e.p.screenshot({ path: OUT + 'movil-error.png' }) }
  await e.p.getByRole('button', { name: 'Volver a intentar el pago' }).click()
  await e.esperaRetenida('fondear-prueba'); const r = await fondoBoton(e.p)
  ok(r.busy === 'true', `${n}: al reintentar no vuelve a crear la cuenta segura: va directo a «Enviando» (${(await estado(e.p))})`)
  e.soltar('fondear-prueba'); await e.p.locator('.tostada--logro').waitFor({ timeout: 15000 }); ok(true, `${n}: reintento con aviso de logro`)
  await e.ctx.close()
}

for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) await recorrido(n, w)
// Reducir movimiento: el color cambia de golpe.
{ const { ctx, p, soltar, esperaRetenida } = await contexto(390, { reducir: true }); await hastaPago(p); await cerrarAviso(p, 'Contrato firmado por los dos')
  await p.getByRole('button', { name: /^Pagar / }).click(); await esperaRetenida('desplegar')
  const r = await fondoBoton(p); ok(r.td.split(',').every(x => x.trim() === '0s') && r.bg === T1, `reducir movimiento: sin fundido (${r.td}) y salvia claro al instante`)
  ok(await p.locator('.envio__logo .aviso-logo__llave').evaluate(e => getComputedStyle(e).animationName) === 'none', 'reducir movimiento: la llave queda quieta')
  soltar('desplegar'); await esperaRetenida('fondear-prueba'); soltar('fondear-prueba'); await ctx.close() }
await browser.close()
console.log(fallas.length ? `\n${fallas.length} FALLAS` : '\nTODO BIEN'); process.exit(fallas.length ? 1 : 0)
