// Acciones del flujo. Las pantallas llaman a estas funciones; según la configuración van al servidor compartido
// (Supabase, dos aparatos) o al almacenamiento local de la demo (un aparato, con "Ver como").
import { store, ahoraDe } from './store'
import { actaDesde, cuartoNuevo, errorNombre, limpiar, listaFija, ERR } from './espacios'
import { escrow, type Guardar, type Avance } from './services/escrow'
import { NOMBRE_PASO, ORDEN, esHash } from './services/comprobantes'
import { unaVez } from './services/pasos'
import { firmar as firmarLocal, ambos, NOMBRE } from './flujo'
import { usd } from './ui'
import type { Alquiler, Cuarto, Foto, Rol } from './types'
import { modoServidor, modoTrustless, modoSolo, espaciosServidor } from './servidor/config'
import { trustless } from './services/trustless'
import { servidor } from './servidor/repositorio'

type Etapa = 'contrato' | 'entrada' | 'salida'
const iso = (a: Alquiler) => new Date(ahoraDe(a)).toISOString()
export const plazoMs = (a: Pick<Alquiler, 'ventanaSegundos'>) => (a.ventanaSegundos ?? 604800) * 1000
/** "7 días", "1 día", "2 horas", "5 minutos": el plazo real del contrato (en la prueba de testnet puede ser corto). */
export function textoPlazo(a: Pick<Alquiler, 'ventanaSegundos'>) {
  const s = plazoMs(a) / 1000, n = (x: number, u: string, us: string) => `${x} ${x === 1 ? u : us}`
  return s >= 86400 && s % 86400 === 0 ? n(s / 86400, 'día', 'días') : s >= 3600 && s % 3600 === 0 ? n(s / 3600, 'hora', 'horas') : n(Math.max(1, Math.round(s / 60)), 'minuto', 'minutos')
}


export interface Acciones {
  crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string; propia?: { g: string; firma: 'cavos' | 'freighter' } }, email: string, cuenta?: string): Promise<{ id: string; link?: string }>
  firmar(a: Alquiler, etapa: Etapa, rol: Rol): Promise<void>
  marcar(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, item: number, estado: 'bien' | 'detalle'): Promise<void>
  nota(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, nota: string): Promise<void>
  agregarFoto(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, f: Foto): Promise<void>
  // `avance` recibe textos cortos mientras un paso trabaja en la red de prueba (para mostrarlos en el botón).
  pagar(a: Alquiler, avance?: Avance): Promise<void>
  iniciarSalida(a: Alquiler): Promise<void>
  /** «+ Agregar espacio» (solo la entrada, antes de que los dos la confirmen). Por ahora solo en los modos locales: en el modo servidor
   *  faltan las RPC (escritas en supabase/migrations/20261024000000_lk_espacios.sql, sin aplicar). Devuelven el id del espacio. */
  agregarCuarto?(a: Alquiler, nombre: string, items: string[], por: Rol): Promise<string>
  renombrarCuarto?(a: Alquiler, id: string, nombre: string): Promise<void>
  quitarCuarto?(a: Alquiler, id: string, por?: Rol): Promise<number>
  /** «Deshacer» del aviso «Espacio quitado»: vuelve a su lugar con sus fotos. */
  deshacerQuitar?(a: Alquiler, id: string): Promise<void>
  reclamar(a: Alquiler, monto: number, motivo: string, fotos: Foto[], avance?: Avance): Promise<void>
  responder(a: Alquiler, acepta: boolean, avance?: Avance): Promise<void>
  cerrarSinReclamo(a: Alquiler, avance?: Avance): Promise<void>
  decidir(a: Alquiler, montoDueno: number, motivo?: string, avance?: Avance): Promise<void>
  /** Solo con Trustless Work real: el dueño aprueba en la cadena devolver el depósito. */
  aprobarDevolucion?(a: Alquiler): Promise<void>
  /** Red de prueba (un solo aparato): el dueño de prueba firma o confirma solo, apenas el inquilino lo hizo. Devuelve qué hizo. */
  duenoPruebaAuto?(a: Alquiler): Promise<string | null>
}

