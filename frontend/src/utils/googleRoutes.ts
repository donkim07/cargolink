import { loadGoogleMaps } from '@/hooks/useGoogleMaps'

export interface LatLng {
  lat: number
  lng: number
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[] = []
): Promise<LatLng[]> {
  await loadGoogleMaps()

  return new Promise((resolve, reject) => {
    const service = new google.maps.DirectionsService()
    service.route(
      {
        origin,
        destination,
        waypoints: waypoints.map((point) => ({ location: point, stopover: true })),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        region: 'tz',
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result?.routes[0]) {
          reject(new Error(status))
          return
        }

        const route = result.routes[0]
        if (route.overview_path?.length) {
          resolve(route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })))
          return
        }

        const encoded = route.overview_polyline
        if (encoded) {
          const points =
            typeof encoded === 'string'
              ? encoded
              : 'points' in encoded
                ? (encoded as { points: string }).points
                : null
          if (points) {
            resolve(decodePolyline(points))
            return
          }
        }

        reject(new Error('No route geometry'))
      }
    )
  })
}
