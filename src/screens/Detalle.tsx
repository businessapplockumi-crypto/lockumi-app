import { useEffect, useState } from 'react'
import { store, useAlquileres, ahoraDe, actaVacia, DIA } from '../store'
import { escrow } from '../services/escrow'
import { rendimiento, REPARTO } from '../services/yield'
import { ETIQUETA_ESTADO, NOMBRE_ROL, type Alquiler, type Rol, type Foto } from '../types'
import { fotoEjemplo } from '../demoFotos'
import { Demo, Deco, Icono, LineaTiempo, usd, fecha, fechaHora } from '../ui'
import { CuartoEditor, Firmas } from './Acta'

type P = { a: Alquiler; rol: Rol; onRol: (r: Rol) => void }
const nombre = (r: Rol) => NOMBRE_ROL[r].toLowerCase()
const ahoraISO = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()

function Esperando({ quien, que, onRol }: { quien: Rol; que: string; onRol: (r: Rol) => void }) {
  return <div className="espera" role="status"><p>Esperando que el {nombre(quien)} {que}.</p>
    <button type="button" className="boton boton--secundario boton--chico" onClick={() => onRol(quien)}>Ver como {nombre(quien)}</button></div>
}

function Entrada({ a, rol, onRol }: P) {
  return <div className="pila">
    <div className="glass tarjeta"><h2>Acta de entrada</h2>
      <p className="nota">Ambas partes suben fotos y revisan cada cuarto. Al firmar los dos, queda como respaldo para la salida.</p></div>
    {a.entrada.cuartos.map((_, i) => <CuartoEditor key={i} a={a} cual="entrada" idx={i} rol={rol} />)}
    <Firmas a={a} cual="entrada" rol={rol} onRol={onRol} alCompletar={x => { x.estado = 'pendiente_pago'; x.historial.push({ fecha: ahoraISO(x), texto: 'Acta de entrada completa: firmada por ambas partes' }) }} />
  </div>
}

function Pago({ a, rol, onRol }: P) {
  const [cargando, setC] = useState(false)
  const pagar = async () => {
    setC(true); const r = await escrow.depositar(a.escrowId ?? 'sim-' + a.id, a.monto)
    store.cambiar(a.id, x => { x.estado = 'apartado'; x.pago = r.fecha; x.escrowId ??= 'sim-' + a.id }, `Depósito de ${usd(a.monto)} apartado en escrow`)
  }
  return <div className="glass glass--fuerte tarjeta pila">
    <div className="cab"><h2>Pago del depósito</h2><Demo /></div>
    <div className="monto">{usd(a.monto)}</div>
    <p>El depósito no va a la cuenta del dueño: queda <strong>apartado</strong> en una cuenta de garantía (escrow) hasta el final del alquiler.</p>
    {rol === 'inquilino'
      ? <><p className="nota">Medio de pago simulado: no se cobra nada real.</p>
        <button type="button" className="boton boton--primario boton--ancho" disabled={cargando} onClick={pagar}>{cargando ? 'Procesando…' : `Pagar ${usd(a.monto)}`}</button></>
      : <Esperando quien="inquilino" que="pague el depósito" onRol={onRol} />}
  </div>
}

