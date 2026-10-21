// «Tus alquileres»: un color por estado (aprobado por Katherine el 20/10/2026, maqueta diseno/tus-alquileres/04-estados).
// Cada estado del flujo cae en UNO de 4 grupos; el color de cada grupo sale de tonos que ya existen en index.css
// (ver las variables --estado-* en index.css). Para agregar un estado: súmalo a Estado (types.ts) y a GRUPO_ESTADO e ICONO_ESTADO;
// TypeScript y las pruebas (services/__tests__/estados.test.ts) avisan si falta.
import type { Estado } from './types'

export type GrupoEstado = 'pendiente' | 'curso' | 'reclamo' | 'terminado'

/** pendiente = falta firma, depósito o fotos · curso = depósito guardado, nada que hacer · reclamo = reclamo o mediador · terminado. */
export const GRUPO_ESTADO: Record<Estado, GrupoEstado> = {
  firmas: 'pendiente', pendiente_pago: 'pendiente', fotos_entrada: 'pendiente', salida: 'pendiente',
  en_curso: 'curso', ventana_reclamo: 'curso',
  reclamo: 'reclamo', mediacion: 'reclamo',
  cerrado: 'terminado',
}

/** Ícono del sello y de la píldora de cada estado (dibujos en screens/Inicio.tsx). */
export type IconoEstado = 'firma' | 'candado' | 'camara' | 'casa' | 'reloj' | 'alerta' | 'check'
export const ICONO_ESTADO: Record<Estado, IconoEstado> = {
  firmas: 'firma', pendiente_pago: 'candado', fotos_entrada: 'camara', salida: 'camara',
  en_curso: 'casa', ventana_reclamo: 'reloj', reclamo: 'alerta', mediacion: 'alerta', cerrado: 'check',
}

/** Clase CSS del grupo (index.css: .estado--pendiente, .estado--curso, .estado--reclamo, .estado--terminado). */
export const claseEstado = (e: Estado) => 'estado--' + GRUPO_ESTADO[e]
