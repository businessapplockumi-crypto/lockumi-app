import { useEffect, useState } from 'react'
import { acciones } from '../acciones'
import { cuentaPropia } from './Invitacion'
import { ir } from '../router'
import type { Usuario } from '../types'
import { CampoFecha } from '../ui'
import { LogoAnimado } from '../LogoAnimado'
import { modoSolo, modoPrueba, escrowReal } from '../servidor/config'
import { DUENO_PRUEBA } from './Real'
import { TOPE_USDC, montoValido, mensajeSaldoPropio } from '../services/solo'
import { conectar, saldoPropio, hayFreighter, hayCavos, NOMBRE_FIRMA, type Firma } from '../services/cuentaPropia'
import { abreviar } from '../services/billetera'
import { validarAlquiler, hoyISO, montoNumero, sumarMeses, MIN_MESES, MAX_ANIOS, type Campo, type Errores } from '../validacion'

export function Crear({ u }: { u: Usuario }) {
  const [f, setF] = useState({ direccion: '', monto: '', email: '', inicio: '', fin: '' })
  const [tocado, setTocado] = useState<Partial<Record<Campo, boolean>>>({}); const [enviado, setEnviado] = useState(false)
  const [reglas, setReglas] = useState<string[]>(['No se permiten mascotas']); const [regla, setRegla] = useState(''); const [ocupado, setOcupado] = useState(false); const [errSrv, setErrSrv] = useState('')
  // Red de prueba: tú eres el inquilino y el dueño es una cuenta de prueba de Lockumi.
  // Origen de los USDC de prueba: «Obtener USDC de prueba» (Lockumi, tope de 20) o tu propia cuenta (el límite es tu saldo real).
  const [origen, setOrigen] = useState<'lockumi' | 'propia'>('lockumi')
  const [propia, setPropia] = useState<{ g: string; firma: Firma; saldo: number | null } | null>(null)
  const [conectando, setConectando] = useState<Firma | null>(null); const [errCuenta, setErrCuenta] = useState('')
  const [freighter, setFreighter] = useState(false)
  useEffect(() => { if (escrowReal) void hayFreighter().then(setFreighter) }, [])
  const usar = async (firma: Firma) => {
    setConectando(firma); setErrCuenta('')
    try { const g = await conectar(firma); setPropia({ g, firma, saldo: await saldoPropio(g) }) }
    catch (e) { setErrCuenta(e instanceof Error ? e.message : 'No pudimos conectar tu cuenta. Vuelve a intentarlo.') }
    finally { setConectando(null) }
  }
  const errores: Errores = modoPrueba ? (() => {
    const e = validarAlquiler({ ...f, email: 'inquilino@ejemplo.com' }, hoyISO()); delete e.email
    const m = montoNumero(f.monto)
    if (escrowReal && !e.monto && origen === 'lockumi' && !montoValido(m, TOPE_USDC)) e.monto = `Con «Obtener USDC de prueba» el depósito es de máximo ${TOPE_USDC} USDC de prueba (no es dinero real). Escribe un monto de ${TOPE_USDC} o menos, o usa USDC de prueba de tu propia cuenta.`
    if (escrowReal && !e.monto && origen === 'propia') {
      if (!propia) e.monto = 'Primero conecta tu cuenta para ver cuántos USDC de prueba tienes.'
      else if ((propia.saldo ?? 0) < m) e.monto = mensajeSaldoPropio(propia.saldo ?? 0)
    }
    return e })() : validarAlquiler(f, hoyISO(), u.email)
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
    try {
      const r = modoPrueba
        ? await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: u.email, ...(escrowReal && origen === 'propia' && propia && { propia: { g: propia.g, firma: propia.firma } }) }, DUENO_PRUEBA)
        : await acciones.crear({ direccion: f.direccion.trim(), monto: m, inicio: f.inicio, fin: f.fin, reglas, inquilinoEmail: f.email.trim() }, u.email, await cuentaPropia())
      ir('/alquiler/' + r.id)
    } catch (e) { setOcupado(false); setErrSrv(e instanceof Error ? e.message : 'No pudimos crear el alquiler. Intenta de nuevo.') }
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
      {escrowReal && <fieldset className="campo origen-usdc"><legend>¿De dónde salen los USDC de prueba?</legend>
        <label className="casilla"><input type="radio" name="origen" checked={origen === 'lockumi'} onChange={() => setOrigen('lockumi')} /> <span>Obtener USDC de prueba de Lockumi (máximo {TOPE_USDC})</span></label>
        <label className="casilla"><input type="radio" name="origen" checked={origen === 'propia'} onChange={() => setOrigen('propia')} /> <span>De mi cuenta (cualquier monto que tenga)</span></label>
        {origen === 'propia' && (propia
          ? <p className="nota" id="saldo-propio" role="status">{propia.saldo === null
              ? <>Tu cuenta ({abreviar(propia.g)}) todavía no tiene USDC de prueba. Carga USDC de prueba o elige «Obtener USDC de prueba».</>
              : <>Tu cuenta ({abreviar(propia.g)}, con {NOMBRE_FIRMA[propia.firma]}) tiene <strong>{propia.saldo.toLocaleString('es-CR', { maximumFractionDigits: 7 })} USDC de prueba</strong>. Puedes depositar hasta esa cantidad.</>}</p>
          : <div className="pila">
              {hayCavos() && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('cavos')}>{conectando === 'cavos' ? 'Conectando…' : 'Usar mi cuenta Lockumi'}</button>}
              {freighter && <button type="button" className="boton boton--secundario boton--ancho" disabled={!!conectando} onClick={() => void usar('freighter')}>{conectando === 'freighter' ? 'Conectando…' : 'Usar Freighter'}</button>}
              {!hayCavos() && !freighter && <p className="nota">Para usar tu cuenta, instala Freighter (freighter.app) en este navegador y recarga la página.</p>}
            </div>)}
        {errCuenta && <p className="error" role="alert">{errCuenta}</p>}
      </fieldset>}
      {campoUI({ k: 'monto', et: escrowReal ? (origen === 'lockumi' ? `Depósito (USDC de prueba, máximo ${TOPE_USDC})` : 'Depósito (USDC de prueba de tu cuenta)') : 'Depósito (USD)', children: <input {...prop('monto')} inputMode="decimal" placeholder={escrowReal ? 'Ej.: 2' : 'Ej.: 800'} autoComplete="off" /> })}
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
      {!modoPrueba && campoUI({ k: 'email', et: 'Correo del inquilino', children: <input {...prop('email')} type="email" placeholder="inquilino@correo.com" autoComplete="off" /> })}
      {enviado && cuantos > 0 && <p className="error" role="alert">Revisa {cuantos === 1 ? 'el campo marcado' : `los ${cuantos} campos marcados`} y vuelve a intentarlo.</p>}
      {errSrv && <p className="error" role="alert">{errSrv}</p>}
      <button type="submit" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado}>{ocupado ? 'Creando…' : modoPrueba ? 'Crear alquiler de prueba' : 'Crear alquiler e invitar'}</button>
      {modoSolo ? <p className="nota">Prueba en la red de prueba de Stellar, sin dinero real. Tú haces los dos papeles: depositas como <strong>inquilino</strong> con tu billetera, y el dueño es un <strong>{DUENO_PRUEBA.toLowerCase()}</strong>. El nombre del lugar se queda en tu navegador: no va a la red.</p>
        : modoPrueba ? <p className="nota">Prueba en la red de prueba de Stellar, sin dinero real: el depósito son USDC de prueba que te da Lockumi. Tú haces los dos papeles: eres el <strong>inquilino</strong> y, con «Ver como dueño», también manejas al <strong>{DUENO_PRUEBA.toLowerCase()}</strong>. El nombre del lugar y las fotos se quedan en tu navegador: no van a la red.</p>
        : <p className="nota">Tú quedas como dueño. La persona invitada entra como inquilino. Lo siguiente es firmar el contrato los dos.</p>}
    </form>
  </main>
}
