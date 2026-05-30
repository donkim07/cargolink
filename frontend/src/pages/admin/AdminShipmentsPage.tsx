import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi, providersApi } from '@/services'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { AdminRowActions } from '@/components/admin/AdminRowActions'
import { DataTable } from '@/components/shared/DataTable'
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Shipment, ShipmentStatus } from '@/types'

export default function AdminShipmentsPage() {
  const queryClient = useQueryClient()
  const [assignId, setAssignId] = useState<string | null>(null)
  const [editShipment, setEditShipment] = useState<Shipment | null>(null)
  const [status, setStatus] = useState<ShipmentStatus>('pending')
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
    mutationFn: () => adminApi.assignShipment(assignId!, providerId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] })
      setAssignId(null)
      setProviderId('')
      setVehicleId('')
    },
  })

  const updateShipment = useMutation({
    mutationFn: () => adminApi.updateShipment(editShipment!.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] })
      setEditShipment(null)
    },
  })

  const cancelShipment = useMutation({
    mutationFn: (id: string) => adminApi.deleteShipment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-shipments'] }),
  })

  const columns: ColumnDef<Shipment>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: ({ row }) => (
        <div>
          <p className="font-medium truncate max-w-[180px]">{row.original.pickup_address}</p>
          <p className="text-xs text-charcoal/50 truncate max-w-[180px]">→ {row.original.destination_address}</p>
        </div>
      ),
    },
    { id: 'cargo', header: 'Cargo', cell: ({ row }) => <span className="capitalize">{row.original.cargo_type}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          <AdminRowActions
            viewTo={`/shipments/${row.original.id}`}
            onEdit={() => {
              setEditShipment(row.original)
              setStatus(row.original.status)
            }}
            onDelete={() => {
              if (confirm('Cancel this shipment?')) cancelShipment.mutate(row.original.id)
            }}
            deleteLabel=""
          />
          {row.original.status !== 'booked' && row.original.status !== 'delivered' && (
            <Button size="sm" variant="outline" onClick={() => setAssignId(row.original.id)}>
              Assign
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell title="Shipments" description="View, edit, assign, and cancel all shipments">
      <DataTable columns={columns} data={shipments} />

      <Dialog open={!!assignId} onOpenChange={(o) => !o && setAssignId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Provider</DialogTitle></DialogHeader>
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
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" disabled={!providerId || !vehicleId || assign.isPending} onClick={() => assign.mutate()}>
              Confirm Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editShipment} onOpenChange={(o) => !o && setEditShipment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Shipment Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['pending', 'quoted', 'booked', 'in_transit', 'delivered', 'cancelled'] as ShipmentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => updateShipment.mutate()} disabled={updateShipment.isPending}>
              Save
            </Button>
            {editShipment && (
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/shipments/${editShipment.id}`}>View full details</Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
