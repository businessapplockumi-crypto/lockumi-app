import { useAlquileres, store } from '../store'
import { ETIQUETA_ESTADO, type Usuario } from '../types'
import { Demo, Deco, usd, fecha } from '../ui'
export function Inicio({ u }: { u: Usuario }) {
  const todos = useAlquileres()
  const chip = (e: string) => e === 'apartado' || e === 'cerrado' ? 'chip--exito' : e === 'reclamo' || e === 'mediacion' ? 'chip--coral' : 'chip--neutro'
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <div className="hero glass">
      <div><p className="etiqueta">{u.rol === 'dueno' ? 'Dueño' : 'Inquilino'}</p><h1>Tus alquileres</h1>
        <p className="nota">{u.rol === 'dueno' ? 'Creá un alquiler e invitá a tu inquilino. El depósito queda protegido para ambos.' : 'Aquí ves los alquileres a los que te invitaron.'}</p></div>
      {u.rol === 'dueno' && <a className="boton boton--primario" href="#/crear">+ Nuevo alquiler</a>}
      <div className="hero__deco" aria-hidden="true"><Deco id="d-casita" size={64} className="deco--flota" /><Deco id="d-hoja" size={34} className="deco--flota deco--b" /><Deco id="d-llave" size={42} className="deco--flota deco--c" /></div>
    </div>
    {todos.length === 0 && <div className="glass tarjeta"><p>Todavía no hay alquileres.</p></div>}
    <ul className="rejilla" role="list">
      {todos.map(a => <li key={a.id}><a className="glass tarjeta alquiler" href={'#/alquiler/' + a.id}>
        <div className="cab"><h2 className="h3">{a.direccion}</h2><span className={'chip ' + chip(a.estado)}>{ETIQUETA_ESTADO[a.estado]}</span></div>
        <div className="monto">{usd(a.monto)} <span className="nota monto__sub">de depósito</span></div>
        <p className="nota">{fecha(a.inicio)} → {fecha(a.fin)}</p>
        <p className="nota cortar">{u.rol === 'dueno' ? 'Inquilino: ' + a.inquilinoEmail : 'Dueño: ' + a.duenoEmail}</p>
      </a></li>)}
    </ul>
    <div className="pie nota"><span>En la demo ves todos los alquileres. Los datos son de ejemplo, ficticios, y se guardan solo en este navegador. <Demo /></span>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => { if (confirm('¿Reiniciar la demo? Se borran los cambios.')) store.reiniciar() }}>Reiniciar demo</button></div>
  </main>
}
