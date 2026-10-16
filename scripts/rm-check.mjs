import { chromium } from 'playwright'
const b = await chromium.launch(); const out = []
for (const url of ['http://localhost:4620/', 'http://localhost:4610/']) {
  const ctx = await b.newContext({ viewport: { width: 600, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage()
  await p.goto(url); await p.waitForSelector('.listo .casita-hero')
  await p.addStyleTag({ content: '.portada__arte{width:300px!important;translate:none!important} body{background:#FFF5EE!important} .aurora,.blob{display:none!important}' })
  await p.waitForTimeout(800)
  out.push({ running: await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), img: (await p.locator('.portada__arte').screenshot()).toString('base64') })
  await ctx.close()
}
const p = await b.newPage()
const r = await p.evaluate(async ([a, c]) => {
  const ld = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s })
  const A = await ld(a), C = await ld(c); const W = Math.min(A.width, C.width), H = Math.min(A.height, C.height)
  const d = im => { const k = document.createElement('canvas'); k.width = W; k.height = H; const x = k.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, W, H).data }
  const X = d(A), Y = d(C); let n = 0; for (let i = 0; i < X.length; i += 4) if (Math.abs(X[i] - Y[i]) + Math.abs(X[i+1] - Y[i+1]) + Math.abs(X[i+2] - Y[i+2]) > 24) n++; return n
}, [out[0].img, out[1].img])
console.log('reduced-motion: animaciones activas landing/app =', out[0].running, out[1].running, '· px distintos =', r)
await b.close()
