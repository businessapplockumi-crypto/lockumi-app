// Estado de espera v2 del pago (solo el paso «Pagar»). Ver docs/estado-espera.md.
// Los pasos salen de las etapas REALES del depósito (services/escrow.ts avisa con `avance` en cada etapa):
// 1 Firmando: todo lo que pasa antes de mandar el depósito (recarga de la cuenta de prueba, dueño de prueba, cuenta segura y,
//   con cuenta propia, la firma en la billetera). 2 Enviando: el depósito firmado va a la red de prueba y se espera su confirmación
//   (avance «Guardando el depósito en la cuenta segura…»). 3 Guardado: la llamada terminó bien y el alquiler quedó anotado.
export type EtapaPago = 0 | 1 | 2 | 3

export const PASOS_PAGO = ['Firmando', 'Enviando', 'Guardado'] as const // LEGAL: revisar
export const ESPERA_PAGO = 'Guardando tu depósito…' // LEGAL: revisar
export const NOTA_ESPERA_PAGO = 'Esto tarda unos segundos. No cierres la app.' // LEGAL: revisar
export const LISTO_PAGO = 'Depósito guardado' // LEGAL: revisar
export const REINTENTO_PAGO = 'Volver a intentar el pago' // LEGAL: revisar
export const BARRA_PAGO = 'Avance del depósito' // LEGAL: revisar (solo lectores de pantalla)
export const LISTA_PASOS = 'Cómo va' // LEGAL: revisar (solo lectores de pantalla)
export const MARCA_PASO = { hecho: ' (listo)', actual: ' (ahora)', futuro: ' (falta)', error: ' (no se pudo)' } as const // LEGAL: revisar (solo lectores de pantalla)

/** Texto de avance de services/escrow.ts → paso. Solo el envío del depósito firmado es «Enviando»; lo anterior es «Firmando». */
export const etapaDeAvance = (texto: string): 1 | 2 => /^Guardando el depósito/.test(texto) ? 2 : 1

/** Lo que se anuncia (role=status) y el aria-valuetext de la barrita. */
export const vozPago = (e: EtapaPago) => e === 3 ? `${LISTO_PAGO}.` : e === 0 ? '' : `Paso ${e} de 3: ${PASOS_PAGO[e - 1]}.` // LEGAL: revisar

/** Barrita: un tercio por paso; dentro del paso se acerca despacio al siguiente sin llegar. `salto` = mitad del tramo (reducir movimiento). */
export function tramoBarra(e: EtapaPago) {
  const n = 3, desde = e <= 1 ? 0 : (e - 1) / n * 100
  if (e === 3) return { desde: (n - 1) / n * 100, hasta: 100, salto: 100, ahora: 100 }
  const hasta = desde + 100 / n * .85, salto = desde + 100 / n / 2
  return { desde, hasta, salto, ahora: Math.round(desde) }
}

export type EstadoPaso = keyof typeof MARCA_PASO
/** Estado de cada paso. `fallo` = paso en el que falló (1..3) o 0. */
export const estadosPasos = (e: EtapaPago, fallo: EtapaPago = 0): EstadoPaso[] => [1, 2, 3].map(i =>
  fallo ? (i < fallo ? 'hecho' : i === fallo ? 'error' : 'futuro')
    : e === 3 || i < e ? 'hecho' : i === e ? 'actual' : 'futuro')