function Rendimiento({ a }: { a: Alquiler }) {
  const cambiar = async (v: boolean) => {
    await (v ? rendimiento.activar(a.escrowId!) : rendimiento.desactivar(a.escrowId!))
    store.cambiar(a.id, x => { x.rendimiento = v }, v ? 'Rendimiento opcional activado' : 'Rendimiento opcional desactivado')
  }
  return <section className="glass tarjeta pila rendimiento" aria-labelledby="rend-t">
    <div className="cab"><h3 id="rend-t"><Deco id="h-brote" size={28} className="deco--en-linea" /> Rendimiento opcional</h3><Demo /></div>
    <label className="interruptor"><input type="checkbox" role="switch" checked={a.rendimiento} onChange={e => cambiar(e.target.checked)} />
      <span className="interruptor__riel" aria-hidden="true"><span /></span>
      <span>Poner el depósito a generar rendimiento en USDC (Blend)</span></label>
    <p className="aviso"><Icono id="i-alerta" /> <span>El rendimiento es <strong>variable y no está garantizado</strong>. Puede ser cero. Lockumi no promete ninguna tasa.</span></p>
    <p className="nota">Si hay ganancias, se reparten así:</p>
    <div className="reparto" role="img" aria-label="Reparto: 40 % inquilino, 40 % dueño, 20 % Lockumi">
      <span style={{ flex: REPARTO.inquilino }}>Inquilino 40 %</span><span style={{ flex: REPARTO.dueno }}>Dueño 40 %</span><span style={{ flex: REPARTO.lockumi }}>Lockumi 20 %</span>
    </div>
    <p className="nota">Tasa: variable. El depósito completo sigue protegido y se devuelve según las reglas del escrow.</p>
  </section>
}

function Apartado({ a, rol }: P) {
  return <div className="pila">
    <div className="glass glass--fuerte tarjeta pila apartado">
      <Deco id="d-candado" size={56} className="deco--flota deco--esquina" />
      <span className="chip chip--exito"><Icono id="i-candado" /> Depósito apartado</span>
      <div className="monto">{usd(a.monto)}</div>
      <p><strong>Nadie puede liberarlo solo.</strong> Ni el dueño, ni el inquilino, ni Lockumi. Para moverlo hace falta el acuerdo de ambas partes, el plazo de 7 días sin reclamo o, en pocos casos, la decisión de un mediador.</p>
      <p className="nota">Pagado el {a.pago ? fechaHora(a.pago) : '—'} · Escrow {a.escrowId} <Demo t="Trustless Work simulado" /></p>
    </div>
    <Rendimiento a={a} />
    <div className="glass tarjeta pila"><h3>Fin del alquiler</h3>
      <p className="nota">Cuando el inquilino entrega el inmueble, hacen juntos el acta de salida. {rol === 'dueno' ? 'Podés iniciarla vos o el inquilino.' : 'Podés iniciarla vos o el dueño.'}</p>
      <button type="button" className="boton boton--primario" onClick={() => store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = actaVacia() }, 'Acta de salida iniciada')}>Iniciar acta de salida</button></div>
  </div>
}

function Salida({ a, rol, onRol }: P) {
  return <div className="pila">
    <div className="glass tarjeta"><h2>Acta de salida</h2>
      <p className="nota">Mismos cuartos, mismos puntos. A la izquierda ves cómo estaba en la entrada; a la derecha, cómo está hoy.</p></div>
    {a.salida!.cuartos.map((_, i) => <CuartoEditor key={i} a={a} cual="salida" idx={i} rol={rol} />)}
    <Firmas a={a} cual="salida" rol={rol} onRol={onRol} alCompletar={x => { x.estado = 'ventana_reclamo'; x.ventanaInicio = ahoraISO(x); x.historial.push({ fecha: ahoraISO(x), texto: 'Acta de salida firmada. Empieza la ventana de reclamo de 7 días' }) }} />
  </div>
}

function cerrarAutomatico(x: Alquiler) {
  x.estado = 'cerrado'; x.resultado = { inquilino: x.monto, dueno: 0, via: 'automatico', fecha: ahoraISO(x) }
  x.historial.push({ fecha: ahoraISO(x), texto: `Sin reclamo en 7 días: ${usd(x.monto)} devueltos automáticamente al inquilino` })
}