const nada: Avance = () => {}
/** Anota en el alquiler cada transacción de la red de prueba apenas termina (con su entrada en el historial). */
const guardarEn = (id: string): Guardar => (txs, red) => store.cambiar(id, x => {
  x.red ??= { txs: {} }; Object.assign(x.red, red ?? {}); if (red?.escrow) x.escrowId = red.escrow
  for (const k of ORDEN) { const h = txs[k]; if (h && !x.red.txs[k]) { x.red.txs[k] = h; if (esHash(h)) x.historial.push({ fecha: new Date().toISOString(), texto: NOMBRE_PASO[k], tx: h }) } }
})
/** Paso idempotente: una sola vez a la vez (pestaña y navegador) y siempre sobre el alquiler recién leído. */
const paso = (a: Alquiler, nombre: string, f: (x: Alquiler) => Promise<void>) => unaVez(a.id + ':' + nombre, async () => { const x = store.fresco(a.id); if (x) await f(x) })

const local: Acciones = {
  async crear({ propia, ...d }, email) {
    const a = store.crear({ ...d, duenoEmail: email })
    // Depósito con USDC de prueba de la propia cuenta del inquilino: queda anotada desde ya (no hay tope de 20, el límite es su saldo).
    if (propia) store.cambiar(a.id, x => { x.red = { ...(x.red ?? { txs: {} }), inquilino: propia.g, inquilinoPrueba: false, firma: propia.firma } })
    // Fase 1 (testnet real): la cuenta segura se crea en la red al depositar (Real.tsx → /api/solo).
    if (modoSolo) { store.cambiar(a.id, x => { x.red = { txs: {} }; x.estado = 'pendiente_pago' }); return { id: a.id } }
    return { id: a.id }
  },
  async firmar(a, etapa, rol) {
    const titulo = { contrato: 'Contrato', entrada: 'Fotos de entrada', salida: 'Fotos de salida' }[etapa]
    store.cambiar(a.id, x => {
      const obj = etapa === 'contrato' ? x.contrato : x[etapa]!; const cuando = iso(x)
      obj.firmas = firmarLocal(obj.firmas, rol, rol, cuando)
      x.historial.push({ fecha: cuando, texto: `${titulo}: firmó el ${NOMBRE[rol]}` })
      if (!ambos(obj.firmas)) return
      if (etapa === 'contrato') { x.estado = 'pendiente_pago'; x.historial.push({ fecha: cuando, texto: 'Contrato firmado por los dos' }) }
      else if (etapa === 'entrada') { x.estado = 'en_curso'; x.historial.push({ fecha: cuando, texto: 'Fotos de entrada confirmadas por los dos' }) }
      else { x.estado = 'ventana_reclamo'; x.ventanaInicio = cuando; x.historial.push({ fecha: cuando, texto: 'Fotos de salida confirmadas. Empiezan los 7 días para reclamos' }) }
    })
  },
  async duenoPruebaAuto(a) {
    const x = store.fresco(a.id); if (!x) return null
    const [etapa, texto] = x.estado === 'firmas' && x.contrato.firmas.inquilino && !x.contrato.firmas.dueno ? ['contrato', 'El dueño de prueba firmó el contrato automáticamente'] as const
      : x.estado === 'fotos_entrada' && x.entrada.firmas.inquilino && !x.entrada.firmas.dueno ? ['entrada', 'El dueño de prueba revisó y confirmó las fotos de entrada automáticamente'] as const
      : x.estado === 'salida' && x.salida?.firmas.inquilino && !x.salida.firmas.dueno ? ['salida', 'El dueño de prueba revisó y confirmó las fotos de salida automáticamente'] as const
      : [null, null]
    if (!etapa) return null
    store.cambiar(a.id, y => { y.historial.push({ fecha: iso(y), texto }) })
    await local.firmar(store.fresco(a.id)!, etapa, 'dueno')
    return texto
  },
  async marcar(a, etapa, cuarto, item, estado) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].items[item].estado = estado; ac.firmas = {} }) },
  async nota(a, etapa, cuarto, nota) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].nota = nota; ac.firmas = {} }) },
  async agregarFoto(a, etapa, cuarto, f) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].fotos.push(f); ac.firmas = {} }) },
  pagar: (a, avance = nada) => paso(a, 'pago', async x => {
    if (x.estado !== 'pendiente_pago') return
    await escrow.depositar(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'pendiente_pago') return; y.estado = 'fotos_entrada'; y.pago = iso(y); y.historial.push({ fecha: iso(y), texto: `Depósito de ${usd(y.monto)} pagado y guardado` }) })
  }),
  async iniciarSalida(a) { store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = actaDesde(x.entrada) }, 'Empezaron las fotos de salida') },   // la salida copia los espacios de la entrada
  // Espacios: se valida sobre lo recién leído (otra pestaña pudo agregar el mismo nombre) y cualquier cambio borra las confirmaciones de la entrada.
  async agregarCuarto(a, nombre, items, por) {
    const x = store.fresco(a.id); if (!x) throw new Error('No encontramos este alquiler.')
    if (listaFija(x)) throw new Error(ERR.fija)
    const e = errorNombre(x.entrada, nombre); if (e) throw new Error(e)
    const c = cuartoNuevo(nombre, items, por)
    store.cambiar(a.id, y => { y.entrada.cuartos.push(c); y.entrada.firmas = {} }, `Se agregó el espacio ${c.nombre}`)
    return c.id
  },
  async renombrarCuarto(a, id, nombre) {
    const x = store.fresco(a.id); if (!x) throw new Error('No encontramos este alquiler.')
    if (listaFija(x)) throw new Error(ERR.fija)
    const c = x.entrada.cuartos.find(k => k.id === id); if (!c) throw new Error('Ese espacio ya no está en la lista.')
    const e = errorNombre(x.entrada, nombre, id); if (e) throw new Error(e)
    const n = limpiar(nombre); if (n === c.nombre) return
    store.cambiar(a.id, y => { const k = y.entrada.cuartos.find(q => q.id === id)!; k.nombre = n; y.entrada.firmas = {} }, `Se cambió el nombre del espacio ${c.nombre} a ${n}`)
  },
  async quitarCuarto(a, id) {
    const x = store.fresco(a.id); if (!x) throw new Error('No encontramos este alquiler.')
    if (listaFija(x)) throw new Error(ERR.fija)
    const pos = x.entrada.cuartos.findIndex(k => k.id === id); if (pos < 0) return 0
    if (x.entrada.cuartos.length <= 1) throw new Error(ERR.ultimo)
    const c = x.entrada.cuartos[pos]
    // Antes de las dos confirmaciones se borra de verdad: el espacio, su lista y sus fotos (no queda copia guardada).
    // «Deshacer» solo existe si no tenía fotos (se recuerda en memoria unos segundos, nunca en el almacenamiento).
    recienQuitado = c.fotos.length ? null : { a: a.id, cuarto: structuredClone(c), pos }
    store.cambiar(a.id, y => { y.entrada.cuartos.splice(pos, 1); y.entrada.firmas = {} },
      c.fotos.length === 1 ? `Se quitó el espacio ${c.nombre} y se borró su foto.` : c.fotos.length ? `Se quitó el espacio ${c.nombre} y se borraron sus ${c.fotos.length} fotos.` : `Se quitó el espacio ${c.nombre}.`) // LEGAL: revisado (24/10)
    return c.fotos.length
  },
  async deshacerQuitar(a, id) {
    const q = recienQuitado; const x = store.fresco(a.id)
    if (!x || !q || q.a !== a.id || q.cuarto.id !== id || listaFija(x) || x.entrada.cuartos.some(k => k.id === id)) return
    if (x.entrada.cuartos.length >= 12) throw new Error(ERR.maximo)
    if (errorNombre(x.entrada, q.cuarto.nombre)) throw new Error(ERR.duplicado)
    recienQuitado = null
    store.cambiar(a.id, y => { y.entrada.cuartos.splice(Math.min(q.pos, y.entrada.cuartos.length), 0, q.cuarto); y.entrada.firmas = {} },
      `Volvió el espacio ${q.cuarto.nombre} (se deshizo «Quitar espacio»)`)
  },
  // Reclamo del dueño: primero se registra en la cuenta segura (disputa) y después cambia la pantalla.
  reclamar: (a, monto, motivo, fotos, avance = nada) => paso(a, 'reclamo', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo) return
    await escrow.disputar(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'ventana_reclamo') return; y.estado = 'reclamo'; y.reclamo = { monto, motivo, fotos, fecha: iso(y) }; y.historial.push({ fecha: iso(y), texto: `El dueño reclamó ${usd(monto)}` }) })
  }),
  responder: (a, acepta, avance = nada) => acepta
    ? paso(a, 'reparto', async x => {     // acuerdo: el reparto se hace en la cuenta segura con lo que pidió el dueño
      if (x.estado !== 'reclamo' || !x.reclamo) return
      const r = await escrow.resolver(x, x.reclamo.monto, guardarEn(a.id), avance)
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.reclamo!.respuesta = 'aceptado'; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'acuerdo', fecha: iso(y) }
        y.historial.push({ fecha: iso(y), texto: `El inquilino aceptó el reclamo: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
    })
    : paso(a, 'rechazo', async x => {
      if (x.estado !== 'reclamo') return
      store.cambiar(a.id, y => { if (y.estado !== 'reclamo') return; y.reclamo!.respuesta = 'rechazado'; y.estado = 'mediacion' }, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora')
    }),
  // Sin reclamos al terminar el plazo: el dueño (de prueba) aprueba y Lockumi devuelve el depósito al inquilino.
  cerrarSinReclamo: (a, avance = nada) => modoSolo ? Promise.resolve() : paso(a, 'devolucion', async x => {
    if (x.estado !== 'ventana_reclamo' || x.reclamo || ahoraDe(x) < +new Date(x.ventanaInicio!) + plazoMs(x)) return
    const r = await escrow.devolver(x, guardarEn(a.id), avance)
    store.cambiar(a.id, y => {
      if (y.estado !== 'ventana_reclamo' || y.reclamo) return
      y.estado = 'cerrado'; y.resultado = { inquilino: r.inquilino, dueno: 0, via: 'automatico', fecha: iso(y) }
      y.historial.push({ fecha: iso(y), texto: `Sin reclamos en ${textoPlazo(y)}: ${usd(r.inquilino)} devueltos al inquilino` })
    })
  }),
  decidir: (a, aDueno, _motivo, avance = nada) => paso(a, 'reparto', async x => {
    if (x.estado !== 'mediacion') return
    const r = await escrow.resolver(x, aDueno, guardarEn(a.id), avance)
    store.cambiar(a.id, y => { if (y.estado !== 'mediacion') return; y.estado = 'cerrado'; y.resultado = { dueno: r.dueno, inquilino: r.inquilino, via: 'mediacion', fecha: iso(y) }
      y.historial.push({ fecha: iso(y), texto: `La persona mediadora decidió: ${usd(r.dueno)} al dueño y ${usd(r.inquilino)} al inquilino` }) })
  }),
}

/** Último espacio quitado SIN fotos, solo en memoria, para «Deshacer». */
let recienQuitado: { a: string; cuarto: Cuarto; pos: number } | null = null

const remoto: Acciones = {
  crear: (d, email, cuenta) => servidor.crear(d, email, cuenta),
  firmar: async (a, etapa) => { await servidor.firmar(a.id, etapa) },        // el servidor deduce el rol de la sesión
  marcar: (a, etapa, c, i, e) => servidor.marcar(a.id, etapa, c, i, e).then(() => {}),
  nota: (a, etapa, c, n) => servidor.nota(a.id, etapa, c, n).then(() => {}),
  agregarFoto: (a, etapa, c, f) => servidor.agregarFoto(a.id, etapa, c, f).then(() => {}),
  // Sin Trustless Work el pago queda registrado sin transacción (tx null). Con TW: escrow real en testnet y su hash.
  pagar: async a => { await servidor.registrarPago(a.id, modoTrustless ? await trustless.depositar(a.id) : null) },
  iniciarSalida: a => servidor.iniciarSalida(a.id).then(() => {}),
  reclamar: (a, m, mot, fotos) => servidor.reclamar(a.id, m, mot, fotos).then(() => {}),
  responder: (a, acepta) => servidor.responder(a.id, acepta).then(() => {}),
  async cerrarSinReclamo(a) {
    const cerro = await servidor.cerrarSinReclamo(a.id)
    // Con TW: la plataforma libera el 100 % al inquilino (necesita la aprobación del dueño en la cadena).
    if (modoTrustless && a.escrowId && (cerro || (a.estado === 'cerrado' && !a.liquidacionTx))) await trustless.liberar(a.id)
  },
  ...(modoTrustless ? { aprobarDevolucion: (a: Alquiler) => trustless.aprobarDevolucion(a.id).then(() => {}) } : {}),
  decidir: (a, m, mot) => servidor.decidir(a.id, m, mot).then(() => {}),
  // Espacios en el servidor: solo con VITE_ESPACIOS_SERVIDOR=1, después de aplicar la migración 20261024000000_lk_espacios.sql.
  ...(espaciosServidor ? {
    agregarCuarto: (a: Alquiler, nombre: string, items: string[]) => servidor.agregarCuarto(a.id, nombre, items),
    renombrarCuarto: (a: Alquiler, id: string, nombre: string) => servidor.renombrarCuarto(a.id, id, nombre),
    quitarCuarto: (a: Alquiler, id: string) => servidor.quitarCuarto(a.id, id),
  } : {}),
}

export const acciones: Acciones = modoServidor ? remoto : local
