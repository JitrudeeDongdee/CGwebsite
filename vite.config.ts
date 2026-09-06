import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honour the PORT the launcher assigns (autoPort); fall back to Vite's default.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined },
})
