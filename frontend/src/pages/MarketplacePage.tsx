import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { providersApi } from '@/services'
import { ProviderCard } from '@/components/shared/ProviderCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

export default function MarketplacePage() {
  const [vehicleType, setVehicleType] = useState<string>('all')
  const [minRating, setMinRating] = useState<string>('')

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Marketplace</h1>
        <p className="text-charcoal/60">Browse verified transport providers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-5 space-y-4">
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onBook={() => {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
