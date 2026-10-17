import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// localStorage mínimo para el entorno de pruebas (node)
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })

const { erroresTrasCambio, ERRORES_INICIALES, validarAceptaciones, guardarAceptacion, leerAceptacion, aceptoVersion, conAceptacion, K_ACEPTACION, MSJ_SIN_TERMINOS, MSJ_SIN_PRIVACIDAD } = await import('../aceptacion')
const { TERMINOS, PRIVACIDAD, DOCS, rutaLegal, consentimientoPrivacidad, leerDoc } = await import('../documentos')
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
  it('carga Términos y Privacidad con versión y fecha', () => {
    expect(TERMINOS.version).toBe('1.0-demo'); expect(TERMINOS.fecha).toBe('17 de octubre de 2026')
    expect(PRIVACIDAD?.version).toBe('1.0-demo'); expect(PRIVACIDAD?.fecha).toBe('17 de octubre de 2026')
    expect(Object.keys(DOCS).sort()).toEqual(['privacidad', 'terminos'])
  })
  it('la nota interna no se publica', () => { expect(PRIVACIDAD!.html).not.toMatch(/Nota interna/) })
  it('mantiene la marca de revisión por abogado', () => { expect(TERMINOS.html).toMatch(/PENDIENTE DE REVISIÓN POR ABOGADO/); expect(PRIVACIDAD!.html).toMatch(/PENDIENTE DE REVISIÓN POR ABOGADO/) })
  it('el consentimiento se toma de privacidad.md', () => {
    const c = consentimientoPrivacidad()!
    expect(c.antes).toBe('Acepto el '); expect(c.enlace).toBe('Aviso de privacidad de la app')
    expect(c.despues).toMatch(/^ y autorizo que Lockumi trate mis datos y los transfiera a Supabase, Vercel, Cavos y Trustless Work, dentro y fuera de Costa Rica/)
  })
  it('rutas', () => { expect(rutaLegal('/terminos')).toBe('terminos'); expect(rutaLegal('/terminos/')).toBe('terminos'); expect(rutaLegal('/privacidad')).toBe('privacidad'); expect(rutaLegal('/')).toBe(null); expect(rutaLegal('/crear')).toBe(null) })
  it('metadatos y Markdown', () => {
    expect(leerDoc('x', '---\nversion: 2\nfecha: 2026-10-17\n---\n# T').version).toBe('2')
    expect(aHtml('# Hola <b>\n- a\n  - b\n- c')).toBe('<h2 id="hola-b">Hola &lt;b&gt;</h2>\n<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>')
    expect(aHtml('[x](javascript:alert(1))')).toContain('href="#"')
  })
})
