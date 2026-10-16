import { useEffect, useState } from 'react'
import './logo-landing.css'
import { LOGO_LANDING_HTML } from './logoLandingMarkup'
/** Arte animado de la portada de lockumi.com, copiado literal (markup + CSS).
 *  La landing pone `.js` y luego `.listo` en <html>; aquí van en un contenedor propio. */
export function LogoAnimado({ className = '' }: { className?: string }) {
  const [listo, setListo] = useState(false)
  useEffect(() => { let b = 0; const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setListo(true)) }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b) } }, [])
  // Lienzo fijo de 420px (tamaño del hero de lockumi.com en escritorio) escalado como un solo bloque.
  return <div className={'logo-escala ' + className}>
    <div className={'logo-escala__lienzo js' + (listo ? ' listo' : '') + ' logo-animado'}>
      <div className="portada__arte" aria-hidden="true" dangerouslySetInnerHTML={{ __html: LOGO_LANDING_HTML }} />
    </div>
  </div>
}
