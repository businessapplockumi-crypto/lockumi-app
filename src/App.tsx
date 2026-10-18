import { useEffect, useState } from 'react'
import { auth, guardarUsuario } from './services/auth'
import type { Usuario } from './types'
import { conAceptacion } from './legal/aceptacion'
import { rutaLegal } from './legal/documentos'
import { PaginaLegal } from './legal/PaginaLegal'
import { Pie } from './legal/Pie'
import { olvidarBilletera } from './services/billetera'
import { Aviso } from './Aviso'
import { modoReal } from './services/auth'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login } from './screens/Login'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
import { Invitacion } from './screens/Invitacion'
const volver = () => { const v = sessionStorage.getItem('lockumi.regreso'); sessionStorage.removeItem('lockumi.regreso'); return v ?? '/' }
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash(); const [bienvenida, setBienvenida] = useState(false)
  // Al entrar, la aceptación de los Términos (guardada al marcar la casilla) se copia al usuario.
  const entro = (x: Usuario) => { setU(guardarUsuario(conAceptacion(x))); setBienvenida(true); location.hash = volver() }
  // Regreso del login con Google/Apple (solo en modo real con VITE_CAVOS_APP_ID)
  useEffect(() => { auth.completarRegreso().then(x => { if (x) entro(x) }).catch(() => {}) }, [])
  const skip = <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
  // Textos legales: /terminos (ruta real, con reescritura en vercel.json) o #/terminos. Se ven con o sin sesión.
  const legal = rutaLegal(location.pathname) ?? rutaLegal(r)
  if (legal) return <Fondo>{skip}<PaginaLegal slug={legal} /><Pie /></Fondo>
  // Si llegó por un link de invitación, se vuelve ahí después de entrar (también tras el regreso de Google o Apple).
  if (!u && r.startsWith('/invitacion/')) sessionStorage.setItem('lockumi.regreso', r)
  if (!u) return <Fondo>{skip}<Login onOk={entro} /><Pie /></Fondo>
  const m = r.match(/^\/alquiler\/(.+)$/)
  const inv = r.match(/^\/invitacion\/([0-9a-f-]{36})\/([0-9a-f]{64})$/)
  return <Fondo>{skip}
    <Barra u={u} onSalir={() => { auth.salir(); olvidarBilletera(); setU(null) }} />
    {bienvenida && <Aviso titulo="¡Ingresaste correctamente!" onCerrar={() => setBienvenida(false)}>
      <p>{modoReal ? 'Estamos preparando tu billetera.' : 'Te damos la bienvenida a la demo.'} Desde aquí puedes ver tus alquileres y crear un depósito protegido.</p>
    </Aviso>}
    {r === '/crear' ? <Crear u={u} /> : inv ? <Invitacion id={inv[1]} token={inv[2]} u={u} /> : m ? <Detalle id={m[1]} u={u} /> : <Inicio u={u} />}
    <Pie />
  </Fondo>
}

