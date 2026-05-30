import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { providersApi } from '@/services'
import { ProviderCard } from '@/components/shared/ProviderCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function MarketplacePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shipmentId = searchParams.get('shipmentId')
  const [vehicleType, setVehicleType] = useState<string>('all')
  const [minRating, setMinRating] = useState<string>('')
  const [bookingProvider, setBookingProvider] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState('')

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', vehicleType, minRating],
    queryFn: () =>
      providersApi
        .list({
          vehicle_type: vehicleType === 'all' ? undefined : vehicleType,
          min_rating: minRating ? parseFloat(minRating) : undefined,
        })
        .then((r) => r.data),
  })

  const provider = providers.find((p) => p.id === bookingProvider)

  const book = useMutation({
    mutationFn: () => providersApi.book(shipmentId!, bookingProvider!, selectedVehicle),
    onSuccess: () => navigate(`/shipments/${shipmentId}`),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Marketplace</h1>
        <p className="text-charcoal/60">
          {shipmentId ? 'Select a provider to book your shipment' : 'Browse verified transport providers'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="h-fit lg:col-span-1">
          <CardContent className="space-y-4 p-5">
            <h3 className="font-display font-bold">Filters</h3>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="refrigerated_truck">Refrigerated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Min Rating</Label>
              <Input value={minRating} onChange={(e) => setMinRating(e.target.value)} type="number" step="0.5" min="0" max="5" placeholder="0" className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {isLoading ? (
            <p>Loading providers...</p>
          ) : providers.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-charcoal/50">No providers match your filters.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onBook={
                    shipmentId
                      ? () => {
                          setBookingProvider(p.id)
                          setSelectedVehicle(p.vehicles[0]?.id ?? '')
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!bookingProvider} onOpenChange={(o) => !o && setBookingProvider(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book {provider?.company_name}</DialogTitle></DialogHeader>
          {provider && (
            <div className="space-y-4">
              <div>
                <Label>Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {provider.vehicles.filter((v) => v.is_available).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number} — {v.type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!selectedVehicle || book.isPending} onClick={() => book.mutate()}>
                Confirm Booking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
