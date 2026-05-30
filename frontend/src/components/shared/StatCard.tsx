import { Package, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: string
  className?: string
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-forest/10 bg-white p-5 shadow-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-charcoal/60">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold text-charcoal">{value}</p>
          {trend && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber/10 text-amber">
          {icon ?? <Package className="h-5 w-5" />}
        </div>
      </div>
    </div>
  )
}
