// API FALSA para el ensayo local: imita POST /v1/projects/{ref}/database/query sobre un Postgres local (nunca Supabase).
// Manda el texto completo en una sola consulta simple (varias sentencias, como la API real), devuelve las filas de la
// última sentencia que devuelve filas, y un 400 con { message } si hay error. read_only = transacción de solo lectura.
// Uso (lo arranca ensayo-local.sh): NODE_PATH=<carpeta con pg> PGHOST=… PGPORT=… node api-falsa.mjs <puerto> <token falso>
import http from 'node:http'
import { appendFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const { Client } = createRequire(process.env.NODE_PATH + '/')('pg')
const [puerto, token] = process.argv.slice(2)
http.createServer(async (req, res) => {
  const fin = (s, j) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)) }
  if (req.method !== 'POST' || !/^\/v1\/projects\/sddgjnuvxzkrhhuczuly\/database\/query$/.test(req.url)) return fin(404, { message: 'no existe' })
  if (req.headers.authorization !== `Bearer ${token}`) return fin(401, { message: 'Unauthorized' })
  let b = ''; for await (const c of req) b += c
  const { query, read_only } = JSON.parse(b)
  if (process.env.LOG_API) appendFileSync(process.env.LOG_API, `-- consulta${read_only ? ' (solo lectura)' : ''}\n${query}\n`)
  const db = new Client({ user: 'postgres', database: 'postgres' }); await db.connect()   // una conexión nueva por consulta
  try {
    if (read_only) await db.query('begin read only')
    let r = await db.query(query); if (read_only) await db.query('commit')
    r = [].concat(r); const con = r.filter(x => x.fields?.length).at(-1)
    fin(201, con ? con.rows : [])
  } catch (e) { fin(400, { message: `Failed to run sql query: ERROR: ${e.message}` }) } finally { await db.end().catch(() => {}) }
}).listen(+puerto, '127.0.0.1', () => console.log(`api falsa en 127.0.0.1:${puerto}`))
