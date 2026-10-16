import { useCallback, useEffect, useState } from 'react'
import { abreviar, conectarBilletera, consultarSaldo, enlaceExplorer, fondear, formatoXlm, type Billetera as B } from '../services/billetera'

type Saldo = { t: 'cargando' } | { t: 'ok'; xlm: string } | { t: 'sin-cuenta' } | { t: 'error' }

/** Tarjeta breve de la billetera Stellar testnet (solo con login real de Cavos). */
export function Billetera() {
  const [b, setB] = useState<B | null>(null); const [err, setErr] = useState('')
  const [saldo, setSaldo] = useState<Saldo>({ t: 'cargando' })
  const [copiado, setCopiado] = useState(false); const [fondeando, setFondeando] = useState(false)

  useEffect(() => { conectarBilletera().then(setB).catch(() => setErr('No pudimos conectar tu billetera. Vuelve a entrar para intentarlo de nuevo.')) }, [])
  const leer = useCallback(async (g: string) => {
    setSaldo({ t: 'cargando' })
    try { const x = await consultarSaldo(g); setSaldo(x === null ? { t: 'sin-cuenta' } : { t: 'ok', xlm: x }) } catch { setSaldo({ t: 'error' }) }
  }, [])
  useEffect(() => { if (b) void leer(b.direccion) }, [b, leer])

  if (err) return <section className="glass tarjeta billetera" aria-label="Tu billetera"><p className="nota">{err}</p></section>
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
