import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/cn'

export interface LocationValue {
  address: string
  lat?: number
  lng?: number
}

interface LocationInputProps {
  label?: string
  value: LocationValue
  onChange: (value: LocationValue) => void
  placeholder?: string
  onOpenMap?: () => void
  className?: string
}

export function LocationInput({
  label,
  value,
  onChange,
  placeholder = 'Enter location',
  onOpenMap,
  className,
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { ready } = useGoogleMaps()

  useEffect(() => {
    if (!ready || !inputRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'tz' },
      fields: ['formatted_address', 'geometry', 'name'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const address = place.formatted_address ?? place.name ?? inputRef.current?.value ?? ''
      const lat = place.geometry?.location?.lat()
      const lng = place.geometry?.location?.lng()
      onChange({ address, lat, lng })
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [ready, onChange])

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <Input
            ref={inputRef}
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder={placeholder}
            className={cn('pl-9', onOpenMap && 'rounded-r-none')}
          />
        </div>
        {onOpenMap && (
          <Button type="button" variant="outline" onClick={onOpenMap} className="shrink-0">
            Map
          </Button>
        )}
      </div>
    </div>
  )
}
