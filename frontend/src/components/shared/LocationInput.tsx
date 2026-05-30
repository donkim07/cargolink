import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadGoogleMaps } from '@/hooks/useGoogleMaps'
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [mapsError, setMapsError] = useState<string | null>(null)

  useEffect(() => {
    let listener: google.maps.MapsEventListener | null = null

    loadGoogleMaps()
      .then(() => {
        if (!inputRef.current) return

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
          componentRestrictions: { country: 'tz' },
          types: ['geocode', 'establishment'],
        })

        listener = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace()
          if (!place) return

          onChangeRef.current({
            address: place.formatted_address ?? place.name ?? inputRef.current?.value ?? '',
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          })
        })

        setMapsError(null)
      })
      .catch((err: Error) => setMapsError(err.message))

    return () => {
      if (listener) google.maps.event.removeListener(listener)
      autocompleteRef.current = null
    }
  }, [])

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <Input
            ref={inputRef}
            value={value.address}
            onChange={(e) =>
              onChange({ ...value, address: e.target.value, lat: undefined, lng: undefined })
            }
            placeholder={placeholder}
            className={cn('pl-9', onOpenMap && 'rounded-r-none')}
            autoComplete="off"
          />
        </div>
        {onOpenMap && (
          <Button type="button" variant="outline" onClick={onOpenMap} className="shrink-0">
            Map
          </Button>
        )}
      </div>
      {mapsError && <p className="mt-1 text-xs text-amber">{mapsError}</p>}
    </div>
  )
}
