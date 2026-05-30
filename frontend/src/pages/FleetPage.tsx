import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck, PlusCircle, UserPlus } from 'lucide-react'
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
  const [driverOpen, setDriverOpen] = useState(false)
  const [driverPhone, setDriverPhone] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverLicense, setDriverLicense] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['provider-me'],
    queryFn: () => providersApi.me().then((r) => r.data),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['provider-drivers'],
    queryFn: () => providersApi.listDrivers().then((r) => r.data),
    enabled: !!profile,
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

  const addDriver = useMutation({
    mutationFn: () =>
      providersApi.addDriver({
        phone: driverPhone,
        license_number: driverLicense,
        full_name: driverName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-drivers'] })
      setDriverOpen(false)
      setDriverPhone('')
      setDriverName('')
      setDriverLicense('')
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
          <p className="text-charcoal/60">
            {profile.company_name} — transport provider with {profile.vehicles.length} vehicles and {drivers.length} drivers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Dialog open={driverOpen} onOpenChange={setDriverOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><UserPlus className="h-4 w-4" /> Add Driver</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
            <p className="text-sm text-charcoal/60">The driver must already have a CargoLink account (register with their phone first).</p>
            <div className="space-y-4">
              <div>
                <Label>Driver Phone</Label>
                <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+255..." className="mt-1.5" />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>License Number</Label>
                <Input value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} className="mt-1.5" />
              </div>
              <Button onClick={() => addDriver.mutate()} disabled={!driverPhone || !driverLicense || addDriver.isPending}>
                Add Driver
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
      </div>

      <Card className="border-forest/10 bg-forest/5">
        <CardContent className="p-4 text-sm text-charcoal/70">
          A <strong>provider</strong> is your transport company account. <strong>Drivers</strong> are your staff who log in,
          accept jobs, and update delivery status. When customers book you on the marketplace, all available drivers are notified.
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">Drivers ({drivers.length})</h2>
        {drivers.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-charcoal/50">No drivers yet. Add drivers so they can accept deliveries.</CardContent></Card>
        ) : (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <p className="font-medium">{d.full_name ?? 'Driver'}</p>
                  <p className="text-sm text-charcoal/50">{d.phone}</p>
                  <p className="text-xs text-charcoal/40">License {d.license_number}</p>
                  <Badge variant={d.is_available ? 'success' : 'secondary'} className="mt-2">
                    {d.is_available ? 'Available' : 'On delivery'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Vehicles</h2>
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
