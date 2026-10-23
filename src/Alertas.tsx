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

/** Muestra los avisos de la cola, de a uno. Va una sola vez en App. */
export function Alertas() {
  const a = useSyncExternalStore(suscribirAlertas, alertaActual, alertaActual)
  if (!a) return null
  return <Aviso key={a.paso + a.titulo} tono={tonoDe(a)} titulo={a.titulo} onCerrar={cerrarAlerta}><TextoAlerta a={a} /></Aviso>
}
