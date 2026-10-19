import { describe, it, expect } from 'vitest'
import terminos from '../terminos.md?raw'
import { aHtml } from '../markdown'

describe('notas internas para Legal', () => {
  it('no se muestran en la página y no cortan el párrafo', () => {
    const h = aHtml('a) uno\n<!-- CAMBIO · antes: «x» -->\nb) dos\n<!-- FIN -->\n')
    expect(h).not.toMatch(/CAMBIO|FIN|&lt;!--/); expect(h).toMatch(/uno[\s\S]*dos/)
  })
  it('términos 2.2 d): el tope de 20 es solo para los USDC del botón de Lockumi', () => {
    const h = aHtml(terminos)
    expect(h).toContain('cuando los USDC de prueba se obtienen con el botón «Obtener USDC de prueba» de Lockumi'); expect(h).not.toMatch(/CAMBIO|REVISIÓN DE LEGAL/)
  })
})
