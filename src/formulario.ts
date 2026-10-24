// Formulario «Nuevo alquiler» divertido: una pregunta por pantalla (maqueta aprobada en diseno/envio/recorrido-formulario/,
// textos.md con las correcciones de Legal del 23/10). Aquí van los textos, las opciones (chips) y las cuentas; la pantalla está en screens/Crear.tsx.
import { sumarMeses } from './validacion'
import type { Alerta } from './alertas'

export type ClavePantalla = 'lugar' | 'fechas' | 'monto' | 'reglas' | 'revisar'
export interface Pantalla { clave: ClavePantalla; pregunta: string; ayuda: string; listo?: string }
// LEGAL: revisado el 23/10 (textos exactos de la maqueta)
export const PANTALLAS: Pantalla[] = [
  { clave: 'lugar', pregunta: '¿Qué lugar van a alquilar?', ayuda: 'Un nombre corto basta.', listo: '¡Lugar listo!' },
  { clave: 'fechas', pregunta: '¿Cuándo empieza y cuánto dura?', ayuda: 'Elige una duración o pon las fechas.', listo: '¡Fechas listas!' },
  { clave: 'monto', pregunta: '¿De cuánto es el depósito?', ayuda: 'USDC de prueba, sin valor. Máximo 20.', listo: '¡Monto listo!' },
  { clave: 'reglas', pregunta: 'Reglas del lugar', ayuda: 'Toca las que apliquen. Quedan en el contrato.', listo: '¡Reglas listas!' },
  { clave: 'revisar', pregunta: 'Revisar el contrato', ayuda: 'Revisa los datos antes de crear.' },
]
export const TOTAL_PANTALLAS = PANTALLAS.length

/** Tipo de lugar: solo de interfaz (no existe en types.ts y no se guarda). */
export const TIPOS_LUGAR = ['Apartamento', 'Casa', 'Estudio', 'Habitación'] as const
export const EJEMPLO_LUGAR = 'Ej.: Apartamento en Barreal de Heredia'

// LEGAL (23/10): los chips de duración se pueden usar en la red de prueba. Antes de usar dinero real hay que revisarlos
// con un abogado (Ley 7527, art. 70). No los actives con dinero real sin ese OK.
export const DURACIONES = [{ meses: 3, texto: '3 meses' }, { meses: 6, texto: '6 meses' }, { meses: 12, texto: '1 año' }] as const
export const OTRA_FECHA = 'Otra fecha'
/** Duración con chips: el fin es el inicio + N meses (mismo cálculo que la validación). */
export const finConDuracion = (inicio: string, meses: number) => sumarMeses(inicio, meses)
/** Qué chip de duración corresponde a unas fechas (o null si es «Otra fecha»). */
export const duracionDe = (inicio: string, fin: string) => !inicio || !fin ? null : DURACIONES.find(d => finConDuracion(inicio, d.meses) === fin)?.meses ?? null

/** Montos rápidos (USDC de prueba). Se muestran siempre con usd(...). */
export const MONTOS = [1, 2, 3, 5, 10, 20] as const

/** Reglas para tocar (aria-pressed). Quedan escritas en el contrato tal cual. */
export const REGLAS_CHIP = ['Sin mascotas', 'Sin fumar', 'Sin fiestas', 'Silencio desde las 10 p. m.', 'Máximo 2 personas', 'Cuidar el jardín'] as const
export const REGLAS_INICIALES = ['Sin mascotas']
export const OTRA_REGLA = '+ Otra regla'
// MODERAR ANTES DE PRODUCCIÓN (Legal, 23/10): «+ Otra regla» es texto libre y necesita moderación antes de usarse fuera de la red de prueba.
export const OTRA_REGLA_SIN_MODERAR = true
export const MAX_REGLA = 120

/** «Falta un paso: revisar y crear.» o «Faltan N pasos.» (después de la pantalla i, contando desde 0). */
export function faltan(i: number) {
  const n = TOTAL_PANTALLAS - 1 - i
  return n === 1 ? 'Falta un paso: revisar y crear.' : `Faltan ${n} pasos.`
}
/** Aviso v2 de cada pantalla lista («¡Lugar listo!» · «Faltan 4 pasos.»). Sin acción: 5 s. */
export const alertaPantallaLista = (i: number): Alerta => ({
  paso: 'formulario-' + PANTALLAS[i].clave, tipo: 'exito', titulo: PANTALLAS[i].listo!, hecho: faltan(i), linea: { texto: faltan(i) },   // LEGAL: revisado el 23/10
})

/** Errores de fechas con las palabras de esta pantalla («empieza» y «termina»). Cada uno dice cómo arreglarlo. */
export function errorFechas(e: string | undefined, cual: 'inicio' | 'fin') {
  if (!e) return e
  if (cual === 'inicio' && e === 'Elige la fecha de entrada.') return 'Elige el día en que empieza.'
  if (cual === 'fin' && e === 'Elige la fecha de salida.') return 'Elige una duración (3 meses, 6 meses o 1 año) o toca «Otra fecha».'
  return e.replace('La salida tiene', 'El fin tiene').replace('de la entrada', 'del inicio').replace('La fecha de entrada', 'El inicio').replace('La entrada debe', 'El inicio debe')
}

// El recorrido guiado pide una pantalla del formulario (paso 2: lugar; paso 3: reglas).
let pedida: number | null = null
const subs = new Set<(i: number) => void>()
export function pedirPantalla(i: number) { pedida = i; subs.forEach(f => f(i)) }
export const tomarPantallaPedida = () => { const p = pedida; pedida = null; return p }
export const suscribirPantalla = (f: (i: number) => void) => { subs.add(f); return () => { subs.delete(f) } }
