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

/** Espera un aviso, revisa accesibilidad, lo captura (la primera vez de cada paso y tamaño) y lo cierra. */
let modo = 0
async function alerta(p, n, paso, titulo, { capturar = true } = {}) {
  const pop = p.locator('.aviso-pop'); await pop.waitFor({ timeout: 30000 }); await p.waitForTimeout(1300)
  const m = await pop.evaluate(e => {
    const t = document.getElementById(e.getAttribute('aria-labelledby') || ''), d = document.getElementById(e.getAttribute('aria-describedby') || '')
    const r = e.getBoundingClientRect()
    return { rol: e.getAttribute('role'), modal: e.getAttribute('aria-modal'), titulo: t?.textContent ?? '', desc: d?.textContent ?? '', foco: e.contains(document.activeElement) && document.activeElement.classList.contains('aviso-pop__x'),
      tapa: innerWidth < 720 && [...document.querySelectorAll('header.barra, #contenido h1, main h1, .marca-c__arte, .entrada-app__titulo')].some(x => { const q = x.getBoundingClientRect(); return q.height && q.bottom > r.top + .5 && q.top < r.bottom - .5 }),
      logo: (() => { const s = e.querySelector('.aviso-pop__logo svg'); return !!s && s.getAttribute('viewBox') === '419.5 65.25 420.25 408.25' && getComputedStyle(s).overflow === 'visible' && getComputedStyle(e.querySelector('.aviso-pop__esquina')).overflow === 'visible' })(),
      cabe: r.left >= 0 && r.right <= innerWidth + .5 && r.top >= -.5 && r.bottom <= innerHeight + .5, letra: Math.min(...[...e.querySelectorAll('p,h2,button,strong')].map(x => parseFloat(getComputedStyle(x).fontSize))),
      emoji: /\p{Extended_Pictographic}/u.test(e.textContent), tono: e.className.replace('aviso-pop aviso-pop--', '') }
  })
  const et = `${paso} (${n})`
  ok(m.titulo === titulo, `${et}: título «${m.titulo}»`)
  ok((m.rol === 'dialog' || m.rol === 'alertdialog') && m.modal === 'false', `${et}: role=${m.rol}, no modal`)
  ok(m.desc.length > 20, `${et}: descripción enlazada`); ok(m.foco, `${et}: el foco va a la X «Cerrar aviso»`)
  ok(m.cabe, `${et}: cabe en la pantalla`); ok(m.letra >= 12, `${et}: letra mínima ${m.letra}px`); ok(!m.emoji, `${et}: sin emojis`); ok(m.logo, `${et}: casita completa (${m.tono})`); ok(!m.tapa, `${et}: no tapa el encabezado ni el título`)
  await p.waitForTimeout(1200)   // no se cierra solo
  ok(await pop.isVisible(), `${et}: sigue abierto (no se cierra solo)`)
  if (capturar && !vistos[paso + n]) { vistos[paso + n] = 1; await p.screenshot({ path: `${OUT}${paso}-${n}.png` }) }
  vistos.textos ??= {}; vistos.textos[paso] = { titulo: m.titulo, texto: m.desc }
  const como = ['Escape', 'x'][modo++ % 2]
  if (como === 'Escape') await p.keyboard.press('Escape'); else await pop.getByRole('button', { name: 'Cerrar aviso' }).click()
  // Cerró este aviso (el siguiente de la cola puede aparecer enseguida)
  await p.waitForFunction(t => !document.querySelector('.aviso-capa--sale') && ![...document.querySelectorAll('.aviso-pop__titulo')].some(h => h.textContent === t), m.titulo, { timeout: 3000 })
  await p.waitForTimeout(100)
  const f = await p.evaluate(() => ({ en: document.activeElement !== document.body && document.activeElement?.isConnected, quien: document.activeElement?.tagName + '#' + (document.activeElement?.id || document.activeElement?.className) }))
  ok(f.en, `${et}: cerrado con ${como}, el foco vuelve a ${f.quien}`)
  ok(await p.evaluate(() => !!document.querySelector('.aviso-pop') || document.body.style.overflow === ''), `${et}: la página vuelve a desplazarse`)
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
  await alerta(p, n, 'firma-inquilino', 'Firmaste el contrato', cap)
  await alerta(p, n, 'firma-dueno', 'Contrato firmado por los dos', cap)
  await p.getByRole('button', { name: /^Pagar / }).click()
  await alerta(p, n, 'pago', 'Depósito guardado', cap)
  await fotos(p, 'entrada')
  await alerta(p, n, 'entrada-inquilino', 'Confirmaste las fotos de entrada', cap)
  await alerta(p, n, 'entrada-dueno', 'Empezó el alquiler', cap)
  await p.getByRole('button', { name: 'Empezar fotos de salida' }).click()
  await alerta(p, n, 'salida-inicio', 'Empezaron las fotos de salida', cap)
  await fotos(p, 'salida')
  await alerta(p, n, 'salida-inquilino', 'Confirmaste las fotos de salida', cap)
  await alerta(p, n, 'salida-dueno', 'Fotos de salida confirmadas', cap)
}

for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) {
  console.log('==', n, w)
  const { ctx, p } = await contexto(w)
  await p.goto(B); await p.waitForTimeout(800)
  // A) sin reclamos: adelantar el plazo → devolución automática
  await hastaVentana(p, n, {})
  await p.getByRole('button', { name: 'Solo red de prueba: adelantar el plazo' }).first().click()
  await alerta(p, n, 'adelantar', 'Plazo adelantado')
  await alerta(p, n, 'devolucion', 'Depósito devuelto')
  // B) reclamo → no estoy de acuerdo → mediación (simulación) → reparto
  await hastaVentana(p, n, { capturar: false })
  await p.getByRole('button', { name: 'Hacer un reclamo como dueño de prueba' }).click()
  await p.getByLabel(/¿Cuánto reclamas\?/).fill('5'); await p.getByLabel('¿Qué pasó?').fill('Mancha en la pared de la sala que no estaba al entrar')
  await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click(); await p.getByRole('button', { name: 'Enviar reclamo' }).click()
  await alerta(p, n, 'reclamo', 'Reclamo enviado')
  await p.getByRole('button', { name: 'No estoy de acuerdo' }).click()
  await alerta(p, n, 'mediacion', 'Pasa a una persona mediadora')
  await p.getByRole('button', { name: 'Decidir como persona mediadora' }).click(); await p.getByRole('button', { name: 'Confirmar el reparto' }).click()
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
  await f.p.goto(B + '?cavos_auth_code=simulado-invalido#/')
  ok(await f.p.locator('.aviso-pop').evaluate(e => getComputedStyle(e).animationName === 'aviso-fade' && getComputedStyle(e.querySelector('.aviso-logo__llave')).animationName === 'none').catch(() => false), `ingreso-fallo (${n}): solo un fundido con movimiento reducido`)
  await alerta(f.p, n, 'ingreso-fallo', 'No pudimos completar el ingreso')
  ok(await f.p.getByRole('button', { name: 'Entrar' }).isVisible(), `ingreso-fallo (${n}): queda la pantalla de entrada`)
  await f.ctx.close()
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