function Ventana({ a, rol, onRol }: P) {
  const fin = +new Date(a.ventanaInicio!) + 7 * DIA; const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(t) }, [])
  const resta = Math.max(0, fin - ahoraDe(a)); const dias = Math.floor(resta / DIA); const horas = Math.floor(resta % DIA / 3_600_000)
  const [form, setForm] = useState(false)
  useEffect(() => { if (resta === 0 && !a.reclamo) store.cambiar(a.id, cerrarAutomatico) }, [resta, a.id, a.reclamo])
  return <div className="pila">
    <div className="glass glass--fuerte tarjeta pila">
      <div className="cab"><h2>Ventana de reclamo</h2><Demo t="Reloj simulado" /></div>
      <div className="cuenta" role="timer" aria-live="polite"><span className="cuenta__n">{dias}</span> días <span className="cuenta__n">{horas}</span> horas</div>
      <p>El dueño tiene 7 días para reclamar con evidencia. Si no reclama, el depósito vuelve <strong>automáticamente</strong> al inquilino, sin que nadie tenga que aprobarlo.</p>
      <p className="nota">Vence el {fechaHora(fin)}</p>
      <button type="button" className="boton boton--secundario" onClick={() => store.cambiar(a.id, x => { x.diasSimulados += 7; if (!x.reclamo && ahoraDe(x) >= fin) cerrarAutomatico(x) }, 'Demo: se simularon 7 días')}>Simular paso de 7 días</button>
    </div>
    {rol === 'dueno'
      ? <div className="glass tarjeta pila"><h3>¿Encontraste daños?</h3>
        <p className="nota">Compará con el acta de entrada y, si hace falta, presentá un reclamo con fotos y monto. Si todo está bien, no tenés que hacer nada.</p>
        {form ? <FormReclamo a={a} /> : <button type="button" className="boton boton--primario" onClick={() => setForm(true)}>Presentar reclamo</button>}</div>
      : <div className="glass tarjeta"><Esperando quien="dueno" que="revise el inmueble (si no reclama, recibís todo de vuelta)" onRol={onRol} /></div>}
  </div>
}

function FormReclamo({ a }: { a: Alquiler }) {
  const [monto, setMonto] = useState(''); const [motivo, setMotivo] = useState(''); const [fotos, setFotos] = useState<Foto[]>([]); const [err, setErr] = useState('')
  const enviar = () => {
    const m = Number(monto)
    if (!(m > 0) || m > a.monto) return setErr(`El monto debe ser mayor que cero y no superar el depósito (${usd(a.monto)}).`)
    if (motivo.trim().length < 5) return setErr('Describí brevemente el motivo.')
    if (!fotos.length) return setErr('Agregá al menos una foto como evidencia.')
    store.cambiar(a.id, x => { x.estado = 'reclamo'; x.reclamo = { monto: m, motivo: motivo.trim(), fotos, fecha: ahoraISO(x) } }, `El dueño presentó un reclamo por ${usd(m)}`)
  }
  return <div className="pila">
    <label className="campo"><span>Monto que reclamás (USD)</span><input type="number" inputMode="decimal" min="1" max={a.monto} value={monto} onChange={e => { setMonto(e.target.value); setErr('') }} /></label>
    <label className="campo"><span>Motivo</span><textarea rows={3} value={motivo} onChange={e => { setMotivo(e.target.value); setErr('') }} placeholder="Ej.: mancha en la pared de la sala que no estaba en la entrada" /></label>
    <div><ul className="fotos">{fotos.map((f, i) => <li key={i}><img src={f.src} alt={`Evidencia ${i + 1}`} /></li>)}</ul>
      <button type="button" className="boton boton--secundario boton--chico" onClick={() => setFotos([...fotos, { src: fotoEjemplo('Sala', 'salida', 0), por: 'dueno', fecha: ahoraISO(a) }])}><Icono id="i-camara" /> Agregar foto de ejemplo</button></div>
    {err && <p className="error" role="alert">{err}</p>}
    <button type="button" className="boton boton--primario boton--ancho" onClick={enviar}>Enviar reclamo</button>
  </div>
}

