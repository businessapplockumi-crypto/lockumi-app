// Constantes compartidas por el cliente y el servidor. Solo Stellar TESTNET: no hay ninguna forma de apuntar a la red principal.
// Fuentes: https://developers.stellar.org/docs/learn/fundamentals/networks · https://docs.trustlesswork.com/trustless-work/api-rest/introduction
export const PASSPHRASE_TESTNET = 'Test SDF Network ; September 2015'
export const PASSPHRASE_MAINNET = 'Public Global Stellar Network ; September 2015'
export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org'
export const RPC_TESTNET = 'https://soroban-testnet.stellar.org'
export const FRIENDBOT = 'https://friendbot.stellar.org'
export const TW_TESTNET = 'https://dev.api.trustlesswork.com'
export const EXPLORADOR = 'https://stellar.expert/explorer/testnet'
/** USDC de prueba de Circle en testnet (emisor que usa Trustless Work). */
export const USDC = { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' } as const
/** Tope por contrato de prueba (términos 1.4-demo, 2.2 d). Se aplica en el cliente y en el servidor. */
export const TOPE_USDC = 20
/** Máximo de XLM de prueba que se gasta en una compra de USDC de prueba (cubre 20 USDC con margen; hoy ~1,13 XLM por USDC). */
export const MAX_XLM_COMPRA = 60

/** Monto válido para un contrato de prueba: número > 0, ≤ TOPE_USDC y con 7 decimales como máximo. */
export function montoValido(m: unknown): m is number {
  return typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= TOPE_USDC && Math.round(m * 1e7) === m * 1e7
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
