import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck, PlusCircle } from 'lucide-react'
import { providersApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VehicleType } from '@/types'

export default function FleetPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<VehicleType>('truck')
  const [plate, setPlate] = useState('')
  const [capacity, setCapacity] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-me'],
    queryFn: () => providersApi.me().then((r) => r.data),
  })

  const addVehicle = useMutation({
    mutationFn: () =>
      providersApi.addVehicle({
        type,
        plate_number: plate,
        capacity_tons: parseFloat(capacity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-me'] })
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] })
      setOpen(false)
      setPlate('')
      setCapacity('')
    },
  })

  if (isLoading) return <p>Loading...</p>

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <Truck className="mx-auto h-12 w-12 text-charcoal/30" />
        <h1 className="font-display text-2xl font-bold">Set Up Your Fleet</h1>
        <p className="text-charcoal/60">Register as a provider before adding vehicles.</p>
        <Button asChild><Link to="/provider/register">Register as Provider</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Fleet</h1>
          <p className="text-charcoal/60">{profile.company_name} — {profile.vehicles.length} vehicles</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="h-4 w-4" /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="refrigerated_truck">Refrigerated Truck</SelectItem>
                    <SelectItem value="container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plate Number</Label>
                <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="T 123 ABC" className="mt-1.5" />
              </div>
              <div>
                <Label>Capacity (tons)</Label>
                <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" className="mt-1.5" />
              </div>
              <Button onClick={() => addVehicle.mutate()} disabled={!plate || !capacity || addVehicle.isPending}>
                Add to Fleet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {profile.vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-charcoal/40">
            <Truck className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>Add vehicles to start accepting jobs</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.vehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold">{v.plate_number}</p>
                    <p className="text-sm capitalize text-charcoal/50">{v.type.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={v.is_available ? 'success' : 'secondary'}>
                    {v.is_available ? 'Available' : 'Busy'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-charcoal/60">{v.capacity_tons} tons capacity</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
