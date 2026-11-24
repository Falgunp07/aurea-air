const MAX_BODY_BYTES = 8192

export class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function readProfile(request) {
  const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (mediaType !== 'application/json') throw new RequestError(415, 'Send JSON data.')
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Routine data is too large.')
  }

  const reader = request.body?.getReader()
  if (!reader) throw new RequestError(400, 'Enter a routine.')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let total = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new RequestError(413, 'Routine data is too large.')
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } catch (error) {
    if (error instanceof RequestError) throw error
    throw new RequestError(400, 'Invalid JSON.')
  } finally {
    reader.releaseLock()
  }
}
