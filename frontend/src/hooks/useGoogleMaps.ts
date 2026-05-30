import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

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

export async function loadGoogleMaps(): Promise<typeof google> {
  if (!loaderPromise) {
    setOptions({
      key: getMapsApiKey(),
      v: 'weekly',
      libraries: ['places'],
    })
    loaderPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('marker'),
    ]).then(() => google)
  }
  return loaderPromise
}
