import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, MapPin } from 'lucide-react'
import { sharedCargoApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { CargoCapacityBar } from '@/components/shared/CargoCapacityBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatTZS } from '@/utils/cn'

export default function SharedCargoPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [routeFrom, setRouteFrom] = useState('')
  const [routeTo, setRouteTo] = useState('')
  const [tons, setTons] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: listings = [] } = useQuery({
    queryKey: ['shared-cargo', routeFrom, routeTo],
    queryFn: () =>
      sharedCargoApi.list({ route_from: routeFrom || undefined, route_to: routeTo || undefined }).then((r) => r.data),
  })

  const bookSpace = useMutation({
    mutationFn: ({ id, tons: t }: { id: string; tons: number }) => sharedCargoApi.book(id, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-cargo'] })
      setSelectedId(null)
      setTons('')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Shared Cargo</h1>
        <p className="text-charcoal/60">Book space on shared truck routes</p>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Route from..." value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)} />
        <Input placeholder="Route to..." value={routeTo} onChange={(e) => setRouteTo(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-amber" />
                <span className="font-medium truncate">{listing.route_from}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-forest" />
                <span className="font-medium truncate">{listing.route_to}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal/50">
                <Calendar className="h-3.5 w-3.5" />
                {listing.departure_date}
              </div>
              <CargoCapacityBar total={listing.total_capacity_tons} used={listing.used_capacity_tons} />
              <div className="flex justify-between items-center">
                <span className="text-sm text-charcoal/50">Price/ton</span>
                <span className="font-bold text-amber">{formatTZS(listing.price_per_ton)}</span>
              </div>
              {user?.role === 'customer' && (
                <Dialog open={selectedId === listing.id} onOpenChange={(o) => !o && setSelectedId(null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full" onClick={() => setSelectedId(listing.id)}>Book Space</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Book Cargo Space</DialogTitle></DialogHeader>
                    <div>
                      <Label>Tons to book</Label>
                      <Input type="number" step="0.1" value={tons} onChange={(e) => setTons(e.target.value)} className="mt-1.5" />
                    </div>
                    <Button
                      onClick={() => bookSpace.mutate({ id: listing.id, tons: parseFloat(tons) })}
                      disabled={!tons || bookSpace.isPending}
                    >
                      Confirm Booking
                    </Button>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
