// SIMULADO · Interfaz pensada para reemplazar por Blend (rendimiento en USDC).
// El rendimiento es VARIABLE y NO GARANTIZADO. No se promete ninguna tasa.
export const REPARTO = { inquilino: 0.4, dueno: 0.4, lockumi: 0.2 } as const
export interface YieldService {
  activar(escrowId: string): Promise<void>
  desactivar(escrowId: string): Promise<void>
  tasa(): Promise<{ tipo: 'variable'; ejemplo: null }>
}
export const rendimiento: YieldService = {
  async activar() {}, async desactivar() {},
  async tasa() { return { tipo: 'variable', ejemplo: null } },
}
