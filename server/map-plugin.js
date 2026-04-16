import { handleMapRequest } from './map-route.js'
import { handleSocialRequest } from './social-route.js'

function attachRoutes(server) {
  server.middlewares.use('/api/map', handleMapRequest)
  server.middlewares.use('/api/social', handleSocialRequest)
}

export function mapPlugin() {
  return {
    name: 'local-map-route',
    configureServer(server) {
      attachRoutes(server)
    },
    configurePreviewServer(server) {
      attachRoutes(server)
    },
  }
}
