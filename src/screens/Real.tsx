// Fase 1 · pantallas del flujo REAL en la red de prueba de Stellar (una sola persona, sin base de datos).
// Botones sin palabras técnicas; los enlaces a stellar.expert dicen "Ver comprobante en la red de prueba".
import { useCallback, useEffect, useState } from 'react'
import { store } from '../store'
import type { Alquiler, PasoRed, Rol } from '../types'
import { usd, fechaHora } from '../ui'
import { enlaceTx, enlaceCuenta, enlaceContrato, TOPE_USDC, MAX_XLM_COMPRA } from '../../api/_lib/red'
import { consultarUsdc, conectarBilletera, abreviar } from '../services/billetera'
import { obtenerUsdc, depositar, reintentarDeposito, aprobar, liberar, huellaActa, usarPrueba, fijarUsarPrueba, cuentaInquilino, cotizar, maximoAGastar, type Txs } from '../services/solo'

export const DUENO_PRUEBA = 'Dueño de prueba (cuenta de testnet custodiada por Lockumi)'
export const INQUILINO_PRUEBA = 'Inquilino de prueba (cuenta de testnet custodiada por Lockumi)'
export const NOMBRE_PASO: Record<PasoRed, string> = {
  trustline: 'USDC habilitado en tu cuenta', compra: 'Compra de USDC de prueba', duenoTrustline: 'USDC habilitado en la cuenta del dueño de prueba',
  escrow: 'Cuenta segura del depósito creada', deposito: 'Depósito bloqueado en la cuenta segura', evidencia: 'Evidencia del acta de salida',
  aprobacion: 'Aprobación del dueño de prueba', liberacion: 'Depósito devuelto al inquilino',
}
const ORDEN: PasoRed[] = ['trustline', 'compra', 'duenoTrustline', 'escrow', 'deposito', 'evidencia', 'aprobacion', 'liberacion']
export const VerTx = ({ h }: { h: string }) => <a className="enlace" href={enlaceTx(h)} target="_blank" rel="noopener noreferrer">Ver comprobante en la red de prueba</a>
const Error = ({ m }: { m: string }) => m ? <p className="error" role="alert">{m}</p> : null
const textoError = (e: unknown) => e instanceof globalThis.Error ? e.message : 'Algo salió mal. Vuelve a intentarlo en un minuto.'
const anotar = (id: string, txs: Partial<Record<PasoRed, string>>, extra: (a: Alquiler) => void = () => {}) => store.cambiar(id, x => {
  x.red ??= { txs: {} }
  for (const k of ORDEN) { const h = txs[k]; if (h && !x.red.txs[k]) { x.red.txs[k] = h; x.historial.push({ fecha: new Date().toISOString(), texto: NOMBRE_PASO[k], tx: h }) } }
  extra(x)
})

/** Quién es quién en esta prueba (rótulos de las cuentas de prueba). */
export function Cuentas({ a }: { a: Alquiler }) {
  const prueba = a.red?.inquilinoPrueba ?? usarPrueba()
  return <div className="cuentas-prueba" role="note" aria-label="Cuentas de esta prueba">
    <p><span className="chip chip--neutro chip--mini">Dueño</span> <strong>{DUENO_PRUEBA}</strong>
      {a.red?.dueno && <> · <a className="enlace" href={enlaceCuenta(a.red.dueno)} target="_blank" rel="noopener noreferrer">Ver cuenta en la red de prueba</a></>}</p>
    <p><span className="chip chip--neutro chip--mini">Inquilino</span> <strong>{prueba ? INQUILINO_PRUEBA : 'Tu billetera'}</strong>
      {a.red?.inquilino && <> · <a className="enlace" href={enlaceCuenta(a.red.inquilino)} target="_blank" rel="noopener noreferrer">Ver cuenta en la red de prueba</a></>}</p>
  </div>
}

