import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ShipmentStatus } from '@/types'

const steps: ShipmentStatus[] = ['pending', 'quoted', 'booked', 'in_transit', 'delivered']

const labels: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  quoted: 'Quoted',
  booked: 'Booked',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function TrackingTimeline({ status }: { status: ShipmentStatus }) {
  const currentIdx = steps.indexOf(status)

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  done ? 'border-amber bg-amber text-white' : 'border-forest/20 bg-white text-charcoal/30',
                  active && 'ring-4 ring-amber/20'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-0.5 h-8', done ? 'bg-amber' : 'bg-forest/10')} />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p className={cn('font-medium text-sm', active ? 'text-charcoal' : 'text-charcoal/50')}>
                {labels[step]}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
