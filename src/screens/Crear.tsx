import { useState } from 'react'
import { store } from '../store'
import { escrow } from '../services/escrow'
import { ir } from '../router'
import type { Usuario } from '../types'
import { Demo } from '../ui'
export function Crear({ u }: { u: Usuario }) {
  const [f, setF] = useState({ direccion:'', monto:'', inicio:'', fin:'', email:'' })
  const [reglas, setReglas] = useState<string[]>(['No se permiten mascotas']); const [regla, setRegla] = useState(''); const [err, setErr] = useState('')
  if (u.rol !== 'dueno') return <main className="cont cont--form"><div className="glass tarjeta">Solo el dueño puede crear un alquiler. Cambiá el rol arriba.</div></main>
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr('') }
  const agregar = () => { if (regla.trim()) { setReglas([...reglas, regla.trim()]); setRegla('') } }
  const crear = async () => {
    const m = Number(f.monto)
    if (!f.direccion || !(m > 0) || !f.inicio || !f.fin || !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Completá todos los campos con datos válidos.')
    if (f.fin <= f.inicio) return setErr('La fecha de salida debe ser posterior a la de entrada.')
    const a = store.crear({ direccion: f.direccion, monto: m, moneda:'USD', inicio: f.inicio, fin: f.fin, reglas, duenoEmail: u.email, inquilinoEmail: f.email })
    await escrow.crear(a.id, m); ir('/alquiler/' + a.id)
  }
  return <main className="cont cont--form" style={{ paddingBottom: 48 }}>
    <a href="#/" className="nota">← Volver</a>
    <h1 style={{ margin: '8px 0 16px' }}>Nuevo alquiler</h1>
    <div className="glass glass--fuerte tarjeta pila">
      <label className="campo"><span>Dirección o nombre del inmueble</span><input value={f.direccion} onChange={set('direccion')} placeholder="Ej.: Apartamento 3B, Escazú" /></label>
      <label className="campo"><span>Monto del depósito (USD)</span><input type="number" inputMode="decimal" min="1" value={f.monto} onChange={set('monto')} placeholder="0" /></label>
      <div className="fila">
        <label className="campo"><span>Entrada</span><input type="date" value={f.inicio} onChange={set('inicio')} /></label>
        <label className="campo"><span>Salida</span><input type="date" value={f.fin} onChange={set('fin')} /></label>
      </div>
      <div className="campo"><span>Reglas del alquiler</span>
        <ul className="lista">{reglas.map((r, i) => <li key={i}>{r}<button className="x" aria-label={'Quitar ' + r} onClick={() => setReglas(reglas.filter((_, j) => j !== i))}>×</button></li>)}</ul>
        <div style={{ display:'flex', gap: 8, marginTop: 8 }}><input style={{ flex: 1, minWidth: 0 }} value={regla} onChange={e => setRegla(e.target.value)} onKeyDown={e => e.key === 'Enter' && agregar()} placeholder="Agregar una regla" />
          <button className="boton boton--secundario boton--chico" style={{ minHeight: 48 }} onClick={agregar}>Agregar</button></div>
      </div>
      <label className="campo"><span>Correo del inquilino</span><input type="email" value={f.email} onChange={set('email')} placeholder="inquilino@correo.com" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="boton boton--primario boton--ancho" onClick={crear}>Crear alquiler e invitar</button>
      <p className="nota">El depósito queda en una cuenta de garantía (escrow) que nadie puede liberar solo. <Demo /></p>
    </div>
  </main>
}
