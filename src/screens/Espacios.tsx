// Lista de espacios de las fotos de entrada y de salida, con «+ Agregar espacio», «Cambiar nombre» y «Quitar espacio»
// (spec diseno/envio/agregar-espacio, 23/10/2026; las correcciones de Legal del 23/10 mandan). El texto libre (nombres y puntos)
// se muestra siempre como texto de React (escapado); nunca como HTML.
import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { Alquiler, Cuarto, Rol } from '../types'
import { acciones } from '../acciones'
import { avisar, alertaEspacioAgregado, alertaNombreCambiado, alertaEspacioQuitado } from '../alertas'
import { TXT, ERR, SUGERENCIAS, MAX_ESPACIOS, MAX_NOMBRE, MAX_PUNTOS, MAX_PUNTO, contador, alEntrar, preguntaQuitar, textoQuitar,
  errorNombre, existe, limpiar, plantilla, sugerirNombre, listaFija, parEnEntrada } from '../espacios'
import { cuartoListo } from './Acta'

const reducir = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const msj = (e: unknown) => e instanceof Error ? e.message : 'No pudimos guardar. Intenta de nuevo.'
const revisados = (c: Cuarto) => `${c.items.filter(i => i.estado).length} de ${c.items.length} revisados`
const fotosTxt = (n: number) => n ? `${n} ${n === 1 ? 'foto' : 'fotos'}` : 'Sin fotos'

/** Trampa de foco para hojas y diálogos: Tab da la vuelta, Esc cierra y al cerrar el foco vuelve a donde estaba. */
function useTrampa(ref: RefObject<HTMLElement | null>, onCerrar: () => void, inicial?: string) {
  const cerrar = useRef(onCerrar); useEffect(() => { cerrar.current = onCerrar })
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current; (el?.querySelector<HTMLElement>(inicial ?? 'input,button:not([disabled])'))?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar.current() }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),a[href]')]; const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    addEventListener('keydown', tecla)
    return () => { removeEventListener('keydown', tecla); if (prev?.isConnected) prev.focus() }
  }, [ref, inicial])
}

