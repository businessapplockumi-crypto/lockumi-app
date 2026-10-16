import { chromium } from 'playwright'
const out = '/workspace/lockumi/capturas/app-v1/'
const b = await chromium.launch()
for (const [w, dsf] of [[390, 2], [1366, 1]]) {
  const p = await b.newPage({ locale: 'es-CR', viewport: { width: w, height: w === 390 ? 844 : 800 }, deviceScaleFactor: dsf })
  await p.goto('http://localhost:4610/'); await p.evaluate(() => localStorage.clear()); await p.reload()
  await p.screenshot({ path: out + `login-${w}.png`, fullPage: true })
  await p.click('text=Continuar con Google'); await p.waitForSelector('text=Tus alquileres')
  await p.screenshot({ path: out + `inicio-${w}.png`, fullPage: true })
  await p.goto('http://localhost:4610/#/crear'); await p.waitForSelector('text=Nuevo alquiler')
  await p.fill('input[placeholder^="Ej."]', 'Apartamento 3B, Escazú'); await p.fill('input[type=number]', '750')
  await p.screenshot({ path: out + `crear-${w}.png`, fullPage: true })
  console.log(w, await p.evaluate(() => document.documentElement.scrollWidth))
}
await b.close()