/** Interruptor visible del respaldo: inquilino en una cuenta de prueba custodiada por Lockumi. */
export function InterruptorPrueba({ bloqueado = false }: { bloqueado?: boolean }) {
  const [v, setV] = useState(usarPrueba())
  useEffect(() => { const f = () => setV(usarPrueba()); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  return <label className="casilla interruptor-prueba">
    <input type="checkbox" checked={v} disabled={bloqueado} onChange={e => fijarUsarPrueba(e.target.checked)} />
    <span><strong>Usar cuenta de prueba</strong>: si tu billetera no puede firmar, Lockumi crea un {INQUILINO_PRUEBA.toLowerCase()} y firma por ella. Solo usa tokens de prueba sin valor.</span>
  </label>
}

/** Botón "Obtener USDC de prueba": XLM de prueba gratis si hace falta, habilitar USDC y comprar con un máximo a gastar. */
export function ObtenerUsdc({ objetivo, onListo }: { objetivo: number; onListo?: (r: { g: string; txs: Txs; saldo: string }) => void }) {
  const [saldo, setSaldo] = useState<string | null | undefined>(undefined); const [g, setG] = useState('')
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState(''); const [txs, setTxs] = useState<Txs>({})
  const [max, setMax] = useState<number | null>(null); const [prueba, setPrueba] = useState(usarPrueba())
  useEffect(() => { const f = () => setPrueba(usarPrueba()); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  const leer = useCallback(async () => {
    try { const c = await cuentaInquilino(); setG(c.g); setSaldo(await consultarUsdc(c.g)); setErr('') }
    catch { setErr(prueba ? 'No pudimos preparar la cuenta de prueba. Vuelve a intentarlo en un minuto.' : 'No pudimos abrir tu billetera. Cierra sesión y vuelve a entrar en esta pestaña, o activa «Usar cuenta de prueba».') }
  }, [prueba])
  useEffect(() => { void leer() }, [leer])
  useEffect(() => { cotizar(objetivo).then(p => setMax(maximoAGastar(p))).catch(() => setMax(null)) }, [objetivo])
  const tiene = Number(saldo ?? 0)
  const pedir = async () => {
    setOcupado(true); setErr('')
    try { const r = await obtenerUsdc(objetivo, setAvance); setTxs(r.txs); setG(r.g); setSaldo(r.saldo); onListo?.(r) }
    catch (e) { setErr(textoError(e)) } finally { setOcupado(false); setAvance('') }
  }
  return <div className="pila obtener-usdc">
    <p className="saldo-usdc" role="status">{saldo === undefined && !g ? 'Consultando tu saldo…' : <>Tienes <strong>{usd(tiene)}</strong> de prueba{g && <> en {prueba ? 'la cuenta de prueba' : 'tu billetera'} ({abreviar(g)})</>}.</>}</p>
    {tiene < objetivo ? <>
      <p className="nota">Necesitas {usd(objetivo)} de prueba. Al tocar el botón: {prueba ? 'Lockumi prepara la cuenta de prueba y compra los USDC de prueba por ella.' : <>
        1) activamos tu cuenta con XLM de prueba gratis si hace falta, 2) habilitamos USDC en tu cuenta y 3) compramos {usd(Math.round((objetivo - tiene) * 1e7) / 1e7)} de prueba
        con <strong>como máximo {max ?? MAX_XLM_COMPRA} XLM de prueba</strong>. Tu billetera te mostrará una ventana para confirmar: revisa y acepta. Nada de esto es dinero real.</>}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void pedir()}>{ocupado ? (avance || 'Un momento…') : 'Obtener USDC de prueba'}</button>
      <p className="nota">¿Prefieres otra vía? En <a className="enlace" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">faucet.circle.com</a> eliges Stellar Testnet y pegas tu dirección (20 USDC cada 2 horas). Después vuelve aquí.</p>
    </> : <p className="nota">Ya tienes los USDC de prueba que necesitas.</p>}
    {(txs.trustline || txs.compra) && <ul className="lista comprobantes">
      {txs.trustline && <li><span>{NOMBRE_PASO.trustline}</span><VerTx h={txs.trustline} /></li>}
      {txs.compra && <li><span>{NOMBRE_PASO.compra}</span><VerTx h={txs.compra} /></li>}</ul>}
    <Error m={err} />
  </div>
}

