import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Handle OAuth callback route during development
    // In production, Caddy will serve this route
  },
  build: {
    outDir: 'dist',
  },
})
