import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { acciones } from '../acciones'
import { cuentaPropia } from './Invitacion'
import { ir } from '../router'
import type { Usuario } from '../types'
import { CASITA_AVISO_SVG } from '../LogoAviso'
import { usd } from '../ui'
import { recorridoActivo } from '../recorrido'
import { PANTALLAS, TOTAL_PANTALLAS, TIPOS_LUGAR, EJEMPLO_LUGAR, DURACIONES, OTRA_FECHA, finConDuracion, duracionDe, MONTOS, REGLAS_CHIP, REGLAS_INICIALES, OTRA_REGLA, MAX_REGLA, faltan, alertaPantallaLista, errorFechas, tomarPantallaPedida, suscribirPantalla } from '../formulario'
import { modoSolo, modoPrueba, escrowReal } from '../servidor/config'
import { DUENO_PRUEBA } from './Real'
/** Primera letra en minúscula, sin tocar el resto («cuenta de Lockumi» conserva la L). */
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
import { TOPE_USDC, MONTO_MAX_USDC, montoValido, mensajeSaldoPropio } from '../services/solo'
import { conectar, saldoPropio, hayFreighter, hayCavos, NOMBRE_FIRMA, type Firma } from '../services/cuentaPropia'
import { abreviar } from '../services/billetera'
import { avisar, alertaCreado } from '../alertas'
import { validarAlquiler, hoyISO, montoNumero, fechaValida, ddmmaa, limitesEntrada, limitesSalida, salidaTrasCambiarEntrada, MONTO_MAX, type Campo, type Errores } from '../validacion'

// ---------- Íconos de línea (mismo trazo que .ico) ----------
const TRAZOS = {
  lugar: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  billetera: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>,
  moneda: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.4c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2 0 2.8 5.6 1.4 5.6 4.1 0 1.2-1.2 1.9-2.8 1.9-1.3 0-2.4-.5-2.9-1.4M12 6.5V8M12 16v1.5" /></>,
  candado: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  escudo: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  reglas: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></>,
  pata: <><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></>,
  check: <path d="M20 6 9 17l-5-5" />, mas: <path d="M12 5v14M5 12h14" />, menos: <path d="M5 12h14" />, x: <path d="M18 6 6 18M6 6l12 12" />,
  der: <path d="m9 18 6-6-6-6" />, i: <path d="M12 11v6M12 7.5h.01" />,
  matraz: <><path d="M9 3h6M10 3v6.5L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9.5V3" /><path d="M7.2 15h9.6" /></>,
  llave: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  enviar: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
}
const Ico = ({ n, c = '' }: { n: keyof typeof TRAZOS; c?: string }) => <svg className={'ico ' + c} viewBox="0 0 24 24" aria-hidden="true">{TRAZOS[n]}</svg>
const Info = ({ et, onClick }: { et: string; onClick: () => void }) => <button type="button" className="na-info" aria-label={et} aria-haspopup="dialog" onClick={onClick}><Ico n="i" /></button>

