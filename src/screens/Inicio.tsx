import { useAlquileres, store, rolDe } from '../store'
import { LogoAnimado } from '../LogoAnimado'
import { NOMBRE_ROL } from '../types'
import { ETIQUETA_ESTADO, type Usuario } from '../types'
import { Demo, Simulado, usd, fecha } from '../ui'
import { modoReal } from '../services/auth'
import { Billetera } from './Billetera'
import { modoSolo, modoVideo } from '../servidor/config'
export function Inicio({ u }: { u: Usuario }) {
  const todos = useAlquileres()
  const chip = (e: string) => e === 'en_curso' || e === 'cerrado' ? 'chip--exito' : e === 'reclamo' || e === 'mediacion' ? 'chip--coral' : 'chip--neutro'
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <div className="hero glass">
      <div><p className="etiqueta">Hola, {u.nombre}</p><h1>Tus alquileres</h1>
        <p className="nota">{modoSolo ? 'Prueba real en la red de prueba de Stellar, sin dinero real: creas un alquiler, depositas USDC de prueba como inquilino y un dueño de prueba de Lockumi aprueba la devolución.' : modoVideo ? 'Prueba en la red de prueba de Stellar, sin dinero real: creas un alquiler, firman el contrato, depositas USDC de prueba en una cuenta segura, toman las fotos de entrada y salida, y ves los 7 días para reclamos. Tú eres el inquilino y también manejas al dueño de prueba de Lockumi.' : 'Crea un alquiler e invita a tu inquilino, o entra a los que te invitaron. El depósito queda protegido para ambos.'}</p></div>
      <a className="boton boton--primario" href="#/crear">+ Nuevo alquiler</a>
      <LogoAnimado className="logo-pieza logo-pieza--hero" />
    </div>
    {(modoReal || (import.meta.env.DEV && localStorage.getItem('lockumi.billetera.prueba'))) && <Billetera />}
    {todos.length === 0 && <div className="glass tarjeta"><p>Todavía no hay alquileres.</p></div>}
    <ul className="rejilla" role="list">
      {todos.map(a => <li key={a.id}><a className="glass tarjeta alquiler" href={'#/alquiler/' + a.id}>
        <div className="cab"><h2 className="h3">{a.direccion}</h2><span className={'chip ' + chip(a.estado)}>{ETIQUETA_ESTADO[a.estado]}</span></div>
        <div className="monto">{usd(a.monto)} <span className="nota monto__sub">de depósito</span></div>
        <p className="nota">{fecha(a.inicio)} → {fecha(a.fin)}</p>
        <p className="nota cortar"><span className="chip chip--neutro chip--mini">Eres {NOMBRE_ROL[rolDe(a, u.email)].toLowerCase()}</span> {rolDe(a, u.email) === 'dueno' ? 'Inquilino: ' + a.inquilinoEmail : 'Dueño: ' + a.duenoEmail}</p>
      </a></li>)}
    </ul>
    <div className="pie nota"><span>{modoSolo ? 'Tus alquileres de prueba se guardan solo en este navegador. El depósito, la aprobación y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales.' : modoVideo ? <>Tus alquileres de prueba se guardan solo en este navegador. El depósito, el reclamo y la devolución quedan registrados en la red de prueba de Stellar, sin datos personales. La persona mediadora es simulada. <Simulado /></> : <>En la demo ves todos los alquileres. Los datos son de ejemplo, ficticios, y se guardan solo en este navegador. <Demo /></>}</span>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => { if (confirm('¿Reiniciar la demo? Se borran los cambios.')) store.reiniciar() }}>Reiniciar demo</button></div>
  </main>
}
