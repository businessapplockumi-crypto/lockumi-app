// POST /api/invitacion-correo · «Enviar por correo» la invitación (Resend). Ver api/_lib/invitacion.ts.
// RESEND_API_KEY vive solo en el servidor. Si falta, responde 503 con un mensaje claro; crear el alquiler no depende de esto.
import { enviarInvitacion, type PedidoCorreo } from './_lib/invitacion.js'
import { ErrorTw } from './_lib/tw.js'

export async function POST(req: Request): Promise<Response> {
  let p: PedidoCorreo
  try { p = await req.json() as PedidoCorreo } catch { return Response.json({ error: 'Pedido inválido.' }, { status: 400 }) }
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  try {
    return Response.json(await enviarInvitacion(process.env, p, jwt), { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    const estado = e instanceof ErrorTw ? e.estado : 500
    if (!(e instanceof ErrorTw)) console.error('invitacion-correo', e instanceof Error ? e.message : 'error')
    return Response.json({ error: e instanceof ErrorTw ? e.message : 'No pudimos enviar el correo. Toca «Copiar link» y envíalo tú.' }, { status: estado })
  }
}
