import { hayPrivacidad } from './documentos'

/** Pie con los enlaces legales. "Privacidad" aparece solo cuando existe `src/legal/privacidad.md`. */
export const Pie = () => <footer className="cont pie-legal">
  <nav aria-label="Enlaces legales">
    <a href="/terminos">Términos y condiciones</a>
    {hayPrivacidad && <a href="/privacidad">Privacidad</a>}
  </nav>
</footer>