// ---------- Fechas: "aaaa-mm-dd" ↔ Date local ----------
const aFecha = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d) }
const aISO = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
/** Texto escrito (dd/mm/aa, dd/mm/aaaa o solo cifras) → ISO válido o ''. Lo usan los campos ocultos #f-inicio/#f-fin. */
const deTexto = (t: string) => {
  const n = t.replace(/\D/g, ''); if (n.length !== 6 && n.length !== 8) return ''
  const iso = `${n.length === 6 ? '20' + n.slice(4) : n.slice(4)}-${n.slice(2, 4)}-${n.slice(0, 2)}`
  return fechaValida(iso) ? iso : ''
}
const INICIAL_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Hoja con <dialog> nativo: en celular entra desde abajo; en escritorio (ancla) se abre como ventanita junto al campo. */
function Hoja({ id, titulo, abierta, onCerrar, ancla, alDerecha, children }: { id: string; titulo: string; abierta: boolean; onCerrar: () => void; ancla?: RefObject<HTMLElement | null>; alDerecha?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (abierta && !d.open) {
      d.style.maxHeight = ''; d.showModal(); document.documentElement.classList.add('sin-scroll')
      const a = ancla?.current
      if (a && matchMedia('(min-width: 720px)').matches) {
        let r = a.getBoundingClientRect(); const w = d.offsetWidth, h = d.offsetHeight
        // Si no cabe ni abajo ni arriba del campo, sube la página lo necesario para que quepa abajo (sin tapar el campo).
        if (r.bottom + 8 + h > innerHeight - 12 && r.top - h - 8 < 12) { scrollBy(0, r.bottom + 8 + h - (innerHeight - 12)); r = a.getBoundingClientRect() }
        // Abajo si cabe; si no, arriba; si no cabe en ninguno (fin de la página), en el lado con más espacio y con scroll interno: nunca tapa el campo.
        const abajo = innerHeight - 12 - (r.bottom + 8), arriba = r.top - 8 - 12
        let top: number
        if (h <= abajo) top = r.bottom + 8
        else if (h <= arriba) top = r.top - 8 - h
        else if (abajo >= arriba) { top = r.bottom + 8; d.style.maxHeight = abajo + 'px' }
        else { top = 12; d.style.maxHeight = arriba + 'px' }
        // Tarjeta de la izquierda: alinea por la izquierda. Tarjeta de la derecha (alDerecha) o si no cabe: alinea con su borde derecho.
        let left = alDerecha ? r.right - w : r.left; if (left + w > innerWidth - 12) left = r.right - w
        d.style.top = top + 'px'; d.style.left = Math.max(12, Math.min(left, innerWidth - w - 12)) + 'px'
      } else { d.style.top = ''; d.style.left = ''; d.style.maxHeight = '' }
    }
    if (!abierta && d.open) d.close()
    if (!abierta) document.documentElement.classList.remove('sin-scroll')
  }, [abierta, ancla, alDerecha])
  useEffect(() => () => document.documentElement.classList.remove('sin-scroll'), [])
  return <dialog ref={ref} className={'na-hoja' + (ancla ? ' na-hoja--pop' : '')} aria-labelledby={id + '-t'}
    onCancel={e => { e.preventDefault(); onCerrar() }} onClick={e => { if (e.target === ref.current) onCerrar() }}>
    <div className="na-hoja__in">
      <div className="na-hoja__asa" aria-hidden="true" />
      <div className="na-hoja__cab"><h2 id={id + '-t'}>{titulo}</h2><button type="button" className="boton-icono" aria-label="Cerrar" onClick={onCerrar}><Ico n="x" /></button></div>
      {abierta && children}
    </div>
  </dialog>
}

/** Campo de fecha: botón que muestra dd/mm/aa y abre un calendario de un solo día (react-day-picker). */
function CampoCalendario({ id, etiqueta, valor, min, max, error, contexto, alDerecha, onElegir, onAbrir, onCerrar }: {
  id: string; etiqueta: string; valor: string; min: string; max: string; error?: string; contexto?: ReactNode; alDerecha?: boolean
  onElegir: (iso: string) => void; onAbrir?: () => boolean; onCerrar: () => void }) {
  const [abierta, setAbierta] = useState(false); const boton = useRef<HTMLButtonElement>(null)
  const sel = valor ? aFecha(valor) : undefined
  const cerrar = () => { setAbierta(false); onCerrar() }
  return <div className="na-fecha">
    <button ref={boton} id={id + '-boton'} type="button" className={'na-entrada' + (abierta ? ' is-abierta' : '') + (error ? ' na-entrada--error' : '')}
      aria-haspopup="dialog" aria-expanded={abierta} aria-invalid={!!error} aria-describedby={error ? id + '-err' : undefined}
      onClick={() => { if (!onAbrir || onAbrir()) setAbierta(true) }}>
      <Ico n="cal" /><small>{etiqueta}</small><strong>{valor ? ddmmaa(valor) : 'Elegir'}</strong><Ico n="der" c="na-entrada__ir" />
    </button>
    {/* Compatibilidad: los recorridos automáticos escriben la fecha aquí (dd/mm/aa o ddmmaaaa). No recibe foco con Tab. */}
    <input id={id} className="sr" tabIndex={-1} aria-hidden="true" autoComplete="off" defaultValue="" onChange={e => { const iso = deTexto(e.target.value); if (iso) onElegir(iso) }} />
    {error && <small id={id + '-err'} className="campo__error" role="alert">{error}</small>}
    <Hoja id={id + '-hoja'} titulo={etiqueta} abierta={abierta} onCerrar={cerrar} ancla={boton} alDerecha={alDerecha}>
      {contexto}
      <DayPicker mode="single" locale={es} captionLayout="dropdown" startMonth={aFecha(min)} endMonth={aFecha(max)} defaultMonth={sel ?? aFecha(min)}
        selected={sel} onSelect={d => { if (d) onElegir(aISO(d)) }} disabled={[{ before: aFecha(min) }, { after: aFecha(max) }]}
        showOutsideDays={false} formatters={{ formatWeekdayName: d => INICIAL_SEMANA[d.getDay()] }} />
      <p className="na-hoja__pie">De {ddmmaa(min)} a {ddmmaa(max)}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande na-hoja__listo" onClick={cerrar}>Listo</button>
    </Hoja>
  </div>
}

