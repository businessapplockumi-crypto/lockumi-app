import { useSyncExternalStore } from 'react'
import { Aviso } from './Aviso'
import { alertaActual, cerrarAlerta, suscribirAlertas, tonoDe, type Alerta } from './alertas'

/** Contenido de un aviso de paso: qué pasó y, en una línea aparte, qué sigue. */
export function TextoAlerta({ a }: { a: Alerta }) {
  return <>
    <p>{a.hecho}</p>
    {a.sigue && <p className="aviso-pop__sigue"><strong>{a.tipo === 'error' ? 'Cómo seguir:' : 'Lo que sigue:'}</strong> {a.sigue}</p>}
  </>
}

/** Muestra los avisos de la cola, de a uno. Va una sola vez en App.
 *  Las dos zonas quedan siempre en la página (vacías si no hay aviso) para que los lectores de pantalla
 *  anuncien el aviso al aparecer: `status` (amable) para pasos y logros, `alert` para errores. */
export function Alertas() {
  const a = useSyncExternalStore(suscribirAlertas, alertaActual, alertaActual)
  const tono = a ? tonoDe(a) : null
  const aviso = a && <Aviso key={a.paso + a.titulo} tono={tono!} titulo={a.titulo} onCerrar={cerrarAlerta}><TextoAlerta a={a} /></Aviso>
  return <>
    <div className="aviso-zona" role="status" aria-live="polite">{tono !== 'error' && aviso}</div>
    <div className="aviso-zona" role="alert">{tono === 'error' && aviso}</div>
  </>
}