function Evidencia({ a }: { a: Alquiler }) {
  const r = a.reclamo!
  return <div className="pila"><div className="cab"><span className="mini">Reclamo del dueño · {fechaHora(r.fecha)}</span><span className="monto monto--chico">{usd(r.monto)}</span></div>
    <p>“{r.motivo}”</p><ul className="fotos">{r.fotos.map((f, i) => <li key={i}><img src={f.src} alt={`Evidencia ${i + 1}`} /></li>)}</ul></div>
}

function Reclamo({ a, rol, onRol }: P) {
  const r = a.reclamo!
  const aceptar = async () => {
    await escrow.aprobarLiberacion(a.escrowId!, 'inquilino', a.monto - r.monto); await escrow.aprobarLiberacion(a.escrowId!, 'dueno', a.monto - r.monto)
    store.cambiar(a.id, x => { x.reclamo!.respuesta = 'aceptado'; x.estado = 'cerrado'; x.resultado = { dueno: r.monto, inquilino: x.monto - r.monto, via: 'acuerdo', fecha: ahoraISO(x) } },
      `El inquilino aceptó el reclamo. Liberado: ${usd(r.monto)} al dueño y ${usd(a.monto - r.monto)} al inquilino`)
  }
  return <div className="pila"><div className="glass glass--fuerte tarjeta pila">
    <div className="cab"><h2>Reclamo abierto</h2><span className="chip chip--coral">Pausa el reloj</span></div>
    <Evidencia a={a} />
    <p className="nota">La mayoría de los casos se resuelve aquí, entre ustedes, con las actas como respaldo. Solo si no hay acuerdo pasa a un mediador.</p>
    {rol === 'inquilino' ? <div className="acciones">
      <button type="button" className="boton boton--primario" onClick={aceptar}>Aceptar reclamo</button>
      <button type="button" className="boton boton--secundario" onClick={() => store.cambiar(a.id, x => { x.reclamo!.respuesta = 'rechazado'; x.estado = 'mediacion' }, 'El inquilino rechazó el reclamo. Pasa a mediación')}>Rechazar</button>
    </div> : <Esperando quien="inquilino" que="responda al reclamo" onRol={onRol} />}
  </div></div>
}

function Mediacion({ a }: P) {
  const r = a.reclamo!; const [panel, setPanel] = useState(false); const [aDueno, setAD] = useState(Math.round(r.monto / 2)); const [motivo, setMotivo] = useState('')
  const decidir = async () => {
    await escrow.aprobarLiberacion(a.escrowId!, 'mediador', a.monto - aDueno)
    store.cambiar(a.id, x => { x.estado = 'cerrado'; x.resultado = { dueno: aDueno, inquilino: x.monto - aDueno, via: 'mediacion', fecha: ahoraISO(x) } },
      `El mediador decidió: ${usd(aDueno)} al dueño y ${usd(a.monto - aDueno)} al inquilino${motivo.trim() ? ' · ' + motivo.trim() : ''}`)
  }
  return <div className="pila"><div className="glass glass--fuerte tarjeta pila">
    <div className="cab"><h2>En mediación</h2><Demo t="Mediador simulado" /></div>
    <p>No hubo acuerdo, así que una persona mediadora revisa las actas de entrada y salida y la evidencia, y decide cómo repartir el depósito. Esto pasa en pocos casos; lo normal es que se resuelva en la app.</p>
    <Evidencia a={a} />
    {!panel ? <button type="button" className="boton boton--secundario" onClick={() => setPanel(true)}><Icono id="i-balanza" /> Abrir panel del mediador (demo)</button>
      : <section className="mediador pila" aria-labelledby="med-t"><h3 id="med-t">Panel del mediador</h3>
        <label className="campo"><span>Monto para el dueño: {usd(aDueno)} · para el inquilino: {usd(a.monto - aDueno)}</span>
          <input type="range" min={0} max={r.monto} step={10} value={aDueno} onChange={e => setAD(Number(e.target.value))} aria-valuetext={`${usd(aDueno)} para el dueño`} /></label>
        <p className="nota">Máximo: lo reclamado ({usd(r.monto)}). El resto vuelve al inquilino.</p>
        <label className="campo"><span>Fundamento (opcional)</span><textarea rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
        <button type="button" className="boton boton--primario boton--ancho" onClick={decidir}>Emitir decisión y liberar</button></section>}
  </div></div>
}

