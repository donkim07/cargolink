import { Badge } from '@/components/ui/badge'
import type { ShipmentStatus } from '@/types'

const statusConfig: Record<ShipmentStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  quoted: { label: 'Quoted', variant: 'secondary' },
  booked: { label: 'Booked', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus | string }) {
  const config = statusConfig[status as ShipmentStatus] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
