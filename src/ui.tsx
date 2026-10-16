import type { ReactNode } from 'react'
import type { Rol, Usuario } from './types'
export const Demo = ({ t = 'Demo: simulado' }: { t?: string }) => <span className="demo" title="Integración simulada para la demo">{t}</span>
export const Escudo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 6 9v10c0 9 6 15 14 17 8-2 14-8 14-17V9z" fill="rgba(111,191,138,.25)" stroke="#2E7347" strokeWidth="2" strokeLinejoin="round"/><path d="m14 20 4 4 8-8" fill="none" stroke="#2E7347" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>)
export function Barra({ u, onRol, onSalir }: { u: Usuario; onRol: (r: Rol) => void; onSalir: () => void }) {
  return <header className="cont barra">
    <a href="#/"><img src="/img/logo-lockumi.svg" alt="Lockumi" /></a>
    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
      <div className="roles" role="group" aria-label="Rol de la demo">
        <button aria-pressed={u.rol==='dueno'} onClick={() => onRol('dueno')}>Dueño</button>
        <button aria-pressed={u.rol==='inquilino'} onClick={() => onRol('inquilino')}>Inquilino</button>
      </div>
      <button className="boton boton--secundario boton--chico" onClick={onSalir} aria-label="Salir">Salir</button>
    </div>
  </header>
}
export const Fondo = ({ children }: { children: ReactNode }) => <><div className="aurora"><div className="blob blob--1"/><div className="blob blob--2"/></div>{children}</>
export const usd = (n: number) => new Intl.NumberFormat('es-CR', { style:'currency', currency:'USD' }).format(n)
export const fecha = (s: string) => new Date(s.length === 10 ? s + 'T12:00:00' : s).toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })
