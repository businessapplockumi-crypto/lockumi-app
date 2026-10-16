// Billetera Stellar testnet con Cavos (@cavos/kit) + lectura de saldo en Horizon y fondeo con Friendbot.
// Fuentes: https://docs.cavos.xyz/docs/stellar (Cavos.connect con chains ["stellar"], network "testnet")
//          https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/accounts (GET /accounts/{id}, 404 si no existe)
//          https://developers.stellar.org/docs/learn/fundamentals/networks#friendbot (fondeo de testnet)
import { CAVOS_BILLETERA, identidadCavos, modoReal, APP_ID } from './auth'

export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
export const FRIENDBOT = 'https://friendbot.stellar.org'
export type EstadoBilletera = 'undeployed' | 'ready' | 'needs-device-approval'
export interface Billetera { direccion: string; estado: EstadoBilletera }
type Fetch = typeof fetch

export const esDireccionStellar = (g: string) => /^G[A-Z2-7]{55}$/.test(g)
export const abreviar = (g: string) => g.length > 12 ? g.slice(0, 4) + '…' + g.slice(-4) : g
export const enlaceExplorer = (g: string) => 'https://stellar.expert/explorer/testnet/account/' + g

/** Saldo XLM nativo como texto decimal (p. ej. "10000.0000000"), o null si la cuenta aún no existe en testnet. */
export async function consultarSaldo(g: string, f: Fetch = fetch): Promise<string | null> {
  const r = await f(`${HORIZON_TESTNET}/accounts/${g}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error('horizon ' + r.status)
  const d = await r.json() as { balances?: { asset_type: string; balance: string }[] }
  return d.balances?.find(b => b.asset_type === 'native')?.balance ?? '0'
}

/** Pide a Friendbot que cree y fondee la cuenta en testnet (10 000 XLM de prueba). */
export async function fondear(g: string, f: Fetch = fetch): Promise<void> {
  const r = await f(`${FRIENDBOT}/?addr=${encodeURIComponent(g)}`)
  if (r.ok) return
  // Friendbot responde 400 si la cuenta ya existe: no es un error para el usuario.
  const t = await r.text().catch(() => '')
  if (r.status === 400 && /already|createAccountAlreadyExist|op_already_exists/i.test(t)) return
  throw new Error('friendbot ' + r.status)
}

/** "10000.0000000" → "10 000 XLM" (hasta 2 decimales). */
export const formatoXlm = (s: string) =>
  new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(Number(s)) + ' XLM'

let conexion: Promise<Billetera> | null = null
/** Conecta la billetera con la identidad del login de Cavos. Solo en modo real. */
export function conectarBilletera(): Promise<Billetera> {
  if (import.meta.env.DEV) { // gancho de prueba local, nunca en el build
    const g = localStorage.getItem('lockumi.billetera.prueba')
    if (g) return Promise.resolve({ direccion: g, estado: 'undeployed' })
  }
  if (!modoReal) return Promise.reject(new Error('simulado'))
  return conexion ??= (async () => {
    const identity = await identidadCavos()
    if (!identity) throw new Error('sin-identidad')
    const { Cavos } = await import('@cavos/kit')
    const s = await Cavos.connect({ ...CAVOS_BILLETERA, chains: [...CAVOS_BILLETERA.chains], identity, appId: APP_ID, vault: true })
    const w = s.wallet('stellar')
    return { direccion: w.address, estado: w.status as EstadoBilletera }
  })().catch(e => { conexion = null; throw e })
}
export const olvidarBilletera = () => { conexion = null }
