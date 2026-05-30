import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, CreditCard, AlertTriangle, Truck } from 'lucide-react'
import { shipmentsApi, trackingApi, driversApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { TrackingTimeline } from '@/components/shared/TrackingTimeline'
import { ShipmentTrackingMap } from '@/components/shared/ShipmentTrackingMap'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTZS } from '@/utils/cn'

interface RouteRisk {
  risk_type: string
  location: string
  section: string
  score: number
  delay_minutes: number
  advice: string
}

interface TrackingInfo {
  tracking_code: string
  booking_status: string
  pickup?: string | null
  destination?: string | null
  pickup_lat?: number | null
  pickup_lng?: number | null
  destination_lat?: number | null
  destination_lng?: number | null
  current_lat?: number | null
  current_lng?: number | null
  current_region?: string | null
  route_label?: string
  risks?: RouteRisk[]
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [region, setRegion] = useState('')
  const [deliveryOtp, setDeliveryOtp] = useState('')
  const canManage = user?.role === 'provider' || user?.role === 'admin' || user?.role === 'driver'
  const isDriver = user?.role === 'driver'

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  })

  const booking = shipment?.bookings?.[0]

  const { data: tracking } = useQuery({
    queryKey: ['tracking', booking?.tracking_code],
    queryFn: () => trackingApi.get(booking!.tracking_code).then((r) => r.data as TrackingInfo),
    enabled: !!booking?.tracking_code,
  })

  const bookingStatus = booking?.status ?? tracking?.booking_status ?? 'pending'
  const canAcceptJob = isDriver && bookingStatus === 'pending' && !booking?.driver_id
  const acceptDone = ['confirmed', 'in_transit', 'delivered'].includes(bookingStatus)
  const tripStarted = ['in_transit', 'delivered'].includes(bookingStatus)
  const delivered = bookingStatus === 'delivered'

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shipment', id] })
    queryClient.invalidateQueries({ queryKey: ['tracking', booking?.tracking_code] })
  }

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      trackingApi.updateStatus(booking!.tracking_code, status, deliveryOtp || undefined),
    onSuccess: refresh,
  })

  const checkpoint = useMutation({
    mutationFn: () => trackingApi.checkpoint(booking!.tracking_code, region),
    onSuccess: () => {
      setRegion('')
      refresh()
    },
  })

  const acceptJob = useMutation({
    mutationFn: () => driversApi.accept(booking!.id),
    onSuccess: refresh,
  })

  if (isLoading) return <p>Loading...</p>
  if (!shipment) return <p>Shipment not found</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold">Shipment Details</h1>
            <ShipmentStatusBadge status={shipment.status} />
          </div>
          {booking && (
            <p className="mt-1 text-sm text-charcoal/60">
              Tracking: <strong>{booking.tracking_code}</strong>
              {tracking?.current_region && (
                <span className="ml-2">· Current region: {tracking.current_region}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
        {booking && (
          <Button variant="outline" asChild>
            <Link to="/track" state={{ code: booking.tracking_code }}>Track on Map</Link>
          </Button>
        )}
        {booking && user?.role === 'customer' && (
          <Button asChild>
            <Link to={`/payments?bookingId=${booking.id}`}><CreditCard className="h-4 w-4" /> Pay Now</Link>
          </Button>
        )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Route</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-charcoal/50">Pickup</p>
                  <p className="font-medium">{shipment.pickup_address}</p>
                </div>
              </div>
              <div className="ml-2 h-6 border-l-2 border-dashed border-forest/20" />
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-charcoal/50">Destination</p>
                  <p className="font-medium">{shipment.destination_address}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-charcoal/60">
                <span>{shipment.distance_km ?? '—'} km</span>
                <span>{shipment.estimated_duration_minutes ?? '—'} min ETA</span>
                <span className="capitalize">{shipment.urgency} urgency</span>
              </div>
            </CardContent>
          </Card>

          {(tracking || (shipment.pickup_lat && shipment.destination_lat)) && (
            <ShipmentTrackingMap
              data={{
                pickup: tracking?.pickup ?? shipment.pickup_address,
                destination: tracking?.destination ?? shipment.destination_address,
                pickup_lat: tracking?.pickup_lat ?? shipment.pickup_lat,
                pickup_lng: tracking?.pickup_lng ?? shipment.pickup_lng,
                destination_lat: tracking?.destination_lat ?? shipment.destination_lat,
                destination_lng: tracking?.destination_lng ?? shipment.destination_lng,
                current_lat: tracking?.current_lat,
                current_lng: tracking?.current_lng,
                current_region: tracking?.current_region,
                booking_status: tracking?.booking_status ?? booking?.status,
              }}
            />
          )}

          {tracking?.risks && tracking.risks.length > 0 && (
            <Card className="border-amber/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber" />
                  Route Alerts — {tracking.route_label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tracking.risks.map((risk, i) => (
                  <div key={i} className="rounded-lg border border-forest/10 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning">{risk.risk_type}</Badge>
                      <span className="font-medium">{risk.location}</span>
                      <span className="text-charcoal/50">Risk {risk.score}/100 · ~{risk.delay_minutes}min delay</span>
                    </div>
                    <p className="mt-1 text-charcoal/60">{risk.section}</p>
                    <p className="mt-1 text-charcoal/70">{risk.advice}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {canManage && booking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" /> Delivery Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canAcceptJob && (
                  <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 text-sm">
                    <p className="font-medium text-charcoal">Job available — first driver to accept gets assigned.</p>
                    <Button className="mt-2" onClick={() => acceptJob.mutate()} disabled={acceptJob.isPending}>
                      Accept This Delivery
                    </Button>
                  </div>
                )}
                {user?.role === 'provider' && bookingStatus === 'pending' && !booking.driver_id && (
                  <p className="text-sm text-charcoal/60">
                    Waiting for a driver from your fleet to accept. Add drivers under My Fleet, or assign one as admin.
                  </p>
                )}
                {booking.driver_id && bookingStatus !== 'pending' && (
                  <p className="text-sm text-charcoal/60">Driver assigned · Status: {bookingStatus.replace(/_/g, ' ')}</p>
                )}
                <p className="text-sm text-charcoal/60">
                  Complete each step in order. Completed steps cannot be repeated.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate('confirmed')}
                    disabled={updateStatus.isPending || acceptDone || canAcceptJob || (isDriver && !booking.driver_id)}
                  >
                    {acceptDone ? '✓ Cargo Accepted' : 'Accept Cargo'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate('in_transit')}
                    disabled={updateStatus.isPending || !acceptDone || tripStarted}
                  >
                    {tripStarted ? '✓ Trip Started' : 'Start Trip'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate('delivered')}
                    disabled={updateStatus.isPending || !tripStarted || delivered || !deliveryOtp}
                  >
                    {delivered ? '✓ Delivered' : 'Mark Delivered'}
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Update Region (checkpoint SMS)</Label>
                    <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Kilosa, Morogoro" className="mt-1.5" />
                    <Button size="sm" className="mt-2" onClick={() => checkpoint.mutate()} disabled={!region || checkpoint.isPending || delivered}>
                      Send Checkpoint SMS
                    </Button>
                  </div>
                  <div>
                    <Label>Delivery OTP (required to complete)</Label>
                    <Input value={deliveryOtp} onChange={(e) => setDeliveryOtp(e.target.value)} placeholder="4-digit OTP from customer SMS" className="mt-1.5" disabled={delivered} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                <p className="font-display text-2xl font-bold text-amber">{formatTZS(booking.total_cost)}</p>
                <p className="mt-1 text-sm capitalize text-charcoal/50">Status: {booking.status}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
