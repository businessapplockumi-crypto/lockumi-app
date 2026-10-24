// LEGAL: revisado (24/10) · ronda 5: el plazo que se muestra es el real del alquiler ({plazo}), no «7 días» fijo.
import { describe, it, expect } from 'vitest'
import { turno, ahoraPrueba, textoPlazo } from '../flujo'
import { textoPlazo as desdeAcciones } from '../acciones'

const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const detalle = leer('../screens/Detalle.tsx'), terminos = leer('../legal/terminos.md'), contrato = leer('../screens/ContratoDoc.tsx')
const alq = (estado: string, ventanaSegundos?: number) => ({ estado, ventanaSegundos, contrato: { firmas: {} }, entrada: { firmas: {} }, salida: { firmas: {} } }) as never

describe('Plazo real en la app', () => {
  it('textoPlazo sigue disponible desde acciones (mismo valor que el encabezado)', () => {
    expect(desdeAcciones({ ventanaSegundos: 300 })).toBe('5 minutos'); expect(textoPlazo({})).toBe('7 días')
  })
  it('«Te toca / Qué sigue» usa el plazo configurado', () => {
    expect(turno(alq('ventana_reclamo', 300), 'dueno').sigue).toBe('Si no reclamas, después de 5 minutos el depósito se devuelve al inquilino.')
    expect(turno(alq('ventana_reclamo', 300), 'inquilino').sigue).toBe('Si no hay reclamo, después de 5 minutos se te devuelve el depósito.')
    expect(turno(alq('salida', 300), 'dueno').sigue).toBe('Después hay 5 minutos para reclamos. Si no hay reclamo, después de ese plazo el depósito se devuelve al inquilino.')
    expect(ahoraPrueba(alq('ventana_reclamo', 300))).toMatch(/^Ahora: corren los 5 minutos para reclamos\./)
    expect(turno(alq('ventana_reclamo'), 'inquilino').sigue).toContain('después de 7 días')
  })
  it('Detalle: sin «7 días» fijo, sin «a. m..», etiquetas de prueba correctas', () => {
    expect(detalle).not.toMatch(/7 días/)
    expect(detalle).not.toMatch(/\{fechaHora\(fin\)\}\./)
    expect(detalle).toContain('después de {textoPlazo(a)} el depósito se devuelve completo al inquilino. En esta demo local no hay red: es solo una simulación.')
    expect(detalle).toContain('<h2>Reclamo del dueño</h2>{modoPrueba && <Simulado texto="Mediación simulada" />}')
    expect(detalle).toContain('Puedes reclamar. <Simulado texto="Red de prueba" /> El reclamo abre una disputa en la red de prueba')
  })
  it('Contrato y Términos 6.5 siguen con 7 días fijos y dicen «después de…»', () => {
    expect(contrato).toContain('Si no reclama, después de 7 días el depósito se devuelve completo al inquilino.')
    expect(terminos).toContain('Si no reclama, después de ese plazo se libera todo al inquilino.')
    expect(terminos).toContain('**Versión 1.6-demo · 24 de octubre de 2026**')
  })
})