/** Lista de espacios. En la entrada, mientras la lista no esté fija, cada fila tiene «⋯» y al final va «+ Agregar espacio». */
export function ListaEspacios({ a, cual, rol, onAbrir }: { a: Alquiler; cual: 'entrada' | 'salida'; rol: Rol; onAbrir: (i: number) => void }) {
  const acta = a[cual]!
  const editable = cual === 'entrada' && !listaFija(a) && Boolean(acciones.agregarCuarto)
  const [hoja, setHoja] = useState(false); const [nuevo, setNuevo] = useState<string | null>(null)
  const [renombrar, setRenombrar] = useState<Cuarto | null>(null); const [quitar, setQuitar] = useState<Cuarto | null>(null)
  const [err, setErr] = useState('')
  const lleno = acta.cuartos.length >= MAX_ESPACIOS
  const botonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (!nuevo) return; const t = setTimeout(() => setNuevo(null), 1200); return () => clearTimeout(t) }, [nuevo])
  const quitarYa = async (c: Cuarto) => {
    setQuitar(null); setErr('')
    try { const n = await acciones.quitarCuarto!(a, c.id, rol); avisar(alertaEspacioQuitado(c.nombre, c.id, !n && Boolean(acciones.deshacerQuitar))) } catch (e) { setErr(msj(e)) }
  }
  return <section className="pila esp" aria-labelledby={`esp-t-${cual}`}>
    <h3 id={`esp-t-${cual}`}>Espacios</h3>
    {cual === 'salida' && <p className="esp__nota esp__nota--info">{TXT.salidaArriba}</p>}
    <ul className="esp__lista">{acta.cuartos.map((c, i) => {
      const ent = cual === 'salida' ? parEnEntrada(a, c) : undefined
      const listo = cuartoListo(c)
      return <li key={c.id} className={'esp__fila' + (c.id === nuevo ? ' esp__fila--nueva' : '')} data-espacio={c.id}>
        <button type="button" className="esp__abrir" onClick={() => onAbrir(i)}>
          {c.fotos[0] ? <img className="esp__mini" src={c.fotos[0].src} alt="" /> : <span className="esp__mini esp__mini--vacia" aria-hidden="true">📷</span>}
          <span className="esp__txt"><strong>{c.nombre}</strong>{c.propio && <span className="chip chip--mini esp__agregado">{TXT.agregado}</span>}
            <small>{cual === 'salida' ? alEntrar(ent?.fotos.length ?? 0) : `${fotosTxt(c.fotos.length)} · ${revisados(c)}`}</small></span>
          {cual === 'salida' && ent && ent.fotos.length > 0 && <span className="esp__antes" aria-hidden="true">{ent.fotos.slice(0, 2).map((f, k) => <img key={k} src={f.src} alt="" />)}</span>}
          <span className={'chip ' + (listo ? 'chip--exito' : 'chip--neutro')}>{listo ? 'Listo' : 'Falta'}</span>
        </button>
        {editable && <Menu c={c} onRenombrar={() => setRenombrar(c)} onQuitar={() => acta.cuartos.length <= 1 ? setErr(ERR.ultimo) : setQuitar(c)} />}
        {c.id === nuevo && !reducir() && <span className="esp__puntos" aria-hidden="true">{Array.from({ length: 6 }, (_, k) => <i key={k} className={'esp__punto esp__punto--' + k} />)}</span>}
      </li>
    })}</ul>
    {err && <p className="error" role="alert">{err}</p>}
    {editable && <>
      <button ref={botonRef} type="button" className="esp__agregar" disabled={lleno} aria-describedby="esp-ayuda" onClick={() => setHoja(true)}>
        <span className="esp__mas" aria-hidden="true">+</span> Agregar espacio</button>
      <p id="esp-ayuda" className="nota esp__ayuda">{lleno ? ERR.maximo : TXT.ayuda}</p>
      {Object.keys(acta.firmas).length > 0 && <p className="nota">{TXT.reconfirmar}</p>}
    </>}
    {listaFija(a) && <p className="esp__nota">🔒 {TXT.bloqueado}</p>}
    {cual === 'salida' && <p className="esp__nota">🔒 {TXT.salidaAbajo}</p>}
    {hoja && <HojaAgregar a={a} onCerrar={() => { setHoja(false); setTimeout(() => botonRef.current?.focus(), 0) }} onListo={async (nombre, items) => {
      const id = await acciones.agregarCuarto!(a, nombre, items, rol); setHoja(false); setNuevo(id); avisar(alertaEspacioAgregado(limpiar(nombre), id))
      setTimeout(() => botonRef.current?.focus(), 0)
    }} />}
    {renombrar && <HojaNombre a={a} c={renombrar} onCerrar={() => setRenombrar(null)} onListo={async n => {
      await acciones.renombrarCuarto!(a, renombrar.id, n); setRenombrar(null); avisar(alertaNombreCambiado(limpiar(n)))
    }} />}
    {quitar && <DialogoQuitar c={quitar} onCerrar={() => setQuitar(null)} onQuitar={() => void quitarYa(quitar)} />}
  </section>
}

function Menu({ c, onRenombrar, onQuitar }: { c: Cuarto; onRenombrar: () => void; onQuitar: () => void }) {
  const [abierto, setAbierto] = useState(false); const id = useId(); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierto) return
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    addEventListener('pointerdown', fuera); return () => removeEventListener('pointerdown', fuera)
  }, [abierto])
  const elegir = (f: () => void) => { setAbierto(false); f() }
  return <div className="esp__menu" ref={ref} onKeyDown={e => { if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false); ref.current?.querySelector<HTMLElement>('button')?.focus() } }}>
    <button type="button" className="esp__mas-op" aria-label={`Opciones de ${c.nombre}`} aria-haspopup="menu" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(v => !v)}>⋯</button>
    {abierto && <div id={id} role="menu" className="esp__ops" aria-label={`Opciones de ${c.nombre}`}>
      <button type="button" role="menuitem" onClick={() => elegir(onRenombrar)}>{TXT.cambiarNombre}</button>
      <button type="button" role="menuitem" onClick={() => elegir(onQuitar)}>{TXT.quitar}</button>
    </div>}
  </div>
}

function Campo({ id, valor, onCambio, error, onEnter }: { id: string; valor: string; onCambio: (v: string) => void; error: string; onEnter: () => void }) {
  const n = [...valor.trim()].length
  return <label className="campo" htmlFor={id}>
    <span className="esp__et"><span>{TXT.campo}</span><small aria-live={n >= 25 ? 'polite' : 'off'} className={n > MAX_NOMBRE ? 'esp__cont esp__cont--mal' : 'esp__cont'}>{contador(Math.min(n, 99))}</small></span>
    <input id={id} value={valor} onChange={e => onCambio(e.target.value.replace(/[\r\n]/g, ' '))} placeholder={TXT.ejemplo} maxLength={40} autoComplete="off" enterKeyHint="done"
      aria-invalid={!!error} aria-describedby={error ? id + '-err' : undefined} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }} />
    {error && <span id={id + '-err'} className="error" role="alert">{error}</span>}
  </label>
}

