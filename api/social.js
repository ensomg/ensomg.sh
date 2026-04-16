import { handleSocialRequest } from '../server/social-route.js'

export default async function handler(req, res) {
  return handleSocialRequest(req, res)
}
