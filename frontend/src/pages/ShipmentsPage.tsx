import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import { shipmentsApi } from '@/services'
import { DataTable } from '@/components/shared/DataTable'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
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
      <Link to={`/shipments/${row.original.id}`} className="text-amber font-medium text-sm hover:underline">
        Details →
      </Link>
    ),
  },
]

export default function ShipmentsPage() {
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.list().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Shipments</h1>
          <p className="text-charcoal/60">Track and manage your cargo</p>
        </div>
        <Button asChild>
          <Link to="/shipments/create"><PlusCircle className="h-4 w-4" /> New Shipment</Link>
        </Button>
      </div>
      {isLoading ? <p>Loading...</p> : <DataTable columns={columns} data={shipments} />}
    </div>
  )
}
