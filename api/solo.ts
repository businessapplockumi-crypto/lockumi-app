// POST /api/solo · Fase 1 (una sola persona, testnet, sin base de datos). Las llaves y la API key salen de process.env y nunca
// se envían al navegador: la respuesta solo lleva claves públicas (G…), ids de contrato (C…) y hashes de transacciones.
import { atenderSolo, type PedidoSolo } from './_lib/solo.js'
import { ErrorTw } from './_lib/tw.js'

export async function POST(req: Request): Promise<Response> {
  let p: PedidoSolo
  try { p = await req.json() as PedidoSolo } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'desconocida'
  try {
    return Response.json(await atenderSolo(process.env, p, ip), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorTw ? e.estado : 500
    if (!(e instanceof ErrorTw)) console.error('solo', e instanceof Error ? e.message : 'error')
    return Response.json({ error: e instanceof ErrorTw ? e.message : 'Error inesperado del servidor. Intenta de nuevo en un minuto.' }, { status: estado })
  }
}
