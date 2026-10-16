import { useEffect, useState } from 'react'
import { auth } from './services/auth'
import { olvidarBilletera } from './services/billetera'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login } from './screens/Login'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash()
  // Regreso del login con Google/Apple (solo en modo real con VITE_CAVOS_APP_ID)
  useEffect(() => { auth.completarRegreso().then(x => { if (x) { setU(x); location.hash = '/' } }).catch(() => {}) }, [])
  const skip = <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
  if (!u) return <Fondo>{skip}<Login onOk={x => { setU(x); location.hash = '/' }} /></Fondo>
  const m = r.match(/^\/alquiler\/(.+)$/)
  return <Fondo>{skip}
    <Barra u={u} onSalir={() => { auth.salir(); olvidarBilletera(); setU(null) }} />
    {r === '/crear' ? <Crear u={u} /> : m ? <Detalle id={m[1]} u={u} /> : <Inicio u={u} />}
  </Fondo>
}
