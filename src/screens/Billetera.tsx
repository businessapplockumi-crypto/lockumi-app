import { useCallback, useEffect, useState } from 'react'
import { Aviso } from '../Aviso'
import { modoTrustless } from '../servidor/config'
import { abrirTrustlineUsdc, consultarUsdc, mensajeFirma, olvidarBilletera, abreviar, conectarBilletera, detalleError, consultarSaldo, enlaceExplorer, fondear, formatoXlm, type Billetera as B } from '../services/billetera'

type Saldo = { t: 'cargando' } | { t: 'ok'; xlm: string } | { t: 'sin-cuenta' } | { t: 'error' }

/** Tarjeta breve de la billetera Stellar testnet (solo con login real de Cavos). */
export function Billetera() {
  const [b, setB] = useState<B | null>(null); const [err, setErr] = useState<{ codigo: string; mensaje: string } | null>(null); const [avisoErr, setAvisoErr] = useState(false)
  const [saldo, setSaldo] = useState<Saldo>({ t: 'cargando' })
  const [copiado, setCopiado] = useState(false); const [fondeando, setFondeando] = useState(false)

  useEffect(() => { conectarBilletera().then(setB).catch(e => {
    const d = detalleError(e); console.error('[Lockumi] Cavos.connect falló:', d.codigo, e)
    setErr(d); if (!sessionStorage.getItem('lockumi.aviso.billetera')) { sessionStorage.setItem('lockumi.aviso.billetera', '1'); setAvisoErr(true) }
  }) }, [])
  const leer = useCallback(async (g: string) => {
    setSaldo({ t: 'cargando' })
    try { const x = await consultarSaldo(g); setSaldo(x === null ? { t: 'sin-cuenta' } : { t: 'ok', xlm: x }) } catch { setSaldo({ t: 'error' }) }
  }, [])
  useEffect(() => { if (b) void leer(b.direccion) }, [b, leer])

  if (err) return <section className="glass tarjeta billetera" aria-label="Tu cuenta para el depósito">
    <p className="etiqueta">Tu cuenta para el depósito</p>
    <p className="nota">No pudimos preparar tu cuenta. Tu sesión sigue activa: cierra sesión y vuelve a entrar en esta misma pestaña para intentarlo de nuevo.</p>
    <details className="billetera__detalle"><summary>Detalles</summary><code>{err.codigo}: {err.mensaje}</code></details>
    {avisoErr && <Aviso tipo="error" titulo="Tu cuenta no está lista" boton="Entendido" onCerrar={() => setAvisoErr(false)}>
      <p>Entraste bien, pero no pudimos preparar tu cuenta para el depósito.</p>
      <p>Cierra sesión y vuelve a entrar en esta misma pestaña. Si se repite, abre «Detalles» en la tarjeta de tu cuenta y compártelo con el equipo.</p>
    </Aviso>}
  </section>
  if (!b) return <section className="glass tarjeta billetera" aria-label="Tu cuenta para el depósito" aria-busy="true"><p className="nota">Preparando tu cuenta…</p></section>

  const copiar = async () => { try { await navigator.clipboard.writeText(b.direccion); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sin permiso de portapapeles */ } }
  const pedirFondos = async () => {
    setFondeando(true)
    try { await fondear(b.direccion); olvidarBilletera(); await leer(b.direccion) } catch { setSaldo({ t: 'error' }) } finally { setFondeando(false) }
  }
  return <section className="glass tarjeta billetera" aria-label="Tu cuenta para el depósito">
    <p className="etiqueta">Tu cuenta para el depósito</p>
    <p><strong>Lista ✓</strong> <span className="nota">Aquí se guarda y se devuelve el depósito.</span></p>
    <details className="billetera__detalle"><summary>Detalles</summary>
      <p className="nota">Cuenta de prueba (sin dinero real).</p>
      <p className="billetera__dir"><code title={b.direccion}>{abreviar(b.direccion)}</code>
        <button type="button" className="boton boton--secundario boton--chico" onClick={copiar} aria-label="Copiar dirección completa">{copiado ? 'Copiada' : 'Copiar'}</button>
        <a className="enlace" href={enlaceExplorer(b.direccion)} target="_blank" rel="noopener noreferrer">Ver en el explorador</a></p>
      <p className="billetera__saldo" role="status">
        {saldo.t === 'cargando' && <span className="nota">Consultando saldo…</span>}
        {saldo.t === 'ok' && <strong>Saldo de prueba: {formatoXlm(saldo.xlm)}</strong>}
        {saldo.t === 'error' && <span className="nota">No pudimos consultar el saldo.</span>}
      </p>
      {saldo.t === 'sin-cuenta' && <div className="billetera__fondeo">
        <p className="nota">La cuenta de prueba se activa cuando recibe su primer saldo de prueba (gratis, sin valor real).</p>
        <button type="button" className="boton boton--secundario boton--chico" disabled={fondeando} onClick={pedirFondos}>{fondeando ? 'Activando…' : 'Activar cuenta de prueba'}</button>
      </div>}
      {modoTrustless && saldo.t === 'ok' && <Usdc g={b.direccion} />}
    </details>
  </section>
}

/** Prueba con Trustless Work: habilitar USDC de testnet (trustline) y cargarlo desde el faucet de Circle.
 *  Fuentes: https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens
 *           https://faucet.circle.com */
function Usdc({ g }: { g: string }) {
  const [usdc, setUsdc] = useState<string | null | undefined | 'cargando'>('cargando'); const [ocupado, setOcupado] = useState(false); const [error, setError] = useState('')
  const leer = useCallback(() => { consultarUsdc(g).then(setUsdc).catch(() => setUsdc(undefined)) }, [g])
  useEffect(leer, [leer])
  const habilitar = async () => {
    setOcupado(true); setError('')
    try { await abrirTrustlineUsdc(); leer() } catch (e) { setError(mensajeFirma(e)) } finally { setOcupado(false) }
  }
  if (usdc === 'cargando' || usdc === undefined) return null
  return <div className="billetera__fondeo">
    {usdc === null ? <>
      <p className="nota">Para pagar el depósito en USDC de prueba, primero habilita USDC en tu cuenta. Tu billetera te pedirá confirmar.</p>
      <button type="button" className="boton boton--secundario boton--chico" disabled={ocupado} onClick={() => void habilitar()}>{ocupado ? 'Habilitando…' : 'Habilitar USDC de prueba'}</button>
    </> : <>
      <p><strong>USDC de prueba: {Number(usdc).toLocaleString('es', { maximumFractionDigits: 2 })}</strong></p>
      <p className="nota">Para cargar USDC de prueba: copia tu dirección, abre <a className="enlace" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">faucet.circle.com</a>, elige Stellar Testnet y pega la dirección (20 USDC cada 2 horas).</p>
      <button type="button" className="boton boton--secundario boton--chico" onClick={leer}>Actualizar saldo</button>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
