BASE_RATES = {
    "motorcycle": 200,
    "van": 350,
    "pickup": 400,
    "truck": 500,
    "refrigerated_truck": 700,
    "container": 900,
}

URGENCY_MULTIPLIERS = {
    "standard": 1.0,
    "express": 1.3,
    "urgent": 1.6,
}


def calculate_cost(
    distance_km: float,
    weight_tons: float,
    volume_m3: float,
    vehicle_type: str,
    urgency: str,
    requires_refrigeration: bool,
) -> dict:
    base_rate = BASE_RATES.get(vehicle_type, BASE_RATES["truck"])
    urgency_multiplier = URGENCY_MULTIPLIERS.get(urgency, 1.0)

    base = base_rate * distance_km
    weight_surcharge = weight_tons * 5000
    urgency_adjusted = base * urgency_multiplier
    refrigeration_surcharge = 50000 if requires_refrigeration else 0
    service_fee = urgency_adjusted * 0.08
    insurance = urgency_adjusted * 0.02

    total = urgency_adjusted + weight_surcharge + refrigeration_surcharge + service_fee + insurance

    return {
        "base_cost": round(urgency_adjusted + weight_surcharge + refrigeration_surcharge),
        "service_fee": round(service_fee),
        "insurance_fee": round(insurance),
        "total_cost": round(total),
        "currency": "TZS",
    }


def recommend_vehicle_type(weight_tons: float, requires_refrigeration: bool) -> str:
    if requires_refrigeration:
        return "refrigerated_truck"
    if weight_tons <= 0.5:
        return "motorcycle"
    if weight_tons <= 2:
        return "van"
    if weight_tons <= 5:
        return "pickup"
    if weight_tons <= 15:
        return "truck"
    return "container"
