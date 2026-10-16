import { useCallback, useEffect, useState } from 'react'
import { Aviso } from '../Aviso'
import { abreviar, conectarBilletera, detalleError, consultarSaldo, enlaceExplorer, fondear, formatoXlm, type Billetera as B } from '../services/billetera'

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

  if (err) return <section className="glass tarjeta billetera" aria-label="Tu billetera">
    <p className="etiqueta">Tu billetera · Stellar testnet</p>
    <p className="nota">No pudimos conectar tu billetera. Tu sesión sigue activa: cierra sesión y vuelve a entrar en esta misma pestaña para intentarlo de nuevo.</p>
    <details className="billetera__detalle"><summary>Ver detalle</summary><code>{err.codigo}: {err.mensaje}</code></details>
    {avisoErr && <Aviso tipo="error" titulo="Tu billetera no está lista" boton="Entendido" onCerrar={() => setAvisoErr(false)}>
      <p>Entraste bien, pero no pudimos preparar tu billetera de Stellar.</p>
      <p>Cierra sesión y vuelve a entrar en esta misma pestaña. Si se repite, abre «Ver detalle» en la tarjeta de billetera y compártelo con el equipo.</p>
    </Aviso>}
  </section>
  if (!b) return <section className="glass tarjeta billetera" aria-label="Tu billetera" aria-busy="true"><p className="nota">Conectando tu billetera…</p></section>

  const copiar = async () => { try { await navigator.clipboard.writeText(b.direccion); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sin permiso de portapapeles */ } }
  const pedirFondos = async () => {
    setFondeando(true)
    try { await fondear(b.direccion); await leer(b.direccion) } catch { setSaldo({ t: 'error' }) } finally { setFondeando(false) }
  }
  return <section className="glass tarjeta billetera" aria-label="Tu billetera">
    <div className="billetera__fila">
      <div>
        <p className="etiqueta">Tu billetera · Stellar testnet</p>
        <p className="billetera__dir"><code title={b.direccion}>{abreviar(b.direccion)}</code>
          <button type="button" className="boton boton--secundario boton--chico" onClick={copiar} aria-label="Copiar dirección completa">{copiado ? 'Copiada' : 'Copiar'}</button>
          <a className="enlace" href={enlaceExplorer(b.direccion)} target="_blank" rel="noopener noreferrer">Ver en stellar.expert</a></p>
      </div>
      <p className="billetera__saldo" role="status">
        {saldo.t === 'cargando' && <span className="nota">Consultando saldo…</span>}
        {saldo.t === 'ok' && <strong>{formatoXlm(saldo.xlm)}</strong>}
        {saldo.t === 'error' && <span className="nota">No pudimos consultar el saldo.</span>}
      </p>
    </div>
    {saldo.t === 'sin-cuenta' && <div className="billetera__fondeo">
      <p className="nota">Tu cuenta todavía no existe en la red de prueba. En Stellar, una cuenta existe cuando recibe su primer XLM.
        Puedes crearla con Friendbot, el servicio de Stellar que entrega XLM de prueba gratis (sin valor real).</p>
      <button type="button" className="boton boton--primario boton--chico" disabled={fondeando} onClick={pedirFondos}>{fondeando ? 'Fondeando…' : 'Fondear con Friendbot'}</button>
    </div>}
  </section>
}
