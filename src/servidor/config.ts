// Servidor compartido (Supabase). Se activa solo si hay URL y clave pública; si no, la app sigue en modo demo local.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const modoServidor = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''
/** Plazo de reclamos al crear (segundos). 7 días por defecto; para la prueba en testnet se puede acortar (mínimo 60). */
export const VENTANA_SEGUNDOS = Math.max(60, Math.min(604800, Number(import.meta.env.VITE_VENTANA_SEGUNDOS ?? 604800) || 604800))
export const BUCKET_FOTOS = 'lk-fotos'
/** Trustless Work real (escrow en testnet) a través de /api/tw. Requiere modoServidor y las variables del servidor. */
export const modoTrustless = modoServidor && import.meta.env.VITE_TRUSTLESS === '1'
/** Fase 1: una sola persona, REAL en Stellar testnet y SIN base de datos (VITE_TRUSTLESS=1 sin Supabase). Proxy /api/solo. */
export const modoSolo = !modoServidor && import.meta.env.VITE_TRUSTLESS === '1'
