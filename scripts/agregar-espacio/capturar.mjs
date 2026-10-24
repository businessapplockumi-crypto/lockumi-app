// «+ Agregar espacio» en el navegador (390 y 1280 px), con Vite en localhost:5173 (VITE_TRUSTLESS=1 y VITE_CAVOS_APP_ID, como producción).
// /api/solo se responde AQUÍ con datos de ejemplo (no se paga nada) y se bloquea Stellar/Cavos. Sesión simulada con demo@lockumi.com.
// Revisa: lista de espacios, hoja con foco atrapado y Esc, duplicados (sin mayúsculas ni tildes), chips y plantilla, «+ Otro punto»,
// aviso «Espacio agregado» → «Tomar foto →», cambiar nombre, quitar con fotos (se BORRAN: «Mantener el espacio» primero con el foco,
// sin «Deshacer»), quitar sin fotos con «Deshacer», volver a agregar = sin fotos, lista fija después de las dos confirmaciones y la salida con los mismos espacios. GIF=1 guarda cuadros del festejo.
// Uso: OUT=/tmp/ux/esp/ CHROME=… node scripts/agregar-espacio/capturar.mjs
import { chromium } from 'playwright'
import { Keypair, StrKey } from '@stellar/stellar-sdk'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
const B = 'http://localhost:5173/', OUT = process.env.OUT || 'agregar-espacio-', APP_ID = (process.env.VITE_CAVOS_APP_ID || 'captura-local').trim()
mkdirSync(OUT.replace(/[^/]*$/, '') || '.', { recursive: true })
const hash = () => randomBytes(32).toString('hex')
const fallas = []; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fallas.push(m) }
const browser = await chromium.launch({ ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })

async function contexto(w) {
  const movil = w < 600
  const ctx = await browser.newContext({ viewport: { width: w, height: movil ? 844 : 900 }, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil, locale: 'es-CR', timezoneId: 'America/Costa_Rica' })
  await ctx.addInitScript(id => {
    localStorage.setItem('lockumi.usuario', JSON.stringify({ email: 'demo@lockumi.com', nombre: 'Demo', metodo: 'google' }))
    localStorage.setItem('cavos-kit:identity:' + id, JSON.stringify({ userId: 'google-oauth2|simulado-demo', email: 'demo@lockumi.com', name: 'Demo' }))
    localStorage.setItem('lockumi.recorrido.v1.059bcb6c5fd0cda5', 'captura')
  }, APP_ID)
  await ctx.route(u => !/^https?:\/\/localhost/.test(u.href), r => r.abort())
  const D = Keypair.random().publicKey(), I = Keypair.random().publicKey()
  await ctx.route('**/api/solo', async r => {
    const a = JSON.parse(r.request().postData() || '{}').accion
    const cuerpo = { dueno: { dueno: D, trustlineTx: null }, 'cuenta-prueba': { inquilino: I, trustlineTx: null, compraTx: null },
      desplegar: { escrow: StrKey.encodeContract(randomBytes(32)), tx: hash(), trustlineTx: null, compraTx: null }, 'fondear-prueba': { tx: hash(), compraTx: null } }[a]
    await r.fulfill(cuerpo ? { status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) } : { status: 503, contentType: 'application/json', body: '{}' })
  })
  const p = await ctx.newPage(); p.on('pageerror', e => { console.log('  pageerror', e.message); fallas.push('pageerror ' + e.message) })
  return { ctx, p }
}
const tostada = (p, t) => p.locator('.tostada:not(.tostada--sale)').filter({ has: p.locator('.tostada__t', { hasText: t }) })
const cerrarTostadas = async p => { for (const t of await p.locator('.tostada:not(.tostada--sale)').all()) await t.click({ position: { x: 60, y: 12 } }).catch(() => {}); await p.waitForTimeout(350) }
const filas = p => p.locator('.esp__fila strong').allTextContents()
const fila = (p, nombre) => p.locator('.esp__fila').filter({ has: p.locator('strong', { hasText: new RegExp('^' + nombre + '$') }) })
const verLista = async p => { await p.locator('.esp__ver').click(); await p.locator('.esp__agregar, .esp__nota').first().waitFor() }
const dentro = (p, sel) => p.evaluate(s => !!document.querySelector(s)?.contains(document.activeElement), sel)
const foco = p => p.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.id)
const quieto = p => p.waitForTimeout(450)

