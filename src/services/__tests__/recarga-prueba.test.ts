// Ruta «USDC de prueba de Lockumi»: antes de crear la cuenta segura, Lockumi recarga SIEMPRE la cuenta de prueba hasta el monto,
// aunque ya exista y esté en 0 (caso del 20/10/2026: «Tu cuenta tiene 0 USDC de prueba…»).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../servidor/config', async orig => ({ ...(await orig<typeof import('../../servidor/config')>()), escrowReal: true, modoPrueba: true }))
// Con sesión de Cavos (Google), como Katherine: modoReal (VITE_CAVOS_APP_ID) y la billetera Cavos disponible. No cambia la ruta de Lockumi.
vi.mock('../auth', async orig => ({ ...(await orig<typeof import('../auth')>()), modoReal: true }))
vi.mock('../billetera', async orig => ({ ...(await orig<typeof import('../billetera')>()), conectarBilletera: vi.fn(async () => ({ direccion: 'GCAVOS' })) }))
const llamadas: string[] = []
vi.mock('../solo', async orig => {
  const o = await orig<typeof import('../solo')>()
  return { ...o,
    cuentaPruebaGuardada: () => 'GVIEJA',
    prepararCuentaPrueba: vi.fn(async (m: number) => { llamadas.push('recargar:' + m); return { g: 'GPRUEBA', txs: { compra: 'tx-compra' } } }),
    prepararDueno: vi.fn(async () => { llamadas.push('dueno'); return { dueno: 'GDUENO', trustlineTx: null } }),
    desplegar: vi.fn(async (_c: string, g: string, m: number, origen: string) => { llamadas.push(`desplegar:${g}:${m}:${origen}`); return { escrow: 'CESCROW', tx: 'tx-escrow', dueno: 'GDUENO', compraTx: null } }),
    fondearPrueba: vi.fn(async () => { llamadas.push('fondear'); return { tx: 'tx-deposito', compraTx: null } }),
  }
})
const { escrow, MENSAJE_RECARGA } = await import('../escrow')
const solo = await import('../solo')
import type { Alquiler } from '../../types'

const alquiler = (red?: Alquiler['red']) => ({ id: '00000000-0000-4000-8000-000000000001', monto: 1, red } as Alquiler)
beforeEach(() => { llamadas.length = 0 })

describe('recarga de la cuenta de prueba (USDC de Lockumi)', () => {
  it('recarga hasta el monto aunque la cuenta de prueba ya exista, y luego crea la cuenta segura y deposita', async () => {
    const guardado: unknown[] = []
    await escrow.depositar(alquiler(), (t, r) => guardado.push([t, r]), () => {})
    expect(llamadas).toEqual(['recargar:1', 'dueno', 'desplegar:GPRUEBA:1:lockumi', 'fondear'])
    expect(guardado[0]).toEqual([{ trustline: undefined, compra: 'tx-compra' }, { inquilino: 'GPRUEBA', inquilinoPrueba: true }])
  })
  it('el alquiler que ya guardó una cuenta en 0 (sin cuenta segura) también se recarga al reintentar', async () => {
    await escrow.depositar(alquiler({ inquilino: 'GPRUEBA', inquilinoPrueba: true, dueno: 'GDUENO', txs: { duenoTrustline: 'x' } }), () => {}, () => {})
    expect(llamadas[0]).toBe('recargar:1'); expect(llamadas).toContain('desplegar:GPRUEBA:1:lockumi')
  })
  it('si la cuenta segura ya existe, no recarga aparte: solo deposita (el servidor completa lo que falte)', async () => {
    await escrow.depositar(alquiler({ inquilino: 'GPRUEBA', inquilinoPrueba: true, escrow: 'CESCROW', txs: { escrow: 'tx-escrow' } }), () => {}, () => {})
    expect(llamadas).toEqual(['fondear'])
  })
  it('con sesión de Cavos (Google) y la cuenta de prueba guardada en 0: recarga, usa la cuenta de prueba (no la de Cavos) y avisa al servidor que es de Lockumi', async () => {
    const guardado: unknown[] = []
    await escrow.depositar({ ...alquiler(), monto: 2 } as Alquiler, (t, r) => guardado.push([t, r]), () => {})
    expect(llamadas).toEqual(['recargar:2', 'dueno', 'desplegar:GPRUEBA:2:lockumi', 'fondear'])
    expect(JSON.stringify(guardado)).not.toContain('GCAVOS')
  })
  it('si la tesorería falla al recargar, muestra el mensaje aprobado y no crea la cuenta segura', async () => {
    vi.mocked(solo.prepararCuentaPrueba).mockRejectedValueOnce(new solo.ErrorSolo('Horizon respondió 504'))
    await expect(escrow.depositar(alquiler(), () => {}, () => {})).rejects.toThrow(MENSAJE_RECARGA)
    expect(MENSAJE_RECARGA).toBe('Ahora no pudimos ponerte USDC de prueba. Espera unos minutos y vuelve a tocar «Pagar».')
    expect(llamadas).toEqual([])
  })
})
