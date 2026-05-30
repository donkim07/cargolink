import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTZS } from '@/utils/cn'
import type { PriceBreakdown } from '@/types'

export function PriceBreakdownCard({ pricing }: { pricing: PriceBreakdown }) {
  const rows = [
    { label: 'Base Cost', value: pricing.base_cost },
    { label: 'Service Fee (8%)', value: pricing.service_fee },
    { label: 'Insurance (2%)', value: pricing.insurance_fee },
  ]

  return (
    <Card className="border-amber/20 bg-gradient-to-br from-white to-amber/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Price Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-charcoal/60">{row.label}</span>
            <span className="font-medium">{formatTZS(row.value)}</span>
          </div>
        ))}
        <div className="border-t border-forest/10 pt-3 flex justify-between">
          <span className="font-display font-bold">Total</span>
          <span className="font-display text-lg font-bold text-amber">{formatTZS(pricing.total_cost)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
