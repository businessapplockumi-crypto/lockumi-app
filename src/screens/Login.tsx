import { useState } from 'react'
import { auth } from '../services/auth'
import type { Rol, Usuario } from '../types'
import { Demo, Escudo } from '../ui'
export function Login({ onOk }: { onOk: (u: Usuario) => void }) {
  const [email, setEmail] = useState(''); const [rol, setRol] = useState<Rol>('dueno'); const [cargando, setC] = useState(false); const [err, setErr] = useState('')
  const entrar = async (m: Usuario['metodo']) => {
    const e = m === 'correo' ? email.trim() : (rol === 'dueno' ? 'katherine@ejemplo.cr' : 'inquilino@ejemplo.cr')
    if (m === 'correo' && !/^\S+@\S+\.\S+$/.test(e)) { setErr('Escribí un correo válido.'); return }
    setC(true); onOk(await auth.login(e, m, rol))
  }
  return <main className="cont cont--form" style={{ paddingTop: 32, paddingBottom: 48 }}>
    <img src="/img/logo-lockumi.svg" alt="Lockumi" style={{ height: 36, marginBottom: 24 }} />
    <div className="glass glass--fuerte tarjeta pila">
      <div className="ok"><Escudo /><div><h1 style={{ fontSize: 28 }}>Entrá a Lockumi</h1><p className="nota">Tu depósito, protegido y claro para ambas partes.</p></div></div>
      <p className="nota">Sin billeteras ni frases secretas: entrás con tu correo o tu cuenta de siempre. <Demo /></p>
      <div><span className="etiqueta">Entrar como (demo)</span>
        <div className="roles" role="group" style={{ display:'flex', marginTop: 6 }}>
          <button style={{ flex:1 }} aria-pressed={rol==='dueno'} onClick={() => setRol('dueno')}>Dueño</button>
          <button style={{ flex:1 }} aria-pressed={rol==='inquilino'} onClick={() => setRol('inquilino')}>Inquilino</button>
        </div></div>
      <div className="social">
        <button className="boton boton--secundario boton--ancho" disabled={cargando} onClick={() => entrar('google')}>Continuar con Google</button>
        <button className="boton boton--secundario boton--ancho" disabled={cargando} onClick={() => entrar('apple')}>Continuar con Apple</button>
      </div>
      <div className="sep">o con tu correo</div>
      <label className="campo"><span>Correo electrónico</span><input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }} placeholder="nombre@correo.com" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="boton boton--primario boton--ancho" disabled={cargando} onClick={() => entrar('correo')}>{cargando ? 'Entrando…' : 'Recibir enlace de acceso'}</button>
    </div>
  </main>
}
