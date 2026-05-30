import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Package, DollarSign, CheckCircle, Clock, Truck, PlusCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { shipmentsApi, providersApi } from '@/services'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { formatTZS } from '@/utils/cn'
import type { ColumnDef } from '@tanstack/react-table'
import type { Shipment } from '@/types'

const shipmentColumns: ColumnDef<Shipment>[] = [
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
  { id: 'cargo', header: 'Cargo', cell: ({ row }) => <span className="capitalize">{row.original.cargo_type}</span> },
  { id: 'status', header: 'Status', cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} /> },
  {
    id: 'distance',
    header: 'Distance',
    cell: ({ row }) => (row.original.distance_km ? `${row.original.distance_km} km` : '—'),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link to={`/shipments/${row.original.id}`} className="text-amber text-sm font-medium hover:underline">
        View
      </Link>
    ),
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const isProvider = user?.role === 'provider'

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => shipmentsApi.list().then((r) => r.data),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: () => providersApi.dashboard().then((r) => r.data),
    enabled: isProvider,
  })

  const active = shipments.filter((s) => ['booked', 'in_transit', 'quoted'].includes(s.status))
  const delivered = shipments.filter((s) => s.status === 'delivered')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">
            {isProvider ? 'Provider Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-charcoal/60">Welcome back, {user?.full_name ?? user?.phone}</p>
        </div>
        {!isProvider && (
          <Button asChild size="lg">
            <Link to="/shipments/create"><PlusCircle className="h-4 w-4" /> Book New Shipment</Link>
          </Button>
        )}
        {isProvider && (
          <Button asChild size="lg">
            <Link to="/shared-cargo"><PlusCircle className="h-4 w-4" /> Publish Shared Cargo</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isProvider ? (
          <>
            <StatCard title="Pending Jobs" value={dashboard?.pending_jobs ?? 0} icon={<Clock className="h-5 w-5" />} />
            <StatCard title="Active Deliveries" value={dashboard?.active_deliveries ?? 0} icon={<Truck className="h-5 w-5" />} />
            <StatCard title="Monthly Earnings" value={formatTZS(dashboard?.monthly_earnings ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="Fleet Available" value={dashboard?.fleet_available ?? 0} icon={<Package className="h-5 w-5" />} />
          </>
        ) : (
          <>
            <StatCard title="Active Shipments" value={active.length} icon={<Package className="h-5 w-5" />} />
            <StatCard title="Completed" value={delivered.length} icon={<CheckCircle className="h-5 w-5" />} />
            <StatCard title="Total Shipments" value={shipments.length} icon={<Truck className="h-5 w-5" />} />
            <StatCard title="Pending" value={shipments.filter((s) => s.status === 'pending').length} icon={<Clock className="h-5 w-5" />} />
          </>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold mb-3">Recent Shipments</h2>
        <DataTable columns={shipmentColumns} data={shipments.slice(0, 8)} />
      </div>
    </motion.div>
  )
}