type InfoClave = 'red' | 'usdc' | 'fechas'

/** Chips de una sola opción (role="radio"): flechas para moverse y elegir; Tab entra y sale del grupo. */
function Chips<T extends string | number>({ ops, valor, onElegir, desact, id }: { id: string; ops: { v: T; t: string; aria?: string }[]; valor: T | null; onElegir: (v: T) => void; desact?: (v: T) => boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const libres = ops.filter(o => !desact?.(o.v))
  const tecla = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return
    e.preventDefault(); const k = libres.findIndex(o => o.v === valor); const o = libres[(k + d + libres.length) % libres.length]
    onElegir(o.v); requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-v="${o.v}"]`)?.focus())
  }
  const enfocable = libres.some(o => o.v === valor) ? valor : libres[0]?.v
  return <div ref={ref} className="fz-chips" role="radiogroup" aria-labelledby={id} onKeyDown={tecla}>
    {ops.map(o => <button key={String(o.v)} type="button" role="radio" data-v={o.v} aria-checked={o.v === valor} aria-label={o.aria} disabled={desact?.(o.v)}
      tabIndex={o.v === enfocable ? 0 : -1} className={'fz-chip' + (o.v === valor ? ' is-sel' : '')} onClick={() => onElegir(o.v)}>
      {o.v === valor && <Ico n="check" />}{o.t}</button>)}
  </div>
}

/** Casita de Lockumi (la del aviso) con la llave; `fiesta` = salto de 14 px, giro de la llave y 10 puntos de la paleta (0,9 s). */
const Casita = ({ fiesta, k }: { fiesta?: boolean; k?: number }) => <span key={k} className={'fz-casa' + (fiesta ? ' fz-casa--fiesta' : ' fz-casa--pop')} aria-hidden="true">
  <span className="fz-casa__svg" dangerouslySetInnerHTML={{ __html: CASITA_AVISO_SVG }} />
  {fiesta && Array.from({ length: 10 }, (_, i) => <i key={i} className={'fz-punto fz-punto--' + (i % 5)} style={{ ['--a' as string]: `${i * 36 - 90}deg`, ['--d' as string]: `${70 + (i % 3) * 18}px` }} />)}
</span>

// Campos que revisa cada pantalla antes de seguir.
const CAMPOS: Record<string, Campo[]> = { lugar: ['direccion'], fechas: ['inicio', 'fin'], monto: ['monto'], reglas: [], revisar: ['direccion', 'inicio', 'fin', 'monto', 'email'] }
const PANTALLA_DE: Record<Campo, number> = { direccion: 0, inicio: 1, fin: 1, monto: 2, email: 4 } as Record<Campo, number>
const idDe = (k: Campo) => 'f-' + k + (k === 'inicio' || k === 'fin' ? '-boton' : '')

export function Crear({ u }: { u: Usuario }) {
  const [f, setF] = useState({ direccion: '', monto: '', email: '', inicio: '', fin: '' })
  const [tocado, setTocado] = useState<Partial<Record<Campo, boolean>>>({}); const [enviado, setEnviado] = useState(false)
  const [reglas, setReglas] = useState<string[]>(REGLAS_INICIALES); const [regla, setRegla] = useState(''); const [otra, setOtra] = useState(false); const [errRegla, setErrRegla] = useState('')
  const [ocupado, setOcupado] = useState(false); const [errSrv, setErrSrv] = useState('')
  // Una pregunta por pantalla (0 a 4) y la celebración «¡Reglas listas!» antes de revisar.
  const [pant, setPant] = useState(() => tomarPantallaPedida() ?? 0); const [fiesta, setFiesta] = useState(false); const [pop, setPop] = useState(0)
  const [tipo, setTipo] = useState<string>(TIPOS_LUGAR[0])
  const [dur, setDur] = useState<number | 'otra' | null>(null)
  // Red de prueba: tú eres el inquilino y el dueño es una cuenta de prueba de Lockumi.
  // Origen de los USDC de prueba: «USDC de prueba de Lockumi» (sin valor, tope de 20) o tu propia cuenta (el límite es tu saldo real, máximo 50 000).
  const [origen, setOrigen] = useState<'lockumi' | 'propia'>('lockumi')
  const [propia, setPropia] = useState<{ g: string; firma: Firma; saldo: number | null } | null>(null)
  const [conectando, setConectando] = useState<Firma | null>(null); const [errCuenta, setErrCuenta] = useState('')
  const [freighter, setFreighter] = useState(false)
  const [info, setInfo] = useState<InfoClave | null>(null)
  const [avisoFin, setAvisoFin] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null); const primera = useRef(true)
  useEffect(() => { if (escrowReal) void hayFreighter().then(setFreighter) }, [])
  useEffect(() => suscribirPantalla(i => { tomarPantallaPedida(); setFiesta(false); setPant(i) }), [])
  // Al cambiar de pantalla, el foco va a la pregunta (no al abrir y no mientras corre el recorrido guiado).
  useEffect(() => { if (primera.current) { primera.current = false; return } if (!recorridoActivo()) titulo.current?.focus({ preventScroll: true }); scrollTo({ top: 0 }) }, [pant, fiesta])
  const usar = async (firma: Firma) => {
    setConectando(firma); setErrCuenta('')
    try { const g = await conectar(firma); setPropia({ g, firma, saldo: await saldoPropio(g) }) }
    catch (e) { setErrCuenta(e instanceof Error ? e.message : 'No pudimos conectar tu cuenta. Vuelve a intentarlo.') }
    finally { setConectando(null) }
  }
  const errores: Errores = modoPrueba ? (() => {
    const e = validarAlquiler({ ...f, email: 'inquilino@ejemplo.com' }, hoyISO()); delete e.email
    const m = montoNumero(f.monto)
    if (escrowReal && !e.monto && origen === 'lockumi' && !montoValido(m, TOPE_USDC)) e.monto = `Con «USDC de prueba de Lockumi» el depósito es de máximo ${TOPE_USDC} USDC de prueba (no es dinero real). Baja el monto a ${TOPE_USDC} o menos, o elige «Mi propio USDC de prueba».`
    if (escrowReal && !e.monto && origen === 'propia') {
      if (!propia) e.monto = 'Primero conecta tu cuenta para ver cuántos USDC de prueba tienes.'
      else if ((propia.saldo ?? 0) < m) e.monto = mensajeSaldoPropio(propia.saldo ?? 0)
    }
    return e })() : validarAlquiler(f, hoyISO(), u.email)
  if (errores.monto && !f.monto.trim()) errores.monto = 'Toca un monto o escríbelo en «Otro monto».'
  const poner = (k: Campo, v: string) => setF(x => ({ ...x, [k]: v }))
  const tocar = (k: Campo) => () => setTocado(t => ({ ...t, [k]: true }))
  // Empieza: con un chip de duración, el fin es el inicio + N meses; con «Otra fecha», la salida se conserva si sigue sirviendo.
  const elegirInicio = (iso: string) => setF(x => {
    const fin = typeof dur === 'number' ? finConDuracion(iso, dur) : salidaTrasCambiarEntrada(iso, x.fin)
    setAvisoFin(x.fin && !fin ? 'Con el nuevo inicio, esa fecha de fin ya no sirve. Elige el fin otra vez.' : '')
    return { ...x, inicio: iso, fin }
  })
  const elegirDur = (v: number | 'otra') => {
    setDur(v); setAvisoFin('')
    if (v === 'otra') { requestAnimationFrame(() => document.getElementById('f-fin-boton')?.focus()); return }
    if (f.inicio) { poner('fin', finConDuracion(f.inicio, v)); tocar('fin')() }
  }
  const elegirFin = (iso: string) => { setAvisoFin(''); poner('fin', iso); setDur(f.inicio ? duracionDe(f.inicio, iso) ?? 'otra' : 'otra') }
  const alternar = (r: string) => setReglas(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r])
  const agregar = () => {
    const t = regla.trim().replace(/\s+/g, ' ')
    if (!t) { setErrRegla('Escribe la regla y toca «Agregar».'); return }
    if (reglas.some(r => r.toLowerCase() === t.toLowerCase())) { setErrRegla('Esa regla ya está. Escribe otra o toca «Cancelar».'); return }
    setReglas([...reglas, t]); setRegla(''); setErrRegla(''); setOtra(false)
  }
  const clave = PANTALLAS[pant].clave
  const errDe = (k: Campo) => k === 'inicio' || k === 'fin' ? errorFechas(errores[k], k) : errores[k]
  const verDe = (k: Campo) => (enviado || tocado[k]) ? errDe(k) : undefined
  const malos = (ks: Campo[]) => ks.filter(k => errores[k])
  const enfocar = (k: Campo) => requestAnimationFrame(() => document.getElementById(idDe(k))?.focus())
  const siguiente = () => {
    const ks = CAMPOS[clave]; setTocado(t => ({ ...t, ...Object.fromEntries(ks.map(k => [k, true])) }))
    const m = malos(ks); if (m.length) { enfocar(m[0]); return }
    if (clave === 'reglas') { setFiesta(true); return }
    avisar(alertaPantallaLista(pant)); setPop(x => x + 1); setPant(pant + 1)
  }
  const crear = async () => {
    setEnviado(true)
    const primero = (['direccion', 'inicio', 'fin', 'monto', 'email'] as Campo[]).find(k => errores[k])
    if (primero) { if (PANTALLA_DE[primero] !== pant) setPant(PANTALLA_DE[primero]); enfocar(primero); return }
    setOcupado(true)
    const m = montoNumero(f.monto)
    try {
      const r = modoPrueba
        ? await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: u.email, ...(escrowReal && origen === 'propia' && propia && { propia: { g: propia.g, firma: propia.firma } }) }, DUENO_PRUEBA)
        : await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: f.email.trim() }, u.email, await cuentaPropia())
      avisar(alertaCreado({ direccion: f.direccion.trim(), monto: m }))
      ir('/alquiler/' + r.id)
    } catch (e) { setOcupado(false); setErrSrv(e instanceof Error ? e.message : 'No pudimos crear el alquiler. Revisa tu conexión y vuelve a tocar «Crear alquiler».') }
  }
  const tope = !escrowReal ? MONTO_MAX : origen === 'lockumi' ? TOPE_USDC : Math.min(propia?.saldo ?? MONTO_MAX_USDC, MONTO_MAX_USDC)
  const mActual = montoNumero(f.monto) || 0
  const hoy = hoyISO(), le = limitesEntrada(hoy), ls = f.inicio ? limitesSalida(f.inicio) : null
  const errFin = avisoFin || verDe('fin')
  const P = PANTALLAS[pant]
  const ayuda = clave === 'monto' && escrowReal && origen === 'propia' ? 'USDC de prueba, sin valor. Hasta tu saldo.' : clave === 'monto' && !escrowReal ? 'Elige un monto o escríbelo.' : P.ayuda
  const err = (k: Campo) => { const e = verDe(k); return e ? <small id={'f-' + k + '-err'} className="campo__error" role="alert">{e}</small> : null }
  const atras = () => { if (fiesta) setFiesta(false); else if (pant > 0) setPant(pant - 1) }
  const enRevisar = clave === 'revisar' && !fiesta
  const avance = fiesta ? 4 : pant   // pantallas terminadas

  return <main id="contenido" tabIndex={-1} className="cont cont--form fz" style={{ paddingBottom: 48 }}>
    <div className="fz-cab">
      <a href="#/" className="boton-icono fz-cerrar" aria-label="Cerrar"><Ico n="x" /></a>
      <div className="fz-barra" role="progressbar" aria-label="Nuevo alquiler" aria-valuemin={1} aria-valuemax={TOTAL_PANTALLAS} aria-valuenow={pant + 1} aria-valuetext={`Paso ${pant + 1} de ${TOTAL_PANTALLAS}`}>
        <span key={pop} className="fz-barra__lleno" style={{ width: `${Math.max(6, (avance / TOTAL_PANTALLAS) * 100)}%` }} />
      </div>
      <span className="fz-n" aria-hidden="true">{pant + 1} de {TOTAL_PANTALLAS}</span>
    </div>

    {fiesta ? <section className="glass glass--fuerte fz-tarjeta fz-fiesta" aria-labelledby="fz-t">
      <Casita fiesta />
      <h1 id="fz-t" ref={titulo} tabIndex={-1}>{PANTALLAS[3].listo}</h1>
      <p className="fz-ayuda">{faltan(3)}</p>
      <div className="fz-pie"><button type="button" className="boton boton--primario boton--ancho boton--grande" onClick={() => { setFiesta(false); setPop(x => x + 1); setPant(4) }}>Seguir</button></div>
    </section>
    : <form className="glass glass--fuerte fz-tarjeta" noValidate aria-labelledby="fz-t" onSubmit={e => { e.preventDefault(); if (enRevisar) void crear(); else siguiente() }}>
      <div className="fz-preg"><Casita k={pop} /><div>
        <h1 id="fz-t" ref={titulo} tabIndex={-1}>{P.pregunta}</h1>
        <p className="fz-ayuda" id="fz-ayuda">{ayuda}</p></div></div>

      {clave === 'lugar' && <div className="fz-campos" data-recorrido="datos">
        <label htmlFor="f-direccion" className="fz-et">Nombre del lugar</label>
        <div className={'na-input' + (verDe('direccion') ? ' na-input--error' : '')}><input id="f-direccion" value={f.direccion} onChange={e => poner('direccion', e.target.value)} onBlur={tocar('direccion')} placeholder={EJEMPLO_LUGAR} autoComplete="off" maxLength={140}
          aria-invalid={!!verDe('direccion')} aria-describedby={verDe('direccion') ? 'f-direccion-err' : 'fz-ayuda'} /></div>
        {err('direccion')}
        <p className="fz-et" id="et-tipo">Tipo</p>
        <Chips id="et-tipo" ops={TIPOS_LUGAR.map(t => ({ v: t, t }))} valor={tipo} onElegir={setTipo} />
      </div>}

      {clave === 'fechas' && <div className="fz-campos">
        <CampoCalendario id="f-inicio" etiqueta="Empieza" valor={f.inicio} min={le.min} max={le.max} error={verDe('inicio')} onElegir={elegirInicio} onCerrar={tocar('inicio')} />
        <p className="fz-et" id="et-dur">Duración<span className="fz-et__der"><Info et="Reglas de las fechas" onClick={() => setInfo('fechas')} /></span></p>
        {/* LEGAL (23/10): chips de duración solo en la red de prueba; antes de usar dinero real, revisarlos con un abogado (Ley 7527, art. 70). */}
        <Chips id="et-dur" ops={[...DURACIONES.map(d => ({ v: d.meses as number | 'otra', t: d.texto })), { v: 'otra' as const, t: OTRA_FECHA }]} valor={dur} onElegir={elegirDur} />
        <CampoCalendario id="f-fin" etiqueta="Termina" valor={f.fin} min={ls?.min ?? le.min} max={ls?.max ?? le.max} error={errFin} onElegir={elegirFin} onCerrar={tocar('fin')}
          onAbrir={() => { if (f.inicio) return true; setAvisoFin('Primero elige el día en que empieza.'); return false }}
          contexto={f.inicio && <div className="na-hoja__ctx"><span className="na-ctx"><Ico n="cal" />Empieza <strong>{ddmmaa(f.inicio)}</strong></span>{f.fin && <span className="na-ctx na-ctx--sel">Termina <strong>{ddmmaa(f.fin)}</strong></span>}</div>} />
      </div>}

      {clave === 'monto' && <div className="fz-campos">
        <p className="fz-monto" aria-live="polite"><strong>{mActual ? usd(mActual) : usd(0)}</strong>{escrowReal && <small>de prueba</small>}</p>
        <p className="sr" id="et-monto">Monto del depósito</p>
        <Chips id="et-monto" ops={MONTOS.map(n => ({ v: n as number, t: usd(n) }))} valor={MONTOS.includes(mActual as never) ? mActual : null} desact={n => n > tope}
          onElegir={n => { poner('monto', String(n)); tocar('monto')() }} />
        <label htmlFor="f-monto" className="fz-et">Otro monto</label>
        <div className={'na-input fz-otro' + (verDe('monto') ? ' na-input--error' : '')}><input id="f-monto" value={f.monto} onChange={e => poner('monto', e.target.value)} onBlur={tocar('monto')} inputMode="decimal" placeholder="0" autoComplete="off"
          aria-invalid={!!verDe('monto')} aria-describedby={verDe('monto') ? 'f-monto-err' : 'fz-ayuda'} /><small>{escrowReal ? 'USDC de prueba' : 'USD'}</small></div>
        {err('monto')}
        {escrowReal && <>
          <p className="fz-et" id="et-origen">Origen<span className="fz-et__der"><Info et="De dónde salen los USDC de prueba" onClick={() => setInfo('usdc')} /></span></p>
          <Chips id="et-origen" ops={[{ v: 'lockumi' as const, t: 'USDC de prueba de Lockumi' }, { v: 'propia' as const, t: 'Mi propio USDC de prueba' }]} valor={origen} onElegir={setOrigen} />
          {origen === 'propia' && (propia
            ? <p className="na-saldo" id="saldo-propio" role="status"><Ico n="check" />{propia.saldo === null
                ? <span>Tu cuenta ({abreviar(propia.g)}) todavía no tiene USDC de prueba. Carga USDC de prueba o elige «USDC de prueba de Lockumi».</span>
                : <span>Cuenta {abreviar(propia.g)} · {NOMBRE_FIRMA[propia.firma]}: <strong>{propia.saldo.toLocaleString('es-CR', { maximumFractionDigits: 7 })} USDC de prueba</strong></span>}</p>
            : <div className="na-conectar">
                {hayCavos() && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('cavos')}>{conectando === 'cavos' ? 'Conectando…' : 'Usar mi cuenta Lockumi'}</button>}
                {freighter && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('freighter')}>{conectando === 'freighter' ? 'Conectando…' : 'Usar Freighter'}</button>}
                {!hayCavos() && !freighter && <p>Para usar tu cuenta, instala Freighter (freighter.app) en este navegador y recarga la página.</p>}
              </div>)}
          {errCuenta && <p className="error" role="alert">{errCuenta}</p>}
        </>}
      </div>}

      {clave === 'reglas' && <div className="fz-campos" data-recorrido="reglas">
        <p className="sr" id="et-reglas">Reglas</p>
        <div className="fz-chips" role="group" aria-labelledby="et-reglas">
          {[...REGLAS_CHIP, ...reglas.filter(r => !(REGLAS_CHIP as readonly string[]).includes(r))].map(r => <button key={r} type="button" aria-pressed={reglas.includes(r)} className={'fz-chip' + (reglas.includes(r) ? ' is-sel' : '')} onClick={() => alternar(r)}>{reglas.includes(r) && <Ico n="check" />}{r}</button>)}
          {/* MODERAR ANTES DE PRODUCCIÓN (Legal, 23/10): «+ Otra regla» es texto libre. Ver OTRA_REGLA_SIN_MODERAR en formulario.ts. */}
          {!otra && <button type="button" className="fz-chip fz-chip--otra" aria-expanded={false} onClick={() => { setOtra(true); requestAnimationFrame(() => document.getElementById('f-regla')?.focus()) }}>{OTRA_REGLA}</button>}
        </div>
        {otra && <div className="fz-otra">
          <label htmlFor="f-regla" className="fz-et">Otra regla</label>
          <div className={'na-input' + (errRegla ? ' na-input--error' : '')}><input id="f-regla" value={regla} maxLength={MAX_REGLA} onChange={e => { setRegla(e.target.value); setErrRegla('') }} placeholder="Ej.: Sacar la basura los martes" autoComplete="off"
            aria-invalid={!!errRegla} aria-describedby={errRegla ? 'f-regla-err' : undefined} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } if (e.key === 'Escape') { e.preventDefault(); setOtra(false); setRegla(''); setErrRegla('') } }} /></div>
          {errRegla && <small id="f-regla-err" className="campo__error" role="alert">{errRegla}</small>}
          <div className="fz-otra__bot"><button type="button" className="boton boton--secundario" onClick={() => { setOtra(false); setRegla(''); setErrRegla('') }}>Cancelar</button><button type="button" className="boton boton--secundario" onClick={agregar}>Agregar</button></div>
        </div>}
      </div>}

      {enRevisar && <div className="fz-campos">
        {modoPrueba && <div className="na-meta"><button type="button" className="na-red" aria-haspopup="dialog" onClick={() => setInfo('red')}><Ico n="matraz" />Red de prueba · sin dinero real<span className="na-red__i" aria-hidden="true"><Ico n="i" /></span><span className="sr">. Ver detalles</span></button></div>}
        <dl className="fz-resumen">
          <div><dt>Lugar</dt><dd>{f.direccion.trim()}</dd><button type="button" className="enlace" aria-label="Cambiar el lugar" onClick={() => setPant(0)}>Cambiar</button></div>
          <div><dt>Fechas</dt><dd>{f.inicio && ddmmaa(f.inicio)} a {f.fin && ddmmaa(f.fin)}</dd><button type="button" className="enlace" aria-label="Cambiar las fechas" onClick={() => setPant(1)}>Cambiar</button></div>
          <div><dt>Depósito</dt><dd>{usd(mActual)}{escrowReal && ' de prueba'}{escrowReal && <small>{origen === 'lockumi' ? 'USDC de prueba de Lockumi' : 'Mi propio USDC de prueba'}</small>}</dd><button type="button" className="enlace" aria-label="Cambiar el depósito" onClick={() => setPant(2)}>Cambiar</button></div>
          <div><dt>Reglas</dt><dd>{reglas.length ? <ul>{reglas.map(r => <li key={r}>{r}</li>)}</ul> : 'Sin reglas'}</dd><button type="button" className="enlace" aria-label="Cambiar las reglas" onClick={() => setPant(3)}>Cambiar</button></div>
        </dl>
        {!modoPrueba && <label className={'campo' + (verDe('email') ? ' campo--error' : '')}><span>Correo del inquilino</span>
          <input id="f-email" type="email" value={f.email} onChange={e => poner('email', e.target.value)} onBlur={tocar('email')} placeholder="inquilino@correo.com" autoComplete="off" aria-invalid={!!verDe('email')} aria-describedby={verDe('email') ? 'f-email-err' : undefined} />
          {err('email')}</label>}
        {errSrv && <p className="error na-error" role="alert">{errSrv}</p>}
        {/* LEGAL: revisar. Texto propuesto por Legal (cambios-1.5-vs-1.4.md, «Línea de la fase 1»), palabra por palabra. */}
        {modoPrueba ? <p className="na-priv"><Ico n="escudo" /><span>Lugar y fotos: se quedan en tu navegador; a la red solo va una huella de las fotos.</span></p>
          : <p className="nota">Tú quedas como dueño. La persona invitada entra como inquilino. Lo siguiente es firmar el contrato los dos.</p>}
      </div>}

      <div className="fz-pie">
        {pant > 0 && <button type="button" className="boton boton--secundario boton--ancho" onClick={atras}>Atrás</button>}
        <button type="submit" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado}>
          {enRevisar ? (ocupado ? 'Creando…' : 'Crear alquiler') : clave === 'reglas' ? 'Revisar el contrato' : 'Siguiente'}</button>
      </div>
    </form>}

    <Hoja id="info" titulo={info === 'red' ? 'Red de prueba' : info === 'usdc' ? 'USDC de prueba' : 'Fechas'} abierta={!!info} onCerrar={() => setInfo(null)}>
      <div className="na-hoja__texto">
        {/* LEGAL: revisar. Hoja «Red de prueba» 1.5 (borrador): 1.er párrafo = ⓘ de la píldora propuesto por Legal; el resto, versión corta del texto 1.4 con los cambios pedidos. */}
        {info === 'red' && <>
          <p>Esta demo funciona en la red de prueba (testnet) de Stellar. Los tokens no tienen valor y la red se reinicia de vez en cuando. No uses la red principal ni envíes dinero real.</p>
          {modoSolo ? <>
            <p>Tú eres el <strong>inquilino</strong> y depositas con tu billetera. El dueño es el <strong>{minuscula(DUENO_PRUEBA)}</strong>: por eso no te pedimos su correo.</p>
            <p>Lockumi firma y confirma por el dueño de prueba: tú tocas el botón en su nombre. El reclamo y el mediador son simulados y no se registran en la red.</p>
          </> : <>
            <p>Tú eres el <strong>inquilino</strong>. El dueño es el <strong>{minuscula(DUENO_PRUEBA)}</strong>: por eso no te pedimos su correo.</p>
            <p>Lockumi firma y confirma por el dueño de prueba. Los reclamos y el mediador son simulados: los haces tú con un botón en nombre del dueño.</p>
          </>}
          <p>El nombre del lugar y las fotos se quedan en tu navegador; a la red solo va una huella de las fotos.</p></>}
        {/* LEGAL: revisar. Hoja «USDC de prueba» 1.5 (borrador): base = ⓘ propuesto por Legal, más billeteras (Cavos o Freighter) y «hasta tu saldo». */}
        {info === 'usdc' && <>
          <p>El USDC de prueba no es dinero real y no tiene valor. Tienes dos opciones:</p>
          <ul>
            <li><strong>USDC de prueba de Lockumi:</strong> USDC de prueba que te da Lockumi, sin valor, hasta {TOPE_USDC}.</li>
            <li><strong>Usar mi propio USDC de prueba:</strong> el de tu billetera de Lockumi (Cavos) o de Freighter, hasta tu saldo y como máximo {MONTO_MAX_USDC.toLocaleString('es-CR')}. Lo obtienes con Friendbot y el exchange de la red de prueba.</li>
          </ul></>}
        {/* LEGAL: revisar. Texto propuesto por Legal para la ⓘ de «Fechas», palabra por palabra. */}
        {info === 'fechas' && <p>En esta demo, la fecha de entrada es de hoy en adelante (hasta 1 año) y la duración va de 1 mes a 5 años. Son valores de prueba, no plazos legales.</p>}
      </div>
      <button type="button" className="boton boton--primario boton--ancho na-hoja__listo" onClick={() => setInfo(null)}>Entendido</button>
    </Hoja>
  </main>
}
