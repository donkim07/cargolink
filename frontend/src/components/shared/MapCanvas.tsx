import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/hooks/useGoogleMaps'
import { cn } from '@/utils/cn'

export interface MapMarker {
  lat: number
  lng: number
  label?: string
  color?: string
}

export interface MapCanvasProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  path?: Array<{ lat: number; lng: number }>
  fitPath?: boolean
  className?: string
  interactive?: boolean
  onClick?: (lat: number, lng: number) => void
}

const DEFAULT_CENTER = { lat: -6.7924, lng: 39.2083 }

function triggerMapResize(map: google.maps.Map, center: { lat: number; lng: number }) {
  google.maps.event.trigger(map, 'resize')
  map.setCenter(center)
}

export function MapCanvas({
  center,
  zoom = 10,
  markers = [],
  path,
  fitPath = false,
  className,
  interactive = true,
  onClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  const [mapReady, setMapReady] = useState(false)
  const markersKey = useMemo(() => JSON.stringify(markers), [markers])
  const pathKey = useMemo(() => JSON.stringify(path ?? []), [path])
  const resolvedCenter = center ?? DEFAULT_CENTER

  useEffect(() => {
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: resolvedCenter,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: interactive,
          zoomControl: interactive,
          draggable: interactive,
          gestureHandling: interactive ? 'auto' : 'none',
        })

        if (interactive) {
          clickListenerRef.current = mapRef.current.addListener(
            'click',
            (e: google.maps.MapMouseEvent) => {
              const lat = e.latLng?.lat()
              const lng = e.latLng?.lng()
              if (lat != null && lng != null) onClickRef.current?.(lat, lng)
            }
          )
        }

        const resize = () => {
          if (mapRef.current) triggerMapResize(mapRef.current, resolvedCenter)
        }

        resizeObserver = new ResizeObserver(() => requestAnimationFrame(resize))
        resizeObserver.observe(containerRef.current)
        requestAnimationFrame(resize)
        window.setTimeout(resize, 150)
        window.setTimeout(resize, 400)
        setMapReady(true)
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div class="flex h-full items-center justify-center p-4 text-sm text-charcoal/50">Map unavailable — check Google Maps API key</div>'
        }
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
      }
      markersRef.current.forEach((m) => m.setMap(null))
      polylineRef.current?.setMap(null)
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    mapRef.current.setCenter(resolvedCenter)
    mapRef.current.setZoom(zoom)
  }, [resolvedCenter.lat, resolvedCenter.lng, zoom, mapReady])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = JSON.parse(markersKey).map((marker: MapMarker) =>
      new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        label: marker.label
          ? { text: marker.label.charAt(0), color: '#fff', fontWeight: '700' }
          : undefined,
      })
    )
  }, [markersKey, mapReady])

  useEffect(() => {
    if (!mapRef.current || !mapReady) return

    polylineRef.current?.setMap(null)
    polylineRef.current = null

    const points: Array<{ lat: number; lng: number }> = JSON.parse(pathKey)
    if (points.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        path: points,
        strokeColor: '#E87C2A',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })

      if (fitPath) {
        const bounds = new google.maps.LatLngBounds()
        points.forEach((p) => bounds.extend(p))
        JSON.parse(markersKey).forEach((marker: MapMarker) => bounds.extend(marker))
        mapRef.current.fitBounds(bounds, 48)
      }
    }
  }, [pathKey, mapReady, fitPath, markersKey])

  return (
    <div
      ref={containerRef}
      className={cn('min-h-[280px] w-full rounded-lg border border-forest/10 bg-canvas/30', className)}
    />
  )
}
