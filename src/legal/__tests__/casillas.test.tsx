import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// localStorage mínimo para el entorno de pruebas (node)
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { erroresTrasCambio, ERRORES_INICIALES, validarAceptaciones, guardarAceptacion, leerAceptacion, aceptoVersion, conAceptacion, K_ACEPTACION, MSJ_SIN_TERMINOS, MSJ_SIN_PRIVACIDAD } = await import('../aceptacion')
const { TERMINOS, PRIVACIDAD, DOCS, rutaLegal, CONSENTIMIENTO_PRIVACIDAD, leerDoc } = await import('../documentos')
const { PaginaLegal } = await import('../PaginaLegal')
const { Login } = await import('../../screens/Login')
const { aHtml } = await import('../markdown')

beforeEach(() => mem.clear())

describe('casillas obligatorias de Términos y Privacidad', () => {
  it('sin marcar ninguna no se puede continuar y el error explica qué hacer', () => {
    const e = validarAceptaciones({ terminos: false, privacidad: false })
    expect(e.terminos).toBe(MSJ_SIN_TERMINOS); expect(e.privacidad).toBe(MSJ_SIN_PRIVACIDAD)
    expect(e.terminos).toMatch(/marca la casilla «Acepto los Términos y condiciones»/)
  })
  it('con una sola marcada tampoco se puede continuar', () => {
    expect(validarAceptaciones({ terminos: true, privacidad: false })).toEqual({ privacidad: MSJ_SIN_PRIVACIDAD })
    expect(validarAceptaciones({ terminos: false, privacidad: true })).toEqual({ terminos: MSJ_SIN_TERMINOS })
  })
  it('con las dos marcadas se puede continuar', () => { expect(validarAceptaciones({ terminos: true, privacidad: true })).toEqual({}) })

  it('al cargar la pantalla no hay errores visibles', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(ERRORES_INICIALES).toEqual({})
    expect(html).not.toContain('casilla-legal__error'); expect(html).not.toContain('casilla-legal--error')
    expect(html).not.toContain('role="alert"'); expect(html).not.toContain('aria-invalid="true"')
    expect(html).not.toContain(MSJ_SIN_TERMINOS); expect(html).not.toContain(MSJ_SIN_PRIVACIDAD)
  })
  it('tras tocar Entrar sin marcar, al marcar una casilla desaparece solo su error', () => {
    const e = validarAceptaciones({ terminos: false, privacidad: false })
    const e2 = erroresTrasCambio(e, 'terminos', true)
    expect(e2).toEqual({ privacidad: MSJ_SIN_PRIVACIDAD })
    expect(erroresTrasCambio(e2, 'privacidad', true)).toEqual({})
    expect(erroresTrasCambio({}, 'terminos', false)).toEqual({}) // desmarcar no muestra errores; solo "Entrar" los muestra
  })
  it('la pantalla de entrada muestra las dos casillas sin marcar, obligatorias y con sus enlaces', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*id="acepto-terminos"[^>]*required=""/)
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*id="acepto-privacidad"[^>]*required=""/)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/)
    expect(html).toContain('Acepto los <a href="/terminos" target="_blank" rel="noopener">Términos y condiciones</a>')
    expect(html).toContain('<a href="/privacidad" target="_blank" rel="noopener">Aviso de privacidad de la app</a>')
  })
  it('si ya aceptó estas versiones, las casillas aparecen marcadas; con otra versión, no', () => {
    guardarAceptacion('terminos', TERMINOS.version); guardarAceptacion('privacidad', PRIVACIDAD!.version)
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toMatch(/id="acepto-terminos"[^>]*checked/)
    guardarAceptacion('terminos', 'otra-version')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).not.toMatch(/id="acepto-terminos"[^>]*checked/)
  })
  it('guarda cada aceptación con versión y fecha, y la copia al usuario', () => {
    const f = new Date('2026-10-17T20:30:00Z')
    guardarAceptacion('terminos', '1.0-demo', f); guardarAceptacion('privacidad', '1.0-demo', f)
    expect(JSON.parse(mem.get(K_ACEPTACION.terminos)!)).toEqual({ version: '1.0-demo', fecha: '2026-10-17T20:30:00.000Z' })
    expect(leerAceptacion('privacidad')).toEqual({ version: '1.0-demo', fecha: '2026-10-17T20:30:00.000Z' })
    expect(aceptoVersion('terminos', '1.0-demo')).toBe(true); expect(aceptoVersion('terminos', '2.0')).toBe(false)
    const u = conAceptacion({ email: 'a@b.cr', nombre: 'a', metodo: 'correo' })
    expect(u.terminos?.version).toBe('1.0-demo'); expect(u.privacidad?.fecha).toBe('2026-10-17T20:30:00.000Z')
  })
})

