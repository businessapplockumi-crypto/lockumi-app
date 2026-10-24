// «+ Agregar espacio» (spec diseno/envio/agregar-espacio, 23/10/2026): reglas puras y textos.
// Cada espacio tiene un `id` fijo: la salida copia la lista de la entrada y la comparación «Así estaba al entrar» empareja por `id`.
// Textos con `// LEGAL: revisado (23/10)`: corregidos por Legal el 23/10 (sus correcciones mandan sobre la spec).
import type { Acta, Alquiler, Cuarto, Rol } from './types'

export const MAX_ESPACIOS = 12, MIN_NOMBRE = 2, MAX_NOMBRE = 30, MAX_PUNTOS = 8, MAX_PUNTO = 60
/** Los 4 de siempre, con su id fijo (los datos viejos sin id reciben estos por posición). */
export const CUARTOS: { id: string; nombre: string; items: string[] }[] = [
  { id: 'sala', nombre: 'Sala', items: ['Paredes y pintura', 'Piso', 'Ventanas y cortinas'] },
  { id: 'cocina', nombre: 'Cocina', items: ['Cocina y horno', 'Fregadero y grifería', 'Muebles'] },
  { id: 'dormitorio', nombre: 'Dormitorio', items: ['Paredes y pintura', 'Clóset', 'Puerta y llavín'] },
  { id: 'bano', nombre: 'Baño', items: ['Ducha', 'Inodoro y lavamanos', 'Azulejos'] },
]
export const SUGERENCIAS = ['Patio', 'Cochera', 'Cuarto de pilas', 'Balcón', 'Bodega', 'Jardín', 'Oficina'] // LEGAL: revisado (23/10)
const PLANTILLAS: Record<string, string[]> = {
  patio: ['Piso o zacate', 'Paredes y portón', 'Luces y enchufes', 'Desagües'],
  jardin: ['Piso o zacate', 'Paredes y portón', 'Luces y enchufes', 'Desagües'],
  cochera: ['Piso', 'Portón y control', 'Luces'],
  'cuarto de pilas': ['Pila y grifería', 'Piso', 'Conexión de lavadora'],
  balcon: ['Piso', 'Baranda', 'Puerta y vidrios'],
  bodega: ['Piso', 'Paredes', 'Puerta y llavín'],
  oficina: ['Paredes y pintura', 'Piso', 'Ventanas', 'Luces y enchufes'],
}
const LIBRE = ['Piso', 'Paredes y pintura', 'Puertas y llavín', 'Luces y enchufes']

