import { useEffect, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let initialized = false
let initPromise: Promise<void> | null = null

async function ensureGoogleMaps(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) throw new Error('Google Maps API key not configured')
    setOptions({ key, v: 'weekly' })
    initPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('marker'),
    ]).then(() => {
      initialized = true
    })
  }
  await initPromise
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(initialized)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureGoogleMaps()
      .then(() => setReady(true))
      .catch((err: Error) => setError(err.message || 'Failed to load Google Maps'))
  }, [])

  return { maps: ready ? google : null, error, ready }
}
