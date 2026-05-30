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
  const debounceRef = useRef<number | undefined>(undefined)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [ready, setReady] = useState(false)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setReady(true)
        setMapsError(null)
      })
      .catch((err: Error) => {
        setReady(false)
        setMapsError(err.message)
      })
  }, [])

  const selectPrediction = useCallback((prediction: Prediction) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'))
    service.getDetails(
      { placeId: prediction.place_id, fields: ['formatted_address', 'geometry', 'name'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onChangeRef.current({
            address: place.formatted_address ?? place.name ?? prediction.description,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          })
        } else {
          onChangeRef.current({ address: prediction.description })
        }
        setOpen(false)
        setPredictions([])
      }
    )
  }, [])

  const requestPredictions = useCallback((input: string, restrictCountry: boolean) => {
    const service = new google.maps.places.AutocompleteService()
    const request: google.maps.places.AutocompletionRequest = {
      input,
      ...(restrictCountry ? { componentRestrictions: { country: 'tz' } } : {}),
    }

    service.getPlacePredictions(request, (results, status) => {
      const ok =
        status === google.maps.places.PlacesServiceStatus.OK ||
        status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS

      if (!ok) {
        if (restrictCountry) {
          requestPredictions(input, false)
          return
        }
        if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
          setMapsError('Places API access denied — enable Places API on your Google key')
        }
        setPredictions([])
        setOpen(false)
        return
      }

      if (!results?.length) {
        if (restrictCountry) {
          requestPredictions(input, false)
          return
        }
        setPredictions([])
        setOpen(false)
        return
      }

      setPredictions(results.map((r) => ({ place_id: r.place_id, description: r.description })))
      setOpen(true)
      setMapsError(null)
    })
  }, [])

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!ready || input.trim().length < 2) {
        setPredictions([])
        setOpen(false)
        return
      }
      requestPredictions(input.trim(), true)
    },
    [ready, requestPredictions]
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
      {mapsError && <p className="mt-1 text-xs text-amber">{mapsError}</p>}
    </div>
  )
}
