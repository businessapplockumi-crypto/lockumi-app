import { useState } from 'react'
import { auth } from './services/auth'
import { useHash } from './router'
import { Barra, Fondo } from './ui'
import { Login } from './screens/Login'
import { Inicio } from './screens/Inicio'
import { Crear } from './screens/Crear'
import { Detalle } from './screens/Detalle'
import type { Rol } from './types'
export default function App() {
  const [u, setU] = useState(auth.actual()); const r = useHash()
  const skip = <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus() }}>Saltar al contenido</a>
  if (!u) return <Fondo>{skip}<Login onOk={x => { setU(x); location.hash = '/' }} /></Fondo>
  const onRol = (x: Rol) => setU({ ...auth.cambiarRol(x)! })
  const m = r.match(/^\/alquiler\/(.+)$/)
  return <Fondo>{skip}
    <Barra u={u} onRol={onRol} onSalir={() => { auth.salir(); setU(null) }} />
    {r === '/crear' ? <Crear u={u} onRol={onRol} /> : m ? <Detalle id={m[1]} rol={u.rol} onRol={onRol} /> : <Inicio u={u} />}
  </Fondo>
}
