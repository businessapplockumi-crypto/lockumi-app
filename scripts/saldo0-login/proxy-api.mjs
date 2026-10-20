// Proxy local SOLO para pruebas: POST /api/solo de http://localhost:8787 → la vista previa protegida de Vercel con `vercel curl`
// (protección de Vercel resuelta por la CLI oficial; VC_DIR = carpeta con .vercel/project.json del proyecto). No imprime secretos.
// Uso: DESTINO=https://…vercel.app VC_DIR=… [PUERTO=8797] node proxy-api.mjs
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
const DESTINO = process.env.DESTINO, VC_DIR = process.env.VC_DIR || process.cwd(), PUERTO = Number(process.env.PUERTO || 8787)
const log = fs.createWriteStream(process.env.LOG || 'proxy.log', { flags: 'a' })
createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/api/solo')) { res.writeHead(404).end(); return }
  let b = ''; for await (const ch of req) b += ch
  const f = `${VC_DIR}/cuerpo-${Date.now()}-${Math.random().toString(36).slice(2)}.json`; fs.writeFileSync(f, b)
  const t0 = Date.now()
  execFile('vercel', ['curl', '/api/solo', '--deployment', DESTINO, '--yes', '--', '-s', '-X', 'POST', '-H', 'content-type: application/json', '--data-binary', '@' + f, '-w', '\n%{http_code}'],
    { cwd: VC_DIR, maxBuffer: 1e7, timeout: 120000 }, (err, out) => {
      fs.rmSync(f, { force: true })
      const lineas = String(out).trimEnd().split('\n'); const codigo = Number(lineas.pop()) || 502; const cuerpo = lineas.join('\n')
      const accion = (b.match(/"accion":"([^"]+)"/) || [])[1]
      log.write(`${new Date().toISOString()} ${accion} ${codigo} ${((Date.now() - t0) / 1000).toFixed(1)}s ${cuerpo.slice(0, 300)}\n`)
      res.writeHead(codigo, { 'content-type': 'application/json' }).end(cuerpo || JSON.stringify({ error: 'proxy: ' + String(err?.message).slice(0, 100) }))
    })
}).listen(PUERTO, () => console.log('proxy /api/solo →', DESTINO, 'en', PUERTO))
