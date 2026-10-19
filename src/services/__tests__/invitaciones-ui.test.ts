import { describe, it, expect } from 'vitest'
import { aAlquiler, type Filas } from '../../servidor/mapeo'
import { ahoraDos } from '../../flujo'

const DUENO = 'u-dueno', INQ = 'u-inq'
const base = (o: Partial<Filas['contrato']>, ps: Filas['participantes']): Filas => ({
  contrato: { id: 'c1', direccion: 'Casa', monto: '100', inicio: '2026-11-01', fin: '2027-05-01', reglas: ['Sin fiestas'], email_inquilino: 'inq@x.cr', estado: 'firmas',
    ventana_inicio: null, ventana_segundos: 60, escrow_contract_id: null, resultado: null, liquidacion_tx: null, creado_en: '', actualizado_en: '', ...o },
  participantes: ps, actas: [], firmas: [], fotos: [], reclamo: null, eventos: [] })
const pD = { rol: 'dueno' as const, usuario: DUENO, email_cavos: 'dueno@x.cr', direccion_stellar: null }
const pI = { rol: 'inquilino' as const, usuario: INQ, email_cavos: 'inq@x.cr', direccion_stellar: null }

describe('marcado Dueño/Inquilino y «Ahora te toca…» con dos personas', () => {
  it('el dueño crea: espera la invitación; luego el inquilino acepta reglas y se firma', () => {
    const a = aAlquiler(base({ rol_creador: 'dueno', email_dueno: 'dueno@x.cr', reglas_ok_dueno: 't' }, [pD]), DUENO, () => '')
    expect(a).toMatchObject({ miRol: 'dueno', rolCreador: 'dueno', otroUnido: false, emailInvitado: 'inq@x.cr' })
    expect(ahoraDos(a, 'dueno')).toMatch(/^Ahora le toca al inquilino: aceptar la invitación.*inq@x\.cr/)
    const b = aAlquiler(base({ rol_creador: 'dueno', email_dueno: 'dueno@x.cr', reglas_ok_dueno: 't', reglas_ok_inquilino: 't' }, [pD, pI]), INQ, () => '')
    expect(b.miRol).toBe('inquilino'); expect(ahoraDos(b, 'inquilino')).toBe('Ahora te toca: lee el contrato y fírmalo.')
  })
  it('el inquilino crea: el dueño invitado ve su correo y le toca confirmar las reglas', () => {
    const f = base({ rol_creador: 'inquilino', email_dueno: 'dueno@x.cr', reglas_ok_inquilino: 't' }, [pI])
    const a = aAlquiler(f, INQ, () => '')
    expect(a).toMatchObject({ rolCreador: 'inquilino', otroUnido: false, emailInvitado: 'dueno@x.cr', duenoEmail: 'dueno@x.cr' })
    expect(ahoraDos(a, 'inquilino')).toMatch(/^Ahora le toca al dueño: aceptar la invitación/)
    const b = aAlquiler({ ...f, participantes: [pI, pD] }, DUENO, () => '')
    expect(ahoraDos(b, 'dueno')).toBe('Ahora te toca: revisar las reglas que propuso el inquilino y confirmarlas.')
    expect(ahoraDos(b, 'inquilino')).toBe('Ahora le toca al dueño: confirmar las reglas que propusiste.')
  })
  it('si el dueño cambió las reglas, al inquilino le toca aceptarlas', () => {
    const a = aAlquiler(base({ rol_creador: 'inquilino', email_dueno: 'dueno@x.cr', reglas_ok_dueno: 't' }, [pI, pD]), INQ, () => '')
    expect(ahoraDos(a, 'inquilino')).toBe('Ahora te toca: aceptar las reglas del dueño.')
    expect(ahoraDos(a, 'dueno')).toBe('Ahora le toca al inquilino: aceptar las reglas.')
  })
  it('alquileres viejos (sin columnas nuevas) siguen como creados por el dueño', () => {
    const a = aAlquiler(base({}, [pD, pI]), DUENO, () => '')
    expect(a.rolCreador).toBe('dueno'); expect(a.otroUnido).toBe(true)
  })
})
