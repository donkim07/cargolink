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
  placeId: string
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
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [ready, setReady] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)

  useEffect(() => {
    loadGoogleMaps()
      .then(async () => {
        const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
        sessionTokenRef.current = new places.AutocompleteSessionToken()
        setReady(true)
        setMapsError(null)
      })
      .catch((err: Error) => {
        setReady(false)
        setMapsError(err.message)
      })
  }, [])

  const selectPrediction = useCallback(async (prediction: Prediction) => {
    try {
      const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
      const place = new places.Place({ id: prediction.placeId })
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] })
      const loc = place.location
      onChangeRef.current({
        address: place.formattedAddress ?? place.displayName ?? prediction.description,
        lat: loc?.lat(),
        lng: loc?.lng(),
      })
      sessionTokenRef.current = new places.AutocompleteSessionToken()
      setMapsError(null)
    } catch {
      onChangeRef.current({ address: prediction.description })
    }
    setOpen(false)
    setPredictions([])
  }, [])

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!ready || input.trim().length < 2) {
        setPredictions([])
        setOpen(false)
        return
      }

      try {
        const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new places.AutocompleteSessionToken()
        }

        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: input.trim(),
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['tz'],
        })

        const items = suggestions
          .map((s) => s.placePrediction)
          .filter(Boolean)
          .map((p) => ({
            placeId: p!.placeId,
            description: p!.text.text,
          }))

        if (!items.length) {
          const fallback = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: input.trim(),
            sessionToken: sessionTokenRef.current,
          })
          setPredictions(
            fallback.suggestions
              .map((s) => s.placePrediction)
              .filter(Boolean)
              .map((p) => ({ placeId: p!.placeId, description: p!.text.text }))
          )
        } else {
          setPredictions(items)
        }
        setOpen(true)
        setMapsError(null)
      } catch (err) {
        setPredictions([])
        setOpen(false)
        setMapsError(err instanceof Error ? err.message : 'Places autocomplete unavailable')
      }
    },
    [ready]
  )

  const handleInputChange = (address: string) => {
    onChange({ ...value, address, lat: undefined, lng: undefined })
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => fetchPredictions(address), 250)
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
            <ul className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-56 overflow-y-auto rounded-lg border border-forest/10 bg-white shadow-lg">
              {predictions.map((prediction) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-canvas/80"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      void selectPrediction(prediction)
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
      {mapsError && <p className="mt-1 text-xs text-amber">{mapsError}</p>}
    </div>
  )
}
