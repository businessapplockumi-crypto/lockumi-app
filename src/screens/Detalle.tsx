import { useEffect, useState } from 'react'
import { LogoAnimado } from '../LogoAnimado'
import { store, useAlquileres, ahoraDe, actaVacia, DIA, vistaDe, rolDe, fijarVista } from '../store'
import { escrow } from '../services/escrow'
import { modoReal } from '../services/auth'
import { NOMBRE_ROL, type Alquiler, type Rol, type Foto, type Usuario } from '../types'
import { fotoEjemplo } from '../demoFotos'
import { Demo, Icono, LineaTiempo, usd, fecha, fechaHora } from '../ui'
import { CuartoEditor, Firma, FotoLista, cuartoListo } from './Acta'
import { TomarFoto } from '../Camara'
import { ETAPAS, etapaDe, pasoTexto, turno, otro, NOMBRE } from '../flujo'

type P = { a: Alquiler; rol: Rol }
const ahoraISO = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()
const Espera = ({ texto }: { texto: string }) => <div className="espera" role="status"><span className="espera__reloj" aria-hidden="true">⏳</span><p>{texto}</p></div>

function Contrato({ a, rol }: P) {
  return <div className="pila">
    <section className="pila"><h2>El contrato</h2>
      <ul className="lista resumen">
        <li><span>Lugar</span><strong>{a.direccion}</strong></li>
        <li><span>Depósito</span><strong>{usd(a.monto)}</strong></li>
        <li><span>Entrada</span><strong>{fecha(a.inicio)}</strong></li>
        <li><span>Salida</span><strong>{fecha(a.fin)}</strong></li>
        <li><span>Dueño</span><strong className="cortar">{a.duenoEmail}</strong></li>
        <li><span>Inquilino</span><strong className="cortar">{a.inquilinoEmail}</strong></li>
      </ul>
      {a.reglas.length > 0 && <><p className="mini">Reglas</p><ul className="reglas">{a.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
      <p className="nota">El depósito queda guardado hasta el final. Nadie puede tomarlo solo: ni el dueño, ni el inquilino, ni Lockumi.</p>
    </section>
    <Firma key={'c-' + rol} a={a} que="contrato" rol={rol} titulo="Firmas del contrato"
      texto="Lee el contrato. Si estás de acuerdo, fírmalo." casilla="Leí el contrato y estoy de acuerdo."
      alCompletar={x => { x.estado = 'pendiente_pago'; x.historial.push({ fecha: ahoraISO(x), texto: 'Contrato firmado por los dos' }) }} />
  </div>
}

function Pago({ a, rol }: P) {
  const [cargando, setC] = useState(false); const [err, setErr] = useState('')
  const pagar = async () => {
    setC(true); setErr('')
    try {
      const r = await escrow.depositar(a.escrowId ?? 'sim-' + a.id, a.monto)
      store.cambiar(a.id, x => { x.estado = 'fotos_entrada'; x.pago = r.fecha; x.escrowId ??= 'sim-' + a.id }, `Depósito de ${usd(a.monto)} pagado y guardado`)
    } catch { setC(false); setErr('No pudimos procesar el pago. Revisa tu conexión e intenta de nuevo.') }
  }
  return <section className="pila"><div className="cab"><h2>Depósito</h2><Demo t="Pago simulado" /></div>
    <div className="monto">{usd(a.monto)}</div>
    <p>El dinero queda guardado. El dueño no lo recibe ahora: se decide al final del alquiler.</p>
    {rol === 'inquilino' ? <>
      {!modoReal && <p className="nota">Es una demo: no se cobra nada.</p>}
      {err && <p className="error" role="alert">{err}</p>}
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={cargando} onClick={pagar}>{cargando ? 'Procesando…' : `Pagar ${usd(a.monto)}`}</button>
    </> : <Espera texto="Esperando que el inquilino pague el depósito." />}
  </section>
}

/** Fotos de entrada o salida: un espacio por pantalla y al final la confirmación. */
function Fotos({ a, rol, cual }: P & { cual: 'entrada' | 'salida' }) {
  const acta = a[cual]!; const n = acta.cuartos.length
  const falta = acta.cuartos.findIndex(c => !cuartoListo(c))
  const [i, setI] = useState(acta.firmas[rol] || falta === -1 ? n : falta); const [err, setErr] = useState('')
  useEffect(() => { window.scrollTo(0, 0) }, [i])
  const firmaCuarto = JSON.stringify(acta.cuartos[i] ?? null)
  useEffect(() => { setErr('') }, [firmaCuarto])
  const siguiente = () => {
    const c = acta.cuartos[i]
    if (!c.fotos.length) return setErr('Falta una foto de este espacio. Toca "Tomar foto".')
    if (c.items.some(x => !x.estado)) return setErr('Marca "Bien" o "Con detalle" en cada punto de la lista.')
    setErr(''); setI(i + 1)
  }
  const titulo = cual === 'entrada' ? 'Fotos de entrada' : 'Fotos de salida'
  return <div className="pila">
    <div className="subpasos" aria-label={`${titulo}: parte ${Math.min(i + 1, n + 1)} de ${n + 1}`}>
      {Array.from({ length: n + 1 }, (_, k) => <span key={k} className={k < i ? 'hecho' : k === i ? 'actual' : ''} />)}</div>
    {i < n ? <>
      <p className="mini">{titulo} · Espacio {i + 1} de {n}</p>
      <CuartoEditor a={a} cual={cual} idx={i} rol={rol} />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="pie-paso">
        {i > 0 && <button type="button" className="boton boton--secundario" onClick={() => { setErr(''); setI(i - 1) }}>Atrás</button>}
        <button type="button" className="boton boton--primario boton--grande pie-paso__principal" onClick={siguiente}>{i + 1 < n ? 'Siguiente espacio' : 'Revisar y confirmar'}</button>
      </div>
    </> : <>
      <Firma key={cual + '-' + rol} a={a} que={cual} rol={rol} titulo={'Confirmar ' + titulo.toLowerCase()}
        texto={cual === 'entrada' ? 'Revisa que las fotos muestren cómo está el lugar hoy.' : 'Revisa que las fotos muestren cómo quedó el lugar.'}
        casilla={cual === 'entrada' ? 'Las fotos muestran cómo está el lugar al entrar.' : 'Las fotos muestran cómo quedó el lugar al salir.'}
        alCompletar={x => cual === 'entrada'
          ? (x.estado = 'en_curso', x.historial.push({ fecha: ahoraISO(x), texto: 'Fotos de entrada confirmadas por los dos' }))
          : (x.estado = 'ventana_reclamo', x.ventanaInicio = ahoraISO(x), x.historial.push({ fecha: ahoraISO(x), texto: 'Fotos de salida confirmadas. Empiezan los 7 días para reclamos' }))} />
      <button type="button" className="enlace" onClick={() => setI(0)}>Ver o cambiar las fotos</button>
    </>}
  </div>
}

function EnCurso({ a }: P) {
  return <section className="pila"><span className="chip chip--exito"><Icono id="i-candado" /> Depósito guardado</span>
    <h2>Alquiler en curso</h2><div className="monto">{usd(a.monto)}</div>
    <p>Del {fecha(a.inicio)} al {fecha(a.fin)}. El depósito sigue guardado y nadie puede tomarlo solo.</p>
    <p className="nota">Cuando el inquilino entregue el lugar, cualquiera de los dos puede empezar las fotos de salida.</p>
    <button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={() => store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = actaVacia() }, 'Empezaron las fotos de salida')}>Empezar fotos de salida</button>
  </section>
}

