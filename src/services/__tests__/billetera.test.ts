import { describe, it, expect, vi } from 'vitest'
import { abreviar, consultarSaldo, enlaceExplorer, esDireccionStellar, fondear, formatoXlm, HORIZON_TESTNET, FRIENDBOT } from '../billetera'

const G = 'GCBLQMWHUDYTKPR5NY527VIILMQVDW7IKTF34MSIFLHZYP2DH2KFFJ4V'
const resp = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

describe('billetera: utilidades', () => {
  it('valida y abrevia la dirección G…', () => {
    expect(esDireccionStellar(G)).toBe(true)
    expect(esDireccionStellar('GABC')).toBe(false)
    expect(abreviar(G)).toBe(G.slice(0, 4) + '…' + G.slice(-4))
  })
  it('enlaza a stellar.expert testnet', () => {
    expect(enlaceExplorer(G)).toBe('https://stellar.expert/explorer/testnet/account/' + G)
  })
  it('formatea XLM', () => { expect(formatoXlm('10000.0000000')).toMatch(/^10.000 XLM$/) })
})

describe('Horizon testnet', () => {
  it('devuelve el saldo nativo', async () => {
    const f = vi.fn(async () => resp(200, { balances: [{ asset_type: 'credit_alphanum4', balance: '5' }, { asset_type: 'native', balance: '10000.0000000' }] }))
    expect(await consultarSaldo(G, f as typeof fetch)).toBe('10000.0000000')
    expect(f).toHaveBeenCalledWith(HORIZON_TESTNET + '/accounts/' + G)
  })
  it('404 → la cuenta no existe (null)', async () => {
    expect(await consultarSaldo(G, (async () => resp(404, { status: 404 })) as typeof fetch)).toBeNull()
  })
  it('otro error se propaga', async () => {
    await expect(consultarSaldo(G, (async () => resp(503, '')) as typeof fetch)).rejects.toThrow('horizon 503')
  })
})

describe('Friendbot', () => {
  it('fondea con ?addr=', async () => {
    const f = vi.fn(async () => resp(200, { hash: 'abc' }))
    await fondear(G, f as typeof fetch)
    expect(f).toHaveBeenCalledWith(FRIENDBOT + '/?addr=' + G)
  })
  it('cuenta ya existente no es error', async () => {
    await expect(fondear(G, (async () => resp(400, { detail: 'createAccountAlreadyExist' })) as typeof fetch)).resolves.toBeUndefined()
  })
  it('otro error se propaga', async () => {
    await expect(fondear(G, (async () => resp(500, '')) as typeof fetch)).rejects.toThrow('friendbot 500')
  })
})
