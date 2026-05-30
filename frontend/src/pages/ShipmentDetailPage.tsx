import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, CreditCard } from 'lucide-react'
import { shipmentsApi } from '@/services'
import { TrackingTimeline } from '@/components/shared/TrackingTimeline'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTZS } from '@/utils/cn'

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) return <p>Loading...</p>
  if (!shipment) return <p>Shipment not found</p>

  const booking = shipment.bookings?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold">Shipment Details</h1>
            <ShipmentStatusBadge status={shipment.status} />
          </div>
          {booking && <p className="mt-1 text-sm text-charcoal/60">Tracking: <strong>{booking.tracking_code}</strong></p>}
        </div>
        {booking && (
          <Button asChild>
            <Link to="/payments"><CreditCard className="h-4 w-4" /> Pay Now</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Route</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-amber shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-charcoal/50 uppercase tracking-wide">Pickup</p>
                  <p className="font-medium">{shipment.pickup_address}</p>
                </div>
              </div>
              <div className="ml-2 border-l-2 border-dashed border-forest/20 h-6" />
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-forest shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-charcoal/50 uppercase tracking-wide">Destination</p>
                  <p className="font-medium">{shipment.destination_address}</p>
                </div>
              </div>
              <div className="flex gap-6 pt-2 text-sm text-charcoal/60">
                <span>{shipment.distance_km ?? '—'} km</span>
                <span>{shipment.estimated_duration_minutes ?? '—'} min ETA</span>
                <span className="capitalize">{shipment.urgency} urgency</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cargo Info</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-charcoal/50">Type</span><p className="font-medium capitalize">{shipment.cargo_type}</p></div>
                <div><span className="text-charcoal/50">Weight</span><p className="font-medium">{shipment.weight_tons} tons</p></div>
                <div><span className="text-charcoal/50">Volume</span><p className="font-medium">{shipment.volume_m3 ?? '—'} m³</p></div>
                <div><span className="text-charcoal/50">Refrigerated</span><p className="font-medium">{shipment.requires_refrigeration ? 'Yes' : 'No'}</p></div>
              </div>
              {shipment.description && <p className="mt-4 text-sm text-charcoal/70">{shipment.description}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
            <CardContent><TrackingTimeline status={shipment.status} /></CardContent>
          </Card>

          {booking && (
            <Card>
              <CardHeader><CardTitle className="text-base">Booking</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-display font-bold text-amber">{formatTZS(booking.total_cost)}</p>
                <p className="text-sm text-charcoal/50 mt-1 capitalize">Status: {booking.status}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
