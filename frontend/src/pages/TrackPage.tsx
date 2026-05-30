import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { shipmentsApi, trackingApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { ShipmentTrackingMap } from '@/components/shared/ShipmentTrackingMap'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import type { Shipment } from '@/types'

interface TrackingInfo {
  tracking_code: string
  booking_status: string
  pickup?: string
  destination?: string
  pickup_lat?: number
  pickup_lng?: number
  destination_lat?: number
  destination_lng?: number
  current_lat?: number
  current_lng?: number
  current_region?: string
}

export default function TrackPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [code, setCode] = useState('')
  const [searchCode, setSearchCode] = useState('')

  useEffect(() => {
    const fromState = (location.state as { code?: string } | null)?.code
    if (fromState) {
      setCode(fromState)
      setSearchCode(fromState)
    }
  }, [location.state])

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.list().then((r) => r.data),
  })

  const { data: tracking, isLoading } = useQuery({
    queryKey: ['tracking', searchCode],
    queryFn: () => trackingApi.get(searchCode).then((r) => r.data as TrackingInfo),
    enabled: searchCode.length > 3,
  })

  const trackableShipments = shipments.filter(
    (s) => s.bookings?.length || s.pickup_lat || s.status !== 'pending'
  )

  const columns: ColumnDef<Shipment>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: ({ row }) => (
        <div>
          <p className="font-medium truncate max-w-[200px]">{row.original.pickup_address}</p>
          <p className="text-xs text-charcoal/50 truncate max-w-[200px]">→ {row.original.destination_address}</p>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} /> },
    {
      id: 'tracking',
      header: 'Tracking',
      cell: ({ row }) => row.original.bookings?.[0]?.tracking_code ?? '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const trackingCode = row.original.bookings?.[0]?.tracking_code
        return (
          <div className="flex gap-2">
            {trackingCode && (
              <button
                type="button"
                className="text-sm font-medium text-amber hover:underline"
                onClick={() => {
                  setCode(trackingCode)
                  setSearchCode(trackingCode)
                }}
              >
                Map
              </button>
            )}
            <Link to={`/shipments/${row.original.id}`} className="text-sm font-medium text-amber hover:underline">
              Details →
            </Link>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Track Shipment</h1>
        <p className="text-charcoal/60">
          Enter a tracking code or pick from your {user?.role === 'provider' ? 'assigned jobs' : 'shipments'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tracking code e.g. CL-2026-ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && code.trim().length >= 4 && setSearchCode(code.trim())}
        />
        <Button onClick={() => setSearchCode(code.trim())} disabled={code.trim().length < 4}>
          <Search className="h-4 w-4" /> Track
        </Button>
      </div>

      {isLoading && searchCode && <p>Loading tracking data...</p>}

      {tracking && (
        <ShipmentTrackingMap
          data={{
            pickup: tracking.pickup,
            destination: tracking.destination,
            pickup_lat: tracking.pickup_lat,
            pickup_lng: tracking.pickup_lng,
            destination_lat: tracking.destination_lat,
            destination_lng: tracking.destination_lng,
            current_lat: tracking.current_lat,
            current_lng: tracking.current_lng,
            current_region: tracking.current_region,
            booking_status: tracking.booking_status,
          }}
        />
      )}

      {trackableShipments.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Your Shipments</h2>
          <DataTable columns={columns} data={trackableShipments} />
        </div>
      )}

      {searchCode && !isLoading && !tracking && (
        <Card>
          <CardContent className="p-6 text-center text-charcoal/50">
            No tracking found for {searchCode}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
