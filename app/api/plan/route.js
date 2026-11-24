import { handle } from '../../../lib/service.mjs'

export async function POST(request) {
  return handle(request, process.env)
}
