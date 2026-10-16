import { store, useAlquileres } from '../store'
import { ETIQUETA_ESTADO } from '../types'
import { Demo, usd, fecha } from '../ui'
export function Detalle({ id }: { id: string }) {
  useAlquileres(); const a = store.obtener(id)
  if (!a) return <main className="cont"><div className="glass tarjeta">No encontramos ese alquiler. <a href="#/">Volver</a></div></main>
  return <main className="cont cont--form" style={{ paddingBottom: 48 }}>
    <a href="#/" className="nota">← Volver</a>
    <div className="cab" style={{ margin: '8px 0 16px' }}><h1>{a.direccion}</h1><span className="chip chip--exito">{ETIQUETA_ESTADO[a.estado]}</span></div>
    <div className="glass tarjeta pila">
      <div className="monto">{usd(a.monto)}</div>
      <p className="nota">{fecha(a.inicio)} → {fecha(a.fin)} · Inquilino: {a.inquilinoEmail}</p>
      <h3>Reglas</h3><ul className="lista">{a.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <h3>Historial</h3><ul className="lista">{a.historial.map((h, i) => <li key={i}><span>{h.texto}</span><span className="nota">{fecha(h.fecha)}</span></li>)}</ul>
      <p className="nota">Acta de entrada, pago, rendimiento, salida y reclamos: próxima fase. <Demo /></p>
    </div>
  </main>
}