function cerrarAutomatico(x: Alquiler) {
  x.estado = 'cerrado'; x.resultado = { inquilino: x.monto, dueno: 0, via: 'automatico', fecha: ahoraISO(x) }
  x.historial.push({ fecha: ahoraISO(x), texto: `Sin reclamos en 7 días: ${usd(x.monto)} devueltos al inquilino` })
}

function Ventana({ a, rol }: P) {
  const fin = +new Date(a.ventanaInicio!) + 7 * DIA; const [, tick] = useState(0); const [form, setForm] = useState(false)
  useEffect(() => { const t = setInterval(() => tick(k => k + 1), 30_000); return () => clearInterval(t) }, [])
  const resta = Math.max(0, fin - ahoraDe(a)); const dias = Math.floor(resta / DIA); const horas = Math.floor(resta % DIA / 3_600_000)
  useEffect(() => { if (resta === 0 && !a.reclamo) store.cambiar(a.id, cerrarAutomatico) }, [resta, a.id, a.reclamo])
  return <section className="pila"><h2>7 días para reclamos</h2>
    <div className="cuenta" role="timer"><span className="cuenta__n">{dias}</span> días <span className="cuenta__n">{horas}</span> horas</div>
    <p className="nota">Termina el {fechaHora(fin)}. Si no hay reclamos, el depósito vuelve completo al inquilino, sin que nadie tenga que aprobarlo.</p>
    {rol === 'dueno'
      ? (form ? <FormReclamo a={a} onCancelar={() => setForm(false)} /> : <>
        <p>¿Encontraste un daño que no estaba en las fotos de entrada? Puedes reclamar. Si todo está bien, no hagas nada.</p>
        <button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={() => setForm(true)}>Reclamar un daño</button></>)
      : <Espera texto="Esperando. Si el dueño no reclama en 7 días, recibes tu depósito completo." />}
    {<button type="button" className="enlace" onClick={() => store.cambiar(a.id, x => { x.diasSimulados += 7; if (!x.reclamo && ahoraDe(x) >= fin) cerrarAutomatico(x) }, 'Demo: se adelantaron 7 días')}>Demo: adelantar 7 días</button>}
  </section>
}