describe('textos legales', () => {
  // LEGAL: revisado (24/10) · Términos 1.6-demo (cláusula 6.7); el Aviso de privacidad sigue en 1.5-demo.
  const VER: Record<string, [string, string]> = { terminos: ['1.6-demo', '24 de octubre de 2026'], privacidad: ['1.5-demo', '20 de octubre de 2026'] }
  it('carga Términos 1.6-demo y Privacidad 1.5-demo con su fecha, tomadas del texto', () => {
    for (const d of [TERMINOS, PRIVACIDAD!]) { expect(d.version).toBe(VER[d.slug][0]); expect(d.fecha).toBe(VER[d.slug][1]); expect(d.metaEnTexto).toBe(true) }
    expect(Object.keys(DOCS).sort()).toEqual(['privacidad', 'terminos'])
  })
  it('la página muestra la versión y la fecha una sola vez, y el aviso de una línea de arriba', () => {
    for (const slug of ['terminos', 'privacidad']) {
      const html = renderToStaticMarkup(<PaginaLegal slug={slug} />)
      expect(html.split(VER[slug][0]).length - 1).toBe(1); if (slug === 'terminos') expect(html).not.toContain('1.5-demo'); expect(html).not.toContain('1.4-demo'); expect(html).not.toContain('1.3-demo'); expect(html).not.toContain('1.2-demo'); expect(html).not.toContain('1.1-demo')
      expect(html.split(VER[slug][1]).length - 1).toBe(1)
      expect(html).toMatch(/<blockquote><p>Versión demo[^<]*\. Este texto puede actualizarse; te avisaremos de los cambios importantes\.<\/p><\/blockquote>/)
      expect(html).toContain('Pendiente de revisión por abogado')
    }
  })
  it('la nota interna no se publica', () => { for (const d of [TERMINOS, PRIVACIDAD!]) expect(d.html).not.toMatch(/nota interna/i) })
  it('los textos legales no traen corchetes ni repiten la línea de versión', () => {
    for (const d of [TERMINOS, PRIVACIDAD!]) {
      const crudo = renderToStaticMarkup(<PaginaLegal slug={d.slug} />).replace(/<[^>]+>/g, '')
      expect(crudo).not.toMatch(/[\[\]]/)
      expect(crudo.match(/Versión \d/g)?.length).toBe(1)
    }
  })
  it('el consentimiento de privacidad es un texto fijo de la app', () => {
    const c = CONSENTIMIENTO_PRIVACIDAD
    expect(c.antes + c.enlace + c.despues).toBe('Acepto el Aviso de privacidad de la app y autorizo que Lockumi trate mis datos y los transfiera a Supabase, Vercel, Cavos y Trustless Work, dentro y fuera de Costa Rica, para usar la demo. Entiendo que la demo funciona en la red de prueba de Stellar, con tokens sin valor y sin dinero real, y que la dirección de mi billetera, los montos y las fechas quedan registrados en esa red, que es pública y no se puede borrar.')
  })
  it('una aceptación de la versión 1.3-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.3-demo'); guardarAceptacion('privacidad', '1.3-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('las dos casillas guardan { version, fecha }: Términos 1.6-demo y Privacidad 1.5-demo', () => {
    const ahora = new Date('2026-10-18T18:00:00Z')
    expect(guardarAceptacion('terminos', TERMINOS.version, ahora)).toEqual({ version: '1.6-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(guardarAceptacion('privacidad', PRIVACIDAD!.version, ahora)).toEqual({ version: '1.5-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(JSON.parse(localStorage.getItem('lockumi.privacidad.consentimiento')!)).toEqual({ version: '1.5-demo', fecha: '2026-10-18T18:00:00.000Z' })
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(true)
  })
  it('una aceptación de Términos 1.5-demo ya no cuenta: la casilla de Términos sale sin marcar; la de privacidad 1.5-demo sigue marcada', () => {
    guardarAceptacion('terminos', '1.5-demo'); guardarAceptacion('privacidad', '1.5-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(true)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('6.7 Desacuerdo: texto de Legal (24/10); la mediación no decide y no hay persona mediadora que decida en la demo', () => {
    const t = TERMINOS.html.replace(/<[^>]+>/g, '')
    expect(t).toContain('6.7 Desacuerdo. En la demo, si el inquilino no acepta el reclamo, el caso pasa a una mediación simulada y el reparto se elige con el botón «Resolver el reclamo (simulación)». En un servicio real, una persona mediadora neutral les ayudaría a buscar un acuerdo, sin decidir por las partes. Si no hay acuerdo, el depósito seguiría guardado y cualquiera de las partes podría acudir a los tribunales de Costa Rica.')
    expect(t).not.toContain('decide un reparto'); expect(TERMINOS.html).not.toContain('LEGAL:')
  })
  // LEGAL: revisado (24/10) · ronda 3: 4.1 a) con el texto de Legal; 5.3 sin cambios (ver docs/alertas.md, «Legal, ronda 3»).
  it('4.1 a) ronda 3 de Legal: el escrow y el reparto de Lockumi si hay reclamo; 5.3 Cavos no cambia', () => {
    const t = TERMINOS.html.replace(/<[^>]+>/g, '')
    expect(t).toContain('tú firmas el depósito con tu billetera. Lockumi no guarda tus tokens de prueba en una cuenta propia: quedan en un contrato de escrow en la red de prueba. Si hay un reclamo, la cuenta de Lockumi puede ejecutar el reparto.')
    expect(t).not.toContain('Lockumi no custodia tus tokens de prueba')
    expect(t).toContain('ni Cavos ni Lockumi pueden firmar por ti ni mover tus fondos')
    expect(TERMINOS.version).toBe('1.6-demo'); expect(TERMINOS.html).not.toContain('LEGAL:')
    expect(renderToStaticMarkup(<Login onOk={() => {}} />)).toContain('Ni el dueño ni el inquilino pueden liberarlo solos.')
  })
  it('una aceptación de la versión 1.2-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.2-demo'); guardarAceptacion('privacidad', '1.2-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('la casilla de privacidad muestra el consentimiento completo con el enlace al aviso', () => {
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).toContain('<a href="/privacidad" target="_blank" rel="noopener">Aviso de privacidad de la app</a>' + CONSENTIMIENTO_PRIVACIDAD.despues)
  })
  it('una aceptación de la versión 1.1-demo no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.1-demo'); guardarAceptacion('privacidad', '1.1-demo')
    expect(aceptoVersion('terminos', TERMINOS.version)).toBe(false); expect(aceptoVersion('privacidad', PRIVACIDAD!.version)).toBe(false)
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('una aceptación de la versión anterior (1.0-demo) no cuenta: las casillas salen sin marcar', () => {
    guardarAceptacion('terminos', '1.0-demo'); guardarAceptacion('privacidad', '1.0-demo')
    const html = renderToStaticMarkup(<Login onOk={() => {}} />)
    expect(html).not.toMatch(/id="acepto-terminos"[^>]*checked/); expect(html).not.toMatch(/id="acepto-privacidad"[^>]*checked/)
  })
  it('rutas', () => { expect(rutaLegal('/terminos')).toBe('terminos'); expect(rutaLegal('/terminos/')).toBe('terminos'); expect(rutaLegal('/privacidad')).toBe('privacidad'); expect(rutaLegal('/')).toBe(null); expect(rutaLegal('/crear')).toBe(null) })
  it('metadatos y Markdown', () => {
    expect(leerDoc('x', '---\nversion: 2\nfecha: 2026-10-17\n---\n# T').version).toBe('2')
    expect(aHtml('# Hola <b>\n- a\n  - b\n- c')).toBe('<h2 id="hola-b">Hola &lt;b&gt;</h2>\n<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>')
    expect(aHtml('[x](javascript:alert(1))')).toContain('href="#"')
  })
})
