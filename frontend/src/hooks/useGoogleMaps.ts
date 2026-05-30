import { Loader } from '@googlemaps/js-api-loader'

let loaderPromise: Promise<typeof google> | null = null

function getMapsApiKey(): string {
  const key =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_KEY
  if (!key) {
    throw new Error('Google Maps API key not configured')
  }
  return key
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: getMapsApiKey(),
      version: 'weekly',
      libraries: ['places'],
    })
    loaderPromise = loader.load()
  }
  return loaderPromise
}

export { Loader }
