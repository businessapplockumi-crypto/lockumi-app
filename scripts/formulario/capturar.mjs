// Pruebas en el navegador del formulario «Nuevo alquiler» divertido (una pregunta por pantalla): textos exactos, errores que dicen
// cómo arreglarlos, teclado y foco, chips, avisos v2 de cada pantalla, celebración, movimiento reducido y que «Crear alquiler» funcione.
// Corre sobre la app construida: VITE_TRUSTLESS=1 npx vite build && npx vite preview --port 4173 &  luego  OUT=/tmp/ux/f/ node scripts/formulario/capturar.mjs
// (GIF=1 guarda cuadros gif-NNN.png). Siempre con la cuenta de demostración demo@lockumi.com.
import { chromium } from 'playwright'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { ddmmaaaa, sinAvisos } from '../_formulario.mjs'
const B = process.env.BASE || 'http://localhost:4173/', OUT = process.env.OUT || 'formulario-', GIF = !!process.env.GIF
const DUENO = Keypair.random().publicKey(), INQ = Keypair.random().publicKey(), hash = () => randomBytes(32).toString('hex')
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
if (OUT.endsWith('/')) mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })

async function contexto(w, { reducir = false } = {}) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica', ...(reducir && { reducedMotion: 'reduce' }) })
  await ctx.addInitScript(() => localStorage.setItem('lockumi.recorrido.v1.059bcb6c5fd0cda5', 'captura'))
  await ctx.addInitScript(() => localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' })))
  await ctx.route(u => !/^https?:\/\/localhost/.test(u.href) && /stellar|horizon|soroban|cavos/i.test(u.hostname), r => r.abort())
  await ctx.route('**/api/solo', async r => {
    const a = JSON.parse(r.request().postData() || '{}').accion
    const cuerpo = { dueno: { dueno: DUENO, trustlineTx: null }, 'cuenta-prueba': { inquilino: INQ, trustlineTx: null, compraTx: null },
      desplegar: { escrow: StrKey.encodeContract(randomBytes(32)), tx: hash(), trustlineTx: null, compraTx: null }, 'fondear-prueba': { tx: hash(), compraTx: null } }[a]
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{"error":"no disponible en la captura"}' })
  })
  const p = await ctx.newPage(); p.on('pageerror', e => { console.log('  pageerror', e.message); fallas.push('pageerror ' + e.message) })
  return { ctx, p }
}
const pie = (p, n) => p.locator('.fz-pie').getByRole('button', { name: n, exact: true })
const h1 = p => p.locator('#contenido h1').first()
const enfocado = p => p.evaluate(() => { const e = document.activeElement; return e ? (e.id || e.tagName + ':' + (e.textContent || '').trim().slice(0, 60)) : '' })
const estado = p => p.evaluate(() => ({ h1: [...document.querySelectorAll('#contenido h1')].filter(h => h.getBoundingClientRect().height).map(h => h.textContent),
  ahora: document.querySelector('.fz-barra')?.getAttribute('aria-valuenow'), n: document.querySelector('.fz-n')?.textContent,
  ayuda: document.querySelector('.fz-ayuda')?.textContent, errores: [...document.querySelectorAll('.campo__error')].map(e => e.textContent) }))
const avisos = p => p.$$eval('.tostada:not(.tostada--sale)', ts => ts.map(t => ({ t: t.querySelector('.tostada__t')?.textContent, l: t.querySelector('.tostada__l')?.textContent })))
const esperarAviso = async (p, t) => { for (let i = 0; i < 60; i++) { const a = await avisos(p); const x = a.find(v => v.t === t); if (x) return x; await p.waitForTimeout(100) } return null }
/** El aviso no tapa la pregunta ni el botón principal. */
const tapa = p => p.evaluate(() => { const t = document.querySelector('.tostada:not(.tostada--sale)')?.getBoundingClientRect(); if (!t) return []
  return [...document.querySelectorAll('#contenido h1, #contenido .boton--primario, .fz-cab')].map(x => ({ q: x.getBoundingClientRect(), n: x.className || x.tagName }))
    .filter(({ q }) => q.height && q.bottom > t.top + .5 && q.top < t.bottom - .5 && q.right > t.left && q.left < t.right).map(x => x.n) })
let cuadroN = 0; const cuadro = async p => { if (GIF) await p.screenshot({ path: `${OUT}gif-${String(cuadroN++).padStart(3, '0')}.png` }) }
const cuadros = async (p, n, ms = 90) => { for (let i = 0; i < n; i++) { await cuadro(p); await p.waitForTimeout(ms) } }