/** Hoja (celular) o panel lateral (computadora) para agregar un espacio. */
function HojaAgregar({ a, onCerrar, onListo }: { a: Alquiler; onCerrar: () => void; onListo: (nombre: string, items: string[]) => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null); useTrampa(ref, onCerrar, '#esp-nombre')
  const [nombre, setNombre] = useState(''); const [intento, setIntento] = useState(false); const [errServ, setErrServ] = useState('')
  const [puntos, setPuntos] = useState<{ texto: string; on: boolean }[]>(plantilla('').map(texto => ({ texto, on: true }))); const [tocados, setTocados] = useState(false)
  const [otro, setOtro] = useState<string | null>(null); const [errOtro, setErrOtro] = useState(''); const [ocupado, setOcupado] = useState(false)
  const poner = (n: string) => { setNombre(n); setErrServ(''); if (!tocados) setPuntos(plantilla(n).map(texto => ({ texto, on: true }))) }
  const elegirChip = (n: string) => { setNombre(n); setErrServ(''); setTocados(false); setPuntos(plantilla(n).map(texto => ({ texto, on: true }))) }
  const e = errorNombre(a.entrada, nombre)
  const visible = errServ || (intento || nombre.trim().length > 1 ? e : e === ERR.maximo ? e : '')
  const dup = e === ERR.duplicado
  const agregarOtro = () => {
    const t = limpiar(otro ?? '')
    if (!t) return setErrOtro('Escribe el punto.')
    if ([...t].length > MAX_PUNTO) return setErrOtro(ERR.puntoLargo)
    if (puntos.length >= MAX_PUNTOS) return setErrOtro(ERR.puntos)
    if (puntos.some(p => p.texto.toLowerCase() === t.toLowerCase())) return setErrOtro('Ese punto ya está en la lista.')
    setPuntos(p => [...p, { texto: t, on: true }]); setTocados(true); setOtro(null); setErrOtro('')
  }
  const enviar = async () => {
    setIntento(true); if (e || ocupado) return
    setOcupado(true)
    try { await onListo(nombre, puntos.filter(p => p.on).map(p => p.texto)) } catch (x) { setErrServ(msj(x)); setOcupado(false) }
  }
  return createPortal(<div className="velo velo--lado" onClick={ev => ev.target === ev.currentTarget && onCerrar()}>
    <div ref={ref} className="hoja esp-hoja" role="dialog" aria-modal="true" aria-labelledby="esp-hoja-t">
      <div className="hoja__asa" aria-hidden="true" />
      <h2 id="esp-hoja-t" className="esp-hoja__t">{TXT.titulo}</h2>
      <Campo id="esp-nombre" valor={nombre} onCambio={poner} error={visible} onEnter={() => void enviar()} />
      {dup && <button type="button" className="enlace" onClick={() => poner(sugerirNombre(a.entrada, nombre))}>Usar «{sugerirNombre(a.entrada, nombre)}»</button>}
      <div className="esp-chips" role="group" aria-label="Sugerencias">{SUGERENCIAS.map(s => {
        const ya = existe(a.entrada, s)
        return <button key={s} type="button" className="esp-chip" aria-pressed={limpiar(nombre) === s} disabled={ya} title={ya ? 'Ya está en la lista' : undefined} onClick={() => elegirChip(s)}>
          {limpiar(nombre) === s && <span aria-hidden="true">✓ </span>}{s}</button>
      })}</div>
      <fieldset className="esp-puntos"><legend><span>{TXT.lista}</span><small>{TXT.opcional}</small></legend>
        {puntos.map((p, k) => <label key={p.texto} className="check"><input type="checkbox" checked={p.on} onChange={ev => { setTocados(true); setPuntos(xs => xs.map((x, j) => j === k ? { ...x, on: ev.target.checked } : x)) }} /> {p.texto}</label>)}
        {otro === null ? <button type="button" className="enlace esp-otro" disabled={puntos.length >= MAX_PUNTOS} onClick={() => setOtro('')}>{TXT.otroPunto}</button>
          : <div className="esp-otro__campo">
            <label className="campo" htmlFor="esp-punto"><span>Punto nuevo</span>
              <input id="esp-punto" value={otro} maxLength={MAX_PUNTO + 10} onChange={ev => { setOtro(ev.target.value.replace(/[\r\n]/g, ' ')); setErrOtro('') }} placeholder="Ej.: Tendedero"
                aria-invalid={!!errOtro} aria-describedby={errOtro ? 'esp-punto-err' : undefined}
                onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); agregarOtro() } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setOtro(null); setErrOtro('') } }} /></label>
            {errOtro && <span id="esp-punto-err" className="error" role="alert">{errOtro}</span>}
            <button type="button" className="boton boton--secundario" onClick={agregarOtro}>Agregar punto</button>
          </div>}
        {puntos.length >= MAX_PUNTOS && <small className="nota">{ERR.puntos}</small>}
      </fieldset>
      <p className="esp__nota esp__nota--info"><strong>La otra persona ve la misma lista.</strong> {TXT.quienVe}</p>
      <div className="esp-hoja__pie">
        <button type="button" className="boton boton--secundario" onClick={onCerrar}>{TXT.cancelar}</button>
        <button type="button" className="boton boton--primario" disabled={!nombre.trim() || ocupado} onClick={() => void enviar()}>{TXT.agregar}</button>
      </div>
    </div>
  </div>, document.body)
}

