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

/** Aviso v2 (sin librerías): tarjeta crema pequeña con la casita completa de Lockumi en una esquina de color.
 *  Tonos: paso (miel), logro (verde; la llave entra y gira una vez, como en el logo) y error (terracota).
 *  No se cierra solo (tampoco los errores): se cierra con la X o con Esc.
 *  Accesible: role="dialog" (o "alertdialog" en errores) no modal, con título y descripción enlazados; el foco va a la X
 *  y al cerrar vuelve a donde estaba. Si la persona está escribiendo, no le quitamos el foco: el aviso se anuncia por aria-live. */
export function Aviso({ tono = 'paso', titulo, children, onCerrar }:
  { tono?: Tono; titulo: string; children: ReactNode; onCerrar: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  const [lugar, setLugar] = useState<{ top?: number }>({})
  const [voz, setVoz] = useState('')
  const ref = useRef<HTMLDivElement>(null); const id = useId()
  const saliendoRef = useRef(false); const onCerrarRef = useRef(onCerrar)
  useEffect(() => { onCerrarRef.current = onCerrar })
  const cerrar = () => {
    if (saliendoRef.current) return; saliendoRef.current = true; setSaliendo(true)
    setTimeout(() => onCerrarRef.current(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200)
  }
  const cerrarRef = useRef(cerrar); useEffect(() => { cerrarRef.current = cerrar })
  useLayoutEffect(() => {
    const poner = () => setLugar(lugarEnCelular()); poner()
    // Otra vez cuando la pantalla nueva ya está dibujada (por ejemplo, al pasar de «Nuevo alquiler» al alquiler creado)
    // y cuando la página se desplaza (la app sube al paso nuevo): el aviso acompaña al título sin taparlo.
    let cuadro = 0
    const luego = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(poner) }
    luego(); const t = setTimeout(poner, 350)
    addEventListener('resize', luego); addEventListener('hashchange', luego); addEventListener('scroll', luego, { passive: true })
    return () => { cancelAnimationFrame(cuadro); clearTimeout(t); removeEventListener('resize', luego); removeEventListener('hashchange', luego); removeEventListener('scroll', luego) }
  }, [])
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null, nodo = ref.current
    const escribiendo = !!prev?.matches?.('input:not([type=checkbox]):not([type=radio]),textarea,select,[contenteditable="true"]')
    if (escribiendo) setVoz(nodo?.querySelector('.aviso-pop__titulo')?.textContent + '. ' + (nodo?.querySelector('.aviso-pop__texto')?.textContent ?? ''))
    else nodo?.querySelector<HTMLElement>('.aviso-pop__x')?.focus()
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); cerrarRef.current() } }
    addEventListener('keydown', k)
    return () => {
      removeEventListener('keydown', k)
      const dentro = !document.activeElement || document.activeElement === document.body || nodo?.contains(document.activeElement)
      if (!dentro) return
      if (prev && prev !== document.body && prev.isConnected) prev.focus()
      else document.getElementById('contenido')?.focus()
    }
  }, [])
  return <div className={'aviso-capa' + (saliendo ? ' aviso-capa--sale' : '')} style={lugar.top != null ? { top: lugar.top, bottom: 'auto' } : undefined}>
    <div ref={ref} className={'aviso-pop aviso-pop--' + tono} role={tono === 'error' ? 'alertdialog' : 'dialog'} aria-modal="false" aria-labelledby={id + 't'} aria-describedby={id + 'd'}>
      <div className="aviso-pop__esquina"><LogoAviso /></div>
      <div className="aviso-pop__cuerpo">
        <h2 id={id + 't'} className="aviso-pop__titulo">{titulo}</h2>
        <div id={id + 'd'} className="aviso-pop__texto">{children}</div>
      </div>
      <button type="button" className="aviso-pop__x" aria-label="Cerrar aviso" onClick={cerrar}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>
    <p className="aviso-capa__voz" aria-live={tono === 'error' ? 'assertive' : 'polite'}>{voz}</p>
  </div>
}
