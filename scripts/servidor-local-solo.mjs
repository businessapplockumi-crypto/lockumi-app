// Servidor local SOLO para pruebas: expone POST /api/solo (api/_lib/solo.ts cargado con Vite SSR) en http://localhost:8787.
// Lee las variables del entorno del proceso (no imprime ninguna). Uso: node scripts/servidor-local-solo.mjs
import { createServer as http } from 'node:http'
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { atenderSolo } = await vite.ssrLoadModule('/api/_lib/solo.ts')
const { ErrorTw } = await vite.ssrLoadModule('/api/_lib/tw.ts')
http(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/solo') { res.writeHead(404).end(); return }
  let b = ''; for await (const ch of req) b += ch
  let estado = 200, cuerpo
  try { cuerpo = await atenderSolo(process.env, JSON.parse(b), req.socket.remoteAddress ?? 'local') }
  catch (e) { estado = e instanceof ErrorTw ? e.estado : 500; cuerpo = { error: e instanceof ErrorTw ? e.message : 'Error inesperado: ' + String(e?.message).slice(0, 200) } }
  res.writeHead(estado, { 'content-type': 'application/json' }).end(JSON.stringify(cuerpo))
}).listen(8787, () => console.log('api/solo local en http://localhost:8787'))
