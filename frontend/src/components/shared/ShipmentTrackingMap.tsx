import { MapCanvas } from '@/components/shared/MapCanvas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

export interface ShipmentMapData {
  pickup_lat?: number | null
  pickup_lng?: number | null
  destination_lat?: number | null
  destination_lng?: number | null
  current_lat?: number | null
  current_lng?: number | null
  pickup?: string | null
  destination?: string | null
  current_region?: string | null
  booking_status?: string | null
}

interface ShipmentTrackingMapProps {
  data: ShipmentMapData
  title?: string
}

const DEFAULT = { lat: -6.7924, lng: 39.2083 }

function resolvePoint(data: ShipmentMapData) {
  const pickup =
    data.pickup_lat != null && data.pickup_lng != null
      ? { lat: data.pickup_lat, lng: data.pickup_lng }
      : null
  const destination =
    data.destination_lat != null && data.destination_lng != null
      ? { lat: data.destination_lat, lng: data.destination_lng }
      : null
  const current =
    data.current_lat != null && data.current_lng != null
      ? { lat: data.current_lat, lng: data.current_lng }
      : pickup

  return { pickup, destination, current }
}

export function ShipmentTrackingMap({ data, title = 'Live Tracking Map' }: ShipmentTrackingMapProps) {
  const { pickup, destination, current } = resolvePoint(data)
  const center = current ?? pickup ?? destination ?? DEFAULT

  const markers = [
    pickup && { lat: pickup.lat, lng: pickup.lng, label: 'A' },
    destination && { lat: destination.lat, lng: destination.lng, label: 'B' },
    current &&
      pickup &&
      (current.lat !== pickup.lat || current.lng !== pickup.lng) && {
        lat: current.lat,
        lng: current.lng,
        label: '🚚',
      },
  ].filter(Boolean) as Array<{ lat: number; lng: number; label: string }>

  const path =
    pickup && destination
      ? [pickup, current && current !== pickup ? current : null, destination].filter(Boolean)
      : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-amber" />
          {title}
        </CardTitle>
        {data.current_region && (
          <Badge variant="secondary">{data.current_region}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <MapCanvas
          center={center}
          zoom={pickup && destination ? 7 : 10}
          markers={markers}
          path={path as Array<{ lat: number; lng: number }>}
          className="h-72"
          interactive
        />
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-charcoal/50">From:</span> {data.pickup ?? '—'}</p>
          <p><span className="text-charcoal/50">To:</span> {data.destination ?? '—'}</p>
        </div>
        {data.booking_status && (
          <p className="text-xs capitalize text-charcoal/50">Status: {data.booking_status.replace(/_/g, ' ')}</p>
        )}
      </CardContent>
    </Card>
  )
}
