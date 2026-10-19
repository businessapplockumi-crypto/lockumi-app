import { useEffect, useState } from 'react'
import { servidor } from '../servidor/repositorio'
import { modoServidor } from '../servidor/config'
import { modoReal } from '../services/auth'
import { conectarBilletera } from '../services/billetera'
import { ir } from '../router'
import type { Usuario } from '../types'
import { usd, fecha } from '../ui'

type Datos = Awaited<ReturnType<typeof servidor.verInvitacion>>
/** Cuenta G… de Cavos, si se puede obtener (solo con login real). No bloquea si falla: se puede agregar después. */
export async function cuentaPropia(): Promise<string | undefined> {
  if (!modoReal) return undefined
  try { return (await conectarBilletera()).direccion } catch { return undefined }
}

export function Invitacion({ id, token, u }: { id: string; token: string; u: Usuario }) {
  const [d, setD] = useState<Datos | null>(null); const [err, setErr] = useState(''); const [ocupado, setOcupado] = useState(false); const [acepto, setAcepto] = useState(false)
  useEffect(() => { if (modoServidor) servidor.verInvitacion(id, token).then(setD).catch(e => setErr(e.message)) }, [id, token])
  if (!modoServidor) return <main id="contenido" tabIndex={-1} className="cont"><div className="glass tarjeta pila">
    <p>Esta versión de Lockumi es la prueba de una sola persona: todavía no recibe invitaciones de otra persona.</p>
    <p className="nota">Para probar el alquiler completo, crea uno nuevo desde tus alquileres.</p><a href="#/" className="enlace">Ir a tus alquileres</a></div></main>
  const comoDueno = d?.rol_invitado === 'dueno'
  const aceptar = async () => {
    setOcupado(true); setErr('')
    try { await servidor.aceptarInvitacion(id, token, u.email, await cuentaPropia(), !comoDueno && acepto); ir('/alquiler/' + id) }
    catch (e) { setErr(e instanceof Error ? e.message : 'No pudimos aceptar la invitación. Intenta de nuevo.'); setOcupado(false) }
  }
  const quien = d ? (d.rol_creador === 'dueno' ? 'El dueño' : 'El inquilino') : ''
  return <main id="contenido" tabIndex={-1} className="cont cont--form" style={{ paddingBottom: 48 }}>
    <h1>Te invitaron a un alquiler</h1>
    <div className="glass glass--fuerte tarjeta pila">
      {!d && !err && <p className="nota">Cargando la invitación…</p>}
      {d && <>
        <p><span className="chip chip--neutro">Entras como {comoDueno ? 'dueño' : 'inquilino'}</span></p>
        <p className="nota">{quien} (<span className="cortar">{d.email_creador}</span>) te invitó. El link vence el {fecha(d.expira.slice(0, 10))}.</p>
        <ul className="lista resumen">
          <li><span>Lugar</span><strong>{d.direccion}</strong></li><li><span>Depósito</span><strong>{usd(Number(d.monto))}</strong></li>
          <li><span>Entrada</span><strong>{fecha(d.inicio)}</strong></li><li><span>Salida</span><strong>{fecha(d.fin)}</strong></li>
          <li><span>{comoDueno ? 'Inquilino' : 'Dueño'}</span><strong className="cortar">{d.email_creador}</strong></li></ul>
        <p className="mini">{d.reglas_por_confirmar ? 'Reglas propuestas por el inquilino' : 'Reglas'}</p>
        {d.reglas?.length > 0 ? <ul className="reglas">{d.reglas.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="nota">Sin reglas.</p>}
        {u.email.toLowerCase() !== d.email_invitado.toLowerCase()
          ? <p className="error" role="alert">Esta invitación es para {d.email_invitado} y entraste con {u.email}. Sal de tu cuenta y entra con {d.email_invitado}, o pide que te inviten con tu correo.</p>
          : comoDueno
            ? <><p>Si aceptas, entras como dueño. Lo siguiente es revisar estas reglas: puedes confirmarlas o cambiarlas antes de firmar.</p>
              <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado} onClick={aceptar}>{ocupado ? 'Aceptando…' : 'Aceptar invitación'}</button></>
            : <><p>Si aceptas, entras como inquilino y aceptas las reglas. Lo siguiente es firmar el contrato y después depositar.</p>
              <label className="casilla"><input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} /> <span>Leí las reglas y estoy de acuerdo.</span></label>
              <button type="button" className="boton boton--primario boton--ancho boton--grande" disabled={ocupado || !acepto} onClick={aceptar}>{ocupado ? 'Aceptando…' : 'Aceptar invitación'}</button>
              {!acepto && <p className="nota">Marca la casilla para activar el botón.</p>}</>}
      </>}
      {err && <p className="error" role="alert">{err}</p>}
      <a href="#/" className="enlace">Ir a tus alquileres</a>
    </div>
  </main>
}
