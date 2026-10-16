import { chromium } from 'playwright'
const OUT = '/workspace/lockumi/capturas/app-v4/'
const APP = process.argv[2] || 'http://localhost:4610/'; const LAND = 'http://localhost:4620/'
const b = await chromium.launch()
const congelar = (p, t) => p.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t }), t)
async function entrada(w, nombre, t) {
  const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 844 : 800 }, deviceScaleFactor: w < 800 ? 2 : 1, locale: 'es-CR' })
  await p.goto(APP); await p.evaluate(() => localStorage.clear()); await p.reload()
  await p.waitForSelector('.listo .casita-hero'); await p.waitForTimeout(300); await congelar(p, t)
  await p.screenshot({ path: OUT + nombre })
  console.log(nombre, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), 'arte', await p.evaluate(() => Math.round(document.querySelector('.portada__arte').getBoundingClientRect().width)))
  await p.close()
}
await entrada(390, 'entrada-390.png', 6000)        // estado final del ciclo (cerradura cerrada, sin llave)
await entrada(390, 'entrada-390-mitad.png', 1500)  // a mitad de animación (llave girando)
await entrada(1366, 'entrada-1366.png', 6000)
// Comparación: mismo tamaño (300 px), mismo instante de animación, fondo neutro
const pares = []
for (const T of [1500, 6000]) {
  const imgs = []
  for (const [url, prep] of [[LAND, null], [APP, true]]) {
    const p = await b.newPage({ viewport: { width: 600, height: 900 }, deviceScaleFactor: 2 })
    await p.goto(url); if (prep) { await p.evaluate(() => localStorage.clear()); await p.reload() }
    await p.waitForSelector('.listo .casita-hero')
    await p.addStyleTag({ content: '.portada__arte{width:300px!important;translate:none!important} body{background:#FFF5EE!important} .aurora,.blob{display:none!important}' })
    await p.waitForTimeout(300); await congelar(p, T)
    imgs.push((await p.locator('.portada__arte').screenshot()).toString('base64')); await p.close()
  }
  pares.push({ T, imgs })
}
const p = await b.newPage({ viewport: { width: 1300, height: 1400 } })
await p.setContent(`<body style="margin:0;font:600 18px Inter,sans-serif;background:#fff;color:#3D2A22;padding:20px">
${pares.map(x => `<div style="display:flex;gap:40px;margin-bottom:20px">${x.imgs.map((im, i) => `<figure style="margin:0"><figcaption>${i ? 'App (lockumi-app-demo)' : 'Landing (lockumi.com hero)'} · t=${x.T} ms</figcaption><img id="i${x.T}${i}" style="width:600px" src="data:image/png;base64,${im}"></figure>`).join('')}</div>`).join('')}</body>`)
await p.waitForTimeout(300)
await p.screenshot({ path: OUT + 'comparacion-logo.png', fullPage: true })
const diffs = await p.evaluate(async (ts) => ts.map(T => {
  const a = document.getElementById('i' + T + '0'), c = document.getElementById('i' + T + '1')
  const W = Math.min(a.naturalWidth, c.naturalWidth), H = Math.min(a.naturalHeight, c.naturalHeight)
  const cv = (im) => { const k = document.createElement('canvas'); k.width = W; k.height = H; const x = k.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, k.width, k.height).data }
  const A = cv(a), C = cv(c); let dif = 0, max = 0
  for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - C[i]), Math.abs(A[i + 1] - C[i + 1]), Math.abs(A[i + 2] - C[i + 2])); if (d > 8) dif++; max = Math.max(max, d) }
  return { T, px: A.length / 4, pxDistintos: dif, pct: +(100 * dif / (A.length / 4)).toFixed(3), max }
}), [1500, 6000])
console.log(JSON.stringify(diffs))
await b.close()
