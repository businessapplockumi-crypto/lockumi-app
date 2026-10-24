export type Rol = 'dueno' | 'inquilino'
/** Tipo de lugar que se elige en «Nuevo alquiler». Opcional: los alquileres creados antes no lo tienen. */
export const TIPOS_LUGAR = ['Apartamento', 'Casa', 'Estudio', 'Habitación'] as const
export type TipoLugar = typeof TIPOS_LUGAR[number]
/** Migración de datos viejos: un tipo que no es uno de los 4 (o que falta) queda sin tipo. */
export const tipoValido = (t: unknown): TipoLugar | undefined => (TIPOS_LUGAR as readonly unknown[]).includes(t) ? t as TipoLugar : undefined
export type Estado = 'firmas'|'pendiente_pago'|'fotos_entrada'|'en_curso'|'salida'|'ventana_reclamo'|'reclamo'|'mediacion'|'cerrado'
/** Aceptación de un texto legal: versión aceptada y fecha (ISO 8601). */
export interface AceptacionLegal { version: string; fecha: string }
export interface Usuario { email: string; nombre: string; metodo: 'correo'|'google'|'apple'; terminos?: AceptacionLegal; privacidad?: AceptacionLegal }
export interface Evento { fecha: string; texto: string; tx?: string }
/** Foto con su origen. `tomadaEn`: hora en que se tomó o eligió en la app. `fechaArchivo`: la que trae la imagen (si trae).
 *  `huella`: SHA-256 del archivo original, para detectar cambios. `origen`: cámara dentro de la app o archivo. */
export interface Foto { id?: string; ruta?: string; huellaGuardada?: string; src: string; por: Rol; fecha: string; tomadaEn?: number; fechaArchivo?: number; huella?: string; origen?: 'camara' | 'archivo' | 'ejemplo'; posibleGaleria?: boolean }
export type EstadoItem = 'bien' | 'detalle' | null
export interface Cuarto { nombre: string; items: { texto: string; estado: EstadoItem }[]; fotos: Foto[]; nota: string }
export interface Acta { cuartos: Cuarto[]; firmas: Partial<Record<Rol, string>> }
export interface Reclamo { monto: number; motivo: string; fotos: Foto[]; fecha: string; respuesta?: 'aceptado' | 'rechazado' }
export interface Resultado { inquilino: number; dueno: number; via: 'automatico' | 'acuerdo' | 'mediacion'; fecha: string }
export interface Alquiler {
  id: string; direccion: string; monto: number; moneda: 'USD' | 'USDC'
  /** Tipo de lugar (Apartamento, Casa, Estudio o Habitación). Falta en los alquileres creados antes del 24/10/2026. */
  tipo?: TipoLugar
  /** Solo con servidor: mi rol según la sesión, si el inquilino ya aceptó y las cuentas G… declaradas. */
  miRol?: Rol; inquilinoUnido?: boolean; cuentas?: Partial<Record<Rol, string>>; ventanaSegundos?: number; liquidacionTx?: string; invitacion?: string
  inicio: string; fin: string; reglas: string[]
  duenoEmail: string; inquilinoEmail: string
  estado: Estado; rendimiento: boolean; historial: Evento[]
  escrowId?: string; contrato: { firmas: Partial<Record<Rol, string>> }; entrada: Acta; salida?: Acta; pago?: string
  ventanaInicio?: string; diasSimulados: number
  reclamo?: Reclamo; resultado?: Resultado
  /** Fase 1 (testnet real, una sola persona): cuenta segura (C…), cuentas G… y hashes de cada paso en la red de prueba. */
  red?: RedPrueba
}
export type PasoRed = 'trustline' | 'compra' | 'escrow' | 'deposito' | 'evidencia' | 'aprobacion' | 'liberacion' | 'duenoTrustline' | 'disputa' | 'resolucion'
export interface RedPrueba { escrow?: string; dueno?: string; inquilino?: string; inquilinoPrueba?: boolean; firma?: 'cavos' | 'freighter'; usdcListo?: boolean; txs: Partial<Record<PasoRed, string>> }
export const ETIQUETA_ESTADO: Record<Estado,string> = {
  firmas:'Firmas', pendiente_pago:'Esperando depósito', fotos_entrada:'Fotos de entrada',
  en_curso:'Alquiler en curso', salida:'Fotos de salida', ventana_reclamo:'7 días para reclamos',
  reclamo:'Reclamo abierto', mediacion:'Con mediador', cerrado:'Terminado',
}
export const NOMBRE_ROL: Record<Rol,string> = { dueno: 'Dueño', inquilino: 'Inquilino' }
/** Migración al leer lo guardado: los alquileres viejos no tienen `tipo` y siguen sin tipo; un valor que no es de los 4 se quita. */
export const migrar = (xs: Alquiler[]): Alquiler[] => xs.map(a => { const t = tipoValido(a.tipo); if (t === a.tipo) return a; const { tipo: _t, ...resto } = a; return t ? { ...resto, tipo: t } : resto })