/** Texto libre (nombre o punto): sin saltos de línea, sin emojis ni caracteres de control, sin espacios sobrantes. */
export const limpiar = (s: string) => s.replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, '').replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ').replace(/\s+/g, ' ').trim()
/** Para comparar duplicados: sin mayúsculas ni tildes («Baño» = «bano»). */
export const clave = (s: string) => limpiar(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
/** Lista sugerida para un nombre (las de la spec o la de nombre libre). */
export const plantilla = (nombre: string) => PLANTILLAS[clave(nombre)] ?? LIBRE
export const existe = (acta: Acta, nombre: string, excepto?: string) => acta.cuartos.some(c => c.id !== excepto && clave(c.nombre) === clave(nombre))
/** «Patio 2», «Patio 3»…: nombre libre que no choca. */
export function sugerirNombre(acta: Acta, nombre: string) { const b = limpiar(nombre); let k = 2; while (existe(acta, `${b} ${k}`)) k++; return `${b} ${k}` }

export const TXT = {
  boton: '+ Agregar espacio', ayuda: '¿Falta un lugar? Agrega patio, cochera o el que tenga la casa.',
  titulo: 'Agregar espacio', campo: 'Nombre del espacio', ejemplo: 'Ej.: Patio', lista: 'Lista para revisar', opcional: 'Opcional', otroPunto: '+ Otro punto',
  agregar: 'Agregar espacio', cancelar: 'Cancelar', agregado: 'Agregado', cambiarNombre: 'Cambiar nombre', quitar: 'Quitar espacio', guardar: 'Guardar',
  mantener: 'Mantener el espacio',
  bloqueado: 'La lista de espacios quedó fija cuando los dos confirmaron las fotos de entrada.',
  salidaArriba: 'Los mismos espacios que en la entrada, para comparar antes y después.',
  salidaAbajo: 'En la salida no se agregan ni se quitan espacios.',
  reconfirmar: 'Si cambias algo, los dos tienen que volver a confirmar.',
  // Corrección de Legal (23/10): manda sobre el texto de la tabla de la spec.
  quienVe: 'En esta demo, el dueño es un rol de prueba que confirma solo. Cuando los dos usen la app, los dos verán la misma lista y quién agregó cada espacio. Los espacios se usan en la entrada y en la salida.',
} as const // LEGAL: revisado (23/10)
export const contador = (n: number) => `${n} de ${MAX_NOMBRE}` // LEGAL: revisado (23/10)
export const alEntrar = (n: number) => `Al entrar: ${n} ${n === 1 ? 'foto' : 'fotos'}` // LEGAL: revisado (23/10)
export const preguntaQuitar = (nombre: string) => `¿Quitar «${nombre}»?` // LEGAL: revisado (23/10)
export const textoQuitar = (n: number) => n > 0 // LEGAL: revisado (23/10)
  ? `Este espacio ya tiene ${n} ${n === 1 ? 'foto' : 'fotos'} y su lista revisada. Si lo quitas, salen de las fotos de entrada, pero quedan guardadas en el historial del alquiler como respaldo.`
  : 'También sale de las fotos de salida, para que las dos listas sigan iguales.'
export const ERR = { // LEGAL: revisado (23/10)
  vacio: 'Escribe un nombre.', corto: `Escribe al menos ${MIN_NOMBRE} letras.`, duplicado: 'Ya hay un espacio con ese nombre.', largo: `Máximo ${MAX_NOMBRE} letras.`,
  maximo: `Llegaste al máximo de ${MAX_ESPACIOS} espacios.`, ultimo: 'Tiene que quedar al menos 1 espacio.', puntos: `Máximo ${MAX_PUNTOS} puntos por espacio.`,
  puntoLargo: `Máximo ${MAX_PUNTO} letras.`, fija: 'La lista de espacios quedó fija cuando los dos confirmaron las fotos de entrada.',
} as const

/** Error del nombre (o '' si sirve). `excepto`: el id del espacio que se renombra. */
export function errorNombre(acta: Acta, crudo: string, excepto?: string): string {
  if (!excepto && acta.cuartos.length >= MAX_ESPACIOS) return ERR.maximo
  const n = limpiar(crudo)
  if (!n) return ERR.vacio
  if ([...n].length > MAX_NOMBRE) return ERR.largo
  if ([...n].length < MIN_NOMBRE) return ERR.corto
  if (existe(acta, n, excepto)) return ERR.duplicado
  return ''
}
/** Puntos de la lista ya limpios: sin vacíos ni repetidos, hasta 8 de hasta 60 letras. */
export const limpiarPuntos = (xs: string[]) => [...new Map(xs.map(limpiar).filter(Boolean).map(x => [clave(x), [...x].slice(0, MAX_PUNTO).join('')])).values()].slice(0, MAX_PUNTOS)

/** La lista se puede cambiar mientras la entrada no esté confirmada por los dos (y antes de la salida). */
export const listaFija = (a: Pick<Alquiler, 'entrada' | 'estado'>) => Boolean(a.entrada.firmas.dueno && a.entrada.firmas.inquilino) || !['firmas', 'pendiente_pago', 'fotos_entrada'].includes(a.estado)

export const nuevoId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
export const cuartoNuevo = (nombre: string, items: string[], por?: Rol, id = nuevoId()): Cuarto =>
  ({ id, nombre: limpiar(nombre), propio: true, ...(por && { agregadoPor: por }), nota: '', fotos: [], items: limpiarPuntos(items).map(texto => ({ texto, estado: null })) })
export const actaVacia = (): Acta => ({ firmas: {}, cuartos: CUARTOS.map(({ id, nombre, items }) => ({ id, nombre, nota: '', fotos: [], items: items.map(texto => ({ texto, estado: null })) })) })
/** La salida copia la entrada: mismos id, nombres y puntos; sin estado, fotos ni notas. */
export const actaDesde = (e: Acta): Acta => ({ firmas: {}, cuartos: e.cuartos.map(c => ({ id: c.id, nombre: c.nombre, ...(c.propio && { propio: true }), ...(c.agregadoPor && { agregadoPor: c.agregadoPor }),
  nota: '', fotos: [], items: c.items.map(i => ({ texto: i.texto, estado: null })) })) })
/** Pareja en la entrada de un espacio de la salida (por id). */
export const parEnEntrada = (a: Pick<Alquiler, 'entrada'>, c: Pick<Cuarto, 'id'>) => a.entrada.cuartos.find(x => x.id === c.id)
/** Pareja de un punto: por texto; si no, por posición. */
export const puntoPar = (ent: Cuarto | undefined, texto: string, j: number) => ent?.items.find(i => i.texto === texto) ?? ent?.items[j]

/** Migración de datos viejos: espacios sin id reciben uno por posición (0-3: los 4 de siempre). La salida ya creada solo recibe ids, no se rehace. */
export function migrarActa(acta: Acta | undefined): Acta | undefined {
  if (!acta || acta.cuartos.every(c => typeof c.id === 'string' && c.id)) return acta
  const usados = new Set<string>()
  return { ...acta, cuartos: acta.cuartos.map((c, i) => {
    let id = typeof c.id === 'string' && c.id ? c.id : CUARTOS[i]?.id ?? 'espacio-' + (i + 1)
    while (usados.has(id)) id += '-' + (i + 1)
    usados.add(id); return { ...c, id }
  }) }
}
export function migrarEspacios(a: Alquiler): Alquiler {
  const e = migrarActa(a.entrada), s = migrarActa(a.salida)
  return e === a.entrada && s === a.salida ? a : { ...a, entrada: e!, ...(a.salida && { salida: s }) }
}