async function hastaFotos(p) {
  const d = k => { const x = new Date(); x.setDate(x.getDate() + k); return [x.getDate(), x.getMonth() + 1, x.getFullYear()].map((v, i) => String(v).padStart(i < 2 ? 2 : 4, '0')).join('') }
  await p.goto(B + '#/crear'); await p.waitForTimeout(800)
  await p.fill('#f-direccion', 'Apartamento en Barreal de Heredia'); await p.fill('#f-monto', '20'); await p.fill('#f-inicio', d(0)); await p.fill('#f-fin', d(182))
  await p.getByRole('button', { name: 'Crear alquiler de prueba' }).click()
  await p.getByLabel('Leí el contrato y estoy de acuerdo.').check(); await p.getByRole('button', { name: 'Firma como inquilino' }).click()
  await p.locator('button:not(.tostada__accion)').filter({ hasText: /^Pagar / }).click({ timeout: 20000 })
  await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).waitFor({ timeout: 30000 }); await cerrarTostadas(p)
}
async function completar(p, cual) {
  for (let k = 0; k < 14; k++) {
    if (await p.getByRole('button', { name: 'Confirmar como inquilino' }).count()) break
    await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click()
    for (const b of await p.getByRole('button', { name: 'Bien', exact: true }).all()) await b.click()
    await p.getByRole('button', { name: /^(Siguiente espacio|Revisar y confirmar)$/ }).click(); await p.waitForTimeout(150)
  }
  await p.getByLabel(cual === 'entrada' ? 'Las fotos muestran cómo está el lugar al entrar.' : 'Las fotos muestran cómo quedó el lugar al salir.').check()
  await p.getByRole('button', { name: 'Confirmar como inquilino' }).click()
}

