import { useSyncExternalStore } from 'react'
import type { Alquiler } from './types'
const K = 'lockumi.alquileres'
const ahora = () => new Date().toISOString()
// Datos de ejemplo (ficticios) para la demo.
const semilla = (): Alquiler[] => [
  { id:'a1', direccion:'Apartamento ejemplo · Escazú', monto:800, moneda:'USD', inicio:'2026-11-01', fin:'2027-10-31',
    reglas:['No se permiten mascotas','Pintura de paredes a cargo del dueño'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'inquilino@ejemplo.cr',
    estado:'apartado', rendimiento:false, historial:[{fecha:'2026-10-10T15:00:00Z',texto:'Alquiler creado'},{fecha:'2026-10-12T15:00:00Z',texto:'Acta de entrada firmada por ambas partes'},{fecha:'2026-10-13T15:00:00Z',texto:'Depósito apartado en escrow'}] },
  { id:'a2', direccion:'Casa ejemplo · Heredia centro', monto:600, moneda:'USD', inicio:'2026-12-01', fin:'2027-05-31',
    reglas:['Jardín a cargo del inquilino'], duenoEmail:'katherine@ejemplo.cr', inquilinoEmail:'otra@ejemplo.cr',
    estado:'entrada', rendimiento:false, historial:[{fecha:'2026-10-15T15:00:00Z',texto:'Alquiler creado'}] },
]
let datos: Alquiler[] = (() => { const s = localStorage.getItem(K); return s ? JSON.parse(s) : semilla() })()
const subs = new Set<() => void>()
const guardar = () => { localStorage.setItem(K, JSON.stringify(datos)); subs.forEach(f => f()) }
export const store = {
  todos: () => datos,
  obtener: (id: string) => datos.find(a => a.id === id),
  crear(a: Omit<Alquiler,'id'|'estado'|'historial'|'rendimiento'>) {
    const n: Alquiler = { ...a, id: 'a' + Date.now().toString(36), estado:'entrada', rendimiento:false, historial:[{fecha:ahora(),texto:'Alquiler creado'}] }
    datos = [n, ...datos]; guardar(); return n
  },
  reiniciar() { datos = semilla(); guardar() },
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
}
export const useAlquileres = () => useSyncExternalStore(store.subscribe, store.todos)
