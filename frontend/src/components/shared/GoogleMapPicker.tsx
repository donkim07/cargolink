import { useEffect, useRef, useState } from 'react'
import { useGoogleMaps } from '@/hooks/useGoogleMaps'
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
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const { ready } = useGoogleMaps()
  const [picked, setPicked] = useState<LocationValue>({ address: '' })

  useEffect(() => {
    if (!open || !ready || !mapRef.current) return

    const map = new google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
    })
    mapInstance.current = map
    geocoderRef.current = new google.maps.Geocoder()

    const marker = new google.maps.Marker({
      map,
      position: initialCenter,
      draggable: true,
    })
    markerRef.current = marker

    const updateFromLatLng = (lat: number, lng: number) => {
      geocoderRef.current?.geocode({ location: { lat, lng } }, (results, status) => {
        const address =
          status === 'OK' && results?.[0]?.formatted_address
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        setPicked({ address, lat, lng })
      })
    }

    updateFromLatLng(initialCenter.lat, initialCenter.lng)

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat()
      const lng = e.latLng?.lng()
      if (lat == null || lng == null) return
      marker.setPosition({ lat, lng })
      updateFromLatLng(lat, lng)
    })

    const dragListener = marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      if (!pos) return
      updateFromLatLng(pos.lat(), pos.lng())
    })

    return () => {
      google.maps.event.removeListener(clickListener)
      google.maps.event.removeListener(dragListener)
      marker.setMap(null)
      mapInstance.current = null
    }
  }, [open, ready, initialCenter.lat, initialCenter.lng])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div ref={mapRef} className="h-80 w-full rounded-lg border border-forest/10" />
        <p className="text-sm text-charcoal/70 truncate">{picked.address || 'Click the map to select a location'}</p>
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
