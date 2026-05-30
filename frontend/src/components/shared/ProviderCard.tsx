import { Star, Truck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Provider } from '@/types'

interface ProviderCardProps {
  provider: Provider
  onBook?: () => void
}

export function ProviderCard({ provider, onBook }: ProviderCardProps) {
  const vehicleTypes = [...new Set(provider.vehicles.map((v) => v.type))]

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-glow hover:border-amber/30">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-forest text-canvas font-display text-xl font-bold">
            {provider.company_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-charcoal truncate">{provider.company_name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-0.5 text-amber">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-semibold">{Number(provider.rating).toFixed(1)}</span>
              </div>
              <span className="text-xs text-charcoal/50">· {provider.total_deliveries} deliveries</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {vehicleTypes.map((type) => (
            <Badge key={type} variant="secondary" className="capitalize text-xs">
              <Truck className="mr-1 h-3 w-3" />
              {type.replace('_', ' ')}
            </Badge>
          ))}
        </div>

        <p className="mt-3 text-xs text-charcoal/50">
          Response rate: {Number(provider.response_rate).toFixed(0)}%
        </p>

        {onBook && (
          <Button className="mt-4 w-full" onClick={onBook}>
            Book Now
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
