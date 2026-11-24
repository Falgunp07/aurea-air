import { handle } from '../../../lib/service.mjs'

export async function GET(request) {
  return handle(request, process.env)
}
