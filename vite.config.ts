import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves from /tetris-synthesia/; local dev stays at the root
  base: command === 'build' ? '/tetris-synthesia/' : '/',
  server: { port: 5173, strictPort: true },
}))
