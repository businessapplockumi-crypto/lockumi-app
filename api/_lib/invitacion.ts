// «Enviar por correo» la invitación de un alquiler (solo servidor). Usa Resend (https://resend.com/docs/api-reference/emails/send-email).
// El correo se arma con los datos de la base (lk_ver_invitacion con la sesión de quien llama), nunca con lo que mande el navegador:
// así nadie puede usar la ruta para mandar correos a cualquier dirección. Si falta RESEND_API_KEY, responde un mensaje claro (503) y
// el alquiler y el link siguen funcionando igual.
import { ErrorTw, type Entorno } from './tw.js'

export interface PedidoCorreo { id?: unknown; token?: unknown; origen?: unknown }
interface Vista { direccion: string; monto: number | string; inicio: string; fin: string; rol_invitado: 'dueno' | 'inquilino'; rol_creador: 'dueno' | 'inquilino'
  email_invitado: string; email_creador: string; expira: string; reglas: string[]; reglas_por_confirmar: boolean }
type Fetch = typeof fetch

export const REMITENTE = 'Lockumi <invitaciones@lockumi.com>'
export const SIN_RESEND = 'El envío por correo todavía no está configurado. Toca «Copiar link» y envíalo por WhatsApp o por tu correo: funciona igual.'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, TOKEN = /^[0-9a-f]{64}$/
const nombre = (r: string) => r === 'dueno' ? 'dueño' : 'inquilino'
const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const dia = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Costa_Rica' })

/** Origen del link: solo la app publicada, sus vistas previas en Vercel o el equipo local. Cualquier otro → app.lockumi.com. */
export function origenSeguro(o: unknown): string {
  const s = typeof o === 'string' ? o.replace(/\/$/, '') : ''
  return /^https:\/\/app\.lockumi\.com$/.test(s) || /^https:\/\/lockumi-app[a-z0-9-]*-businessapplockumi-4427\.vercel\.app$/.test(s) || /^http:\/\/localhost:\d{2,5}$/.test(s)
    ? s : 'https://app.lockumi.com'
}

/** Asunto, texto y HTML del correo, en español neutro. */
export function armarCorreo(v: Vista, link: string) {
  const quien = `${v.rol_creador === 'dueno' ? 'El dueño' : 'El inquilino'} (${v.email_creador})`
  const monto = Number(v.monto).toLocaleString('es-CR', { maximumFractionDigits: 7 })
  const paso = v.rol_invitado === 'dueno'
    ? 'Al entrar, revisas las reglas que propuso el inquilino: puedes confirmarlas o cambiarlas. Después firman los dos y el inquilino deposita.'
    : 'Al entrar, aceptas las reglas del dueño. Después firman los dos y tú depositas.'
  const asunto = `Te invitaron a un alquiler en Lockumi como ${nombre(v.rol_invitado)}`
  const lineas = [
    `${quien} te invitó a un alquiler en Lockumi. Entras como ${nombre(v.rol_invitado)}.`, '',
    `Lugar: ${v.direccion}`, `Depósito: ${monto} USDC de prueba (red de prueba de Stellar, sin dinero real)`, `Fechas: ${dia(v.inicio)} al ${dia(v.fin)}`, '',
    paso, '', `Abre este link y entra con ${v.email_invitado}:`, link, '',
    `El link sirve una sola vez y vence el ${dia(v.expira)} (7 días). Si venció, pide que te envíen una invitación nueva.`,
    'Si no esperabas este correo, ignóralo.']
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.5;color:#1b1b1f">
<p>${esc(quien)} te invitó a un alquiler en <strong>Lockumi</strong>. Entras como <strong>${esc(nombre(v.rol_invitado))}</strong>.</p>
<ul><li>Lugar: ${esc(v.direccion)}</li><li>Depósito: ${esc(monto)} USDC de prueba (red de prueba de Stellar, sin dinero real)</li><li>Fechas: ${esc(dia(v.inicio))} al ${esc(dia(v.fin))}</li></ul>
<p>${esc(paso)}</p>
<p><a href="${esc(link)}" style="display:inline-block;padding:12px 20px;background:#2d5bff;color:#fff;border-radius:10px;text-decoration:none">Ver la invitación</a></p>
<p style="font-size:14px">Entra con <strong>${esc(v.email_invitado)}</strong>. El link sirve una sola vez y vence el ${esc(dia(v.expira))} (7 días). Si venció, pide que te envíen una invitación nueva.</p>
<p style="font-size:13px;color:#666">Si el botón no abre, copia este link: ${esc(link)}<br>Si no esperabas este correo, ignóralo.</p></div>`
  return { asunto, texto: lineas.join('\n'), html }
}

const ultimos = new Map<string, number>()
/** Atiende POST /api/invitacion-correo. `jwt`: sesión de Supabase de quien llama (tiene que ser quien creó el alquiler). */
export async function enviarInvitacion(e: Entorno, p: PedidoCorreo, jwt: string, f: Fetch = fetch, ahora = Date.now()) {
  const llave = e.RESEND_API_KEY?.trim()
  if (!llave) throw new ErrorTw(503, SIN_RESEND)
  const url = (e.SUPABASE_URL || e.VITE_SUPABASE_URL || '').trim().replace(/\/$/, ''), anon = (e.SUPABASE_ANON_KEY || e.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!url || !anon) throw new ErrorTw(503, 'El servidor compartido todavía no está configurado. Copia el link y envíalo tú.')
  if (typeof p.id !== 'string' || !UUID.test(p.id) || typeof p.token !== 'string' || !TOKEN.test(p.token)) throw new ErrorTw(400, 'Pedido inválido.')
  if (!jwt) throw new ErrorTw(401, 'Tu sesión venció. Vuelve a entrar.')
  const ult = ultimos.get(p.id) ?? 0
  if (ahora - ult < 60_000) throw new ErrorTw(429, 'Ya enviamos este correo hace menos de un minuto. Espera un momento antes de volver a enviarlo.')
  const rpc = async <T>(fn: string, args: object): Promise<T> => {
    const r = await f(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: anon, authorization: 'Bearer ' + jwt, 'content-type': 'application/json' }, body: JSON.stringify(args) })
    const j = await r.json().catch(() => null) as T & { message?: string }
    if (!r.ok) throw new ErrorTw(r.status === 401 ? 401 : 400, typeof j?.message === 'string' && j.message.length < 200 ? j.message : 'No pudimos leer la invitación.')
    return j
  }
  const v = await rpc<Vista>('lk_ver_invitacion', { p_contrato: p.id, p_token: p.token })
  const mio = await rpc<string | null>('lk_rol', { p_contrato: p.id })
  if (mio !== v.rol_creador) throw new ErrorTw(403, 'Solo quien creó el alquiler puede enviar la invitación por correo.')
  const link = `${origenSeguro(p.origen)}/#/invitacion/${p.id}/${p.token}`
  const c = armarCorreo(v, link)
  const r = await f('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + llave, 'content-type': 'application/json' },
    body: JSON.stringify({ from: e.RESEND_FROM?.trim() || REMITENTE, to: [v.email_invitado], subject: c.asunto, text: c.texto, html: c.html, reply_to: v.email_creador }) })
  if (!r.ok) {
    console.error('resend', r.status)
    throw new ErrorTw(502, 'No pudimos enviar el correo ahora (el remitente de Lockumi todavía no está listo o el servicio falló). Toca «Copiar link» y envíalo tú.')
  }
  ultimos.set(p.id, ahora)
  return { enviado: true as const, a: v.email_invitado }
}
