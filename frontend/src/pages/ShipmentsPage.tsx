import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { shipmentsApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { DataTable } from '@/components/shared/DataTable'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ColumnDef } from '@tanstack/react-table'
import type { Shipment } from '@/types'

const columns: ColumnDef<Shipment>[] = [
  {
    id: 'route',
    header: 'Route',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.pickup_address}</p>
        <p className="text-xs text-charcoal/50">→ {row.original.destination_address}</p>
      </div>
    ),
  },
  { id: 'weight', header: 'Weight', cell: ({ row }) => `${row.original.weight_tons ?? '—'} tons` },
  { id: 'urgency', header: 'Urgency', cell: ({ row }) => <span className="capitalize">{row.original.urgency}</span> },
  { id: 'status', header: 'Status', cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} /> },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link to={`/shipments/${row.original.id}`} className="text-sm font-medium text-amber hover:underline">
        Details →
      </Link>
    ),
  },
]

const pageCopy = {
  customer: {
    title: 'My Shipments',
    description: 'View quotes, bookings, and live tracking for your cargo',
    showCreate: true,
    empty: 'No shipments yet. Book your first delivery to get started.',
  },
  provider: {
    title: 'Available Jobs',
    description: 'Shipments assigned to your company',
    showCreate: false,
    empty: 'No assigned jobs yet. Complete your provider profile and wait for bookings.',
  },
  admin: {
    title: 'All Shipments',
    description: 'Platform-wide shipment overview',
    showCreate: false,
    empty: 'No shipments in the system.',
  },
  driver: {
    title: 'My Deliveries',
    description: 'Assigned delivery jobs',
    showCreate: false,
    empty: 'No deliveries assigned.',
  },
}

export default function ShipmentsPage() {
  const { user } = useAuth()
  const role = user?.role ?? 'customer'
  const copy = pageCopy[role]

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.list().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{copy.title}</h1>
          <p className="text-charcoal/60">{copy.description}</p>
        </div>
        {copy.showCreate && (
          <Button asChild>
            <Link to="/shipments/create"><PlusCircle className="h-4 w-4" /> New Shipment</Link>
          </Button>
        )}
      </div>

      {role === 'customer' && (
        <Card className="border-forest/10 bg-forest/5">
          <CardContent className="p-4 text-sm text-charcoal/70">
            As a customer you can: create shipments and get quotes, book a provider from quotes or marketplace,
            run reverse auctions, book shared cargo space, pay via mobile money, and track deliveries on the map.
            You cannot manage fleet, approve providers, or publish shared cargo listings.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : shipments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-charcoal/50">{copy.empty}</CardContent></Card>
      ) : (
        <DataTable columns={columns} data={shipments} />
      )}
    </div>
  )
}
