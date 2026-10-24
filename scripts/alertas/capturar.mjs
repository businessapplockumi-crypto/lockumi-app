// Avisos de cada paso: recorrido con Playwright (390 y 1280 px), una captura por aviso y revisión de accesibilidad.
// Vite en localhost:5173 con VITE_TRUSTLESS=1 y VITE_CAVOS_APP_ID (como producción) y, solo para el aviso de ingreso
// correcto, otro Vite en localhost:5174 sin VITE_CAVOS_APP_ID (login simulado). Sesión simulada como la deja el login.
// /api/solo se responde AQUÍ con datos de ejemplo (no se paga nada en la red de prueba) y se bloquea toda llamada a
// Stellar o Cavos: no hace falta la vista previa protegida ni ningún enlace para saltar la protección.
// Uso: VITE_CAVOS_APP_ID=… OUT=dir/alertas-preview- [CHROME=…] node scripts/alertas/capturar.mjs
import { chromium } from 'playwright'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { randomBytes } from 'node:crypto'
const APP_ID = (process.env.VITE_CAVOS_APP_ID || '').trim(), OUT = process.env.OUT || 'alertas-preview-', B = 'http://localhost:5173/', B2 = 'http://localhost:5174/'
const DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey()
const hash = () => randomBytes(32).toString('hex')
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const vistos = {}
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })

async function contexto(w, { sesion = true, reducir = false } = {}) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica', ...(reducir && { reducedMotion: 'reduce' }) })
  if (sesion) await ctx.addInitScript(id => {
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'kattmoresol@gmail.com', nombre: 'Katherine', metodo: 'google' }))
    localStorage.setItem('cavos-kit:identity:' + id, JSON.stringify({ userId: 'google-oauth2|simulado-katherine', email: 'kattmoresol@gmail.com', name: 'Katherine' }))
  }, APP_ID)
  // Cuándo nació y cuándo se fue cada aviso (por título), medido en la página: el tiempo de «solo» no depende de cuándo lo ve la prueba.
  //   Se descuenta el tiempo en pausa (ratón, foco o dedo sobre la pila pausan a todos).
  await ctx.addInitScript(() => { const nace = window.__nace = {}, fin = window.__fin = {}, pausa = window.__pausa = {}, desde = {}; new MutationObserver(ms => { for (const m of ms) {
    const t = n => n.querySelector('.tostada__t')?.textContent
    for (const n of m.addedNodes) if (n.classList?.contains('tostada')) { nace[t(n)] = performance.now(); pausa[t(n)] = 0; if (n.classList.contains('tostada--pausa')) desde[t(n)] = performance.now() }
    for (const n of m.removedNodes) if (n.classList?.contains('tostada')) fin[t(n)] = performance.now()
    if (m.type === 'attributes' && m.target.classList.contains('tostada')) { const k = t(m.target), en = m.target.classList.contains('tostada--pausa')
      if (en && desde[k] == null) desde[k] = performance.now(); else if (!en && desde[k] != null) { pausa[k] += performance.now() - desde[k]; desde[k] = null } } } })
    .observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }) })
  await ctx.route(u => !/^https?:\/\/localhost/.test(u.href) && /stellar|horizon|soroban|cavos/i.test(u.hostname), r => r.abort())
  await ctx.route('**/api/solo', async r => {
    const a = JSON.parse(r.request().postData() || '{}').accion
    const cuerpo = { dueno: { dueno: DUENO, trustlineTx: null }, 'cuenta-prueba': { inquilino: INQ, trustlineTx: null, compraTx: null },
      desplegar: { escrow: StrKey.encodeContract(randomBytes(32)), tx: hash(), trustlineTx: null, compraTx: null }, 'fondear-prueba': { tx: hash(), compraTx: null },
      aprobar: { evidenciaTx: null, aprobacionTx: hash() }, liberar: { tx: hash() }, disputar: { tx: hash() }, resolver: { tx: hash() } }[a]
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{"error":"no disponible en la captura"}' })
  })
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('  pageerror', e.message))
  return { ctx, p }
}

/** Espera un aviso v2 (toast) por su título, revisa accesibilidad, lo captura (la primera vez de cada paso y tamaño) y lo cierra
 *  de una de cuatro maneras (por turnos): tocándolo, con Esc, con Tab + Enter (pausa), o dejándolo esconderse solo (5 s; 8 s con acción).
 *  Los avisos se apilan (hasta 3): si el buscado no está adelante, se abre la pila con el foco para tocarlo o cerrarlo. */
