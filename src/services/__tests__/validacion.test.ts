import { describe, it, expect } from 'vitest'
import { fechaValida, sumarMeses, validarFechas, validarMonto, validarAlquiler, hoyISO, limitesEntrada, limitesSalida, salidaTrasCambiarEntrada, ddmmaa } from '../../validacion'
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
    expect(validarFechas('', '2027-01-01', HOY).inicio).toMatch(/Elige/)
    expect(validarFechas('2026-02-30', '2027-01-01', HOY).inicio).toMatch(/no existe/)
  })
  it('rechaza ayer y cualquier fecha pasada', () => {
    expect(validarFechas('2026-10-15', '2026-12-15', HOY).inicio).toBe('La fecha de entrada no puede ser anterior a hoy. Elige hoy o una fecha futura.')
    expect(validarFechas('2026-10-09', '2026-12-09', HOY).inicio).toMatch(/anterior a hoy/)
    expect(validarFechas('2025-10-16', '2026-12-09', HOY).inicio).toMatch(/anterior a hoy/)
  })
  it('acepta mañana y el último día del año siguiente permitido', () => {
    expect(validarFechas('2026-10-17', '2026-11-17', HOY)).toEqual({})
    expect(validarFechas('2027-10-16', '2027-11-16', HOY)).toEqual({})
  })
  it('hoy se calcula en la zona local, no en UTC', () => {
    // 16/10 a las 23:30 y a las 00:05 locales siguen siendo 16/10 en cualquier zona (en UTC-6 las 23:30 ya son 17/10 en UTC)
    expect(hoyISO(new Date(2026, 9, 16, 23, 30))).toBe('2026-10-16')
    expect(hoyISO(new Date(2026, 9, 16, 0, 5))).toBe('2026-10-16')
    if (new Date(2026, 9, 16, 23, 30).getTimezoneOffset() > 0) expect(new Date(2026, 9, 16, 23, 30).toISOString().slice(0, 10)).toBe('2026-10-17')
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

describe('calendarios de Nuevo alquiler', () => {
  it('entrada: desde hoy hasta 365 días, y los bordes pasan la validación', () => {
    const { min, max } = limitesEntrada(HOY)
    expect(min).toBe(HOY); expect(max).toBe('2027-10-16')
    expect(validarFechas(min, sumarMeses(min, 1), HOY).inicio).toBeUndefined()
    expect(validarFechas(max, sumarMeses(max, 1), HOY).inicio).toBeUndefined()
    expect(validarFechas('2027-10-17', '2027-11-17', HOY).inicio).toBeDefined()
  })
  it('salida: de sumarMeses(entrada, 1) a sumarMeses(entrada, 60), incluso a fin de mes', () => {
    expect(limitesSalida('2026-10-19')).toEqual({ min: '2026-11-19', max: '2031-10-19' })
    expect(limitesSalida('2027-01-31')).toEqual({ min: '2027-02-28', max: '2032-01-31' })
    const { min, max } = limitesSalida('2027-01-31')
    expect(validarFechas('2027-01-31', min, HOY)).toEqual({}); expect(validarFechas('2027-01-31', max, HOY)).toEqual({})
  })
  it('al cambiar la entrada se borra la salida que deja de valer y se conserva la que sigue valiendo', () => {
    expect(salidaTrasCambiarEntrada('2026-12-01', '2027-04-19')).toBe('2027-04-19')
    expect(salidaTrasCambiarEntrada('2027-04-01', '2027-04-19')).toBe('')     // menos de 1 mes
    expect(salidaTrasCambiarEntrada('2027-05-01', '2027-04-19')).toBe('')     // antes de la entrada
    expect(salidaTrasCambiarEntrada('2026-10-19', '2031-10-20')).toBe('')     // más de 5 años
    expect(salidaTrasCambiarEntrada('2026-10-19', '')).toBe('')
  })
  it('formato dd/mm/aa', () => { expect(ddmmaa('2027-04-19')).toBe('19/04/27'); expect(ddmmaa('')).toBe('') })
})
