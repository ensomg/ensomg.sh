import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { mapPlugin } from './server/map-plugin.js'

function versionPlugin() {
  return {
    name: 'version-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: Date.now() })
      });
    }
  }
}

function discordPlugin() {
  return {
    name: 'discord-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '.well-known/discord',
        source: `dh=067e705497fcc6d2817d3d9326c3c8defa766d50
dh=3f47de1af92af8152112b460b5987520007a42a0
dh=708d872d7307e55548f81d1aabfb211d64b5ee54
dh=fbe0feb01947bcc6d0be040fc0ca7f4395f52c36\n`
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mapPlugin(), versionPlugin(), discordPlugin()],
})
