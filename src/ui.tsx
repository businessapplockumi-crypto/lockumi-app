import { modoReal } from './services/auth'
import { useEffect, useState, type ReactNode } from 'react'
import type { Usuario, Alquiler } from './types'
import { ETAPAS, etapaDe } from './flujo'

export const Demo = ({ t = 'Demo: simulado' }: { t?: string }) => modoReal ? null : <span className="demo" title="Integración simulada para la demo">{t}</span>
export const Icono = ({ id, className = '' }: { id: string; className?: string }) =>
  <svg className={'ico ' + className} aria-hidden="true" focusable="false"><use href={'#' + id} /></svg>
export const Deco = ({ id, size = 48, className = '' }: { id: string; size?: number; className?: string }) =>
  <svg className={'deco ' + className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href={'#' + id} /></svg>

export function Barra({ u, onSalir }: { u: Usuario; onSalir: () => void }) {
  return <header className="cont barra">
    <a href="#/" className="logo" aria-label="Lockumi, ir a tus alquileres"><img src="/img/logo-lockumi.svg" alt="" /></a>
    <div className="barra__der">
      <span className="barra__usuario cortar" title={u.email}>{u.email}</span>
      <button type="button" className="boton-icono" onClick={onSalir} aria-label="Salir" title="Salir">
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10"/></svg>
      </button>
    </div>
  </header>
}
export const Fondo = ({ children }: { children: ReactNode }) => <><div className="aurora" aria-hidden="true"><div className="blob blob--1"/><div className="blob blob--2"/><div className="blob blob--3"/></div>{children}</>
export const usd = (n: number) => new Intl.NumberFormat('es-CR', { style:'currency', currency:'USD', currencyDisplay:'code' }).format(n)
const d = (s: string | number) => typeof s === 'string' && s.length === 10 ? new Date(s + 'T12:00:00') : new Date(s)
export const fecha = (s: string | number) => d(s).toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })
export const fechaHora = (s: string | number) => d(s).toLocaleString('es-CR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

/** Campo de fecha en formato dd/mm/aaaa (consistente en cualquier navegador). Valor: ISO aaaa-mm-dd (aunque sea un día
 *  imposible, para que la validación lo explique) o '' si está incompleta. */
export function CampoFecha({ etiqueta, valor, onCambio, onSalir, id, error, ayuda }: { etiqueta: string; valor: string; onCambio: (iso: string) => void; onSalir?: () => void; id: string; error?: string; ayuda?: string }) {
  const aTexto = (iso: string) => iso ? iso.split('-').reverse().join('/') : ''
  const [t, setT] = useState(aTexto(valor))
  useEffect(() => { if (!valor) return; setT(aTexto(valor)) }, [valor])
  const cambiar = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 8)
    const f = n.length > 4 ? `${n.slice(0,2)}/${n.slice(2,4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0,2)}/${n.slice(2)}` : n
    setT(f)
    const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    onCambio(m ? `${m[3]}-${m[2]}-${m[1]}` : '')
  }
  const ok = !error && /^\d{4}-\d{2}-\d{2}$/.test(valor)
  return <div className={'campo' + (error ? ' campo--error' : '')}><label htmlFor={id} className="campo__et">{etiqueta}</label>
    <input id={id} inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={t} onChange={e => cambiar(e.target.value)} onBlur={onSalir}
      aria-invalid={!!error} aria-describedby={id + '-ayuda'} />
    <small id={id + '-ayuda'} className={error ? 'campo__error' : 'ayuda'} role={error ? 'alert' : undefined}>{error ?? (ok ? fecha(valor) : ayuda ?? 'Formato dd/mm/aaaa')}</small>
  </div>
}

/** Línea de tiempo simple, igual para las dos personas. */
export function LineaTiempo({ a }: { a: Alquiler }) {
  const actual = etapaDe(a); const fin = a.estado === 'cerrado'
  return <ol className="tiempo" aria-label="Cómo va el alquiler">
    {ETAPAS.map((t, i) => {
      const estado = i < actual || (fin && i === actual) ? 'hecho' : i === actual ? 'actual' : 'futuro'
      return <li key={t} className={'tiempo__paso tiempo__paso--' + estado} aria-current={estado === 'actual' ? 'step' : undefined}>
        <span className="tiempo__punto">{estado === 'hecho' ? <Icono id="i-check" /> : <b>{i + 1}</b>}</span>
        <span>{t}{estado === 'actual' && <em className="nota"> · ahora</em>}</span>
        <span className="sr">{estado === 'hecho' ? ' (listo)' : estado === 'actual' ? ' (paso actual)' : ' (pendiente)'}</span>
      </li>
    })}
  </ol>
}
