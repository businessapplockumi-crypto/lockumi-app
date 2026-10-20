// Prueba del arreglo en el servidor: desplegar con origen 'lockumi' + token de la cuenta de prueba (en 0), SIN llamar antes a cuenta-prueba.
// El token se lee del perfil del navegador y no se imprime. Uso: PERFIL=dir node servidor-recarga.mjs (con Vite y el proxy corriendo)
import { chromium } from 'playwright'
const ctx = await chromium.launchPersistentContext(process.env.PERFIL, { ...(process.env.CHROME && { executablePath: process.env.CHROME }), args: ['--no-sandbox'] })
const p = ctx.pages()[0]; await p.goto('http://localhost:5173/'); await p.waitForTimeout(500)
const r = await p.evaluate(async () => {
  const token = localStorage.getItem('lockumi.testnet.cuenta-prueba'), g = localStorage.getItem('lockumi.testnet.cuenta-prueba.g'), contrato = crypto.randomUUID()
  const usdc = async () => (await (await fetch('https://horizon-testnet.stellar.org/accounts/' + g)).json()).balances.find(b => b.asset_code === 'USDC')?.balance
  const api = async c => { const x = await fetch('/api/solo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(c) }); return [x.status, await x.json()] }
  const antes = await usdc(); const d = await api({ accion: 'dueno', contrato })
  const e = await api({ accion: 'desplegar', contrato, inquilino: g, monto: 2, origen: 'lockumi', token })
  return { g, antes, dueno: d[0], desplegar: e, despues: await usdc() }
})
console.log(JSON.stringify(r, null, 1)); await ctx.close()
