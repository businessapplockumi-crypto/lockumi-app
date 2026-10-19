// Constantes compartidas por el cliente y el servidor. Solo Stellar TESTNET: no hay ninguna forma de apuntar a la red principal.
// Fuentes: https://developers.stellar.org/docs/learn/fundamentals/networks · https://docs.trustlesswork.com/trustless-work/api-rest/introduction
export const PASSPHRASE_TESTNET = 'Test SDF Network ; September 2015'
export const PASSPHRASE_MAINNET = 'Public Global Stellar Network ; September 2015'
/** Red en la que trabaja esta app: fija en el código (no depende de variables de entorno). */
export const RED_ACTIVA: string = PASSPHRASE_TESTNET
/** «Solo red de prueba: adelantar el plazo» (devolver o reclamar antes de los 7 días) existe SOLO en testnet. */
export const adelantoPermitido = (passphrase: string = RED_ACTIVA) => passphrase === PASSPHRASE_TESTNET
export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
export const RPC_TESTNET = 'https://soroban-testnet.stellar.org'
export const FRIENDBOT = 'https://friendbot.stellar.org'
export const TW_TESTNET = 'https://dev.api.trustlesswork.com'
export const EXPLORADOR = 'https://stellar.expert/explorer/testnet'
/** USDC de prueba de Circle en testnet (emisor que usa Trustless Work). */
export const USDC = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' } as const
/** Tope de los USDC de prueba que da Lockumi (botón «Obtener USDC de prueba», desde la tesorería). Términos 2.2 d). */
export const TOPE_USDC = 20
/** Máximo de la app por depósito (igual que MONTO_MAX de validacion.ts). Con USDC de prueba propios, el límite es el saldo de la cuenta. */
export const MONTO_MAX_USDC = 50_000
const fmt = (x: number) => x.toLocaleString('es-CR', { maximumFractionDigits: 7 })
/** Al crear el alquiler: la cuenta propia no alcanza para el monto escrito. */
export const mensajeSaldoPropio = (x: number) => `Tu cuenta tiene ${fmt(x)} USDC de prueba. Escribe un monto de ${fmt(x)} o menos, o usa «Obtener USDC de prueba».`
/** Al depositar: la cuenta propia ya no alcanza (por ejemplo, se gastó después de crear el alquiler). */
export const mensajeSaldoAlPagar = (x: number, monto: number) => `Tu cuenta tiene ${fmt(x)} USDC de prueba y el depósito es de ${fmt(monto)}. Carga más USDC de prueba en tu cuenta y vuelve a tocar el botón.`
/** Máximo de XLM de prueba que se gasta en una compra de USDC de prueba (cubre 20 USDC con margen; hoy ~1,13 XLM por USDC). */
export const MAX_XLM_COMPRA = 60

/** Monto válido: número > 0, ≤ tope y con 7 decimales como máximo. Por defecto el máximo de la app; con USDC de Lockumi, TOPE_USDC. */
export function montoValido(m: unknown, tope: number = MONTO_MAX_USDC): m is number {
  return typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= tope && Math.round(m * 1e7) === m * 1e7
}
/** Rechaza cualquier configuración que no sea testnet. */
export function exigirTestnet(passphrase: string, ...urls: string[]) {
  if (passphrase !== PASSPHRASE_TESTNET) throw new Error('Solo se permite la red de prueba de Stellar (testnet).')
  for (const u of urls) if (!/^https:\/\/([a-z0-9-]+\.)*(horizon-testnet\.stellar\.org|soroban-testnet\.stellar\.org|friendbot\.stellar\.org|dev\.api\.trustlesswork\.com)(\/|$)/.test(u))
    throw new Error('Solo se permiten servicios de la red de prueba: ' + u.slice(0, 80))
}
export const enlaceTx = (h: string) => `${EXPLORADOR}/tx/${h}`
export const enlaceCuenta = (g: string) => `${EXPLORADOR}/account/${g}`
export const enlaceContrato = (c: string) => `${EXPLORADOR}/contract/${c}`
