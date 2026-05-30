import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, providersApi } from '@/services'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function AdminShipmentsPage() {
  const queryClient = useQueryClient()
  const [assignShipmentId, setAssignShipmentId] = useState<string | null>(null)
  const [providerId, setProviderId] = useState('')
  const [vehicleId, setVehicleId] = useState('')

  const { data: shipments = [] } = useQuery({
    queryKey: ['admin-shipments'],
    queryFn: () => adminApi.listShipments().then((r) => r.data),
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-assign'],
    queryFn: () => providersApi.list().then((r) => r.data),
  })

  const selectedProvider = providers.find((p) => p.id === providerId)

  const assign = useMutation({
    mutationFn: () => adminApi.assignShipment(assignShipmentId!, providerId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] })
      setAssignShipmentId(null)
      setProviderId('')
      setVehicleId('')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Shipment Management</h1>
        <p className="text-charcoal/60">View all shipments and assign providers</p>
      </div>

      <div className="space-y-3">
        {shipments.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ShipmentStatusBadge status={s.status} />
                  <span className="text-xs text-charcoal/50 capitalize">{s.cargo_type}</span>
                </div>
                <p className="mt-1 truncate font-medium">{s.pickup_address}</p>
                <p className="truncate text-sm text-charcoal/50">→ {s.destination_address}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/shipments/${s.id}`}>View</Link>
                </Button>
                {s.status !== 'booked' && s.status !== 'delivered' && (
                  <Button size="sm" onClick={() => setAssignShipmentId(s.id)}>
                    Assign Provider
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!assignShipmentId} onOpenChange={(o) => !o && setAssignShipmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider</Label>
              <Select value={providerId} onValueChange={(v) => { setProviderId(v); setVehicleId('') }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProvider && (
              <div>
                <Label>Vehicle</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {selectedProvider.vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number} — {v.type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full"
              disabled={!providerId || !vehicleId || assign.isPending}
              onClick={() => assign.mutate()}
            >
              Confirm Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
