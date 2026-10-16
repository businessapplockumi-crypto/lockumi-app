import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Aviso emergente propio (sin librerías): tarjeta con desenfoque de fondo, ícono animado y entrada suave.
 *  En celular entra desde abajo (hoja); en escritorio aparece centrado con fade + scale. */
export function Aviso({ tipo = 'exito', titulo, children, boton = 'Continuar', onCerrar }:
  { tipo?: 'exito' | 'error'; titulo: string; children: ReactNode; boton?: string; onCerrar: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cerrar = () => { if (saliendo) return; setSaliendo(true); setTimeout(onCerrar, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220) }
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('.aviso-pop__boton')?.focus()
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); if (e.key === 'Tab') { e.preventDefault(); ref.current?.querySelector<HTMLElement>('.aviso-pop__boton')?.focus() } }
    addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.() }
  }) // eslint-disable-line
  return <div className={'aviso-velo' + (saliendo ? ' aviso-velo--sale' : '')} onClick={e => e.target === e.currentTarget && cerrar()}>
    <div ref={ref} className={'aviso-pop aviso-pop--' + tipo} role={tipo === 'error' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="aviso-t" aria-describedby="aviso-d">
      <button type="button" className="aviso-pop__x" aria-label="Cerrar" onClick={cerrar}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      <div className="aviso-pop__ico" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <circle className="aviso-pop__aro" cx="32" cy="32" r="28" pathLength={1} />
          {tipo === 'exito' ? <path className="aviso-pop__trazo" d="M20 33l8 8 16-17" pathLength={1} />
            : <><path className="aviso-pop__trazo" d="M32 19v17" pathLength={1} /><circle className="aviso-pop__punto" cx="32" cy="45" r="2.6" /></>}
        </svg>
      </div>
      <h2 id="aviso-t" className="aviso-pop__titulo">{titulo}</h2>
      <div id="aviso-d" className="aviso-pop__texto">{children}</div>
      <button type="button" className="boton boton--primario boton--ancho aviso-pop__boton" onClick={cerrar}>{boton}</button>
    </div>
  </div>
}
