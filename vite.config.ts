import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.hemma.cloud'],
    proxy: {
      '/api': 'http://localhost:3001',
      '/backgrounds': 'http://localhost:3001',
      '/plugins': 'http://localhost:3001',
      '/ws': { target: 'ws://localhost:3001', ws: true }
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true
  }
})
