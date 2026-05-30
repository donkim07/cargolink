import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, MapPin, Search } from 'lucide-react'
import { sharedCargoApi, providersApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { CargoCapacityBar } from '@/components/shared/CargoCapacityBar'
import { LocationInput, type LocationValue } from '@/components/shared/LocationInput'
import { GoogleMapPicker } from '@/components/shared/GoogleMapPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTZS } from '@/utils/cn'

export default function SharedCargoPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [routeFrom, setRouteFrom] = useState('')
  const [routeTo, setRouteTo] = useState('')
  const [searchFrom, setSearchFrom] = useState('')
  const [searchTo, setSearchTo] = useState('')
  const [tons, setTons] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [mapTarget, setMapTarget] = useState<'from' | 'to' | null>(null)

  const [publishFrom, setPublishFrom] = useState<LocationValue>({ address: '' })
  const [publishTo, setPublishTo] = useState<LocationValue>({ address: '' })
  const [vehicleId, setVehicleId] = useState('')
  const [capacity, setCapacity] = useState('')
  const [pricePerTon, setPricePerTon] = useState('')
  const [departureDate, setDepartureDate] = useState('')

  const { data: providerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['provider-me'],
    queryFn: () => providersApi.me().then((r) => r.data),
    enabled: user?.role === 'provider',
  })

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['shared-cargo', searchFrom, searchTo],
    queryFn: () =>
      sharedCargoApi
        .list({ route_from: searchFrom || undefined, route_to: searchTo || undefined })
        .then((r) => r.data),
  })

  const bookSpace = useMutation({
    mutationFn: ({ id, tons: t }: { id: string; tons: number }) => sharedCargoApi.book(id, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-cargo'] })
      setSelectedId(null)
      setTons('')
    },
  })

  const publishListing = useMutation({
    mutationFn: () =>
      sharedCargoApi.create({
        vehicle_id: vehicleId,
        route_from: publishFrom.address,
        route_from_lat: publishFrom.lat,
        route_from_lng: publishFrom.lng,
        route_to: publishTo.address,
        route_to_lat: publishTo.lat,
        route_to_lng: publishTo.lng,
        departure_date: departureDate,
        total_capacity_tons: parseFloat(capacity),
        price_per_ton: parseFloat(pricePerTon),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-cargo'] })
      setShowPublish(false)
    },
  })

  const handleSearch = () => {
    setSearchFrom(routeFrom)
    setSearchTo(routeTo)
  }

  const isProvider = user?.role === 'provider'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Shared Cargo</h1>
          <p className="text-charcoal/60">Book space on shared truck routes</p>
        </div>
        {isProvider && providerProfile?.is_approved && (
          <Button onClick={() => setShowPublish(true)}>Publish Route</Button>
        )}
      </div>

      {isProvider && !profileLoading && !providerProfile && (
        <Card>
          <CardContent className="p-5">
            <p className="font-medium">Provider profile required</p>
            <p className="mt-1 text-sm text-charcoal/60">
              Register as a provider before publishing shared cargo routes.
            </p>
            <Button asChild className="mt-3">
              <Link to="/provider/register">Register as Provider</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isProvider && providerProfile && !providerProfile.is_approved && (
        <Card>
          <CardContent className="p-5 text-sm text-charcoal/60">
            Your provider profile is pending admin approval. You can browse listings but cannot publish yet.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Route from..." value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)} />
        <Input placeholder="Route to..." value={routeTo} onChange={(e) => setRouteTo(e.target.value)} />
        <Button onClick={handleSearch} className="shrink-0">
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      {isLoading ? (
        <p>Loading listings...</p>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-charcoal/50">
            No shared cargo listings found. Try different routes or check back later.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-amber" />
                  <span className="truncate font-medium">{listing.route_from}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 shrink-0 text-forest" />
                  <span className="truncate font-medium">{listing.route_to}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-charcoal/50">
                  <Calendar className="h-3.5 w-3.5" />
                  {listing.departure_date}
                </div>
                <CargoCapacityBar total={listing.total_capacity_tons} used={listing.used_capacity_tons} />
                <div className="flex items-center justify-between">
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
      )}

      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Publish Shared Cargo Route</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {providerProfile?.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate_number} — {v.type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LocationInput label="Route From" value={publishFrom} onChange={setPublishFrom} onOpenMap={() => setMapTarget('from')} />
            <LocationInput label="Route To" value={publishTo} onChange={setPublishTo} onOpenMap={() => setMapTarget('to')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Departure Date</Label>
                <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Total Capacity (tons)</Label>
                <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Price per Ton (TZS)</Label>
              <Input type="number" value={pricePerTon} onChange={(e) => setPricePerTon(e.target.value)} className="mt-1.5" />
            </div>
            <Button
              className="w-full"
              disabled={!vehicleId || !publishFrom.address || !publishTo.address || !departureDate || !capacity || !pricePerTon || publishListing.isPending}
              onClick={() => publishListing.mutate()}
            >
              Publish Listing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GoogleMapPicker
        open={mapTarget !== null}
        onOpenChange={(o) => !o && setMapTarget(null)}
        title={mapTarget === 'from' ? 'Pick Route Start' : 'Pick Route End'}
        onSelect={(loc) => {
          if (mapTarget === 'from') setPublishFrom(loc)
          else if (mapTarget === 'to') setPublishTo(loc)
        }}
      />
    </div>
  )
}
