import { useEffect, useState } from 'react'
import { fetchRegionalForecast } from '../lib/provider.mjs'

const REFRESH_INTERVAL = 5 * 60 * 1000

// Hosted deployments can reach our server even when its upstream is unavailable.
// A direct, credential-free browser request gives those users a second data path.
async function loadForecast(city, signal) {
  let serverForecast
  try {
    const response = await fetch('/api/forecast?city=' + encodeURIComponent(city), {
      signal: AbortSignal.any([signal, AbortSignal.timeout(8500)]),
      cache: 'no-store',
    })
    if (response.ok) serverForecast = await response.json()
  } catch (error) {
    if (signal.aborted) throw error
  }

  if (serverForecast?.hours?.length) return serverForecast
  try {
    return await fetchRegionalForecast(city, Date.now(), { signal })
  } catch {
    return serverForecast ?? { hours: [], current: null }
  }
}

export default function useForecast(city) {
  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer
    let pending = false
    let lastChecked = 0

    async function refresh() {
      clearTimeout(timer)
      if (pending || document.hidden || controller.signal.aborted) return
      pending = true
      try {
        const data = await loadForecast(city, controller.signal)
        if (!controller.signal.aborted) {
          lastChecked = Date.now()
          setSnapshot({ city, data })
        }
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot({ city, data: { hours: [], current: null } })
      } finally {
        pending = false
        if (!controller.signal.aborted) schedule()
      }
    }

    function schedule() {
      clearTimeout(timer)
      if (!document.hidden) {
        const delay = Math.max(0, REFRESH_INTERVAL - (Date.now() - lastChecked))
        timer = setTimeout(refresh, delay)
      }
    }

    refresh()
    document.addEventListener('visibilitychange', schedule)
    return () => {
      controller.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [city])

  return snapshot?.city === city ? snapshot.data : null
}
