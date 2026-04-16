import { handleMapRequest } from '../server/map-route.js'

export default async function handler(req, res) {
  return handleMapRequest(req, res)
}
