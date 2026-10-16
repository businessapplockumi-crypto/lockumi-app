// Recorrido completo de la demo + capturas. Uso: node e2e.mjs <url-base> [carpeta-capturas|-] [anchos]
import { chromium } from 'playwright'
const BASE = process.argv[2] || 'http://localhost:4610/'
const OUT = process.argv[3] && process.argv[3] !== '-' ? process.argv[3].replace(/\/?$/, '/') : null
const ANCHOS = (process.argv[4] || '390,1366').split(',').map(Number)
const url = (h) => { const u = new URL(BASE); u.hash = h; return u.toString() }
const b = await chromium.launch()
const fallas = []
for (const w of ANCHOS) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 800 ? 844 : 800 }, deviceScaleFactor: w < 800 ? 2 : 1, locale: 'es-CR', timezoneId: 'America/Costa_Rica', isMobile: w < 800, hasTouch: w < 800 })
  const p = await ctx.newPage()
  p.on('pageerror', e => fallas.push(`[${w}] error JS: ${e.message}`))
  const foto = async (n, full = true) => {
    const sw = await p.evaluate(() => document.documentElement.scrollWidth)
    if (sw > w) fallas.push(`[${w}] desborde en ${n}: ${sw}px`)
    if (OUT) await p.screenshot({ path: `${OUT}${n}-${w}.png`, fullPage: full })
  }
  const rol = (r) => p.getByRole('group', { name: 'Ver la demo como' }).getByRole('button', { name: r }).click()
  const llenarActa = async () => {
    const ej = p.getByRole('button', { name: 'Usar foto de ejemplo' }); const n = await ej.count()
    for (let i = 0; i < n; i++) await ej.nth(i).click()
    const bien = p.getByRole('button', { name: 'Bien', exact: true }); const m = await bien.count()
    for (let i = 0; i < m; i++) await bien.nth(i).click()
  }
  const firmar = async () => { await p.getByLabel(/Confirmo que esta acta/).check(); await p.getByRole('button', { name: /^Firmar como/ }).click() }
  const espera = (t) => p.getByText(t, { exact: false }).first().waitFor({ timeout: 8000 })

  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload()
  await espera('Entrá a Lockumi'); await foto('01-login')
  await p.getByLabel('Correo electrónico').fill('katherine@ejemplo.cr'); await p.getByRole('button', { name: 'Recibir enlace de acceso' }).click()
  await espera('Tus alquileres'); await foto('02-inicio')
  await p.getByRole('link', { name: '+ Nuevo alquiler' }).click(); await espera('Nuevo alquiler')
  await p.getByLabel('Dirección o nombre del inmueble').fill('Apartamento 3B, Escazú')
  await p.getByLabel('Monto del depósito (USD)').fill('750')
  await p.getByLabel('Entrada', { exact: true }).fill('01112026'); await p.getByLabel('Salida', { exact: true }).fill('31102027')
  await p.getByLabel('Nueva regla').fill('Se permite una mascota pequeña'); await p.getByRole('button', { name: 'Agregar', exact: true }).click()
  await p.getByLabel('Correo del inquilino').fill('inquilino@ejemplo.cr')
  await foto('03-crear')
  await p.getByRole('button', { name: 'Crear alquiler e invitar' }).click()
  // Entrada
  await espera('Ambas partes suben fotos'); await foto('04-entrada-vacia', false)
  await llenarActa(); await foto('05-entrada')
  await firmar(); await rol('Inquilino'); await firmar()
  // Pago
  await espera('Pago del depósito'); await foto('06-pago')
  await p.getByRole('button', { name: /^Pagar/ }).click()
  await espera('Nadie puede liberarlo solo'); await p.locator('.interruptor').click()
  await espera('Rendimiento opcional activado'); await foto('07-apartado-rendimiento')
  // Salida
  await p.getByRole('button', { name: 'Iniciar acta de salida' }).click(); await espera('A la izquierda ves')
  await llenarActa(); await foto('08-salida-comparar')
  if (OUT) await p.locator('.cuarto').first().screenshot({ path: `${OUT}08b-comparar-sala-${w}.png` })
  await firmar(); await rol('Dueño'); await firmar()
  await espera('Simular paso de 7 días'); await foto('09-ventana')
  if (OUT && w > 800) { await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.screenshot({ path: `${OUT}00-fondo-viewport-${w}.png` }) }
  await p.getByRole('button', { name: 'Simular paso de 7 días' }).click()
  await espera('Devolución automática'); await foto('10-cerrado-automatico')
  if (!(await p.getByText('USD 750,00').count())) fallas.push(`[${w}] monto devuelto no visible`)
  // Reclamo → rechazo → mediación (alquiler de ejemplo a1, ya apartado)
  await p.goto(url('/alquiler/a1')); await espera('Nadie puede liberarlo solo')
  await p.getByRole('button', { name: 'Iniciar acta de salida' }).click(); await espera('A la izquierda ves')
  await llenarActa(); await firmar(); await rol('Inquilino'); await firmar(); await rol('Dueño')
  await p.getByRole('button', { name: 'Presentar reclamo' }).click()
  await p.getByLabel('Monto que reclamás (USD)').fill('200'); await p.getByLabel('Motivo').fill('Mancha en la pared de la sala que no estaba en la entrada')
  await p.getByRole('button', { name: /Agregar foto de ejemplo/ }).click(); await foto('11-reclamo-form')
  await p.getByRole('button', { name: 'Enviar reclamo' }).click(); await espera('Reclamo abierto')
  await rol('Inquilino'); await foto('12-reclamo-inquilino')
  await p.getByRole('button', { name: 'Rechazar' }).click(); await espera('En mediación')
  await p.getByRole('button', { name: /Abrir panel del mediador/ }).click(); await foto('13-mediacion')
  await p.getByRole('button', { name: 'Emitir decisión y liberar' }).click(); await espera('Resuelto por decisión del mediador')
  await foto('14-cerrado-mediacion')
  await p.goto(url('/')); await espera('Tus alquileres'); await foto('15-inicio-final')
  console.log(`[${w}] recorrido completo OK`)
  await ctx.close()
}
await b.close()
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1) } else console.log('Sin fallas')
