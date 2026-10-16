export type Rol = 'dueno' | 'inquilino'
export type Estado = 'borrador'|'entrada'|'pendiente_pago'|'apartado'|'salida'|'ventana_reclamo'|'reclamo'|'mediacion'|'cerrado'
export interface Usuario { email: string; nombre: string; rol: Rol; metodo: 'correo'|'google'|'apple' }
export interface Evento { fecha: string; texto: string }
export interface Alquiler {
  id: string; direccion: string; monto: number; moneda: 'USD'
  inicio: string; fin: string; reglas: string[]
  duenoEmail: string; inquilinoEmail: string
  estado: Estado; rendimiento: boolean; historial: Evento[]
}
export const ETIQUETA_ESTADO: Record<Estado,string> = {
  borrador:'Borrador', entrada:'Acta de entrada', pendiente_pago:'Esperando depósito',
  apartado:'Depósito apartado', salida:'Acta de salida', ventana_reclamo:'Ventana de reclamo',
  reclamo:'Reclamo abierto', mediacion:'En mediación', cerrado:'Cerrado',
}
