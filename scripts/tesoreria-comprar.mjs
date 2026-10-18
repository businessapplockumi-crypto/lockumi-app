// Tesorería de USDC de prueba (una sola vez): la plataforma GCTL… compra USDC de Circle en el DEX de testnet con su XLM de prueba.
// Después /api/solo envía desde aquí a cada inquilino de prueba (máximo 20 USDC por contrato).
// Uso: node scripts/tesoreria-comprar.mjs [usdc=500] [maxXlm=700]   (lee LOCKUMI_TW_PLATAFORMA_SECRET o .secrets; no la imprime)
import { readFileSync } from 'node:fs'
import { Keypair, Asset, Networks, Operation, TransactionBuilder, Horizon } from '@stellar/stellar-sdk'
const PLAT = Keypair.fromSecret((process.env.LOCKUMI_TW_PLATAFORMA_SECRET || JSON.parse(readFileSync('/workspace/lockumi/.secrets/plataforma-testnet.json', 'utf8')).secret).trim())
const HZ = new Horizon.Server('https://horizon-testnet.stellar.org'), USDC = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')
const USDC_N = Number(process.argv[2] || 500), MAX = Number(process.argv[3] || 700)
const t = new TransactionBuilder(await HZ.loadAccount(PLAT.publicKey()), { fee: '1000', networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: String(MAX), destination: PLAT.publicKey(), destAsset: USDC, destAmount: String(USDC_N), path: [] })).setTimeout(60).build()
t.sign(PLAT); const r = await HZ.submitTransaction(t)
const a = await HZ.loadAccount(PLAT.publicKey())
console.log('compra:', 'https://stellar.expert/explorer/testnet/tx/' + r.hash)
console.log('saldo de la tesorería', PLAT.publicKey(), a.balances.map(b => `${b.balance} ${b.asset_code ?? 'XLM'}`).join(' · '))
