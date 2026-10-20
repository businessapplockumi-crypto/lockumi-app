import { describe, it, expect } from 'vitest'
import terminos from '../terminos.md?raw'
import { aHtml } from '../markdown'

describe('notas internas para Legal', () => {
  it('no se muestran en la página y no cortan el párrafo', () => {
    const h = aHtml('a) uno\n<!-- CAMBIO · antes: «x» -->\nb) dos\n<!-- FIN -->\n')
    expect(h).not.toMatch(/CAMBIO|FIN|&lt;!--/); expect(h).toMatch(/uno[\s\S]*dos/)
  })
  it('términos 1.5 2.2 d): 50 000 con USDC propio y 20 con el USDC que da Lockumi', () => {
    const h = aHtml(terminos)
    expect(h).toContain('<strong>máximo técnico de 50 000 USDC de prueba</strong> por contrato'); expect(h).toContain('el máximo es de <strong>20 USDC de prueba</strong> (cláusula 5.5)'); expect(h).not.toMatch(/CAMBIO|REVISIÓN DE LEGAL/)
  })
})
