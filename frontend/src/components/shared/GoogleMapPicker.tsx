import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadGoogleMaps } from '@/hooks/useGoogleMaps'
import { MapCanvas } from '@/components/shared/MapCanvas'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { LocationValue } from '@/components/shared/LocationInput'

interface GoogleMapPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (value: LocationValue) => void
  title?: string
  initialCenter?: { lat: number; lng: number }
}

const DEFAULT_CENTER = { lat: -6.7924, lng: 39.2083 }

export function GoogleMapPicker({
  open,
  onOpenChange,
  onSelect,
  title = 'Pick Location',
  initialCenter = DEFAULT_CENTER,
}: GoogleMapPickerProps) {
  const [center, setCenter] = useState(initialCenter)
  const [picked, setPicked] = useState<LocationValue>({ address: '' })
  const [mapReady, setMapReady] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMapReady(false)
      return
    }

    setCenter(initialCenter)
    setPicked({ address: '' })
    setGeocodeError(null)

    let timer: number | undefined
    loadGoogleMaps()
      .then(() => {
        timer = window.setTimeout(() => setMapReady(true), 300)
      })
      .catch(() => setMapReady(false))

    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [open, initialCenter.lat, initialCenter.lng])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setCenter({ lat, lng })
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    setPicked({ address: fallback, lat, lng })
    setGeocodeError(null)

    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]?.formatted_address) {
        setPicked({ address: results[0].formatted_address, lat, lng })
      } else if (status !== 'OK') {
        setGeocodeError('Address lookup failed — coordinates will be used instead')
      }
    })
  }, [])

  const markers = useMemo(
    () => [{ lat: center.lat, lng: center.lng, label: 'P' }],
    [center.lat, center.lng]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && mapReady ? (
          <MapCanvas
            key="map-picker"
            center={center}
            zoom={11}
            className="h-80"
            markers={markers}
            onClick={handleMapClick}
          />
        ) : (
          open && (
            <div className="flex h-80 items-center justify-center rounded-lg border border-forest/10 bg-canvas/30 text-sm text-charcoal/50">
              Loading map...
            </div>
          )
        )}
        <p className="truncate text-sm text-charcoal/70">
          {picked.address || 'Click the map to select a location'}
        </p>
        {geocodeError && <p className="text-xs text-amber">{geocodeError}</p>}
        <Button
          disabled={!picked.address}
          onClick={() => {
            onSelect(picked)
            onOpenChange(false)
          }}
        >
          Use This Location
        </Button>
      </DialogContent>
    </Dialog>
  )
}
