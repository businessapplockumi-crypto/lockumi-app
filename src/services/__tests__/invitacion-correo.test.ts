import { describe, it, expect, vi } from 'vitest'
import { enviarInvitacion, armarCorreo, origenSeguro, SIN_RESEND, REMITENTE } from '../../../api/_lib/invitacion'

const ID = '6f7e2ebd-fe03-489e-9db3-6c6cef2d14d1', TOKEN = 'a'.repeat(64)
const vista = { direccion: 'Casa <b>Escazú</b>', monto: '25.5', inicio: '2026-11-01', fin: '2027-05-01', rol_invitado: 'dueno' as const, rol_creador: 'inquilino' as const,
  email_invitado: 'dueno@x.cr', email_creador: 'inq@x.cr', expira: '2026-10-26T16:00:00Z', reglas: ['Sin fiestas'], reglas_por_confirmar: true }
const ENV = { RESEND_API_KEY: 're_prueba', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }
const resp = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status, headers: { 'content-type': 'application/json' } })
function falso(rol: string | null = 'inquilino', resend = 200) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url)
    if (u.endsWith('/rpc/lk_ver_invitacion')) return resp(vista)
    if (u.endsWith('/rpc/lk_rol')) return resp(rol)
    if (u === 'https://api.resend.com/emails') return resp({ id: 'm1' }, resend)
    throw new Error('url inesperada ' + u)
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

describe('Enviar por correo (Resend)', () => {
  it('sin RESEND_API_KEY: mensaje claro (503) y no llama a nadie', async () => {
    const f = falso()
    await expect(enviarInvitacion({}, { id: ID, token: TOKEN }, 'jwt', f)).rejects.toMatchObject({ estado: 503, message: SIN_RESEND })
    expect(f).not.toHaveBeenCalled()
  })
  it('envía al correo invitado que está en la base, desde invitaciones@lockumi.com', async () => {
    const f = falso()
    const r = await enviarInvitacion(ENV, { id: ID, token: TOKEN, origen: 'https://app.lockumi.com' }, 'jwt', f, 1e12)
    expect(r).toEqual({ enviado: true, a: 'dueno@x.cr' })
    const cuerpo = JSON.parse((f.mock.calls.find(c => String(c[0]).includes('resend'))![1] as RequestInit).body as string)
    expect(cuerpo).toMatchObject({ from: REMITENTE, to: ['dueno@x.cr'], reply_to: 'inq@x.cr' })
    expect(cuerpo.text).toContain(`https://app.lockumi.com/#/invitacion/${ID}/${TOKEN}`)
  })
  it('solo quien creó el alquiler puede enviarlo', async () => {
    await expect(enviarInvitacion(ENV, { id: ID, token: TOKEN }, 'jwt', falso('dueno'), 2e12)).rejects.toMatchObject({ estado: 403 })
    await expect(enviarInvitacion(ENV, { id: ID, token: TOKEN }, 'jwt', falso(null), 3e12)).rejects.toMatchObject({ estado: 403 })
  })
  it('si Resend falla (dominio sin verificar), explica que copie el link', async () => {
    await expect(enviarInvitacion(ENV, { id: ID, token: TOKEN }, 'jwt', falso('inquilino', 403), 4e12)).rejects.toThrow(/Copiar link/)
  })
  it('pedido raro o sin sesión: rechazado', async () => {
    await expect(enviarInvitacion(ENV, { id: 'x', token: TOKEN }, 'jwt', falso())).rejects.toMatchObject({ estado: 400 })
    await expect(enviarInvitacion(ENV, { id: ID, token: TOKEN }, '', falso())).rejects.toMatchObject({ estado: 401 })
  })
  it('el link solo apunta a la app o a sus vistas previas', () => {
    expect(origenSeguro('https://evil.example')).toBe('https://app.lockumi.com')
    expect(origenSeguro('https://lockumi-app-git-parte4-invitaciones-businessapplockumi-4427.vercel.app')).toContain('vercel.app')
  })
  it('correo en español: quién invita, papel, monto, fechas, link y 7 días; sin HTML inyectado', () => {
    const c = armarCorreo(vista, 'https://app.lockumi.com/#/invitacion/x/y')
    expect(c.asunto).toBe('Te invitaron a un alquiler en Lockumi como dueño')
    for (const t of ['El inquilino (inq@x.cr) te invitó', 'Entras como dueño', '25,5 USDC de prueba', 'noviembre de 2026', 'mayo de 2027', '(7 días)', 'confirmarlas o cambiarlas'])
      expect(c.texto).toContain(t)
    expect(c.html).not.toContain('<b>Escazú</b>'); expect(c.html).toContain('&lt;b&gt;')
  })
})