function HojaNombre({ a, c, onCerrar, onListo }: { a: Alquiler; c: Cuarto; onCerrar: () => void; onListo: (n: string) => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null); useTrampa(ref, onCerrar, '#esp-renombre')
  const [n, setN] = useState(c.nombre); const [intento, setIntento] = useState(false); const [errServ, setErrServ] = useState('')
  const e = errorNombre(a.entrada, n, c.id)
  const guardar = async () => { setIntento(true); if (e) return; try { await onListo(n) } catch (x) { setErrServ(msj(x)) } }
  return createPortal(<div className="velo" onClick={ev => ev.target === ev.currentTarget && onCerrar()}>
    <div ref={ref} className="hoja esp-hoja" role="dialog" aria-modal="true" aria-labelledby="esp-ren-t">
      <div className="hoja__asa" aria-hidden="true" />
      <h2 id="esp-ren-t" className="esp-hoja__t">{TXT.cambiarNombre}</h2>
      <Campo id="esp-renombre" valor={n} onCambio={v => { setN(v); setErrServ('') }} error={errServ || (intento || n !== c.nombre ? e : '')} onEnter={() => void guardar()} />
      <div className="esp-hoja__pie">
        <button type="button" className="boton boton--secundario" onClick={onCerrar}>{TXT.cancelar}</button>
        <button type="button" className="boton boton--primario" disabled={!n.trim()} onClick={() => void guardar()}>{TXT.guardar}</button>
      </div>
    </div>
  </div>, document.body)
}

/** Confirmación de «Quitar espacio» (role=alertdialog). Con fotos: «Mantener el espacio» va primero y tiene el foco. */
function DialogoQuitar({ c, onCerrar, onQuitar }: { c: Cuarto; onCerrar: () => void; onQuitar: () => void }) {
  const ref = useRef<HTMLDivElement>(null); const n = c.fotos.length
  useTrampa(ref, onCerrar, '.esp-dlg__seguro')
  return createPortal(<div className="velo" onClick={ev => ev.target === ev.currentTarget && onCerrar()}>
    <div ref={ref} className="hoja esp-dlg" role="alertdialog" aria-modal="true" aria-labelledby="esp-q-t" aria-describedby="esp-q-d">
      <h2 id="esp-q-t" className="esp-hoja__t">{preguntaQuitar(c.nombre)}</h2>
      <p id="esp-q-d" className={n ? 'esp__nota esp__nota--aviso' : 'nota'}>{n > 0 && <span aria-hidden="true">⚠️ </span>}{textoQuitar(n)}</p>
      {n > 0 ? <div className="esp-dlg__pie">
        <button type="button" className="boton boton--primario boton--ancho esp-dlg__seguro" onClick={onCerrar}>{TXT.mantener}</button>
        <button type="button" className="boton boton--secundario boton--ancho" onClick={onQuitar}>{TXT.quitar}</button>
      </div> : <div className="esp-dlg__pie">
        <button type="button" className="boton boton--primario boton--ancho" onClick={onQuitar}>{TXT.quitar}</button>
        <button type="button" className="boton boton--secundario boton--ancho esp-dlg__seguro" onClick={onCerrar}>{TXT.cancelar}</button>
      </div>}
    </div>
  </div>, document.body)
}
