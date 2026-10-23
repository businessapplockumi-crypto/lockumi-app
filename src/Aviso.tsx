import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

const ENFOCABLE = 'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Aviso emergente propio (sin librerías): tarjeta con desenfoque de fondo, ícono animado y entrada suave.
 *  En celular entra desde abajo (hoja); en escritorio aparece centrado con fade + scale.
 *  Accesible: diálogo modal con título y descripción, el foco entra al botón principal, queda atrapado
 *  entre la X y el botón, Esc cierra y al cerrar vuelve a donde estaba (o al contenido si ese botón ya no existe). */
export function Aviso({ tipo = 'exito', titulo, children, boton = 'Continuar', icono, onCerrar }:
  { tipo?: 'exito' | 'error'; titulo: string; children: ReactNode; boton?: string; icono?: string; onCerrar: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  const ref = useRef<HTMLDivElement>(null); const id = useId()
  const saliendoRef = useRef(false); const onCerrarRef = useRef(onCerrar)
  useEffect(() => { onCerrarRef.current = onCerrar })
  const cerrar = () => {
    if (saliendoRef.current) return; saliendoRef.current = true; setSaliendo(true)
    setTimeout(() => onCerrarRef.current(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220)
  }
  const cerrarRef = useRef(cerrar); useEffect(() => { cerrarRef.current = cerrar })
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('.aviso-pop__boton')?.focus()
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrarRef.current(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const t = [...ref.current.querySelectorAll<HTMLElement>(ENFOCABLE)]; if (!t.length) return
      const i = t.indexOf(document.activeElement as HTMLElement)
      e.preventDefault(); t[(i + (e.shiftKey ? -1 : 1) + t.length) % t.length].focus()
    }
    addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', k); document.body.style.overflow = ''
      if (prev && prev !== document.body && prev.isConnected) prev.focus()
      else document.getElementById('contenido')?.focus()
    }
  }, [])
  return <div className={'aviso-velo' + (saliendo ? ' aviso-velo--sale' : '')} onClick={e => e.target === e.currentTarget && cerrar()}>
    <div ref={ref} className={'aviso-pop aviso-pop--' + tipo} role={tipo === 'error' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={id + 't'} aria-describedby={id + 'd'}>
      <button type="button" className="aviso-pop__x" aria-label="Cerrar" onClick={cerrar}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      <div className="aviso-pop__ico" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <circle className="aviso-pop__aro" cx="32" cy="32" r="28" pathLength={1} />
          {icono ? <use className="aviso-pop__icono" href={'#' + icono} x="18" y="18" width="28" height="28" />
            : tipo === 'exito' ? <path className="aviso-pop__trazo" d="M20 33l8 8 16-17" pathLength={1} />
            : <><path className="aviso-pop__trazo" d="M32 19v17" pathLength={1} /><circle className="aviso-pop__punto" cx="32" cy="45" r="2.6" /></>}
        </svg>
      </div>
      <h2 id={id + 't'} className="aviso-pop__titulo">{titulo}</h2>
      <div id={id + 'd'} className="aviso-pop__texto">{children}</div>
      <button type="button" className="boton boton--primario boton--ancho aviso-pop__boton" onClick={cerrar}>{boton}</button>
    </div>
  </div>
}
