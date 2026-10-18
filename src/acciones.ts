// Acciones del flujo. Las pantallas llaman a estas funciones; según la configuración van al servidor compartido
// (Supabase, dos aparatos) o al almacenamiento local de la demo (un aparato, con "Ver como").
import { store, ahoraDe, actaVacia } from './store'
import { escrow } from './services/escrow'
import { firmar as firmarLocal, ambos, NOMBRE } from './flujo'
import { usd } from './ui'
import type { Alquiler, Foto, Rol } from './types'
import { modoServidor, modoTrustless, modoSolo } from './servidor/config'
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
  crear(d: { direccion: string; monto: number; inicio: string; fin: string; reglas: string[]; inquilinoEmail: string }, email: string, cuenta?: string): Promise<{ id: string; link?: string }>
  firmar(a: Alquiler, etapa: Etapa, rol: Rol): Promise<void>
  marcar(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, item: number, estado: 'bien' | 'detalle'): Promise<void>
  nota(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, nota: string): Promise<void>
  agregarFoto(a: Alquiler, etapa: 'entrada' | 'salida', cuarto: number, f: Foto): Promise<void>
  pagar(a: Alquiler): Promise<void>
  iniciarSalida(a: Alquiler): Promise<void>
  reclamar(a: Alquiler, monto: number, motivo: string, fotos: Foto[]): Promise<void>
  responder(a: Alquiler, acepta: boolean): Promise<void>
  cerrarSinReclamo(a: Alquiler): Promise<void>
  decidir(a: Alquiler, montoDueno: number, motivo?: string): Promise<void>
  /** Solo con Trustless Work real: el dueño aprueba en la cadena devolver el depósito. */
  aprobarDevolucion?(a: Alquiler): Promise<void>
}

const local: Acciones = {
  async crear(d, email) {
    const a = store.crear({ ...d, duenoEmail: email })
    // Fase 1 (testnet real): la cuenta segura se crea en la red al depositar (Real.tsx → /api/solo).
    if (modoSolo) { store.cambiar(a.id, x => { x.red = { txs: {} } }); return { id: a.id } }
    const { escrowId } = await escrow.crear(a.id, d.monto); store.cambiar(a.id, x => { x.escrowId = escrowId }); return { id: a.id }
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
  async marcar(a, etapa, cuarto, item, estado) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].items[item].estado = estado; ac.firmas = {} }) },
  async nota(a, etapa, cuarto, nota) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].nota = nota; ac.firmas = {} }) },
  async agregarFoto(a, etapa, cuarto, f) { store.cambiar(a.id, x => { const ac = x[etapa]!; ac.cuartos[cuarto].fotos.push(f); ac.firmas = {} }) },
  async pagar(a) {
    const r = await escrow.depositar(a.escrowId ?? 'sim-' + a.id, a.monto)
    store.cambiar(a.id, x => { x.estado = 'fotos_entrada'; x.pago = r.fecha; x.escrowId ??= 'sim-' + a.id }, `Depósito de ${usd(a.monto)} pagado y guardado`)
  },
  async iniciarSalida(a) { store.cambiar(a.id, x => { x.estado = 'salida'; x.salida = actaVacia() }, 'Empezaron las fotos de salida') },
  async reclamar(a, monto, motivo, fotos) { store.cambiar(a.id, x => { x.estado = 'reclamo'; x.reclamo = { monto, motivo, fotos, fecha: iso(x) } }, `El dueño reclamó ${usd(monto)}`) },
  async responder(a, acepta) {
    const r = a.reclamo!
    if (acepta) {
      await escrow.aprobarLiberacion(a.escrowId!, 'inquilino', a.monto - r.monto); await escrow.aprobarLiberacion(a.escrowId!, 'dueno', a.monto - r.monto)
      store.cambiar(a.id, x => { x.reclamo!.respuesta = 'aceptado'; x.estado = 'cerrado'; x.resultado = { dueno: r.monto, inquilino: x.monto - r.monto, via: 'acuerdo', fecha: iso(x) } },
        `El inquilino aceptó el reclamo: ${usd(r.monto)} al dueño y ${usd(a.monto - r.monto)} al inquilino`)
    } else store.cambiar(a.id, x => { x.reclamo!.respuesta = 'rechazado'; x.estado = 'mediacion' }, 'El inquilino no aceptó el reclamo. Pasa a una persona mediadora')
  },
  async cerrarSinReclamo(a) {
    if (modoSolo) return   // fase 1: se cierra con la aprobación y la devolución reales (CierreReal)
    store.cambiar(a.id, x => {
      if (x.estado !== 'ventana_reclamo' || x.reclamo || ahoraDe(x) < +new Date(x.ventanaInicio!) + plazoMs(x)) return
      x.estado = 'cerrado'; x.resultado = { inquilino: x.monto, dueno: 0, via: 'automatico', fecha: iso(x) }
      x.historial.push({ fecha: iso(x), texto: `Sin reclamos en 7 días: ${usd(x.monto)} devueltos al inquilino` })
    })
  },
  async decidir(a, aDueno) {
    await escrow.aprobarLiberacion(a.escrowId!, 'mediador', a.monto - aDueno)
    store.cambiar(a.id, x => { x.estado = 'cerrado'; x.resultado = { dueno: aDueno, inquilino: x.monto - aDueno, via: 'mediacion', fecha: iso(x) } },
      `La persona mediadora decidió: ${usd(aDueno)} al dueño y ${usd(a.monto - aDueno)} al inquilino`)
  },
}

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
}

export const acciones: Acciones = modoServidor ? remoto : local