// ── Celular 390 px: el recorrido entero, con errores, teclado y avisos ──
{
  console.log('Celular 390 px')
  const { ctx, p } = await contexto(390)
  await p.goto(B + '#/crear'); await p.locator('#f-direccion').waitFor(); await p.waitForTimeout(500)
  let s = await estado(p)
  ok(s.h1.length === 1 && s.h1[0] === '¿Qué lugar van a alquilar?', 'pantalla 1: una sola pregunta «¿Qué lugar van a alquilar?» → ' + s.h1)
  ok(s.n === '1 de 5' && s.ahora === '1' && s.ayuda === 'Un nombre corto basta.', 'pantalla 1: «1 de 5», barra en 1 y la ayuda exacta')
  ok(await p.getAttribute('#f-direccion', 'placeholder') === 'Ej.: Apartamento en Barreal de Heredia', 'pantalla 1: el ejemplo exacto')
  ok(await p.getByLabel('Cerrar').first().isVisible(), '✕ con aria-label «Cerrar»')
  const sinFz = await p.evaluate(() => !document.body.innerText.match(/escrow|wallet|trustline|blockchain|soroban/i)); ok(sinFz, 'sin palabras técnicas a la vista')
  await p.screenshot({ path: OUT + 'm-1-lugar.png' }); await cuadros(p, 4)
  await pie(p, 'Siguiente').click(); await p.waitForTimeout(250)
  s = await estado(p); ok(s.errores.some(e => /Escribe|Pon/.test(e)), 'pantalla 1 vacía: el error dice qué hacer → ' + s.errores.join(' | '))
  ok(await enfocado(p) === 'f-direccion', 'el foco va al campo con el error')
  await p.screenshot({ path: OUT + 'm-1-error.png' }); await cuadros(p, 4)
  await p.keyboard.type('Apartamento en Barreal de Heredia', { delay: 15 })
  // Teclado: Tab al grupo de tipo y flechas
  await p.keyboard.press('Tab'); const r0 = await p.evaluate(() => document.activeElement?.getAttribute('role'))
  ok(r0 === 'radio', 'Tab llega a los chips de tipo (role=radio) → ' + r0)
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80)
  const sel = await p.evaluate(() => ({ f: document.activeElement?.textContent?.trim(), c: document.activeElement?.getAttribute('aria-checked') }))
  ok(sel.c === 'true', 'flecha a la derecha elige el siguiente tipo (aria-checked) → ' + sel.f)
  const alto = await p.locator('.fz-chip').first().evaluate(e => e.getBoundingClientRect().height); ok(alto >= 44, 'chips de 44 px o más → ' + alto)
  await cuadros(p, 3)
  await pie(p, 'Siguiente').click()
  const a1 = await esperarAviso(p, '¡Lugar listo!'); ok(a1?.l === 'Faltan 4 pasos.', 'aviso v2 «¡Lugar listo!» · «Faltan 4 pasos.» → ' + JSON.stringify(a1))
  await p.waitForTimeout(700); ok((await tapa(p)).length === 0, 'el aviso no tapa la pregunta ni el botón principal → ' + (await tapa(p)))
  await cuadros(p, 6)
  s = await estado(p); ok(s.h1[0] === '¿Cuándo empieza y cuánto dura?' && s.n === '2 de 5', 'pantalla 2: una sola pregunta, «2 de 5»')
  ok(await p.evaluate(() => document.activeElement?.tagName === 'H1' && document.activeElement.textContent === '¿Cuándo empieza y cuánto dura?'), 'el foco pasa a la pregunta nueva → ' + await enfocado(p))
  await p.screenshot({ path: OUT + 'm-2-fechas-aviso.png' })
  await sinAvisos(p)
  await pie(p, 'Siguiente').click(); await p.waitForTimeout(250)
  s = await estado(p); ok(s.errores.includes('Elige el día en que empieza.'), 'pantalla 2 vacía: «Elige el día en que empieza.» → ' + s.errores.join(' | '))
  ok(s.errores.some(e => /Elige una duración .*«Otra fecha»/.test(e)), 'pantalla 2 vacía: el fin dice cómo arreglarlo')
  await p.fill('#f-inicio', ddmmaaaa(1)); await p.waitForTimeout(150)
  await p.getByRole('radio', { name: '6 meses' }).click(); await p.waitForTimeout(150)
  const fin = await p.locator('#f-fin-boton strong').textContent(); ok(/\d\d\/\d\d\/\d\d/.test(fin), '«6 meses» pone la fecha en «Termina» → ' + fin)
  ok(await p.getByRole('radio', { name: '6 meses' }).getAttribute('aria-checked') === 'true', 'chip «6 meses» marcado')
  await p.screenshot({ path: OUT + 'm-2-fechas.png' }); await cuadros(p, 5)
  await pie(p, 'Siguiente').click(); await esperarAviso(p, '¡Fechas listas!')
  s = await estado(p); ok(s.h1[0] === '¿De cuánto es el depósito?' && s.ayuda === 'USDC de prueba, sin valor. Máximo 20.', 'pantalla 3: pregunta y ayuda exactas')
  const montos = await p.locator('[role="radio"]').allTextContents(); ok(montos.slice(0, 6).every(t => /^\d+ USDC$|^USD \d+,\d\d$/.test(t.trim())), 'montos con usd(...) → ' + montos.slice(0, 6).join(' · '))
  await cuadros(p, 4); await sinAvisos(p)
  await pie(p, 'Siguiente').click(); await p.waitForTimeout(250)
  s = await estado(p); ok(s.errores.includes('Toca un monto o escríbelo en «Otro monto».'), 'pantalla 3 vacía: el error dice cómo arreglarlo')
  await p.locator('[role="radio"]').nth(4).click(); await p.waitForTimeout(150)
  const grande = await p.locator('.fz-monto strong').textContent(); ok(/10/.test(grande), 'el monto grande sigue al chip → ' + grande)
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(150)   // el chip deja la página bajada: la captura va con la pregunta arriba
  await p.screenshot({ path: OUT + 'm-3-monto.png' }); await cuadros(p, 5)
  await pie(p, 'Siguiente').click(); await esperarAviso(p, '¡Monto listo!')
  s = await estado(p); ok(s.h1[0] === 'Reglas del lugar' && s.n === '4 de 5', 'pantalla 4: «Reglas del lugar», «4 de 5»')
  ok(await p.getByRole('button', { name: 'Sin mascotas' }).getAttribute('aria-pressed') === 'true', 'reglas con aria-pressed; «Sin mascotas» ya marcada')
  await p.getByRole('button', { name: 'Sin fumar' }).click(); ok(await p.getByRole('button', { name: 'Sin fumar' }).getAttribute('aria-pressed') === 'true', 'tocar «Sin fumar» la marca')
  await sinAvisos(p)
  await p.getByRole('button', { name: '+ Otra regla' }).click(); await p.waitForTimeout(150)
  ok(await enfocado(p) === 'f-regla', '«+ Otra regla» abre el campo y le pone el foco')
  await p.getByRole('button', { name: 'Agregar', exact: true }).click(); await p.waitForTimeout(150)
  const eR = await p.locator('#f-regla-err').textContent().catch(() => ''); ok(/Escribe/.test(eR), 'regla vacía: el error dice qué hacer → ' + eR)
  await p.fill('#f-regla', 'No usar la parrilla'); await p.keyboard.press('Enter'); await p.waitForTimeout(150)
  ok(await p.getByRole('button', { name: 'No usar la parrilla' }).getAttribute('aria-pressed') === 'true', 'la regla nueva queda como chip marcado')
  await p.screenshot({ path: OUT + 'm-4-reglas.png' }); await cuadros(p, 4)
  await pie(p, 'Revisar el contrato').click(); await p.waitForTimeout(40)
  const fz = await p.evaluate(() => ({ h: document.querySelector('.fz-fiesta h1')?.textContent, t: document.querySelector('.fz-fiesta .fz-ayuda, .fz-fiesta p')?.textContent,
    puntos: document.querySelectorAll('.fz-punto').length, anim: getComputedStyle(document.querySelector('.fz-casa--fiesta')).animationName }))
  ok(fz.h === '¡Reglas listas!' && /Falta un paso: revisar y crear\./.test(fz.t ?? ''), 'celebración «¡Reglas listas!» · «Falta un paso: revisar y crear.»')
  ok(fz.puntos === 10 && fz.anim === 'fz-salto', 'la casita salta y salen 10 puntos → ' + fz.puntos + ' ' + fz.anim)
  await p.waitForTimeout(350); await p.screenshot({ path: OUT + 'm-5-fiesta.png' }); await cuadros(p, 10, 70)
  await p.getByRole('button', { name: 'Seguir', exact: true }).click(); await p.locator('.fz-resumen').waitFor()
  s = await estado(p); ok(s.h1[0] === 'Revisar el contrato' && s.n === '5 de 5', 'pantalla 5: «Revisar el contrato», «5 de 5»')
  const res = await p.locator('.fz-resumen').innerText(); ok(/Barreal/.test(res) && /No usar la parrilla/.test(res) && /Sin fumar/.test(res), 'el resumen tiene el lugar y las reglas')
  ok(await p.getByRole('button', { name: 'Cambiar el lugar' }).isVisible(), 'cada dato tiene «Cambiar»')
  await p.screenshot({ path: OUT + 'm-6-revisar.png' }); await cuadros(p, 5)
  await p.getByRole('button', { name: 'Cambiar las reglas' }).click(); await p.waitForTimeout(200)
  ok((await estado(p)).h1[0] === 'Reglas del lugar', '«Cambiar» lleva a su pantalla'); await pie(p, 'Revisar el contrato').click(); await p.getByRole('button', { name: 'Seguir', exact: true }).click()
  await sinAvisos(p)
  await pie(p, 'Crear alquiler').click()
  const ac = await esperarAviso(p, 'Alquiler creado'); ok(!!ac, 'al crear: aviso v2 «Alquiler creado» → ' + JSON.stringify(ac))
  await p.waitForURL(/#\/alquiler\//, { timeout: 15000 }).catch(() => {}); ok(/#\/alquiler\//.test(p.url()), 'crear funciona: abre el alquiler nuevo')
  await cuadros(p, 8)
  await p.screenshot({ path: OUT + 'm-7-creado.png' })
  ok(!(await p.content()).includes('katherine'), 'sin el correo real en la pantalla')
  // Atrás conserva los datos
  await p.goto(B + '#/crear'); await p.locator('#f-direccion').waitFor(); await p.fill('#f-direccion', 'Casa en Escazú'); await pie(p, 'Siguiente').click(); await p.waitForTimeout(200)
  await pie(p, 'Atrás').click(); await p.waitForTimeout(200); ok(await p.inputValue('#f-direccion') === 'Casa en Escazú', '«Atrás» vuelve con lo escrito')
  await ctx.close()
}

