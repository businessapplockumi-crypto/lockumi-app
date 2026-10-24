// Formulario «Nuevo alquiler» divertido (src/formulario.ts y src/screens/Crear.tsx): textos exactos de la maqueta
// (diseno/envio/recorrido-formulario/textos.md, Legal 23/10), chips, cuentas, notas de Legal y accesibilidad.
import { describe, it, expect } from 'vitest'
import { PANTALLAS, TOTAL_PANTALLAS, TIPOS_LUGAR, EJEMPLO_LUGAR, DURACIONES, OTRA_FECHA, MONTOS, REGLAS_CHIP, OTRA_REGLA, OTRA_REGLA_SIN_MODERAR,
  faltan, alertaPantallaLista, finConDuracion, duracionDe, errorFechas, pedirPantalla, tomarPantallaPedida, suscribirPantalla } from '../formulario'
import { PASOS_RECORRIDO } from '../recorrido'

const fs = await import(/* @vite-ignore */ ['node', 'fs'].join(':')) as { readFileSync(r: URL, c: 'utf8'): string }
const leer = (r: string) => fs.readFileSync(new URL(r, import.meta.url), 'utf8')
const crear = leer('../screens/Crear.tsx'), form = leer('../formulario.ts'), css = leer('../index.css')

describe('textos exactos de la maqueta', () => {
  it('5 pantallas, una pregunta por pantalla', () => {
    expect(TOTAL_PANTALLAS).toBe(5)
    expect(PANTALLAS.map(p => [p.pregunta, p.ayuda])).toEqual([
      ['¿Qué lugar van a alquilar?', 'Un nombre corto basta.'],
      ['¿Cuándo empieza y cuánto dura?', 'Elige una duración o pon las fechas.'],
      ['¿De cuánto es el depósito?', 'USDC de prueba, sin valor. Máximo 20.'],
      ['Reglas del lugar', 'Toca las que apliquen. Quedan en el contrato.'],
      ['Revisar el contrato', 'Revisa los datos antes de crear.'],
    ])
    expect(PANTALLAS.map(p => p.listo).filter(Boolean)).toEqual(['¡Lugar listo!', '¡Fechas listas!', '¡Monto listo!', '¡Reglas listas!'])
  })
  it('chips y ejemplos', () => {
    expect(TIPOS_LUGAR).toEqual(['Apartamento', 'Casa', 'Estudio', 'Habitación'])
    expect(EJEMPLO_LUGAR).toBe('Ej.: Apartamento en Barreal de Heredia')
    expect(DURACIONES.map(d => d.texto)).toEqual(['3 meses', '6 meses', '1 año']); expect(OTRA_FECHA).toBe('Otra fecha')
    expect([...MONTOS]).toEqual([1, 2, 3, 5, 10, 20])
    expect([...REGLAS_CHIP]).toEqual(['Sin mascotas', 'Sin fumar', 'Sin fiestas', 'Silencio desde las 10 p. m.', 'Máximo 2 personas', 'Cuidar el jardín'])
    expect(OTRA_REGLA).toBe('+ Otra regla')
    for (const t of ['Nombre del lugar', 'Empieza', 'Termina', 'USDC de prueba de Lockumi', 'Mi propio USDC de prueba', 'Siguiente', 'Atrás', 'Revisar el contrato', 'Seguir', 'Crear alquiler', 'aria-label="Cerrar"'])
      expect(crear, t).toContain(t)
  })
  it('«Falta un paso» / «Faltan N pasos» y el aviso v2 de cada pantalla', () => {
    expect([0, 1, 2, 3].map(faltan)).toEqual(['Faltan 4 pasos.', 'Faltan 3 pasos.', 'Faltan 2 pasos.', 'Falta un paso: revisar y crear.'])
    const a = alertaPantallaLista(0)
    expect(a).toMatchObject({ paso: 'formulario-lugar', tipo: 'exito', titulo: '¡Lugar listo!' }); expect(a.accion).toBeUndefined()
    expect(crear).toMatch(/avisar\(alertaPantallaLista\(/)
  })
  it('sin palabras técnicas en lo que se ve', () => {
    const vis = [...PANTALLAS.flatMap(p => [p.pregunta, p.ayuda, p.listo ?? '']), ...REGLAS_CHIP, EJEMPLO_LUGAR].join(' ')
    expect(vis).not.toMatch(/escrow|wallet|trustline|contrato inteligente|blockchain|stellar|soroban|\bID\b/i)
    expect(form + crear).not.toMatch(/garantizad|seguro al 100|protegido/i)
  })
})

describe('cuentas', () => {
  it('el fin es el inicio + N meses, y se reconoce la duración', () => {
    expect(finConDuracion('2026-11-01', 3)).toBe('2027-02-01'); expect(finConDuracion('2026-11-01', 12)).toBe('2027-11-01')
    expect(duracionDe('2026-11-01', '2027-05-01')).toBe(6); expect(duracionDe('2026-11-01', '2027-04-20')).toBeNull(); expect(duracionDe('', '')).toBeNull()
  })
  it('cada error dice cómo arreglarlo', () => {
    expect(errorFechas('Elige la fecha de entrada.', 'inicio')).toBe('Elige el día en que empieza.')
    expect(errorFechas('Elige la fecha de salida.', 'fin')).toMatch(/Elige una duración .*«Otra fecha»/)
    expect(errorFechas(undefined, 'fin')).toBeUndefined()
    expect(crear).toContain("'Toca un monto o escríbelo en «Otro monto».'")
    for (const m of crear.matchAll(/setErrRegla\('([^']+)'\)/g)) expect(m[1]).toMatch(/Escribe|Usa|Quita|Toca|Elige/)
  })
  it('el recorrido puede pedir una pantalla (paso 2: lugar, paso 3: reglas)', () => {
    expect(PASOS_RECORRIDO[1]).toMatchObject({ ruta: '/crear', pantalla: 0, el: '[data-recorrido="datos"]' })
    expect(PASOS_RECORRIDO[2]).toMatchObject({ ruta: '/crear', pantalla: 3, el: '[data-recorrido="reglas"]' })
    const vistos: number[] = []; const quitar = suscribirPantalla(i => vistos.push(i))
    pedirPantalla(3); expect(vistos).toEqual([3]); expect(tomarPantallaPedida()).toBe(3); expect(tomarPantallaPedida()).toBeNull(); quitar()
    expect(crear).toMatch(/data-recorrido="datos"/); expect(crear).toMatch(/data-recorrido="reglas"/)
  })
})

describe('notas de Legal', () => {
  it('chips de duración: Ley 7527, art. 70; «+ Otra regla»: moderar antes de producción', () => {
    expect(form).toMatch(/LEGAL[^\n]*\n[^\n]*Ley 7527, art\. 70/)
    expect(OTRA_REGLA_SIN_MODERAR).toBe(true); expect(form).toContain('MODERAR ANTES DE PRODUCCIÓN')
  })
  it('los montos salen siempre de usd(...)', () => {
    expect(crear).toMatch(/usd\(n\)/); expect(crear).toMatch(/usd\(/)
    expect(crear).not.toMatch(/['"`>]\s*\d+(,\d+)?\s*USDC/)
    expect(crear).not.toMatch(/USD \d/)
  })
  it('al crear se usa el aviso v2 aprobado y la lógica no cambia', () => {
    expect(crear).toContain("avisar(alertaCreado({ direccion: f.direccion.trim(), monto: m }))")
  })
})

describe('accesibilidad', () => {
  it('chips: radio o aria-pressed, 44 px, foco visible, flechas', () => {
    expect(crear).toMatch(/role="radiogroup"/); expect(crear).toMatch(/role="radio"/); expect(crear).toMatch(/aria-checked/); expect(crear).toMatch(/aria-pressed/)
    expect(crear).toMatch(/ArrowRight|ArrowDown/)
    expect(css).toMatch(/\.fz-chip\{[^}]*min-height:44px/); expect(css).toMatch(/\.fz-chip:focus-visible\{[^}]*box-shadow:var\(--foco\)/)
  })
  it('barra de avance y foco en la pregunta', () => {
    expect(crear).toMatch(/role="progressbar"/); expect(crear).toMatch(/aria-valuenow/)
    expect(crear).toMatch(/tabIndex=\{-1\}/)
  })
  it('movimiento reducido apaga la casita, el confeti y el brillo', () => {
    const red = css.slice(css.indexOf('/* Formulario «Nuevo alquiler» divertido')); const m = red.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\n\}/)
    expect(m?.[0]).toMatch(/fz-casa--fiesta/); expect(m?.[0]).toMatch(/fz-punto\{animation:none/); expect(m?.[0]).toMatch(/fz-barra__lleno::after/)
    expect(css).toMatch(/@keyframes fz-salto\{[^\n]*translateY\(-14px\)/); expect(css).toMatch(/fz-pop 300ms/); expect(css).toMatch(/fz-confeti 900ms/)
  })
})
