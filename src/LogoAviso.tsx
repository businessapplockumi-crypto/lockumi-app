import { LOGO_LANDING_HTML } from './logoLandingMarkup'

/** Casita oficial de Lockumi (la misma del logo animado de lockumi.com) para el ícono de los avisos.
 *  Se toma del markup literal del logo: mismo viewBox, sin recortes (overflow visible) y con ids propios
 *  para no chocar con el logo de la pantalla. La llave tiene su clase para animarla en los logros. */
const inicio = LOGO_LANDING_HTML.indexOf('<svg class="casita-hero"')
export const CASITA_AVISO_SVG = LOGO_LANDING_HTML.slice(inicio, LOGO_LANDING_HTML.indexOf('</svg>', inicio) + 6)
  .replace(/casa-(clip|luz|brillo)/g, 'aviso-casa-$1')
  .replace(/casita-hero/g, 'aviso-logo')
  .replace(/ width="340" height="330"/, ' aria-hidden="true" overflow="visible"')
  .replace(/>\s+</g, '><')

export function LogoAviso() {
  return <span className="aviso-pop__logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: CASITA_AVISO_SVG }} />
}
