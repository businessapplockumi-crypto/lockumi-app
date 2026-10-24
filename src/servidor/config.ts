// Servidor compartido (Supabase). Se activa solo si hay URL y clave pública; si no, la app sigue en modo demo local.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const modoServidor = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''
/** Plazo de reclamos al crear (segundos). 7 días por defecto; para la prueba en testnet se puede acortar (mínimo 60). */
export const VENTANA_SEGUNDOS = Math.max(60, Math.min(604800, Number(import.meta.env.VITE_VENTANA_SEGUNDOS ?? 604800) || 604800))
export const BUCKET_FOTOS = 'lk-fotos'
/** «+ Agregar espacio» en el servidor: apagado hasta que se aplique supabase/migrations/20261024000000_lk_espacios.sql (sin aplicar). */
export const espaciosServidor = modoServidor && import.meta.env.VITE_ESPACIOS_SERVIDOR === '1'
/** Trustless Work real (escrow en testnet) a través de /api/tw. Requiere modoServidor y las variables del servidor. */
export const modoTrustless = modoServidor && import.meta.env.VITE_TRUSTLESS === '1'
/** Red de prueba sin base de datos (VITE_TRUSTLESS=1 sin Supabase): aviso fijo de red de prueba, dueño de prueba rotulado
 *  (custodiado por Lockumi) y mediador rotulado «Simulado». Es lo que corre en producción. */
export const modoPrueba = !modoServidor && import.meta.env.VITE_TRUSTLESS === '1'
/** Fase 1 mínima: 5 pasos REALES en Stellar testnet (Real.tsx → /api/solo). Solo si además VITE_FLUJO=solo. */
export const modoSolo = modoPrueba && import.meta.env.VITE_FLUJO === 'solo'
/** Interfaz completa del video (8 pasos: contrato, firmas, depósito, actas con fotos, 7 días, mediador) en un solo aparato,
 *  sin «Ver como»: tú eres el inquilino; el dueño de prueba firma y confirma solo, y los reclamos y la decisión de la persona
 *  mediadora se hacen con botones rotulados («Hacer un reclamo como dueño de prueba», «Resolver el reclamo (simulación)»).
 *  Opción por defecto con VITE_TRUSTLESS=1. */
export const modoVideo = modoPrueba && !modoSolo
/** ¿El depósito se mueve de verdad en Stellar testnet (Trustless Work)? Sí en la red de prueba (modoSolo y modoVideo):
 *  services/escrow.ts usa /api/solo en cada paso. Sin VITE_TRUSTLESS=1 (demo local) el escrow sigue simulado. */
export const escrowReal = modoPrueba