function FormReclamo({ a, onCancelar }: { a: Alquiler; onCancelar: () => void }) {
  const [monto, setMonto] = useState(''); const [motivo, setMotivo] = useState(''); const [fotos, setFotos] = useState<Foto[]>([]); const [env, setEnv] = useState(false)
  const m = Number(monto.replace(',', '.'))
  const e = {
    monto: !monto.trim() ? 'Escribe cuánto reclamas.' : !(m > 0) ? 'El monto tiene que ser mayor que cero.' : m > a.monto ? `No puede ser más que el depósito (${usd(a.monto)}).` : '',
    motivo: motivo.trim().length < 10 ? 'Cuenta qué pasó en al menos 10 letras (ej.: "mancha en la pared de la sala").' : '',
    fotos: fotos.length ? '' : 'Agrega al menos una foto del daño. Toca "Tomar foto del daño".',
  }
  const enviar = () => {
    setEnv(true); if (e.monto || e.motivo || e.fotos) return
    store.cambiar(a.id, x => { x.estado = 'reclamo'; x.reclamo = { monto: m, motivo: motivo.trim(), fotos, fecha: ahoraISO(x) } }, `El dueño reclamó ${usd(m)}`)
  }
  return <div className="pila">
    <label className={'campo' + (env && e.monto ? ' campo--error' : '')}><span>¿Cuánto reclamas? (USD)</span><input inputMode="decimal" value={monto} onChange={x => setMonto(x.target.value)} />{env && e.monto && <small className="campo__error" role="alert">{e.monto}</small>}</label>
    <label className={'campo' + (env && e.motivo ? ' campo--error' : '')}><span>¿Qué pasó?</span><textarea rows={3} value={motivo} onChange={x => setMotivo(x.target.value)} placeholder="Ej.: mancha en la pared de la sala que no estaba al entrar" />{env && e.motivo && <small className="campo__error" role="alert">{e.motivo}</small>}</label>
    <FotoLista fotos={fotos} vacio="Sin fotos del daño todavía." />
    <TomarFoto por="dueno" etiqueta="Tomar foto del daño" principal={false} onFoto={f => setFotos(v => [...v, f])} />
    {<button type="button" className="enlace" onClick={() => setFotos(v => [...v, { src: fotoEjemplo('Sala', 'salida', 0), por: 'dueno', fecha: ahoraISO(a), tomadaEn: ahoraDe(a), origen: 'ejemplo' }])}>Demo: usar una foto de ejemplo</button>}
    {env && e.fotos && <p className="error" role="alert">{e.fotos}</p>}
    <div className="pie-paso"><button type="button" className="boton boton--secundario" onClick={onCancelar}>Cancelar</button>
      <button type="button" className="boton boton--primario boton--grande pie-paso__principal" onClick={enviar}>Enviar reclamo</button></div>
  </div>
}

