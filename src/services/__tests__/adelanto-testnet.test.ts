// «Solo red de prueba: adelantar el plazo» existe SOLO en testnet: en el cliente (constante fija) y en el servidor.
import { describe, it, expect, beforeEach } from 'vitest'
import { Keypair, Networks } from '@stellar/stellar-sdk'
import { adelantoPermitido, RED_ACTIVA, PASSPHRASE_TESTNET, PASSPHRASE_MAINNET } from '../../../api/_lib/red'
import { atenderSolo, reiniciarLimites, type Entorno } from '../../../api/_lib/solo'
import { ahoraPrueba } from '../../flujo'

const ENV: Entorno = { TRUSTLESS_WORK_API_KEY: 'llave', LOCKUMI_TW_PLATAFORMA_SECRET: Keypair.random().secret(), LOCKUMI_DEMO_SEED: 'semilla-'.padEnd(48, 'x') }
const ESC = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'
const sinRed = (async () => new Response('{}', { status: 500 })) as typeof fetch
beforeEach(() => reiniciarLimites())

describe('adelantar el plazo: solo en la red de prueba', () => {
  it('cliente: la red activa está fija en testnet y el control existe', () => {
    expect(RED_ACTIVA).toBe(PASSPHRASE_TESTNET); expect(adelantoPermitido()).toBe(true); expect(adelantoPermitido(Networks.TESTNET)).toBe(true)
  })
  it('cliente: con el passphrase de la red principal el control no existe', () => {
    expect(adelantoPermitido(PASSPHRASE_MAINNET)).toBe(false); expect(adelantoPermitido(Networks.PUBLIC)).toBe(false); expect(adelantoPermitido('')).toBe(false)
  })
  it('servidor: con la red principal se niegan aprobar y liberar, aunque las variables digan lo contrario', async () => {
    for (const accion of ['aprobar', 'liberar']) {
      await expect(atenderSolo({ ...ENV, STELLAR_NETWORK_PASSPHRASE: PASSPHRASE_MAINNET }, { accion, escrow: ESC } as never, 'ip', sinRed)).rejects.toThrow(/red de prueba/)
      await expect(atenderSolo({ ...ENV, STELLAR_NETWORK_PASSPHRASE: PASSPHRASE_MAINNET, TRUSTLESS_WORK_BASE_URL: 'https://api.trustlesswork.com', HORIZON_URL: 'https://horizon.stellar.org' }, { accion, escrow: ESC } as never, 'ip', sinRed)).rejects.toThrow(/red de prueba/)
    }
  })
  it('servidor: con testnet pasan la regla (y siguen hasta consultar la cuenta segura)', async () => {
    for (const accion of ['aprobar', 'liberar']) {
      const e = await atenderSolo(ENV, { accion, escrow: ESC } as never, 'ip', sinRed).catch(x => x as Error)
      expect(String((e as Error).message)).not.toMatch(/solo se puede en la red de prueba|Solo se permite la red de prueba/)
    }
  })
})

describe('una línea «Ahora…» en cada pantalla de la prueba', () => {
  const base = { contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }
  it('cada estado dice quién hace qué', () => {
    for (const estado of ['firmas', 'pendiente_pago', 'fotos_entrada', 'en_curso', 'salida', 'ventana_reclamo', 'reclamo', 'mediacion', 'cerrado'])
      expect(ahoraPrueba({ ...base, estado } as never)).toMatch(/^(Ahora|Listo)/)
    expect(ahoraPrueba({ ...base, estado: 'firmas', contrato: { firmas: { inquilino: 'x' } } } as never)).toBe('Ahora le toca al dueño de prueba: firmar el contrato (lo hace solo, en unos segundos).')
  })
})
