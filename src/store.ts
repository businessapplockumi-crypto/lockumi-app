import { useSyncExternalStore } from 'react'
import type { Acta, Alquiler, Rol } from './types'
import { fotoEjemplo } from './demoFotos'
const K = 'lockumi.alquileres.v2'
export const DIA = 86_400_000
const CUARTOS: [string, string[]][] = [
  ['Sala', ['Paredes y pintura', 'Piso', 'Ventanas y cortinas']],
  ['Cocina', ['Cocina y horno', 'Fregadero y grifería', 'Muebles']],
  ['Dormitorio', ['Paredes y pintura', 'Clóset', 'Puerta y llavín']],
  ['Baño', ['Ducha', 'Inodoro y lavamanos', 'Azulejos']],
]
export const actaVacia = (): Acta => ({ firmas: {}, cuartos: CUARTOS.map(([nombre, items]) => ({ nombre, nota: '', fotos: [], items: items.map(texto => ({ texto, estado: null })) })) })
const actaLista = (fecha: string): Acta => ({ firmas: { dueno: fecha, inquilino: fecha }, cuartos: CUARTOS.map(([nombre, items], i) => ({ nombre, nota: '',
  fotos: [{ src: fotoEjemplo(nombre, 'entrada', i), por: i % 2 ? 'inquilino' : 'dueno', fecha }], items: items.map(texto => ({ texto, estado: 'bien' as const })) })) })
// Datos de ejemplo (ficticios) para la demo.
const semilla = (): Alquiler[] => [
  { id:'a1', direccion:'Apartamento ejemplo · Escazú', monto:800, moneda:'USD', inicio:'2026-11-01', fin:'2027-10-31',
    reglas:['No se permiten mascotas','Pintura de paredes a cargo del dueño'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'inquilino@ejemplo.cr',
    estado:'apartado', rendimiento:false, escrowId:'sim-a1', entrada: actaLista('2026-10-12T15:00:00Z'), pago:'2026-10-13T15:00:00Z', diasSimulados:0,
    historial:[{fecha:'2026-10-10T15:00:00Z',texto:'Alquiler creado'},{fecha:'2026-10-12T15:00:00Z',texto:'Acta de entrada firmada por ambas partes'},{fecha:'2026-10-13T15:00:00Z',texto:'Depósito apartado en escrow'}] },
  { id:'a2', direccion:'Casa ejemplo · Heredia centro', monto:600, moneda:'USD', inicio:'2026-12-01', fin:'2027-05-31',
    reglas:['Jardín a cargo del inquilino'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'otra@ejemplo.cr',
    estado:'entrada', rendimiento:false, escrowId:'sim-a2', entrada: actaVacia(), diasSimulados:0, historial:[{fecha:'2026-10-15T15:00:00Z',texto:'Alquiler creado'}] },
]
let datos: Alquiler[] = (() => { try { const s = localStorage.getItem(K); return s ? JSON.parse(s) : semilla() } catch { return semilla() } })()
const subs = new Set<() => void>()
let avisoEspacio = false
const guardar = () => {
  try { localStorage.setItem(K, JSON.stringify(datos)); avisoEspacio = false } catch { avisoEspacio = true }
  subs.forEach(f => f())
}
export const ahoraReal = () => new Date().toISOString()
/** Reloj de la demo: hora real + días simulados de ese alquiler. */
export const ahoraDe = (a: Alquiler) => Date.now() + a.diasSimulados * DIA
export const store = {
  todos: () => datos,
  obtener: (id: string) => datos.find(a => a.id === id),
  sinEspacio: () => avisoEspacio,
  crear(a: Pick<Alquiler,'direccion'|'monto'|'inicio'|'fin'|'reglas'|'duenoEmail'|'inquilinoEmail'>) {
    const n: Alquiler = { ...a, moneda:'USD', id: 'a' + Date.now().toString(36), estado:'entrada', rendimiento:false, entrada: actaVacia(), diasSimulados: 0,
      historial:[{fecha:ahoraReal(),texto:'Alquiler creado e invitación enviada al inquilino'}] }
    datos = [n, ...datos]; guardar(); return n
  },
  /** Aplica un cambio inmutable y, si se indica, agrega un evento al historial. */
  cambiar(id: string, fn: (a: Alquiler) => void, evento?: string) {
    datos = datos.map(a => {
      if (a.id !== id) return a
      const c: Alquiler = structuredClone(a); fn(c)
      if (evento) c.historial.push({ fecha: new Date(ahoraDe(c)).toISOString(), texto: evento })
      return c
    }); guardar()
  },
  reiniciar() { datos = semilla(); guardar() },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
}
export const useAlquileres = () => useSyncExternalStore(store.subscribe, store.todos)
export const actaCompleta = (a: Acta) => a.cuartos.every(c => c.fotos.length > 0 && c.items.every(i => i.estado))
export const firmo = (a: Acta, r: Rol) => Boolean(a.firmas[r])
