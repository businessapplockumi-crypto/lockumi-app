import { useState } from 'react'
import { auth } from '../services/auth'
import type { Rol, Usuario } from '../types'
import { Demo, Deco, Icono } from '../ui'
export function Login({ onOk }: { onOk: (u: Usuario) => void }) {
  const [email, setEmail] = useState(''); const [rol, setRol] = useState<Rol>('dueno'); const [cargando, setC] = useState(false); const [err, setErr] = useState('')
  const entrar = async (m: Usuario['metodo']) => {
    const e = m === 'correo' ? email.trim() : (rol === 'dueno' ? 'katherine@ejemplo.cr' : 'inquilino@ejemplo.cr')
    if (m === 'correo' && !/^\S+@\S+\.\S+$/.test(e)) { setErr('Escribí un correo válido.'); return }
    setC(true); onOk(await auth.login(e, m, rol))
  }
  return <main id="contenido" tabIndex={-1} className="cont cont--form login">
    <div className="login__cab"><img src="/img/logo-lockumi.svg" alt="Lockumi" className="login__logo" /><div aria-hidden="true" className="login__deco"><Deco id="d-hoja" size={30} className="deco--flota" /><Deco id="d-candado" size={44} className="deco--flota deco--b" /></div></div>
    <div className="glass glass--fuerte tarjeta pila">
      <div><h1>Entrá a Lockumi</h1><p className="nota">Tu depósito de alquiler, protegido y claro para ambas partes.</p></div>
      <p className="nota"><span className="ok"><Icono id="i-escudo" className="ico--salvia" /> Sin billeteras ni frases secretas: entrás con tu correo o tu cuenta de siempre.</span> <Demo t="Login simulado" /></p>
      <div><span className="etiqueta" id="rol-t">Entrar como (demo)</span>
        <div className="roles roles--ancho" role="group" aria-labelledby="rol-t">
          <button style={{ flex:1 }} aria-pressed={rol==='dueno'} type="button" onClick={() => setRol('dueno')}>Dueño</button>
          <button style={{ flex:1 }} aria-pressed={rol==='inquilino'} type="button" onClick={() => setRol('inquilino')}>Inquilino</button>
        </div></div>
      <div className="social">
        <button className="boton boton--secundario boton--ancho" disabled={cargando} onClick={() => entrar('google')}>Continuar con Google</button>
        <button className="boton boton--secundario boton--ancho" disabled={cargando} onClick={() => entrar('apple')}>Continuar con Apple</button>
      </div>
      <div className="sep">o con tu correo</div>
      <label className="campo"><span>Correo electrónico</span><input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} placeholder="nombre@correo.com" autoComplete="email" onKeyDown={e => e.key === 'Enter' && entrar('correo')} /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="boton boton--primario boton--ancho" disabled={cargando} onClick={() => entrar('correo')}>{cargando ? 'Entrando…' : 'Recibir enlace de acceso'}</button>
    </div>
  </main>
}
