import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Package, Truck } from 'lucide-react'
import { searchApi } from '@/services'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const { data } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchApi.search(query).then((r) => r.data),
    enabled: query.trim().length >= 2,
  })

  const showResults = focused && query.trim().length >= 2 && data
  const hasResults = (data?.shipments.length ?? 0) > 0 || (data?.providers.length ?? 0) > 0

  return (
    <div className="relative w-full max-w-md flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search shipments, providers..."
        className="h-9 border-forest/10 bg-canvas/50 pl-9 pr-4"
      />
      {showResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-forest/10 bg-white shadow-lg">
          {!hasResults && (
            <p className="p-3 text-sm text-charcoal/50">No results for &quot;{query}&quot;</p>
          )}
          {data?.shipments.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn('flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-canvas/80')}
              onMouseDown={() => navigate(`/shipments/${s.id}`)}
            >
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.pickup_address}</p>
                <p className="truncate text-xs text-charcoal/50">→ {s.destination_address}</p>
              </div>
            </button>
          ))}
          {data?.providers.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas/80"
              onMouseDown={() => navigate('/marketplace')}
            >
              <Truck className="h-4 w-4 shrink-0 text-forest" />
              <span className="truncate text-sm font-medium">{p.company_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
