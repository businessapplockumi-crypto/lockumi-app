// Formulario: el tipo de lugar se guarda en el alquiler (con migración para los viejos) y sale en el contrato y su PDF;
// el monto: «Máximo 20» solo con «USDC de prueba de Lockumi» (tesorería); con «Mi propio USDC de prueba» el límite es el saldo.
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Alquiler } from '../types'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, String(v)), removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear() })
const { TIPOS_LUGAR, tipoValido, migrar } = await import('../types')
const { ContratoDoc, Documento } = await import('../screens/ContratoDoc')
const { PANTALLAS } = await import('../formulario')
const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const crear = leer('../screens/Crear.tsx'), doc = leer('../screens/ContratoDoc.tsx'), store = leer('../store.ts'), red = leer('../../api/_lib/red.ts'), solo = leer('../../api/_lib/solo.ts')

const A: Alquiler = { id: '3f2a9c1b-0000-4000-8000-000000000000', direccion: 'Apartamento en Barreal de Heredia', monto: 20, moneda: 'USDC', inicio: '2026-10-19', fin: '2027-04-19',
  reglas: ['Sin mascotas'], duenoEmail: 'dueno@ejemplo.cr', inquilinoEmail: 'demo@lockumi.com', estado: 'firmas', rendimiento: false, historial: [],
  contrato: { firmas: {} }, entrada: { cuartos: [], firmas: {} }, diasSimulados: 0 }

describe('tipo de lugar', () => {
  it('los 4 tipos y la validación', () => {
    expect([...TIPOS_LUGAR]).toEqual(['Apartamento', 'Casa', 'Estudio', 'Habitación'])
    expect(tipoValido('Casa')).toBe('Casa'); expect(tipoValido('casa')).toBeUndefined(); expect(tipoValido(undefined)).toBeUndefined(); expect(tipoValido('<b>x</b>')).toBeUndefined()
  })
  it('migración: los viejos sin tipo siguen igual; un tipo inválido se quita; uno válido se conserva', () => {
    const viejo = { ...A }; const [m1] = migrar([viejo]); expect(m1).toBe(viejo); expect('tipo' in m1).toBe(false)
    const [m2] = migrar([{ ...A, tipo: 'Castillo' as never }]); expect('tipo' in m2).toBe(false)
    const [m3] = migrar([{ ...A, tipo: 'Estudio' }]); expect(m3.tipo).toBe('Estudio')
    expect(store).toMatch(/migrar\(JSON\.parse\(s\)\)/)
  })
  it('se guarda al crear', () => {
    expect(crear.match(/tipo: tipoValido\(tipo\)/g)).toHaveLength(2)
    expect(store).toMatch(/const t = tipoValido\(tipo\)/)
  })
  it('sale en el contrato y en su PDF, con la marca de Legal; sin tipo no sale la línea', () => {
    const con = renderToStaticMarkup(<ContratoDoc a={{ ...A, tipo: 'Casa' }} />)
    expect(con).toContain('<dt>Tipo de lugar</dt><dd>Casa</dd>')
    const pdf = renderToStaticMarkup(<Documento a={{ ...A, tipo: 'Casa' }} plegado={{ abierto: false, alternar: () => {}, id: 'x' }} />)
    expect(pdf).toContain('<dt>Tipo de lugar</dt><dd>Casa</dd>')
    expect(renderToStaticMarkup(<ContratoDoc a={A} />)).not.toContain('Tipo de lugar')
    expect(doc).toMatch(/Tipo de lugar.*LEGAL: revisar/)
  })
})

describe('monto según el origen', () => {
  it('«Máximo 20» solo con «USDC de prueba de Lockumi»', () => {
    expect(PANTALLAS[2].ayuda).toBe('USDC de prueba, sin valor. Máximo 20.')
    expect(crear).toMatch(/origen === 'propia' \? 'USDC de prueba, sin valor\. Hasta tu saldo\.'/)
    expect(crear).toMatch(/origen === 'lockumi' && !montoValido\(m, TOPE_USDC\)/)
    expect(crear).toMatch(/Baja el monto a \$\{TOPE_USDC\} o menos, o elige «Mi propio USDC de prueba»\./)
  })
  it('con la cuenta propia no hay tope de 20: el límite es el saldo', () => {
    expect(crear).toMatch(/origen === 'lockumi' \? TOPE_USDC : Math\.min\(propia\?\.saldo/)
    expect(crear).toMatch(/\(propia\.saldo \?\? 0\) < m\) e\.monto = mensajeSaldoPropio/)
  })
  it('al cambiar el origen se revalida el monto en el acto', () => {
    expect(crear).toMatch(/const cambiarOrigen = \(o: 'lockumi' \| 'propia'\) => \{ setOrigen\(o\); if \(f\.monto\.trim\(\)\) setTocado\(t => \(\{ \.\.\.t, monto: true \}\)\) \}/)
    expect(crear).toMatch(/onElegir=\{cambiarOrigen\}/)
  })
  it('el servidor mantiene el tope real de la tesorería', () => {
    expect(red).toMatch(/export const TOPE_USDC = 20/)
    expect(solo).toMatch(/montoValido\(p\.monto, TOPE_USDC\)/)
  })
})