function Evidencia({ a }: { a: Alquiler }) {
  const r = a.reclamo!
  return <div className="pila"><div className="cab"><span className="mini">Reclamo del dueño · {fechaHora(r.fecha)}</span><span className="monto monto--chico">{usd(r.monto)}</span></div>
    <p>“{r.motivo}”</p><FotoLista fotos={r.fotos} /></div>
}

function Reclamo({ a, rol }: P) {
  const r = a.reclamo!
  const aceptar = async () => {
    await escrow.aprobarLiberacion(a.escrowId!, 'inquilino', a.monto - r.monto); await escrow.aprobarLiberacion(a.escrowId!, 'dueno', a.monto - r.monto)
    store.cambiar(a.id, x => { x.reclamo!.respuesta = 'aceptado'; x.estado = 'cerrado'; x.resultado = { dueno: r.monto, inquilino: x.monto - r.monto, via: 'acuerdo', fecha: ahoraISO(x) } },
      `El inquilino aceptó el reclamo: ${usd(r.monto)} al dueño y ${usd(a.monto - r.monto)} al inquilino`)
  }
  return <section className="pila"><h2>Reclamo del dueño</h2><Evidencia a={a} />
    {rol === 'inquilino' ? <>
      <p>Si aceptas, recibes {usd(a.monto - r.monto)} y el dueño {usd(r.monto)}. Si no estás de acuerdo, una persona mediadora revisa las fotos y decide.</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={aceptar}>Aceptar reclamo</button>
      <button type="button" className="boton boton--secundario boton--ancho" onClick={() => store.cambiar(a.id, x => { x.reclamo!.respuesta = 'rechazado'; x.estado = 'mediacion' }, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora')}>No estoy de acuerdo</button>
    </> : <Espera texto="Esperando que el inquilino responda tu reclamo." />}
  </section>
}

function Mediacion({ a }: P) {
  const r = a.reclamo!; const [panel, setPanel] = useState(false); const [aDueno, setAD] = useState(Math.round(r.monto / 2))
  const decidir = async () => {
    await escrow.aprobarLiberacion(a.escrowId!, 'mediador', a.monto - aDueno)
    store.cambiar(a.id, x => { x.estado = 'cerrado'; x.resultado = { dueno: aDueno, inquilino: x.monto - aDueno, via: 'mediacion', fecha: ahoraISO(x) } },
      `La persona mediadora decidió: ${usd(aDueno)} al dueño y ${usd(a.monto - aDueno)} al inquilino`)
  }
  return <section className="pila"><h2>Con una persona mediadora</h2>
    <p>No hubo acuerdo. Una persona mediadora revisa las fotos de entrada y salida y decide cómo se reparte el depósito.</p>
    <Espera texto="No tienes que hacer nada. Te avisaremos cuando haya una decisión." />
    <Evidencia a={a} />
    {(!panel ? <button type="button" className="enlace" onClick={() => setPanel(true)}>Demo: decidir como mediador</button>
      : <div className="mediador pila"><label className="campo"><span>Para el dueño: {usd(aDueno)} · para el inquilino: {usd(a.monto - aDueno)}</span>
          <input type="range" min={0} max={r.monto} step={10} value={aDueno} onChange={e => setAD(Number(e.target.value))} aria-valuetext={`${usd(aDueno)} para el dueño`} /></label>
        <button type="button" className="boton boton--primario boton--ancho" onClick={decidir}>Decidir</button></div>)}
  </section>
}

function Cerrado({ a }: P) {
  const r = a.resultado!
  const via = { automatico: 'No hubo reclamos en 7 días.', acuerdo: 'Se pusieron de acuerdo en la app.', mediacion: 'Lo decidió una persona mediadora.' }[r.via]
  return <section className="pila cerrado"><LogoAnimado className="logo-pieza logo-pieza--esquina" />
    <span className="chip chip--exito"><Icono id="i-check" /> Terminado</span>
    <h2>Depósito devuelto</h2><p>{via}</p>
    <ul className="lista"><li><span>Inquilino</span><strong>{usd(r.inquilino)}</strong></li><li><span>Dueño</span><strong>{usd(r.dueno)}</strong></li></ul>
    <p className="nota">{fechaHora(r.fecha)}</p>
  </section>
}

export function Detalle({ id, u }: { id: string; u: Usuario }) {
  useAlquileres(); const a = store.obtener(id)
  const real: Rol = a ? rolDe(a, u.email) : 'dueno'
  const rol: Rol = a ? vistaDe(a, u.email) : 'dueno'
  useEffect(() => { window.scrollTo(0, 0) }, [a?.estado, rol])
  if (!a) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta">No encontramos ese alquiler. <a href="#/">Volver a tus alquileres</a></div></main>
  const p = { a, rol }; const t = turno(a, rol); const etapa = etapaDe(a)
  const panel = {
    firmas: <Contrato {...p} />, pendiente_pago: <Pago {...p} />, fotos_entrada: <Fotos key={'e' + rol} {...p} cual="entrada" />,
    en_curso: <EnCurso {...p} />, salida: <Fotos key={'s' + rol} {...p} cual="salida" />, ventana_reclamo: <Ventana {...p} />,
    reclamo: <Reclamo {...p} />, mediacion: <Mediacion {...p} />, cerrado: <Cerrado {...p} />,
  }[a.estado]
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <h1 className="h-lugar">{a.direccion}</h1>
    <div className="vista-demo" role="group" aria-label="Demo: cambiar de persona">
      <span>Estás viendo como <strong>{NOMBRE[rol]}</strong></span>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => fijarVista(id, otro(rol))}>Ver como {NOMBRE[otro(rol)]}</button>
      <span className="demo">Demo en un solo aparato</span></div>
    <div className="paso-cab"><p className="paso-cab__n">{a.estado === 'cerrado' ? 'Terminado' : pasoTexto(a)}</p><p className="paso-cab__t">{ETAPAS[etapa]}</p>
      <div className="barra-paso" aria-hidden="true"><span style={{ width: `${((etapa + (a.estado === 'cerrado' ? 1 : 0.5)) / ETAPAS.length) * 100}%` }} /></div></div>
    <div className="detalle">
      <div className="detalle__principal pila">
        <section className="turno" aria-label="Qué toca ahora">
          <p><span className="turno__et">Te toca</span>{t.tu}</p>
          <p><span className="turno__et">Al {NOMBRE[otro(rol)]}</span>{t.otra}</p>
          <p><span className="turno__et">Qué sigue</span>{t.sigue}</p>
        </section>
        <div className="glass glass--fuerte tarjeta">{panel}</div>
      </div>
      <aside className="detalle__lado pila">
        <section className="glass tarjeta" aria-labelledby="t-estado"><h3 id="t-estado">Los pasos</h3><LineaTiempo a={a} /></section>
        <details className="glass tarjeta detalles"><summary>Detalles</summary>
          <ul className="lista"><li><span>Dueño</span><span className="cortar">{a.duenoEmail}</span></li><li><span>Inquilino</span><span className="cortar">{a.inquilinoEmail}</span></li>
            <li><span>Depósito</span><span>{usd(a.monto)}</span></li><li><span>Fechas</span><span>{fecha(a.inicio)} → {fecha(a.fin)}</span></li></ul>
          {real !== rol && <p className="nota">Tu papel real en este alquiler: {NOMBRE_ROL[real].toLowerCase()}.</p>}
          <p className="mini" style={{ marginTop: 12 }}>Historial</p>
          <ol className="lista historial">{[...a.historial].reverse().map((h, i) => <li key={i}><span>{h.texto}</span><small className="nota">{fechaHora(h.fecha)}</small></li>)}</ol>
        </details>
      </aside>
    </div>
  </main>
}
