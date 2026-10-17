export type Rol = 'dueno' | 'inquilino'
export type Estado = 'firmas'|'pendiente_pago'|'fotos_entrada'|'en_curso'|'salida'|'ventana_reclamo'|'reclamo'|'mediacion'|'cerrado'
/** Aceptación de un texto legal: versión aceptada y fecha (ISO 8601). */
export interface AceptacionLegal { version: string; fecha: string }
export interface Usuario { email: string; nombre: string; metodo: 'correo'|'google'|'apple'; terminos?: AceptacionLegal; privacidad?: AceptacionLegal }
export interface Evento { fecha: string; texto: string }
/** Foto con su origen. `tomadaEn`: hora en que se tomó o eligió en la app. `fechaArchivo`: la que trae la imagen (si trae).
 *  `huella`: SHA-256 del archivo original, para detectar cambios. `origen`: cámara dentro de la app o archivo. */
export interface Foto { src: string; por: Rol; fecha: string; tomadaEn?: number; fechaArchivo?: number; huella?: string; origen?: 'camara' | 'archivo' | 'ejemplo'; posibleGaleria?: boolean }
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
  escrowId?: string; contrato: { firmas: Partial<Record<Rol, string>> }; entrada: Acta; salida?: Acta; pago?: string
  ventanaInicio?: string; diasSimulados: number
  reclamo?: Reclamo; resultado?: Resultado
}
export const ETIQUETA_ESTADO: Record<Estado,string> = {
  firmas:'Firmas', pendiente_pago:'Esperando depósito', fotos_entrada:'Fotos de entrada',
  en_curso:'Alquiler en curso', salida:'Fotos de salida', ventana_reclamo:'7 días para reclamos',
  reclamo:'Reclamo abierto', mediacion:'Con mediador', cerrado:'Terminado',
}
export const NOMBRE_ROL: Record<Rol,string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
