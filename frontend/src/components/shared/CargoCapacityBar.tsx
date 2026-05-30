import { Progress } from '@/components/ui/progress'

interface CargoCapacityBarProps {
  total: number
  used: number
}

export function CargoCapacityBar({ total, used }: CargoCapacityBarProps) {
  const available = total - used
  const pct = total > 0 ? (used / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-charcoal/60">{available.toFixed(1)} tons available</span>
        <span className="font-medium">{pct.toFixed(0)}% filled</span>
      </div>
      <Progress value={pct} />
    </div>
  )
}