let modo = 0
const conTitulo = (p, titulo) => p.locator('.tostada:not(.tostada--sale)').filter({ has: p.locator('.tostada__t', { hasText: new RegExp('^' + titulo.replace(/[.*+?^${}()|[\]\\¡!]/g, '\\$&') + '$') }) })
async function alerta(p, n, paso, titulo, { capturar = true, sigue = false } = {}) {
  const pop = conTitulo(p, titulo); await pop.waitFor({ timeout: 30000 }); const visto = Date.now(); await p.waitForTimeout(900)
  // Se mide en un cuadro de dibujo (requestAnimationFrame): lo que la persona ve en la pantalla.
  const m = await pop.evaluate(e => new Promise(listo => requestAnimationFrame(() => listo((() => {
    const [t, d] = (e.getAttribute('aria-describedby') || '').split(' ').map(x => document.getElementById(x))
    const r = e.getBoundingClientRect(), zona = e.closest('.tostadas__zona')
    return { rol: e.getAttribute('role'), zona: zona?.getAttribute('role'), vivo: zona?.getAttribute('aria-live'), nombre: e.getAttribute('aria-label'), tab: e.tabIndex, frente: e.dataset.i === '0',
      titulo: t?.textContent ?? '', desc: d?.textContent ?? '', robo: e.contains(document.activeElement), botones: e.querySelectorAll('button').length, accion: e.querySelector('.tostada__accion')?.getBoundingClientRect().height ?? 0,
      raro: /Entendido|✕|×/.test(e.textContent), tiempo: e.querySelector('.tostada__tiempo') ? getComputedStyle(e.querySelector('.tostada__tiempo')).animationDuration : null,
      tapa: [...document.querySelectorAll('header.barra, #contenido h1, main h1, .marca-c__arte, .entrada-app__titulo, .paso-cab, #contenido .boton--primario')].some(x => { const q = x.getBoundingClientRect(); return q.height && q.bottom > r.top + .5 && q.top < r.bottom - .5 && q.right > r.left && q.left < r.right }),
      logo: (() => { const s = e.querySelector('.tostada__casa .aviso-pop__logo svg'); return !!s && s.getAttribute('viewBox') === '419.5 65.25 420.25 408.25' && getComputedStyle(s).overflow === 'visible' && getComputedStyle(e.querySelector('.tostada__casa')).overflow === 'visible' && Math.round(s.getBoundingClientRect().width * e.offsetWidth / r.width) === 32 /* sin la escala de la pila */ })(),
      cabe: r.left >= 0 && r.right <= innerWidth + .5 && r.top >= -.5 && r.bottom <= innerHeight + .5, letra: Math.min(...[...e.querySelectorAll('p,h2,b,button')].map(x => parseFloat(getComputedStyle(x).fontSize))),
      emoji: /\p{Extended_Pictographic}/u.test(e.textContent), tono: (e.className.match(/tostada--(logro|paso|error)/) || [])[1] }
  })()))))
  const et = `${paso} (${n})`
  ok(m.titulo === titulo, `${et}: título «${m.titulo}»`)
  ok(m.rol === 'group' && (m.tono === 'error' ? m.zona === 'alert' : m.zona === 'status' && m.vivo === 'polite'), `${et}: sin diálogo; zona ${m.zona}${m.vivo ? ' ' + m.vivo : ''} (${m.tono})`)
  ok(m.nombre === 'Aviso. Toca para cerrar' && m.tab === 0 && !m.raro && m.botones === (m.accion ? 1 : 0) && (!m.accion || m.accion >= 44), `${et}: enfocable, nombre «${m.nombre}», sin X ni «Entendido»${m.accion ? `, un botón de acción de ${m.accion} px` : ', sin botones'}`)
  ok(m.tono === 'error' ? m.tiempo === null : m.tiempo === (m.accion ? '8s' : '5s'), `${et}: ${m.tono === 'error' ? 'sin línea de tiempo (no se esconde solo)' : 'línea de tiempo de ' + m.tiempo}`)
  ok(m.desc.length > 10, `${et}: título y línea enlazados («${m.desc}»)`); ok(!m.robo, `${et}: no roba el foco`)
  ok(m.cabe, `${et}: cabe en la pantalla`); ok(m.letra >= 12, `${et}: letra mínima ${m.letra}px`); ok(!m.emoji, `${et}: sin emojis`); ok(m.logo, `${et}: casita completa de 32 px (${m.tono})`); ok(!m.tapa, `${et}: no tapa el encabezado, el título ni los botones principales`)
  if (capturar && !vistos[paso + n]) { vistos[paso + n] = 1; await p.screenshot({ path: `${OUT}${paso}-${n}.png` }) }
  vistos.textos ??= {}; vistos.textos[paso] = { titulo: m.titulo, texto: m.desc }
  let como = ['toque', 'Escape', 'teclado', 'solo'][modo++ % 4]
  // `sigue`: enseguida llega otro aviso (el dueño de prueba responde solo); sus tiempos corren a la vez, así que este no se deja esconder solo.
  if (como === 'solo' && sigue) como = 'toque'
  const adelante = async () => { if (!await pop.evaluate(e => e.dataset.i === '0')) { await pop.focus(); await p.waitForTimeout(350) } }   // abre la pila
  if (como === 'toque') { await adelante(); if (n === 'movil') await pop.tap({ position: { x: 70, y: 14 } }); else await pop.click({ position: { x: 70, y: 14 } }) }
  else if (como === 'Escape') { await adelante(); await p.keyboard.press('Escape') }
  else if (como === 'teclado') {
    let encima = 0   // tiempo con el mouse encima: el conteo estuvo en pausa
    if (n !== 'movil' && m.frente) { const h0 = Date.now(); await pop.hover({ position: { x: 70, y: 14 } }); await p.waitForTimeout(m.accion ? 8400 : 5400); ok(await pop.isVisible(), `${et}: con el mouse encima no se esconde`); await p.mouse.move(2, 2); encima = (Date.now() - h0) / 1000 }
    // Con Tab de verdad: desde «Saltar al contenido», Tab recorre la pila (el más nuevo primero; Tab desde un aviso con acción pasa a su botón).
    await p.locator('a.skip').focus(); let llego = false
    for (let k = 0; k < 7 && !llego; k++) { await p.keyboard.press('Tab'); llego = await pop.evaluate(e => e === document.activeElement).catch(() => false) }
    const t = (Date.now() - visto) / 1000 - encima
    ok(llego && t < (m.accion ? 8 : 5), `${et}: se llega con Tab (después de «Saltar al contenido», a los ${t.toFixed(1)} s de conteo)`)
    await p.waitForTimeout(m.accion ? 8400 : 5400); ok(await pop.isVisible(), `${et}: con el foco no se esconde (pausa)`)
    await p.keyboard.press('Enter')
  } else if (m.tono === 'error') {
    await p.mouse.move(2, 2); await p.waitForTimeout(6500); ok(await pop.isVisible(), `${et}: el error no se esconde solo (sigue a los ${((Date.now() - visto) / 1000).toFixed(1)} s)`)
    await adelante(); await p.keyboard.press('Escape'); como = 'Esc (error)'
  } else await p.mouse.move(2, 2)
  // Se cerró. Solo: a los 5 s (8 s con acción) desde que apareció.
  const dur = m.accion ? 8 : 5
  await p.waitForFunction(t => ![...document.querySelectorAll('.tostada:not(.tostada--sale) .tostada__t')].some(h => h.textContent === t), m.titulo, { timeout: como === 'solo' ? (dur + 3) * 1000 : 3000 })
  if (como === 'solo') { await p.waitForTimeout(250); const s = await p.evaluate(t => (window.__fin[t] - window.__nace[t] - window.__pausa[t]) / 1000, m.titulo); ok(s >= dur && s < dur + .6, `${et}: se escondió solo a los ${s.toFixed(1)} s de conteo sin pausa (${dur} s + 200 ms de salida)`) }
  else ok(true, `${et}: cerrado con ${como}`)
  if (como === 'teclado') {
    await p.waitForTimeout(100)
    const f = await p.evaluate(() => ({ en: document.activeElement !== document.body && document.activeElement?.isConnected, quien: document.activeElement?.tagName + '#' + (document.activeElement?.id || document.activeElement?.className) }))
    ok(f.en, `${et}: el foco vuelve a ${f.quien}`)
  }
}

