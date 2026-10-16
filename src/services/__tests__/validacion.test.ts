import { describe, it, expect } from 'vitest'
import { fechaValida, sumarMeses, validarFechas, validarMonto, validarAlquiler } from '../../validacion'
const HOY = '2026-10-16'
describe('fechas imposibles', () => {
  it('rechaza 31/02, 30/02, 29/02 no bisiesto, mes 13, día 0', () => {
    for (const f of ['2027-02-31', '2027-02-30', '2027-02-29', '2027-13-01', '2027-01-00', '2027-1-5', 'abc']) expect(fechaValida(f)).toBe(false)
  })
  it('acepta 29/02 en bisiesto y 31/12', () => { expect(fechaValida('2028-02-29')).toBe(true); expect(fechaValida('2026-12-31')).toBe(true) })
  it('sumarMeses respeta fin de mes', () => { expect(sumarMeses('2027-01-31', 1)).toBe('2027-02-28'); expect(sumarMeses('2027-03-15', 60)).toBe('2032-03-15') })
})
describe('entrada', () => {
  it('vacía o imposible', () => {
    expect(validarFechas('', '2027-01-01', HOY).inicio).toMatch(/Escribe/)
    expect(validarFechas('2026-02-30', '2027-01-01', HOY).inicio).toMatch(/no existe/)
  })
  it('acepta hasta 7 días atrás y rechaza 8', () => {
    expect(validarFechas('2026-10-09', '2026-12-09', HOY).inicio).toBeUndefined()
    expect(validarFechas('2026-10-08', '2026-12-08', HOY).inicio).toMatch(/7 días/)
  })
  it('acepta hoy y rechaza más de un año adelante', () => {
    expect(validarFechas(HOY, '2027-01-16', HOY)).toEqual({})
    expect(validarFechas('2027-10-17', '2028-10-17', HOY).inicio).toMatch(/próximo año/)
  })
})
describe('salida y duración', () => {
  it('salida igual o antes de la entrada', () => {
    expect(validarFechas('2026-11-01', '2026-11-01', HOY).fin).toMatch(/después/)
    expect(validarFechas('2026-11-01', '2026-10-30', HOY).fin).toMatch(/después/)
  })
  it('mínimo 1 mes', () => {
    expect(validarFechas('2026-11-01', '2026-11-30', HOY).fin).toMatch(/al menos 1 mes/)
    expect(validarFechas('2026-11-01', '2026-12-01', HOY).fin).toBeUndefined()
  })
  it('máximo 5 años', () => {
    expect(validarFechas('2026-11-01', '2031-11-01', HOY).fin).toBeUndefined()
    expect(validarFechas('2026-11-01', '2031-11-02', HOY).fin).toMatch(/5 años/)
  })
  it('salida imposible', () => { expect(validarFechas('2026-11-01', '2027-02-29', HOY).fin).toMatch(/no existe/) })
})
describe('monto y obligatorios', () => {
  it('monto', () => {
    expect(validarMonto('')).toMatch(/Escribe/); expect(validarMonto('0')).toMatch(/mayor que cero/); expect(validarMonto('-5')).toMatch(/números/)
    expect(validarMonto('12.345')).toMatch(/2 decimales/); expect(validarMonto('50001')).toMatch(/hasta/); expect(validarMonto('800,50')).toBeUndefined(); expect(validarMonto('50000')).toBeUndefined()
  })
  it('formulario completo', () => {
    const ok = { direccion: 'Apto 3B, Escazú', monto: '800', inicio: '2026-11-01', fin: '2027-10-31', email: 'ana@gmail.com' }
    expect(validarAlquiler(ok, HOY, 'yo@gmail.com')).toEqual({})
    const e = validarAlquiler({ direccion: '', monto: '', inicio: '', fin: '', email: 'yo@gmail.com' }, HOY, 'yo@gmail.com')
    expect(Object.keys(e).sort()).toEqual(['direccion', 'email', 'fin', 'inicio', 'monto'])
    expect(e.email).toMatch(/tu correo/)
    expect(validarAlquiler({ ...ok, email: 'ana@gmail' }, HOY).email).toMatch(/no parece válido/)
  })
})
