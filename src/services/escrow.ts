// SIMULADO · Interfaz pensada para reemplazar por Trustless Work (escrow con liberación multiparte).
export interface EscrowService {
  crear(alquilerId: string, monto: number): Promise<{ escrowId: string }>
  depositar(escrowId: string, monto: number): Promise<{ ok: true; fecha: string }>
  // Liberar requiere aprobación de ambas partes (o del mediador): nadie libera solo.
  aprobarLiberacion(escrowId: string, parte: 'dueno'|'inquilino'|'mediador', repartoInquilino: number): Promise<{ aprobaciones: string[] }>
}
const aprob: Record<string, Set<string>> = {}
export const escrow: EscrowService = {
  async crear(id) { return { escrowId: 'sim-' + id } },
  async depositar() { return { ok: true, fecha: new Date().toISOString() } },
  async aprobarLiberacion(escrowId, parte) { (aprob[escrowId] ??= new Set()).add(parte); return { aprobaciones: [...aprob[escrowId]] } },
}
