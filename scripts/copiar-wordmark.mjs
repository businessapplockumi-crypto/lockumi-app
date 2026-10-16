// Extrae el texto «Lockumi» (trazo #3D2A22) del logo de la landing, tal cual: mismo SVG, solo ese trazo, viewBox ajustado.
import { chromium } from 'playwright'; import fs from 'fs'
const svg = fs.readFileSync('/workspace/lockumi/landing/img/logo-lockumi.svg', 'utf8')
const b = await chromium.launch(); const p = await b.newPage()
await p.setContent(svg)
const out = await p.evaluate(() => {
  const root = document.querySelector('svg'); const path = root.querySelector('path[fill="#3D2A22"]')
  const m = root.getScreenCTM().inverse().multiply(path.getScreenCTM()); const bb = path.getBBox()
  const pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => { const q = root.createSVGPoint(); q.x = x; q.y = y; return q.matrixTransform(m) })
  const xs = pts.map(q => q.x), ys = pts.map(q => q.y); const x0 = Math.min(...xs), y0 = Math.min(...ys)
  root.querySelectorAll('path').forEach(e => { if (e !== path) e.remove() })
  root.querySelector('title')?.remove(); root.removeAttribute('aria-labelledby'); root.removeAttribute('role')
  root.setAttribute('viewBox', [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0].map(n => n.toFixed(2)).join(' '))
  root.setAttribute('aria-hidden', 'true'); root.setAttribute('class', 'wordmark')
  return root.outerHTML
})
await b.close()
fs.writeFileSync('src/wordmark.ts', `// COPIA LITERAL del texto «Lockumi» de landing/img/logo-lockumi.svg (trazo #3D2A22, sin el ícono). Regenerar con scripts/copiar-wordmark.mjs\nexport const WORDMARK_SVG = ${JSON.stringify(out)}\n`)
console.log(out.slice(0, 200))