async function fotos(p, cual) {
  for (let k = 0; k < 12; k++) {
    const conf = p.getByRole('button', { name: 'Confirmar como inquilino' })
    if (await conf.count()) break
    await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click()
    for (const b of await p.getByRole('button', { name: 'Bien', exact: true }).all()) await b.click()
    await p.getByRole('button', { name: /^(Siguiente espacio|Revisar y confirmar)$/ }).click(); await p.waitForTimeout(150)
  }
  await p.getByLabel(cual === 'entrada' ? 'Las fotos muestran cómo está el lugar al entrar.' : 'Las fotos muestran cómo quedó el lugar al salir.').check()
  await p.getByRole('button', { name: 'Confirmar como inquilino' }).click()
}

/** Crear → firmar → pagar → fotos de entrada → salida, hasta los 7 días para reclamos. */
async function hastaVentana(p, n, cap) {
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.goto(B + '#/crear'); await p.waitForTimeout(1000)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  const crear = p.getByRole('button', { name: 'Crear alquiler de prueba' }); await crear.click()
  await alerta(p, n, 'crear', 'Alquiler creado', cap)
  ok(await p.locator('.turno').count() === 1 && await p.locator('.turno').isHidden(), `turno (${n}): la caja «Qué toca ahora» no se ve en el modo video`)
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  await alerta(p, n, 'firma-inquilino', 'Firmaste el contrato', { ...cap, sigue: true })
  await alerta(p, n, 'firma-dueno', 'Contrato firmado por los dos', cap)
  await p.locator('button:not(.tostada__accion)').filter({ hasText: /^Pagar / }).click()   // el botón del paso (el aviso también tiene «Pagar →»)
  await alerta(p, n, 'pago', '¡Depósito guardado!', cap)
  await fotos(p, 'entrada')
  await alerta(p, n, 'entrada-inquilino', 'Confirmaste las fotos de entrada', { ...cap, sigue: true })
  await alerta(p, n, 'entrada-dueno', 'Empezó el alquiler', cap)
  await p.getByRole('button', { name: 'Empezar fotos de salida' }).click()
  await alerta(p, n, 'salida-inicio', 'Empezaron las fotos de salida', cap)
  await fotos(p, 'salida')
  await alerta(p, n, 'salida-inquilino', 'Confirmaste las fotos de salida', { ...cap, sigue: true })
  await alerta(p, n, 'salida-dueno', 'Fotos de salida confirmadas', cap)
}