// ── Computadora 1280 px ──
{
  console.log('Computadora 1280 px')
  const { ctx, p } = await contexto(1280)
  await p.goto(B + '#/crear'); await p.locator('#f-direccion').waitFor(); await p.waitForTimeout(400)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.keyboard.press('Enter'); await p.waitForTimeout(250)
  const s = await estado(p); ok(s.h1[0] === '¿Cuándo empieza y cuánto dura?', 'Enter en el campo pasa a la pantalla siguiente → ' + s.h1)
  await p.fill('#f-inicio', ddmmaaaa(1)); await p.getByRole('radio', { name: '1 año' }).click(); await p.waitForTimeout(400)
  const w = await p.locator('.fz-tarjeta').evaluate(e => e.getBoundingClientRect().width); ok(w <= 640, 'en computadora la tarjeta queda angosta y centrada → ' + w)
  await p.screenshot({ path: OUT + 'd-2-fechas.png' })
  await ctx.close()
}

// ── Movimiento reducido ──
{
  console.log('Movimiento reducido')
  const { ctx, p } = await contexto(390, { reducir: true })
  await p.goto(B + '#/crear'); await p.locator('#f-direccion').waitFor()
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await pie(p, 'Siguiente').click()
  await p.fill('#f-inicio', ddmmaaaa(1)); await p.getByRole('radio', { name: '3 meses' }).click(); await pie(p, 'Siguiente').click()
  await p.locator('[role="radio"]').nth(2).click(); await pie(p, 'Siguiente').click(); await p.locator('[data-recorrido="reglas"]').waitFor()
  const brillo = await p.locator('.fz-barra__lleno').evaluate(e => getComputedStyle(e, '::after').animationName); ok(brillo === 'none', 'sin brillo en la barra → ' + brillo)
  await pie(p, 'Revisar el contrato').click(); await p.waitForTimeout(40)
  const m = await p.evaluate(() => ({ casa: getComputedStyle(document.querySelector('.fz-casa--fiesta')).animationName, punto: getComputedStyle(document.querySelector('.fz-punto')).animationName, op: getComputedStyle(document.querySelector('.fz-punto')).opacity }))
  ok(m.casa === 'none' && m.punto === 'none' && m.op === '0', 'sin salto ni confeti → ' + JSON.stringify(m))
  ok(await p.getByRole('heading', { name: '¡Reglas listas!' }).isVisible(), 'el texto de la celebración sigue a la vista')
  await ctx.close()
}

await browser.close()
console.log(fallas.length ? `\nFALLAS (${fallas.length}):\n- ` + fallas.join('\n- ') : '\nTODO BIEN')
process.exit(fallas.length ? 1 : 0)
