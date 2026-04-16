import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { mapPlugin } from './server/map-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mapPlugin()],
})
