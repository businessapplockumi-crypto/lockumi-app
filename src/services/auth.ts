// SIMULADO · Interfaz pensada para reemplazar por Cavos (login con correo/social, sin frase semilla).
import type { Rol, Usuario } from '../types'
export interface AuthService {
  login(email: string, metodo: Usuario['metodo'], rol: Rol): Promise<Usuario>
  actual(): Usuario | null
  cambiarRol(rol: Rol): Usuario | null
  salir(): void
}
const K = 'lockumi.usuario'
export const auth: AuthService = {
  async login(email, metodo, rol) {
    await new Promise(r => setTimeout(r, 300))
    const u: Usuario = { email, metodo, rol, nombre: email.split('@')[0] }
    localStorage.setItem(K, JSON.stringify(u)); return u
  },
  actual() { const s = localStorage.getItem(K); return s ? JSON.parse(s) : null },
  cambiarRol(rol) { const u = this.actual(); if (!u) return null; u.rol = rol; localStorage.setItem(K, JSON.stringify(u)); return u },
  salir() { localStorage.removeItem(K) },
}
