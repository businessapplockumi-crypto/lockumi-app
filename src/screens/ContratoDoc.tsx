// Contrato del alquiler: siempre visible en el detalle (antes y después de firmar) y con una versión para imprimir o guardar
// como PDF desde el navegador (window.print, sin generar archivos). Todo sale de los datos que ya están en este navegador:
// el lugar y las fotos no se envían a ningún lado para mostrarlo o imprimirlo.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { modoPrueba } from '../servidor/config'
import { NOMBRE_ROL, type Alquiler, type Rol } from '../types'
import { usd, fecha, fechaHora } from '../ui'
import { DUENO_PRUEBA } from './Real'

const ROLES: Rol[] = ['dueno', 'inquilino']
const parte = (a: Alquiler, r: Rol) => r === 'dueno' ? (modoPrueba ? DUENO_PRUEBA : a.duenoEmail) : a.inquilinoEmail

function Documento({ a, impresion }: { a: Alquiler; impresion?: boolean }) {
  const f = a.contrato.firmas
  const firmado = ROLES.every(r => f[r])
  return <article className={'ct' + (impresion ? ' ct--impresion' : '')} aria-labelledby={impresion ? undefined : 'ct-titulo'}>
    <header className="ct__cab">
      <p className="ct__marca">Lockumi{modoPrueba ? ' · Prueba en la red de prueba' : ''}</p>
      <h2 id={impresion ? undefined : 'ct-titulo'} className="ct__titulo">Contrato</h2>
      <p className="ct__estado"><span className={'ct__sello' + (firmado ? ' ct__sello--ok' : '')}>{firmado ? 'Firmado por los dos' : 'Pendiente de firmas'}</span>
        <span className="ct__ref">Referencia {a.id.slice(0, 8).toUpperCase()}</span></p>
    </header>

    <section className="ct__sec"><h3>El alquiler</h3>
      <dl className="ct__datos">
        <div className="ct__ancho"><dt>Lugar</dt><dd>{a.direccion}</dd></div>
        <div><dt>Depósito</dt><dd>{usd(a.monto)}</dd></div>
        <div><dt>Entrada</dt><dd>{fecha(a.inicio)}</dd></div>
        <div><dt>Salida</dt><dd>{fecha(a.fin)}</dd></div>
      </dl>
    </section>

    <section className="ct__sec"><h3>Partes</h3>
      <dl className="ct__datos ct__datos--partes">{ROLES.map(r => <div key={r}><dt>{NOMBRE_ROL[r]}</dt><dd>{parte(a, r)}</dd></div>)}</dl>
    </section>

    <section className="ct__sec"><h3>Reglas</h3>
      {a.reglas.length > 0 ? <ul className="ct__reglas">{a.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="ct__texto">Sin reglas adicionales.</p>}
    </section>

    <section className="ct__sec"><h3>El depósito</h3>
      {/* Texto que ya mostraba la app en «El contrato». */}
      <p className="ct__texto">El depósito queda guardado hasta el final. Nadie puede tomarlo solo: ni el dueño, ni el inquilino, ni Lockumi.</p>
    </section>

    <section className="ct__sec"><h3>7 días para reclamos</h3>
      {/* LEGAL: revisar. Resumen de la cláusula 6.5 de los Términos 1.5-demo. */}
      <p className="ct__texto">Al terminar el alquiler, el dueño tiene 7 días para hacer un reclamo, con fotos y una factura o un presupuesto. Si no reclama, el depósito vuelve completo al inquilino. El inquilino tiene 7 días para responder.</p>
    </section>

    <section className="ct__sec"><h3>Mediación</h3>
      {/* LEGAL: revisar. Resumen de la cláusula 6.7 de los Términos 1.5-demo. */}
      <p className="ct__texto">Si no se ponen de acuerdo, una persona mediadora revisa las fotos de entrada y de salida y decide cómo se reparte el depósito.{modoPrueba ? ' En esta prueba, la persona mediadora es simulada.' : ''}</p>
    </section>

    <section className="ct__sec"><h3>Firmas</h3>
      <ul className="ct__firmas">{ROLES.map(r => <li key={r}>
        <span className="ct__firma-quien">{NOMBRE_ROL[r]}<small>{parte(a, r)}</small></span>
        {f[r] ? <span className="ct__firma-ok">Firmó el {fechaHora(f[r]!)}</span> : <span className="ct__firma-pend">Pendiente</span>}
      </li>)}</ul>
    </section>

    {/* LEGAL: revisar. Resumen de las cláusulas 2.5 y 2.6 de los Términos 1.5-demo y de la línea de privacidad aprobada. */}
    <footer className="ct__pie">
      {modoPrueba && <p>Es una prueba en la red de prueba de Stellar, sin dinero real. No reemplaza un contrato de alquiler.</p>}
      <p>Este contrato se guarda solo en tu navegador. El lugar y las fotos no salen de él.</p>
    </footer>
  </article>
}

/** Contrato con el botón «Descargar o imprimir». El navegador abre su ventana de impresión, donde también se puede guardar como PDF. */
export function ContratoDoc({ a }: { a: Alquiler }) {
  const [imprimiendo, setImprimiendo] = useState(false)
  useEffect(() => {
    if (!imprimiendo) return
    const fin = () => { document.documentElement.classList.remove('imprimiendo'); setImprimiendo(false) }
    document.documentElement.classList.add('imprimiendo'); addEventListener('afterprint', fin, { once: true })
    const t = setTimeout(() => print(), 50)
    return () => { clearTimeout(t); removeEventListener('afterprint', fin); document.documentElement.classList.remove('imprimiendo') }
  }, [imprimiendo])
  return <div className="pila">
    <Documento a={a} />
    <button type="button" className="boton boton--secundario boton--ancho ct__imprimir" onClick={() => setImprimiendo(true)}>Descargar o imprimir</button>
    <p className="nota centro">Se abre la ventana de impresión. Para descargarlo, elige «Guardar como PDF».</p>
    {imprimiendo && createPortal(<div className="impresion"><Documento a={a} impresion /></div>, document.body)}
  </div>
}
