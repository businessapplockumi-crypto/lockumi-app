import { useState } from 'react'
import { auth } from './services/auth'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login } from './screens/Login'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash()
  if (!u) return <Fondo><Login onOk={x => { setU(x); location.hash = '/' }} /></Fondo>
  const m = r.match(/^\/alquiler\/(.+)$/)
  return <Fondo>
    <Barra u={u} onRol={x => setU({ ...auth.cambiarRol(x)! })} onSalir={() => { auth.salir(); setU(null) }} />
    {r === '/crear' ? <Crear u={u} /> : m ? <Detalle id={m[1]} /> : <Inicio u={u} />}
  </Fondo>
}
