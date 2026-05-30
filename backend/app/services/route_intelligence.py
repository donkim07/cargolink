"""Route intelligence — corridor risks for major Tanzania freight routes."""

from dataclasses import dataclass


@dataclass
class RouteRisk:
    risk_type: str
    location: str
    section: str
    score: int
    delay_minutes: int
    advice: str


# Known corridor hazards (static + community-reported via Redis)
STATIC_RISKS: list[dict] = [
    {
        "keywords": ["dar es salaam", "morogoro", "dodoma", "kilosa", "chalinze"],
        "risk_type": "Flood",
        "location": "Kilosa",
        "section": "Chalinze → Morogoro",
        "score": 67,
        "delay_minutes": 46,
        "advice": "Route is mostly usable, but exercise caution near Kilosa due to seasonal flooding.",
    },
    {
        "keywords": ["dar es salaam", "morogoro", "chalinze"],
        "risk_type": "Traffic",
        "location": "Chalinze",
        "section": "Dar es Salaam → Chalinze",
        "score": 45,
        "delay_minutes": 25,
        "advice": "Heavy truck traffic on Pugu Road during peak hours.",
    },
    {
        "keywords": ["morogoro", "dodoma", "mikumi"],
        "risk_type": "Wildlife Crossing",
        "location": "Mikumi",
        "section": "Morogoro → Mikumi",
        "score": 38,
        "delay_minutes": 15,
        "advice": "Reduce speed through Mikumi corridor — wildlife crossing zone.",
    },
    {
        "keywords": ["mwanza", "shinyanga", "lukwago"],
        "risk_type": "Road Works",
        "location": "Lukwago",
        "section": "Shinyanga → Mwanza",
        "score": 52,
        "delay_minutes": 30,
        "advice": "Partial lane closure reported. Plan extra travel time.",
    },
    {
        "keywords": ["arusha", "moshi", "namanga"],
        "risk_type": "Weather",
        "location": "Moshi Highlands",
        "section": "Moshi → Arusha",
        "score": 41,
        "delay_minutes": 20,
        "advice": "Fog possible in early morning on highland sections.",
    },
]


def _normalize(text: str) -> str:
    return text.lower().strip()


def analyze_route(pickup_address: str | None, destination_address: str | None) -> list[RouteRisk]:
    """Return applicable risks for a pickup → destination corridor."""
    route_text = _normalize(f"{pickup_address or ''} {destination_address or ''}")
    if not route_text.strip():
        return []

    risks: list[RouteRisk] = []
    seen: set[str] = set()

    for item in STATIC_RISKS:
        if not any(kw in route_text for kw in item["keywords"]):
            continue
        key = f"{item['location']}:{item['risk_type']}"
        if key in seen:
            continue
        seen.add(key)
        risks.append(
            RouteRisk(
                risk_type=item["risk_type"],
                location=item["location"],
                section=item["section"],
                score=item["score"],
                delay_minutes=item["delay_minutes"],
                advice=item["advice"],
            )
        )

    return sorted(risks, key=lambda r: r.score, reverse=True)


def format_route_label(pickup: str | None, destination: str | None) -> str:
    pickup_short = (pickup or "Origin").split(",")[0].strip()
    dest_short = (destination or "Destination").split(",")[0].strip()
    return f"{pickup_short} → {dest_short}"


async def get_community_risks(redis, route_label: str) -> list[RouteRisk]:
    """Load user-reported hazards from Redis."""
    key = f"route:hazards:{_normalize(route_label)}"
    entries = await redis.lrange(key, 0, 4)
    risks: list[RouteRisk] = []
    for raw in entries:
        parts = raw.split("|")
        if len(parts) < 5:
            continue
        risks.append(
            RouteRisk(
                risk_type=parts[0],
                location=parts[1],
                section=parts[2],
                score=int(parts[3]),
                delay_minutes=int(parts[4]),
                advice=parts[5] if len(parts) > 5 else "Community-reported hazard.",
            )
        )
    return risks


async def report_hazard(
    redis,
    route_label: str,
    hazard_type: str,
    location: str,
    section: str,
    score: int = 65,
    delay_minutes: int = 40,
) -> None:
    key = f"route:hazards:{_normalize(route_label)}"
    entry = f"{hazard_type}|{location}|{section}|{score}|{delay_minutes}|Community report — drive carefully."
    await redis.lpush(key, entry)
    await redis.ltrim(key, 0, 19)
    await redis.expire(key, 60 * 60 * 72)