for (const [n, w] of [['movil', 390], ['escritorio', 1280]].filter(([n]) => !process.env.SOLO || process.env.SOLO === n)) {   // SOLO=movil|escritorio para repetir un tamaño
  console.log('==', n, w)
  const { ctx, p } = await contexto(w)
  await p.goto(B); await p.waitForTimeout(800)
  // A) sin reclamos: adelantar el plazo → devolución automática
  await hastaVentana(p, n, {})
  await p.getByRole('button', { name: 'Solo red de prueba: adelantar el plazo' }).first().click()
  await alerta(p, n, 'adelantar', 'Plazo adelantado', { sigue: true })
  await alerta(p, n, 'devolucion', 'Depósito devuelto')
  // B) reclamo → no estoy de acuerdo → mediación (simulación) → reparto
  await hastaVentana(p, n, { capturar: false })
  await p.getByRole('button', { name: 'Hacer un reclamo como dueño de prueba' }).click()
  await p.getByLabel(/¿Cuánto reclamas\?/).fill('5'); await p.getByLabel('¿Qué pasó?').fill('Mancha en la pared de la sala que no estaba al entrar')
  await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click(); await p.getByRole('button', { name: 'Enviar reclamo' }).click()
  await alerta(p, n, 'reclamo', 'Reclamo enviado')
  await p.getByRole('button', { name: 'No estoy de acuerdo' }).click()
  await alerta(p, n, 'mediacion', 'Pasa a una persona mediadora')
  await p.getByRole('button', { name: 'Resolver el reclamo (simulación)' }).click(); await p.getByRole('button', { name: 'Confirmar el reparto' }).click()
  await alerta(p, n, 'reparto', 'Reparto decidido')
  // C) reclamo aceptado
  await hastaVentana(p, n, { capturar: false })
  await p.getByRole('button', { name: 'Hacer un reclamo como dueño de prueba' }).click()
  await p.getByLabel(/¿Cuánto reclamas\?/).fill('5'); await p.getByLabel('¿Qué pasó?').fill('Mancha en la pared de la sala que no estaba al entrar')
  await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click(); await p.getByRole('button', { name: 'Enviar reclamo' }).click()
  await alerta(p, n, 'reclamo', 'Reclamo enviado', { capturar: false })
  await p.getByRole('button', { name: 'Aceptar reclamo' }).click()
  await alerta(p, n, 'acuerdo', 'Reclamo aceptado')
  await ctx.close()

  // Ingreso que no terminó (regreso de Google con un código que no sirve; Cavos bloqueado) + movimiento reducido
  const f = await contexto(w, { sesion: false, reducir: true })
  // Qué se ve mientras se confirma el regreso: «Entrando…» (aria-busy), nunca la pantalla Entrar antes del resultado.
  await f.ctx.addInitScript(() => { const v = window.__vio = []; new MutationObserver(() => { const c = document.querySelector('.ingreso-cargando'), e = document.querySelector('.entrada-app:not(.ingreso-cargando)')
    const k = c ? 'cargando:' + c.getAttribute('aria-busy') : e ? (document.querySelector('.tostada') ? 'entrar+aviso' : 'entrar') : ''; if (k && v[v.length - 1] !== k) v.push(k) }).observe(document, { childList: true, subtree: true }) })
  await f.p.goto(B + '?cavos_auth_code=simulado-invalido#/')
  ok(await f.p.locator('.tostada').first().evaluate(e => getComputedStyle(e).animationName === 'aviso-fade' && getComputedStyle(e).animationDuration === '0.16s' && getComputedStyle(e.querySelector('.aviso-logo__llave')).animationName === 'none').catch(() => false), `ingreso-fallo (${n}): solo un fundido con movimiento reducido`)
  await alerta(f.p, n, 'ingreso-fallo', 'El ingreso no terminó')
  ok(await f.p.getByRole('button', { name: 'Entrar' }).isVisible(), `ingreso-fallo (${n}): queda la pantalla de entrada`)
  const vio = await f.p.evaluate(() => window.__vio)
  ok(vio[0] === 'cargando:true' && vio[1] === 'entrar+aviso', /* «entrar» solo (sin aviso) recién después de que el aviso se va */ `ingreso-fallo (${n}): primero «Entrando…» con aria-busy, luego Entrar con el error (${vio.join(' → ')})`)
  const err = f.p.locator('#error-ingreso')
  ok(await err.isVisible() && (await err.textContent()) === 'El ingreso no terminó Toca Entrar y elige tu cuenta.', `ingreso-fallo (${n}): el error sigue escrito en Entrar después de cerrar el aviso («${await err.textContent().catch(() => '')}»)`)
  ok(await f.p.getByRole('button', { name: 'Entrar' }).getAttribute('aria-describedby') === 'error-ingreso', `ingreso-fallo (${n}): el error está asociado al botón Entrar`)
  await f.p.getByLabel(/Acepto los Términos/).check(); await f.p.getByLabel(/Acepto el Aviso de privacidad/).check(); await f.p.getByRole('button', { name: 'Entrar' }).click()
  ok(await err.count() === 0, `ingreso-fallo (${n}): al volver a intentar, el error se quita`)
  await f.ctx.close()
  // Recién cargada la página (foco al inicio): Tab, Tab → «Saltar al contenido», luego el aviso. Pausa, Esc y el foco vuelve.
  const h = await contexto(w, { sesion: false }); await h.p.goto(B + '?cavos_auth_code=simulado-invalido#/')
  const pt = h.p.locator('.tostada'); await pt.waitFor({ timeout: 30000 }); const vt = Date.now()
  await h.p.keyboard.press('Tab'); const prim = await h.p.evaluate(() => document.activeElement?.className); await h.p.keyboard.press('Tab')
  const st = (Date.now() - vt) / 1000, en = await pt.evaluate(e => e === document.activeElement)
  ok(prim === 'skip' && en && st < 5, `tab (${n}): 1.º Tab «Saltar al contenido», 2.º Tab el aviso (a los ${st.toFixed(1)} s)`)
  await h.p.waitForTimeout(5400); ok(await pt.isVisible(), `tab (${n}): con el foco se pausa (sigue a los ${((Date.now() - vt) / 1000).toFixed(1)} s)`)
  await h.p.keyboard.press('Escape'); await h.p.waitForTimeout(400)
  ok(await pt.count() === 0 && await h.p.evaluate(() => document.activeElement?.className === 'skip'), `tab (${n}): Esc lo cierra y el foco vuelve a «Saltar al contenido»`)
  await h.ctx.close()
  // Ingreso correcto (Vite sin Cavos real: login simulado)
  const g = await contexto(w, { sesion: false }); await g.p.goto(B2); await g.p.waitForTimeout(800)
  await g.p.getByLabel(/Acepto los Términos/).check(); await g.p.getByLabel(/Acepto el Aviso de privacidad/).check(); await g.p.getByRole('button', { name: 'Entrar' }).click(); await g.p.getByRole('button', { name: 'Continuar con Google' }).click()
  await alerta(g.p, n, 'ingreso', '¡Ingresaste correctamente!')
  await g.ctx.close()
}
await browser.close()
console.log('TEXTOS ' + JSON.stringify(vistos.textos, null, 1))
console.log(fallas.length ? `FALLAS: ${fallas.length}` : 'TODO OK')
process.exit(fallas.length ? 1 : 0)
