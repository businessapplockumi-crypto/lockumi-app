import { useAlquileres, store } from '../store'
import { ETIQUETA_ESTADO, type Usuario } from '../types'
import { Demo, usd, fecha } from '../ui'
export function Inicio({ u }: { u: Usuario }) {
  const todos = useAlquileres()
  const mios = todos.filter(a => (u.rol === 'dueno' ? a.duenoEmail : a.inquilinoEmail) === u.email || u.metodo !== 'correo')
  const chip = (e: string) => e === 'apartado' || e === 'cerrado' ? 'chip--exito' : e === 'reclamo' || e === 'mediacion' ? 'chip--coral' : 'chip--neutro'
  return <main className="cont" style={{ paddingBottom: 48 }}>
    <div className="cab" style={{ margin: '16px 0 20px' }}>
      <div><p className="etiqueta">{u.rol === 'dueno' ? 'Dueño' : 'Inquilino'}</p><h1>Tus alquileres</h1></div>
      {u.rol === 'dueno' && <a className="boton boton--primario" href="#/crear">+ Nuevo alquiler</a>}
    </div>
    {mios.length === 0 && <div className="glass tarjeta"><p>Todavía no tenés alquileres.</p></div>}
    <div className="rejilla">
      {mios.map(a => <a key={a.id} className="glass tarjeta alquiler" href={'#/alquiler/' + a.id}>
        <div className="cab"><h3>{a.direccion}</h3><span className={'chip ' + chip(a.estado)}>{ETIQUETA_ESTADO[a.estado]}</span></div>
        <div className="monto">{usd(a.monto)} <span className="nota" style={{ fontFamily:'var(--f-texto)', fontWeight:400 }}>de depósito</span></div>
        <p className="nota">{fecha(a.inicio)} → {fecha(a.fin)} · {u.rol === 'dueno' ? a.inquilinoEmail : a.duenoEmail}</p>
      </a>)}
    </div>
    <p className="nota" style={{ marginTop: 24 }}>Datos de ejemplo, ficticios. <Demo /> <button className="boton boton--secundario boton--chico" style={{ marginLeft: 8 }} onClick={() => store.reiniciar()}>Reiniciar demo</button></p>
  </main>
}
