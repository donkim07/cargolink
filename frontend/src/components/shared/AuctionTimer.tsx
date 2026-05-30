import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

export function AuctionTimer({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Ended')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  const isUrgent = remaining !== 'Ended' && remaining.startsWith('0h')

  return (
    <span className={cn('font-mono text-sm font-bold', isUrgent ? 'text-red-600' : 'text-amber')}>
      {remaining}
    </span>
  )
}