/** Paso "Depósito" real: un paso por pantalla (1. USDC de prueba → 2. depositar). */
export function PagoReal({ a, rol }: { a: Alquiler; rol: Rol }) {
  const [listo, setListo] = useState(false); const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  const [, refrescar] = useState(0)
  useEffect(() => { const f = () => refrescar(n => n + 1); addEventListener('lockumi-cuenta', f); return () => removeEventListener('lockumi-cuenta', f) }, [])
  const prueba = usarPrueba()
  useEffect(() => { let vivo = true; setListo(false)
    cuentaInquilino().then(c => consultarUsdc(c.g)).then(s => { if (vivo) setListo(Number(s ?? 0) >= a.monto) }).catch(() => {}); return () => { vivo = false } }, [a.monto, prueba])
  if (rol === 'dueno') return <section className="pila"><div className="cab"><h2>Depósito</h2><span className="chip chip--neutro">Red de prueba</span></div>
    <div className="monto">{usd(a.monto)}</div><Cuentas a={a} />
    <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>Esperando que el inquilino deposite. Toca «Ver como inquilino» para hacerlo tú.</p></div></section>
  const pagar = async () => {
    setOcupado(true); setErr('')
    try {
      if (a.red?.escrow && !a.red.txs.deposito) {   // la cuenta segura ya existe: solo falta el depósito
        setAvance('Confirma el depósito en tu billetera…'); const h = await reintentarDeposito(a.red.escrow)
        anotar(a.id, { deposito: h }, x => { x.estado = 'fotos_entrada'; x.pago = new Date().toISOString(); x.escrowId = a.red!.escrow })
      } else {
        const r = await depositar(a.id, a.monto, setAvance)
        anotar(a.id, r.pasos, x => { x.red!.escrow = r.escrow; x.red!.dueno = r.dueno; x.red!.inquilino = r.inquilino; x.red!.inquilinoPrueba = r.prueba; x.escrowId = r.escrow; x.estado = 'fotos_entrada'; x.pago = new Date().toISOString() })
      }
    } catch (e) {
      const x = e as { escrow?: string; pasos?: Partial<Record<PasoRed, string>> }
      if (x.escrow) anotar(a.id, x.pasos ?? {}, y => { y.red!.escrow = x.escrow })
      setErr(textoError(e) + (usarPrueba() ? '' : ' Si tu billetera no puede firmar, activa «Usar cuenta de prueba» y vuelve a tocar el botón.'))
    } finally { setOcupado(false); setAvance('') }
  }
  return <section className="pila"><div className="cab"><h2>Depósito</h2><span className="chip chip--neutro">Red de prueba</span></div>
    <div className="subpasos" aria-label={`Depósito: parte ${listo ? 2 : 1} de 2`}><span className={listo ? 'hecho' : 'actual'} /><span className={listo ? 'actual' : ''} /></div>
    <div className="monto">{usd(a.monto)}</div>
    <Cuentas a={a} />
    {!listo ? <><p className="mini">Parte 1 de 2 · Consigue USDC de prueba</p><ObtenerUsdc objetivo={a.monto} onListo={r => setListo(Number(r.saldo) >= a.monto)} /></> : <>
      <p className="mini">Parte 2 de 2 · Deposita</p>
      <p>Tus {usd(a.monto)} de prueba quedan bloqueados en una cuenta segura de Trustless Work en la red de prueba de Stellar. Nadie puede tomarlos solo.
        {!prueba && ' Tu billetera te mostrará una ventana para confirmar el depósito.'}</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void pagar()}>{ocupado ? (avance || 'Un momento…') : `Depositar ${usd(a.monto)}`}</button>
      <p className="nota">Esto toma entre 20 y 60 segundos.</p></>}
    <Error m={err} />
    <InterruptorPrueba bloqueado={!!a.red?.escrow} />
  </section>
}

