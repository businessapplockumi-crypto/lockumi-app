import { useState } from 'react'
import { store } from '../store'
import { escrow } from '../services/escrow'
import { ir } from '../router'
import type { Usuario } from '../types'
import { CampoFecha } from '../ui'
import { LogoAnimado } from '../LogoAnimado'
import { validarAlquiler, hoyISO, montoNumero, sumarMeses, MIN_MESES, MAX_ANIOS, type Campo, type Errores } from '../validacion'

export function Crear({ u }: { u: Usuario }) {
  const [f, setF] = useState({ direccion: '', monto: '', email: '', inicio: '', fin: '' })
  const [tocado, setTocado] = useState<Partial<Record<Campo, boolean>>>({}); const [enviado, setEnviado] = useState(false)
  const [reglas, setReglas] = useState<string[]>(['No se permiten mascotas']); const [regla, setRegla] = useState(''); const [ocupado, setOcupado] = useState(false)
  const errores: Errores = validarAlquiler(f, hoyISO(), u.email)
  const ver = (k: Campo) => (enviado || tocado[k]) ? errores[k] : undefined
  const poner = (k: Campo, v: string) => setF(x => ({ ...x, [k]: v }))
  const tocar = (k: Campo) => () => setTocado(t => ({ ...t, [k]: true }))
  const agregar = () => { if (regla.trim()) { setReglas([...reglas, regla.trim()]); setRegla('') } }
  const crear = async () => {
    setEnviado(true)
    const primero = (['direccion', 'monto', 'inicio', 'fin', 'email'] as Campo[]).find(k => errores[k])
    if (primero) { document.getElementById('f-' + primero)?.focus(); return }
    setOcupado(true)
    const m = montoNumero(f.monto)
    const a = store.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, duenoEmail: u.email, inquilinoEmail: f.email.trim() })
    const { escrowId } = await escrow.crear(a.id, m); store.cambiar(a.id, x => { x.escrowId = escrowId }); ir('/alquiler/' + a.id)
  }
  const campoUI = ({ k, et, children }: { k: Campo; et: string; children: React.ReactNode }) => <label className={'campo' + (ver(k) ? ' campo--error' : '')}><span>{et}</span>{children}
    {ver(k) && <small id={'f-' + k + '-err'} className="campo__error" role="alert">{ver(k)}</small>}</label>
  const prop = (k: Campo) => ({ id: 'f-' + k, value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => poner(k, e.target.value), onBlur: tocar(k), 'aria-invalid': !!ver(k), 'aria-describedby': ver(k) ? 'f-' + k + '-err' : undefined })
  const cuantos = Object.keys(errores).length
  return <main id="contenido" tabIndex={-1} className="cont cont--form" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <div className="cab titulo"><h1>Nuevo alquiler</h1><LogoAnimado className="logo-pieza logo-pieza--titulo" /></div>
    <form className="glass glass--fuerte tarjeta pila" noValidate onSubmit={e => { e.preventDefault(); crear() }}>
      {campoUI({ k: 'direccion', et: 'Dirección o nombre del lugar', children: <input {...prop('direccion')} placeholder="Ej.: Apartamento 3B, Escazú" autoComplete="off" maxLength={140} /> })}
      {campoUI({ k: 'monto', et: 'Depósito (USD)', children: <input {...prop('monto')} inputMode="decimal" placeholder="Ej.: 800" autoComplete="off" /> })}
      <div className="fila">
        <CampoFecha id="f-inicio" etiqueta="Entrada" valor={f.inicio} onCambio={v => poner('inicio', v)} onSalir={tocar('inicio')} error={ver('inicio')} ayuda="Desde hoy en adelante" min={hoyISO()} max={sumarMeses(hoyISO(), 12)} />
        <CampoFecha id="f-fin" etiqueta="Salida" valor={f.fin} onCambio={v => poner('fin', v)} onSalir={tocar('fin')} error={ver('fin')} ayuda={`De ${MIN_MESES} mes a ${MAX_ANIOS} años`} />
      </div>
      <p className="nota">La entrada es desde hoy en adelante (hasta 1 año), porque el alquiler empieza cuando se paga el depósito. El alquiler dura entre {MIN_MESES} mes y {MAX_ANIOS} años.</p>
      <fieldset className="campo"><legend>Reglas del alquiler</legend>
        <ul className="lista">{reglas.map((r, i) => <li key={i}>{r}<button type="button" className="x" aria-label={'Quitar regla: ' + r} onClick={() => setReglas(reglas.filter((_, j) => j !== i))}>×</button></li>)}</ul>
        <div className="agregar"><input aria-label="Nueva regla" value={regla} onChange={e => setRegla(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} placeholder="Agregar una regla" />
          <button type="button" className="boton boton--secundario boton--chico" onClick={agregar}>Agregar</button></div>
      </fieldset>
      {campoUI({ k: 'email', et: 'Correo del inquilino', children: <input {...prop('email')} type="email" placeholder="inquilino@correo.com" autoComplete="off" /> })}
      {enviado && cuantos > 0 && <p className="error" role="alert">Revisa {cuantos === 1 ? 'el campo marcado' : `los ${cuantos} campos marcados`} y vuelve a intentarlo.</p>}
      <button type="submit" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado}>{ocupado ? 'Creando…' : 'Crear alquiler e invitar'}</button>
      <p className="nota">Tú quedas como dueño. La persona invitada entra como inquilino. Lo siguiente es firmar el contrato los dos.</p>
    </form>
  </main>
}