for (const [n, w] of [['movil', 390], ['escritorio', 1280]]) {
  console.log('==', n, w)
  const { ctx, p } = await contexto(w)
  await p.goto(B); await p.waitForTimeout(600)
  await hastaFotos(p)
  ok(await p.locator('.esp__ver').textContent() === 'Ver la lista de espacios (4) o agregar uno', `${n}: en cada espacio, enlace a la lista`)
  await verLista(p)
  ok(JSON.stringify(await filas(p)) === '["Sala","Cocina","Dormitorio","Baño"]', `${n}: la lista empieza con los 4 espacios de siempre`)
  ok(await p.locator('.esp__ayuda').textContent() === '¿Falta un lugar? Agrega patio, cochera o el que tenga la casa.', `${n}: ayuda debajo del botón`)
  ok(await p.getByText('demo@lockumi.com').count() > 0 || await p.evaluate(() => document.body.innerText.includes('demo@lockumi.com')), `${n}: la sesión es demo@lockumi.com`)
  await quieto(p); await p.screenshot({ path: `${OUT}${n}-lista.png` })
  // Hoja: foco, trampa, Esc
  const agregar = p.locator('.esp__agregar'); await agregar.click()
  const hoja = p.locator('.esp-hoja[role="dialog"]'); await hoja.waitFor()
  ok(await p.evaluate(() => document.activeElement?.id) === 'esp-nombre', `${n}: la hoja abre con el foco en el nombre`)
  let fuera = false; for (let k = 0; k < 16; k++) { await p.keyboard.press('Tab'); if (!await dentro(p, '.esp-hoja')) fuera = true }
  ok(!fuera, `${n}: Tab queda dentro de la hoja`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  ok(await hoja.count() === 0 && await agregar.evaluate(e => e === document.activeElement), `${n}: Esc cierra y el foco vuelve a «+ Agregar espacio»`)
  await agregar.click(); await hoja.waitFor()
  await p.fill('#esp-nombre', ' baño '); await p.waitForTimeout(150)
  ok((await hoja.locator('.error').textContent().catch(() => '')) === 'Ya hay un espacio con ese nombre.', `${n}: «baño» choca con «Baño» (sin mayúsculas ni tildes)`)
  ok(await hoja.getByRole('button', { name: 'Usar «baño 2»' }).count() === 1, `${n}: propone «baño 2»`)
  await p.fill('#esp-nombre', 'x'.repeat(35)); await p.waitForTimeout(150)
  ok(await p.locator('#esp-nombre').inputValue().then(v => v.length) <= 40 && /Máximo 30/.test(await hoja.locator('.error').textContent().catch(() => '')), `${n}: más de 30 letras: «Máximo 30 letras.»`)
  await p.fill('#esp-nombre', '')
  const chip = hoja.locator('.esp-chip', { hasText: 'Patio' }); await chip.click()
  ok(await chip.getAttribute('aria-pressed') === 'true' && await p.locator('#esp-nombre').inputValue() === 'Patio', `${n}: el chip «Patio» llena el nombre (aria-pressed)`)
  const pl = (await hoja.locator('.esp-puntos label.check').allTextContents()).map(t => t.trim())
  ok(JSON.stringify(pl) === '["Piso o zacate","Paredes y portón","Luces y enchufes","Desagües"]', `${n}: plantilla de Patio (${pl.join(' · ')})`)
  await hoja.getByRole('button', { name: '+ Otro punto' }).click(); await p.fill('#esp-punto', 'Pila de lavar'); await hoja.getByRole('button', { name: 'Agregar punto' }).click()
  ok(await hoja.locator('.esp-puntos label.check').count() === 5, `${n}: «+ Otro punto» agrega «Pila de lavar»`)
  ok((await hoja.locator('.esp__nota--info').textContent()).includes('En esta demo, el dueño es un rol de prueba que confirma solo.'), `${n}: nota de Legal: quién ve la lista`)
  await quieto(p); await p.screenshot({ path: `${OUT}${n}-hoja.png` })
  // GIF: el festejo dura 1,2 s; para tener cuadros parejos se pasa a cámara lenta (×5) solo en la captura.
  const lento = process.env.GIF && n === 'movil'
  const cdp = lento && await p.context().newCDPSession(p)
  if (lento) { await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.2 })
    await p.evaluate(() => { const t = window.setTimeout; window.setTimeout = (f, ms, ...r) => t(f, ms === 1200 ? 6000 : ms, ...r) }) }
  await hoja.getByRole('button', { name: 'Agregar espacio' }).click()
  const nueva = p.locator('.esp__fila--nueva'); await nueva.waitFor()
  const fn = await nueva.evaluate(e => ({ t: e.querySelector('strong')?.textContent, ag: e.querySelector('.esp__agregado')?.textContent, puntos: document.querySelectorAll('.esp__puntos .esp__punto').length }))
  ok(fn.t === 'Patio' && fn.ag === 'Agregado', `${n}: Patio al final, con «Agregado» y el festejo`)
  ok(fn.puntos === 6, `${n}: festejo de 6 puntos`)
  const av = tostada(p, 'Espacio agregado'); await av.waitFor()
  ok((await av.textContent()).includes('Patio está en la lista. Ahora: una foto') && await av.locator('.tostada__accion').textContent() === 'Tomar foto →', `${n}: aviso v2 «Espacio agregado» con «Tomar foto →»`)
  if (lento) { for (let k = 0; k < 24; k++) { await p.screenshot({ path: `${OUT}gif-${String(k).padStart(3, '0')}.png` }); await p.waitForTimeout(100) }
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 }) }
  else { await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}${n}-agregado.png` }) }
  if (await av.count()) await av.locator('.tostada__accion').click(); else { ok(n === 'movil', `${n}: el aviso se escondió durante los cuadros del GIF: se abre Patio desde la fila`); await fila(p, 'Patio').locator('.esp__abrir').click() }
  await p.waitForTimeout(300)
  ok(await p.getByText('Pila de lavar').count() === 1 && await p.locator('.esp__ver').count() === 1, `${n}: «Tomar foto →» abre Patio con su lista`)
  await p.getByRole('button', { name: 'Demo: usar una foto de ejemplo' }).click()   // una foto al Patio
  await cerrarTostadas(p); await verLista(p)
  // Cambiar nombre
  await fila(p, 'Patio').locator('.esp__mas-op').click()
  ok(await p.evaluate(() => document.activeElement?.getAttribute('role')) === 'menuitem', `${n}: el menú ⋯ abre con el foco en la primera opción`)
  await p.getByRole('menuitem', { name: 'Cambiar nombre' }).click()
  await p.fill('#esp-renombre', 'sála'); await p.waitForTimeout(150)
  ok(/Ya hay un espacio/.test(await p.locator('.esp-hoja .error').textContent().catch(() => '')), `${n}: renombrar a «sála» choca con «Sala»`)
  await p.fill('#esp-renombre', 'Terraza'); await p.getByRole('button', { name: 'Guardar' }).click()
  await tostada(p, 'Nombre cambiado').waitFor()
  ok(JSON.stringify(await filas(p)) === '["Sala","Cocina","Dormitorio","Baño","Terraza"]' && (await fila(p, 'Terraza').textContent()).includes('1 foto'), `${n}: Terraza con su foto (mismo id)`)
  await cerrarTostadas(p)
  // Quitar con fotos (Terraza tiene 1): «Mantener el espacio» primero, con el foco
  await fila(p, 'Terraza').locator('.esp__mas-op').click(); await p.getByRole('menuitem', { name: 'Quitar espacio' }).click()
  const dlg = p.locator('[role="alertdialog"]'); await dlg.waitFor()
  const b = await dlg.locator('button').allTextContents()
  ok(JSON.stringify(b) === '["Mantener el espacio","Quitar espacio"]' && await foco(p) === 'Mantener el espacio', `${n}: con fotos: «Mantener el espacio» primero y con el foco`)
  ok((await dlg.locator('#esp-q-d').textContent()).includes('Este espacio ya tiene 1 foto y su lista revisada. Si lo quitas, se borran y no podrás recuperarla. Si lo vuelves a agregar, tendrás que tomar fotos nuevas.'), `${n}: texto de Legal (24/10) al quitar con 1 foto`)
  await quieto(p); await p.screenshot({ path: `${OUT}${n}-quitar.png` })
  await dlg.getByRole('button', { name: 'Quitar espacio' }).click()
  const q = tostada(p, 'Espacio quitado'); await q.waitFor()
  ok(!(await filas(p)).includes('Terraza') && await q.locator('.tostada__accion').count() === 0, `${n}: Terraza y su foto se borraron (sin «Deshacer»)`)
  await cerrarTostadas(p)
  // Volver a agregarla: espacio nuevo, sin fotos
  await agregar.click(); await hoja.waitFor(); await p.fill('#esp-nombre', 'Terraza'); await hoja.getByRole('button', { name: 'Agregar espacio' }).click()
  await tostada(p, 'Espacio agregado').waitFor(); await cerrarTostadas(p)
  ok((await fila(p, 'Terraza').textContent()).includes('Sin fotos'), `${n}: al volver a agregar Terraza no trae fotos (hay que tomarlas de nuevo)`)
  // Quitar sin fotos: Dormitorio; foco en Cancelar
  await fila(p, 'Dormitorio').locator('.esp__mas-op').click(); await p.getByRole('menuitem', { name: 'Quitar espacio' }).click(); await dlg.waitFor()
  ok(JSON.stringify(await dlg.locator('button').allTextContents()) === '["Quitar espacio","Cancelar"]' && await foco(p) === 'Cancelar', `${n}: sin fotos: «Quitar espacio» y «Cancelar» (foco en Cancelar)`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await dlg.count() === 0, `${n}: Esc cierra el aviso de quitar`)
  await fila(p, 'Dormitorio').locator('.esp__mas-op').click(); await p.getByRole('menuitem', { name: 'Quitar espacio' }).click(); await dlg.getByRole('button', { name: 'Quitar espacio' }).click()
  const q2 = tostada(p, 'Espacio quitado'); await q2.waitFor()
  ok(JSON.stringify(await filas(p)) === '["Sala","Cocina","Baño","Terraza"]', `${n}: Dormitorio quitado`)
  await q2.locator('.tostada__accion', { hasText: 'Deshacer' }).click(); await p.waitForTimeout(400)
  ok(JSON.stringify(await filas(p)) === '["Sala","Cocina","Dormitorio","Baño","Terraza"]', `${n}: sin fotos: «Deshacer» lo devuelve a su lugar`)
  await cerrarTostadas(p)
  await fila(p, 'Dormitorio').locator('.esp__mas-op').click(); await p.getByRole('menuitem', { name: 'Quitar espacio' }).click(); await dlg.getByRole('button', { name: 'Quitar espacio' }).click()
  await p.waitForTimeout(300); await cerrarTostadas(p)
  // Confirmar la entrada → lista fija; salida con los mismos espacios
  await fila(p, 'Sala').locator('.esp__abrir').click(); await completar(p, 'entrada')
  await p.getByRole('button', { name: 'Empezar fotos de salida' }).click({ timeout: 30000 }); await cerrarTostadas(p)
  ok(await p.locator('.esp__ver').textContent() === 'Ver la lista de espacios (4) o agregar uno' || await p.locator('.esp__ver').count() === 1, `${n}: salida: enlace a la lista`)
  await verLista(p)
  ok(JSON.stringify(await filas(p)) === '["Sala","Cocina","Baño","Terraza"]', `${n}: salida con los mismos espacios, en el mismo orden`)
  ok(await p.locator('.esp__agregar').count() === 0 && await p.locator('.esp__mas-op').count() === 0 && (await p.locator('.esp').textContent()).includes('En la salida no se agregan ni se quitan espacios.'), `${n}: en la salida no se agregan ni se quitan`)
  ok((await fila(p, 'Terraza').textContent()).includes('Al entrar: 1 foto'), `${n}: salida: Terraza muestra la foto de entrada`)
  ok((await p.locator('.esp').textContent()).includes('La entrada ya está firmada por los dos. Los espacios, las fotos y la lista quedan guardados como respaldo y ya no se pueden cambiar ni borrar.'), `${n}: después de firmar: sin controles para quitar y con la explicación de Legal`)
  await quieto(p); await p.screenshot({ path: `${OUT}${n}-salida.png` })
  await ctx.close()
}
await browser.close()
console.log(fallas.length ? `FALLAS: ${fallas.length}\n` + fallas.join('\n') : 'TODO OK')
process.exit(fallas.length ? 1 : 0)
