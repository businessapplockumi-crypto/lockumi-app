import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // absoluta: la app también se sirve desde rutas como /terminos (ver vercel.json)
})
