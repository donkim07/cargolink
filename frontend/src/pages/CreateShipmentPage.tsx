import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Wheat, UtensilsCrossed, HardHat, ShoppingBag, Factory, Package } from 'lucide-react'
import { shipmentsApi, auctionsApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { PriceBreakdownCard } from '@/components/shared/PriceBreakdownCard'
import { cn } from '@/utils/cn'
import type { CargoType, UrgencyLevel } from '@/types'

const cargoTypes: { type: CargoType; label: string; icon: React.ElementType }[] = [
  { type: 'agriculture', label: 'Agriculture', icon: Wheat },
  { type: 'food', label: 'Food', icon: UtensilsCrossed },
  { type: 'construction', label: 'Construction', icon: HardHat },
  { type: 'retail', label: 'Retail', icon: ShoppingBag },
  { type: 'industrial', label: 'Industrial', icon: Factory },
  { type: 'other', label: 'Other', icon: Package },
]

const urgencyOptions: { value: UrgencyLevel; label: string; multiplier: string }[] = [
  { value: 'standard', label: 'Standard', multiplier: '1.0×' },
  { value: 'express', label: 'Express', multiplier: '1.3×' },
  { value: 'urgent', label: 'Urgent', multiplier: '1.6×' },
]

export default function CreateShipmentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [cargoType, setCargoType] = useState<CargoType>('agriculture')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [volume, setVolume] = useState('')
  const [refrigeration, setRefrigeration] = useState(false)
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [urgency, setUrgency] = useState<UrgencyLevel>('standard')
  const [shipmentId, setShipmentId] = useState('')
  const [quotes, setQuotes] = useState<Array<{ provider_name: string; pricing: { total_cost: number } }>>([])

  const createShipment = useMutation({
    mutationFn: () =>
      shipmentsApi.create({
        cargo_type: cargoType,
        description,
        weight_tons: parseFloat(weight),
        volume_m3: volume ? parseFloat(volume) : undefined,
        pickup_address: pickup,
        destination_address: destination,
        urgency,
        requires_refrigeration: refrigeration,
        preferred_departure_date: departureDate || undefined,
      }),
    onSuccess: async ({ data }) => {
      setShipmentId(data.id)
      const quoteRes = await shipmentsApi.quote(data.id)
      setQuotes(quoteRes.data.quotes)
      setStep(3)
    },
  })

  const createAuction = useMutation({
    mutationFn: () => auctionsApi.create(shipmentId),
    onSuccess: () => navigate('/auctions'),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Book New Shipment</h1>
        <p className="text-charcoal/60">Step {step} of 3</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-amber' : 'bg-forest/10')} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <Label className="mb-3 block">Cargo Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {cargoTypes.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => setCargoType(type)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                      cargoType === type ? 'border-amber bg-amber/5 shadow-glow' : 'border-forest/10 hover:border-forest/20'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', cargoType === type ? 'text-amber' : 'text-charcoal/40')} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your cargo" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight (tons)</Label>
                <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" className="mt-1.5" />
              </div>
              <div>
                <Label>Volume (m³)</Label>
                <Input value={volume} onChange={(e) => setVolume(e.target.value)} type="number" step="0.1" className="mt-1.5" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-forest/10 p-4">
              <div>
                <Label>Requires Refrigeration</Label>
                <p className="text-xs text-charcoal/50">Cold chain transport</p>
              </div>
              <Switch checked={refrigeration} onCheckedChange={setRefrigeration} />
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(2)} disabled={!weight}>
              Continue to Route
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <Label>Pickup Location</Label>
              <Input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Dar es Salaam, Tanzania" className="mt-1.5" />
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dodoma, Tanzania" className="mt-1.5" />
            </div>
            <div>
              <Label>Preferred Departure Date</Label>
              <Input value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} type="date" className="mt-1.5" />
            </div>
            <div>
              <Label className="mb-3 block">Urgency</Label>
              <div className="grid grid-cols-3 gap-3">
                {urgencyOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setUrgency(opt.value)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center transition-all',
                      urgency === opt.value ? 'border-amber bg-amber/5' : 'border-forest/10'
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-charcoal/50">{opt.multiplier}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" size="lg" onClick={() => createShipment.mutate()} disabled={!pickup || !destination || createShipment.isPending}>
                {createShipment.isPending ? 'Calculating route...' : 'Get Quote'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && quotes.length > 0 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <PriceBreakdownCard pricing={quotes[0].pricing as never} />
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="font-medium">Available Providers ({quotes.length})</p>
                {quotes.slice(0, 3).map((q, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{q.provider_name}</span>
                    <span className="font-medium text-amber">TZS {q.pricing.total_cost.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/marketplace')}>
                Post to Marketplace
              </Button>
              <Button className="flex-1" onClick={() => createAuction.mutate()} disabled={createAuction.isPending}>
                Create Auction
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
