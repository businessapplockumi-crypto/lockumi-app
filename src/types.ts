export type Rol = 'dueno' | 'inquilino'
export type Estado = 'entrada'|'pendiente_pago'|'apartado'|'salida'|'ventana_reclamo'|'reclamo'|'mediacion'|'cerrado'
export interface Usuario { email: string; nombre: string; metodo: 'correo'|'google'|'apple' }
export interface Evento { fecha: string; texto: string }
export interface Foto { src: string; por: Rol; fecha: string }
export type EstadoItem = 'bien' | 'detalle' | null
export interface Cuarto { nombre: string; items: { texto: string; estado: EstadoItem }[]; fotos: Foto[]; nota: string }
export interface Acta { cuartos: Cuarto[]; firmas: Partial<Record<Rol, string>> }
export interface Reclamo { monto: number; motivo: string; fotos: Foto[]; fecha: string; respuesta?: 'aceptado' | 'rechazado' }
export interface Resultado { inquilino: number; dueno: number; via: 'automatico' | 'acuerdo' | 'mediacion'; fecha: string }
export interface Alquiler {
  id: string; direccion: string; monto: number; moneda: 'USD'
  inicio: string; fin: string; reglas: string[]
  duenoEmail: string; inquilinoEmail: string
  estado: Estado; rendimiento: boolean; historial: Evento[]
  escrowId?: string; entrada: Acta; salida?: Acta; pago?: string
  ventanaInicio?: string; diasSimulados: number
  reclamo?: Reclamo; resultado?: Resultado
}
export const ETIQUETA_ESTADO: Record<Estado,string> = {
  entrada:'Acta de entrada', pendiente_pago:'Esperando depósito',
  apartado:'Depósito apartado', salida:'Acta de salida', ventana_reclamo:'Ventana de reclamo',
  reclamo:'Reclamo abierto', mediacion:'En mediación', cerrado:'Cerrado',
}
export const NOMBRE_ROL: Record<Rol,string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
