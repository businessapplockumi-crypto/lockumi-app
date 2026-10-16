// SIMULADO · Interfaz preparada para Cavos (@cavos/kit, clase CavosAuth) sin agregar la dependencia.
// Forma esperada de CavosAuth: getGoogleOAuthUrl, getAppleOAuthUrl, handleCallback, sendOtp, verifyOtp.
// Para conectar: implementar CavosLike con el SDK real y reemplazar `proveedor` abajo. Sin llaves en el código.
import type { Usuario } from '../types'

export interface CavosLike {
  getGoogleOAuthUrl(redirectUri: string): Promise<string>
  getAppleOAuthUrl(redirectUri: string): Promise<string>
  handleCallback(params: URLSearchParams): Promise<{ email: string; nombre?: string }>
  sendOtp(email: string): Promise<void>
  verifyOtp(email: string, code: string): Promise<{ email: string; nombre?: string }>
}

/** Proveedor simulado: no hay red ni billetera; cualquier código de 6 dígitos es válido. */
const simulado: CavosLike = {
  async getGoogleOAuthUrl() { return '#sim-google' },
  async getAppleOAuthUrl() { return '#sim-apple' },
  async handleCallback(p) { return { email: p.get('email') ?? 'katherine@ejemplo.cr', nombre: 'Katherine' } },
  async sendOtp() { await espera(400) },
  async verifyOtp(email, code) { await espera(400); if (!/^\d{6}$/.test(code)) throw new Error('codigo'); return { email } },
}
const proveedor: CavosLike = simulado
const espera = (ms: number) => new Promise(r => setTimeout(r, ms))
const K = 'lockumi.usuario'
const guardar = (u: Usuario) => { localStorage.setItem(K, JSON.stringify(u)); return u }
const aUsuario = (email: string, metodo: Usuario['metodo'], nombre?: string): Usuario => ({ email, metodo, nombre: nombre ?? email.split('@')[0] })

export interface AuthService {
  loginGoogle(): Promise<Usuario>
  loginApple(): Promise<Usuario>
  sendOtp(email: string): Promise<void>
  verifyOtp(email: string, code: string): Promise<Usuario>
  handleCallback(params: URLSearchParams, metodo: 'google' | 'apple'): Promise<Usuario>
  actual(): Usuario | null
  salir(): void
}
export const auth: AuthService = {
  // Con Cavos real: location.href = await proveedor.getGoogleOAuthUrl(origen) y luego handleCallback al volver.
  async loginGoogle() { await proveedor.getGoogleOAuthUrl(location.origin); await espera(500); return this.handleCallback(new URLSearchParams(), 'google') },
  async loginApple() { await proveedor.getAppleOAuthUrl(location.origin); await espera(500); return this.handleCallback(new URLSearchParams(), 'apple') },
  async handleCallback(params, metodo) { const r = await proveedor.handleCallback(params); return guardar(aUsuario(r.email, metodo, r.nombre)) },
  sendOtp: (email) => proveedor.sendOtp(email),
  async verifyOtp(email, code) { const r = await proveedor.verifyOtp(email, code); return guardar(aUsuario(r.email, 'correo', r.nombre)) },
  actual() { try { const s = localStorage.getItem(K); return s ? JSON.parse(s) : null } catch { return null } },
  salir() { localStorage.removeItem(K) },
}
