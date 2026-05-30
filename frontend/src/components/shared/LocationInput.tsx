import { useCallback, useEffect, useRef, useState } from 'react'
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

interface Prediction {
  place_id: string
  description: string
}

export function LocationInput({
  label,
  value,
  onChange,
  placeholder = 'Enter location',
  onOpenMap,
  className,
}: LocationInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadGoogleMaps()
      .then((google) => {
        autocompleteService.current = new google.maps.places.AutocompleteService()
        placesService.current = new google.maps.places.PlacesService(document.createElement('div'))
        setReady(true)
      })
      .catch(() => setReady(false))
  }, [])

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!ready || !autocompleteService.current || input.trim().length < 2) {
        setPredictions([])
        setOpen(false)
        return
      }

      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'tz' },
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            setPredictions([])
            setOpen(false)
            return
          }
          setPredictions(
            results.map((r) => ({
              place_id: r.place_id,
              description: r.description,
            }))
          )
          setOpen(true)
        }
      )
    },
    [ready]
  )

  const handleInputChange = (address: string) => {
    onChange({ ...value, address, lat: undefined, lng: undefined })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPredictions(address), 250)
  }

  const selectPrediction = (prediction: Prediction) => {
    if (!placesService.current) {
      onChange({ address: prediction.description })
      setOpen(false)
      return
    }

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'name'],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          onChange({ address: prediction.description })
        } else {
          onChange({
            address: place.formatted_address ?? place.name ?? prediction.description,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          })
        }
        setOpen(false)
        setPredictions([])
      }
    )
  }

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className={className} ref={containerRef}>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <Input
            value={value.address}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => value.address.length >= 2 && fetchPredictions(value.address)}
            placeholder={placeholder}
            className={cn('pl-9', onOpenMap && 'rounded-r-none')}
            autoComplete="off"
          />
          {open && predictions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-forest/10 bg-white shadow-lg">
              {predictions.map((prediction) => (
                <li key={prediction.place_id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-canvas/80"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      selectPrediction(prediction)
                    }}
                  >
                    {prediction.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
