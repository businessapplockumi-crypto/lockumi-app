import { useState } from 'react'
import { store } from '../store'
import { escrow } from '../services/escrow'
import { ir } from '../router'
import type { Usuario } from '../types'
import { CampoFecha, Demo, Deco } from '../ui'
export function Crear({ u, onRol }: { u: Usuario; onRol: (r: 'dueno') => void }) {
  const [f, setF] = useState({ direccion:'', monto:'', email:'' }); const [inicio, setInicio] = useState(''); const [fin, setFin] = useState('')
  const [reglas, setReglas] = useState<string[]>(['No se permiten mascotas']); const [regla, setRegla] = useState(''); const [err, setErr] = useState('')
  if (u.rol !== 'dueno') return <main id="contenido" tabIndex={-1} className="cont cont--form"><div className="glass tarjeta pila"><p>Solo el dueño puede crear un alquiler.</p>
    <button type="button" className="boton boton--secundario boton--chico" onClick={() => onRol('dueno')}>Ver como dueño</button></div></main>
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr('') }
  const agregar = () => { if (regla.trim()) { setReglas([...reglas, regla.trim()]); setRegla('') } }
  const crear = async () => {
    const m = Number(f.monto)
    if (!f.direccion.trim()) return setErr('Escribí la dirección o un nombre para el inmueble.')
    if (!(m > 0)) return setErr('El monto del depósito debe ser mayor que cero.')
    if (!inicio || !fin) return setErr('Completá las fechas de entrada y salida (dd/mm/aaaa).')
    if (fin <= inicio) return setErr('La fecha de salida debe ser posterior a la de entrada.')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Escribí un correo válido para el inquilino.')
    const a = store.crear({ direccion: f.direccion.trim(), monto: m, inicio, fin, reglas, duenoEmail: u.email, inquilinoEmail: f.email.trim() })
    const { escrowId } = await escrow.crear(a.id, m); store.cambiar(a.id, x => { x.escrowId = escrowId }); ir('/alquiler/' + a.id)
  }
  return <main id="contenido" tabIndex={-1} className="cont cont--form" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <div className="cab titulo"><h1>Nuevo alquiler</h1><Deco id="d-casita" size={52} className="deco--flota" /></div>
    <form className="glass glass--fuerte tarjeta pila" noValidate onSubmit={e => { e.preventDefault(); crear() }}>
      <label className="campo"><span>Dirección o nombre del inmueble</span><input value={f.direccion} onChange={set('direccion')} placeholder="Ej.: Apartamento 3B, Escazú" autoComplete="off" /></label>
      <label className="campo"><span>Monto del depósito (USD)</span><input type="number" inputMode="decimal" min="1" value={f.monto} onChange={set('monto')} placeholder="0" /></label>
      <div className="fila">
        <CampoFecha id="f-inicio" etiqueta="Entrada" valor={inicio} onCambio={v => { setInicio(v); setErr('') }} />
        <CampoFecha id="f-fin" etiqueta="Salida" valor={fin} onCambio={v => { setFin(v); setErr('') }} />
      </div>
      <fieldset className="campo"><legend>Reglas del alquiler</legend>
        <ul className="lista">{reglas.map((r, i) => <li key={i}>{r}<button type="button" className="x" aria-label={'Quitar regla: ' + r} onClick={() => setReglas(reglas.filter((_, j) => j !== i))}>×</button></li>)}</ul>
        <div className="agregar"><input aria-label="Nueva regla" value={regla} onChange={e => setRegla(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} placeholder="Agregar una regla" />
          <button type="button" className="boton boton--secundario boton--chico" onClick={agregar}>Agregar</button></div>
      </fieldset>
      <label className="campo"><span>Correo del inquilino</span><input type="email" value={f.email} onChange={set('email')} placeholder="inquilino@correo.com" autoComplete="off" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button type="submit" className="boton boton--primario boton--ancho">Crear alquiler e invitar</button>
      <p className="nota">El depósito quedará en una cuenta de garantía (escrow) que nadie puede liberar solo. La invitación por correo también es simulada. <Demo /></p>
    </form>
  </main>
}
