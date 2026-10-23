import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LogoAviso } from './LogoAviso'

export type Tono = 'paso' | 'logro' | 'error'

/** En celular el aviso va arriba, debajo del encabezado, del logo y del título de la pantalla (no los tapa).
 *  Si eso lo dejaría muy abajo, va al pie. En escritorio va abajo a la derecha (solo CSS). */
function lugarEnCelular(): { top?: number } {
  if (matchMedia('(min-width:720px)').matches) return {}
  const fondo = (e: Element | null | undefined) => { const r = e?.getBoundingClientRect(); return r && r.height && r.bottom > 0 ? r.bottom : 0 }
  const h1 = document.querySelector('#contenido h1, main h1')
  const debajo = Math.max(fondo(document.querySelector('.aviso-red')), fondo(document.querySelector('header.barra')), fondo(h1?.closest('.cab') ?? h1),
    fondo(document.querySelector('.entrada-app__titulo')))   // entrada: logo grande, arte y título
  const top = Math.round(debajo + 10)
  return top < innerHeight * 0.55 ? { top } : {}
}

/** Tiempo que se ve cada aviso antes de esconderse solo. */
export const DURACION_AVISO = 5000

/** Aviso v2 (sin librerías): tarjeta crema pequeña con la casita completa de Lockumi en una esquina de color.
 *  Tonos: paso (miel), logro (verde; la llave entra y gira una vez, como en el logo) y error (terracota).
 *  Se esconde solo a los 5 s. También se cierra al tocarlo o hacer clic, con Enter, Espacio o Esc.
 *  Si el dedo o el mouse está encima, o tiene el foco, el conteo se pausa y se reanuda al salir.
 *  No es un diálogo y no roba el foco: se anuncia desde la zona `role="status"` (o `role="alert"` en errores)
 *  de <Alertas />. Se puede enfocar con Tab (pausa) y, al cerrarlo, el foco vuelve a donde estaba. */
export function Aviso({ tono = 'paso', titulo, children, onCerrar }:
  { tono?: Tono; titulo: string; children: ReactNode; onCerrar: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  const [lugar, setLugar] = useState<{ top?: number }>({})
  const [pausa, setPausa] = useState(false)
  const ref = useRef<HTMLDivElement>(null), capa = useRef<HTMLDivElement>(null); const id = useId()
  const saliendoRef = useRef(false); const onCerrarRef = useRef(onCerrar)
  const antesDelFoco = useRef<HTMLElement | null>(null)
  useEffect(() => { onCerrarRef.current = onCerrar })
  const cerrar = () => {
    if (saliendoRef.current) return; saliendoRef.current = true; setSaliendo(true)
    const nodo = ref.current
    if (nodo?.contains(document.activeElement)) {   // tenía el foco: vuelve a donde estaba
      const v = antesDelFoco.current
      if (v && v !== document.body && v.isConnected) v.focus(); else document.getElementById('contenido')?.focus()
    }
    setTimeout(() => onCerrarRef.current(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200)
  }
  const cerrarRef = useRef(cerrar); useEffect(() => { cerrarRef.current = cerrar })
  // Conteo de 5 s que se pausa (dedo o mouse encima, o foco) y sigue donde quedó.
  const encima = useRef(false), conFoco = useRef(false), queda = useRef(DURACION_AVISO), desde = useRef(0), reloj = useRef(0)
  const revisar = () => {
    const pausar = encima.current || conFoco.current
    if (pausar && reloj.current) { clearTimeout(reloj.current); reloj.current = 0; queda.current -= Date.now() - desde.current }
    if (!pausar && !reloj.current) { desde.current = Date.now(); reloj.current = window.setTimeout(() => cerrarRef.current(), Math.max(0, queda.current)) }
    setPausa(pausar)
  }
  const revisarRef = useRef(revisar); useEffect(() => { revisarRef.current = revisar })
  useEffect(() => { revisarRef.current(); return () => { clearTimeout(reloj.current); reloj.current = 0 } }, [])   // (en StrictMode el efecto corre dos veces)
  useLayoutEffect(() => {
    // Se escribe también directo en la tarjeta para que el cuadro que se dibuja ya la tenga en su lugar
    // (por ejemplo, cuando la página salta arriba al cambiar de paso); el estado queda igual para React.
    const poner = () => { const n = lugarEnCelular(), c = capa.current
      if (c) { if (n.top != null) { c.style.top = n.top + 'px'; c.style.bottom = 'auto' } else c.removeAttribute('style') }
      setLugar(v => v.top === n.top ? v : n) }
    // Otra vez cuando la pantalla nueva ya está dibujada (por ejemplo, al pasar de «Nuevo alquiler» al alquiler creado)
    // y cuando la página se desplaza (la app sube al paso nuevo): el aviso acompaña al título sin taparlo.
    let cuadro = 0
    const luego = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(poner) }
    poner(); luego(); const t = setTimeout(poner, 350)
    addEventListener('resize', luego); addEventListener('hashchange', luego); addEventListener('scroll', poner, { passive: true })
    // También cuando el contenido cambia de tamaño o se agrega algo encima del título (por ejemplo, una línea
    // «El dueño de prueba confirmó…»): el título baja y el aviso baja con él.
    const tam = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(poner)
    const vigilar = () => { if (!tam) return; tam.disconnect()
      for (const e of [document.querySelector('.aviso-red'), document.querySelector('header.barra'), document.getElementById('contenido'),
        document.querySelector('#contenido h1, main h1')?.closest('.cab') ?? document.querySelector('#contenido h1, main h1'), document.querySelector('.entrada-app__titulo')]) if (e) tam.observe(e) }
    vigilar()
    const cambios = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { vigilar(); luego() })
    cambios?.observe(document.getElementById('contenido') ?? document.body, { childList: true, subtree: true, characterData: true })
    return () => { cancelAnimationFrame(cuadro); clearTimeout(t); tam?.disconnect(); cambios?.disconnect()
      removeEventListener('resize', luego); removeEventListener('hashchange', luego); removeEventListener('scroll', poner) }
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarRef.current() }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  const poner = (campo: typeof encima, v: boolean) => { campo.current = v; revisar() }
  return <div ref={capa} className={'aviso-capa' + (saliendo ? ' aviso-capa--sale' : '')} style={lugar.top != null ? { top: lugar.top, bottom: 'auto' } : undefined}>
    <div ref={ref} className={'aviso-pop aviso-pop--' + tono + (pausa ? ' aviso-pop--pausa' : '')} role="group" tabIndex={0}
      aria-label="Aviso. Toca para cerrar" aria-describedby={id + 't ' + id + 'd'}
      onClick={cerrar}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); cerrar() } }}
      onPointerEnter={() => poner(encima, true)} onPointerLeave={() => poner(encima, false)}
      onPointerDown={() => poner(encima, true)} onPointerCancel={() => poner(encima, false)}
      onFocus={e => { antesDelFoco.current = e.relatedTarget as HTMLElement | null; poner(conFoco, true) }} onBlur={() => poner(conFoco, false)}>
      <div className="aviso-pop__esquina"><LogoAviso /></div>
      <div className="aviso-pop__cuerpo">
        <h2 id={id + 't'} className="aviso-pop__titulo">{titulo}</h2>
        <div id={id + 'd'} className="aviso-pop__texto">{children}</div>
      </div>
      <span className="aviso-pop__tiempo" aria-hidden="true" style={{ animationDuration: DURACION_AVISO + 'ms' }} />
    </div>
  </div>
}
