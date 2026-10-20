// Vite para reproducir con sesión: la app en localhost:5173 (Cavos acepta localhost) y /api/solo al proxy local (proxy-api.mjs).
// Uso (desde la raíz del repo): VITE_TRUSTLESS=1 VITE_CAVOS_APP_ID=… npx vite --config scripts/saldo0-login/vite.repro.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({ plugins: [react()], base: '/', server: { port: 5173, strictPort: true, proxy: { '/api/solo': 'http://localhost:8797' } } })