function Cerrado({ a }: P) {
  const r = a.resultado!
  const via = { automatico: 'Devolución automática: no hubo reclamo en 7 días.', acuerdo: 'Resuelto en la app, por acuerdo entre las partes.', mediacion: 'Resuelto por decisión del mediador.' }[r.via]
  return <div className="glass glass--fuerte tarjeta pila cerrado">
    <Deco id="d-llave" size={56} className="deco--flota deco--esquina" />
    <span className="chip chip--exito"><Icono id="i-check" /> Alquiler cerrado</span>
    <h2>Depósito liberado</h2><p>{via}</p>
    <ul className="lista"><li><span>Inquilino</span><strong>{usd(r.inquilino)}</strong></li><li><span>Dueño</span><strong>{usd(r.dueno)}</strong></li></ul>
    {a.rendimiento && <p className="nota">Rendimiento: se calcularía con la tasa real (variable) al cierre y se repartiría 40/40/20. En la demo no se muestra ningún monto. <Demo /></p>}
    <p className="nota">Liberado el {fechaHora(r.fecha)}. <Demo t="Escrow simulado" /></p>
  </div>
}

export function Detalle({ id, rol, onRol }: { id: string; rol: Rol; onRol: (r: Rol) => void }) {
  useAlquileres(); const a = store.obtener(id)
  useEffect(() => { window.scrollTo(0, 0) }, [a?.estado])
  if (!a) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta">No encontramos ese alquiler. <a href="#/">Volver a tus alquileres</a></div></main>
  const p = { a, rol, onRol }
  const Panel = { entrada: Entrada, pendiente_pago: Pago, apartado: Apartado, salida: Salida, ventana_reclamo: Ventana, reclamo: Reclamo, mediacion: Mediacion, cerrado: Cerrado }[a.estado]
  return <main id="contenido" tabIndex={-1} className="cont" style={{ paddingBottom: 48 }}>
    <a href="#/" className="volver">← Tus alquileres</a>
    <div className="cab titulo"><h1>{a.direccion}</h1><span className={'chip ' + (a.estado === 'reclamo' || a.estado === 'mediacion' ? 'chip--coral' : 'chip--exito')}>{ETIQUETA_ESTADO[a.estado]}</span></div>
    <p className="nota">Viendo como <strong>{NOMBRE_ROL[rol]}</strong> · Depósito {usd(a.monto)} · {fecha(a.inicio)} → {fecha(a.fin)}</p>
    <div className="detalle">
      <div className="detalle__principal"><Panel {...p} /></div>
      <aside className="detalle__lado pila">
        <section className="glass tarjeta" aria-labelledby="t-estado"><h3 id="t-estado">Estado</h3><LineaTiempo a={a} /></section>
        <section className="glass tarjeta" aria-labelledby="t-datos"><h3 id="t-datos">Datos</h3>
          <ul className="lista"><li><span>Dueño</span><span className="cortar">{a.duenoEmail}</span></li><li><span>Inquilino</span><span className="cortar">{a.inquilinoEmail}</span></li></ul>
          <p className="mini" style={{ marginTop: 12 }}>Reglas</p><ul className="reglas">{a.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul></section>
        <section className="glass tarjeta" aria-labelledby="t-hist"><h3 id="t-hist">Historial</h3>
          <ol className="lista historial">{[...a.historial].reverse().map((h, i) => <li key={i}><span>{h.texto}</span><small className="nota">{fechaHora(h.fecha)}</small></li>)}</ol></section>
      </aside>
    </div>
  </main>
}
