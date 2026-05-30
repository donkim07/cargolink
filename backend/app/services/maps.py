import httpx

from app.core.config import settings


class MapsServiceError(Exception):
    pass


async def get_distance_and_duration(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict:
    if not settings.google_maps_api_key:
        # Fallback for development without API key
        return {"distance_km": 100.0, "duration_minutes": 120}

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": f"{origin_lat},{origin_lng}",
        "destinations": f"{dest_lat},{dest_lng}",
        "key": settings.google_maps_api_key,
        "units": "metric",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    if data.get("status") != "OK":
        raise MapsServiceError(data.get("error_message", "Distance Matrix API error"))

    element = data["rows"][0]["elements"][0]
    if element.get("status") != "OK":
        raise MapsServiceError(element.get("status", "Route not found"))

    distance_km = element["distance"]["value"] / 1000
    duration_minutes = element["duration"]["value"] // 60

    return {
        "distance_km": round(distance_km, 2),
        "duration_minutes": int(duration_minutes),
    }


async def geocode_address(address: str) -> dict:
    if not settings.google_maps_api_key:
        return {
            "lat": -6.792354,
            "lng": 39.208328,
            "formatted_address": address,
        }

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": settings.google_maps_api_key,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    if data.get("status") != "OK" or not data.get("results"):
        raise MapsServiceError(data.get("error_message", "Geocoding failed"))

    result = data["results"][0]
    location = result["geometry"]["location"]
    return {
        "lat": location["lat"],
        "lng": location["lng"],
        "formatted_address": result["formatted_address"],
    }
