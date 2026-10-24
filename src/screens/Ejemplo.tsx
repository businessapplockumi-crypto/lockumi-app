import { useEffect, useSyncExternalStore } from 'react'
import type { Usuario } from '../types'
import { Detalle } from './Detalle'
import { abrirRecorrido, alquilerEjemplo, estadoDelEjemplo, suscribirEjemplo, yaLoVio, recorridoActivo } from '../recorrido'

/** #/ejemplo: el alquiler de ejemplo del recorrido (solo lectura). Fuera del recorrido muestra el mismo ejemplo. */
export function Ejemplo({ u }: { u: Usuario }) {
  const estado = useSyncExternalStore(suscribirEjemplo, estadoDelEjemplo)
  return <Detalle id="ejemplo" u={u} ejemplo={alquilerEjemplo(estado, u.email)} />
}

/** Abre el recorrido solo la primera vez que la persona llega a Inicio (con la sesión iniciada). */
export function useRecorridoPrimeraVez(u: Usuario | null, ruta: string) {
  useEffect(() => {
    if (!u || ruta !== '/') return
    let vivo = true
    const t = setTimeout(() => { void yaLoVio(u).then(v => { if (vivo && !v && !recorridoActivo() && (location.hash.slice(1) || '/') === '/') abrirRecorrido(u) }) }, 700)
    return () => { vivo = false; clearTimeout(t) }
  }, [u, ruta])
}