/** Plazo de reclamos (fase 1): el dueño de prueba aprueba y Lockumi devuelve el depósito en la red de prueba. */
export function CierreReal({ a, rol }: { a: Alquiler; rol: Rol }) {
  const [ocupado, setOcupado] = useState(false); const [avance, setAvance] = useState(''); const [err, setErr] = useState('')
  const escrow = a.red?.escrow; if (!escrow) return null
  const aprobado = !!a.red?.txs.aprobacion
  const correr = async (f: () => Promise<void>) => { setOcupado(true); setErr(''); try { await f() } catch (e) { setErr(textoError(e)) } finally { setOcupado(false); setAvance('') } }
  const aprobarYa = () => correr(async () => {
    setAvance('El dueño de prueba está aprobando…')
    const huella = await huellaActa((a.salida?.cuartos ?? []).flatMap(c => c.fotos.map(f => f.huella ?? '')))
    const r = await aprobar(escrow, huella)
    anotar(a.id, { ...(r.evidenciaTx && { evidencia: r.evidenciaTx }), ...(r.aprobacionTx && { aprobacion: r.aprobacionTx }) }, x => { if (r.yaAprobado) x.red!.txs.aprobacion ??= 'ya-aprobado' })
  })
  const liberarYa = () => correr(async () => {
    setAvance('Devolviendo el depósito…'); const r = await liberar(escrow)
    anotar(a.id, { liberacion: r.tx }, x => { x.estado = 'cerrado'; x.resultado = { inquilino: Math.round(x.monto * 0.997 * 1e7) / 1e7, dueno: 0, via: 'automatico', fecha: new Date().toISOString() } })
  })
  return <div className="pila cierre-real">
    {!aprobado ? (rol === 'dueno' ? <>
      <p>Si todo está bien, aprueba la devolución. Como dueño de prueba, Lockumi firma esta aprobación por ti en la red de prueba.</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void aprobarYa()}>{ocupado ? (avance || 'Un momento…') : 'Todo está bien: aprobar la devolución'}</button>
    </> : <div className="espera" role="status"><span aria-hidden="true">⏳</span><p>Esperando que el dueño de prueba apruebe. Toca «Ver como dueño» para hacerlo.</p></div>) : <>
      <p>El dueño de prueba aprobó. Ya se puede devolver el depósito al inquilino.</p>
      <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={() => void liberarYa()}>{ocupado ? (avance || 'Un momento…') : 'Devolver el depósito al inquilino'}</button>
      <p className="nota">Trustless Work descuenta 0,3 % al devolver: el inquilino recibe {usd(Math.round(a.monto * 0.997 * 1e7) / 1e7)} de prueba.</p></>}
    {(a.red?.txs.evidencia || (a.red?.txs.aprobacion && a.red.txs.aprobacion !== 'ya-aprobado')) && <ul className="lista comprobantes">
      {a.red?.txs.evidencia && <li><span>{NOMBRE_PASO.evidencia}</span><VerTx h={a.red.txs.evidencia} /></li>}
      {a.red?.txs.aprobacion && a.red.txs.aprobacion !== 'ya-aprobado' && <li><span>{NOMBRE_PASO.aprobacion}</span><VerTx h={a.red.txs.aprobacion} /></li>}</ul>}
    <Error m={err} />
  </div>
}

/** Todos los comprobantes del alquiler en la red de prueba (stellar.expert, testnet). */
export function Comprobantes({ a }: { a: Alquiler }) {
  const txs = a.red?.txs ?? {}; const hay = ORDEN.filter(k => txs[k] && txs[k] !== 'ya-aprobado')
  return <section className="glass tarjeta" aria-labelledby="t-comp"><h3 id="t-comp">Comprobantes en la red de prueba</h3>
    {hay.length === 0 ? <p className="nota">Aquí aparece cada paso que quede registrado en la red de prueba de Stellar.</p> :
      <ol className="lista comprobantes">{hay.map(k => <li key={k}><span>{NOMBRE_PASO[k]}</span><VerTx h={txs[k]!} /></li>)}</ol>}
    {a.red?.escrow && <p className="nota"><a className="enlace" href={enlaceContrato(a.red.escrow)} target="_blank" rel="noopener noreferrer">Ver la cuenta segura en la red de prueba</a></p>}
  </section>
}

/** Último paso registrado en la red de prueba, para mostrarlo arriba del panel. */
export function UltimoComprobante({ a }: { a: Alquiler }) {
  const e = [...a.historial].reverse().find(h => h.tx && h.tx !== 'ya-aprobado'); if (!e) return null
  return <p className="ultimo-comprobante nota" role="status">✓ {e.texto} · {fechaHora(e.fecha)} · <VerTx h={e.tx!} /></p>
}
export { TOPE_USDC, conectarBilletera }
