## 🚀 Cursor Master Prompt — CargoLink Africa

---

```
You are building CargoLink Africa — a Digital Freight Marketplace + Logistics Management Platform targeting the African market. Think Uber Freight meets Kobo360 meets Flexport, but built for African infrastructure including SMS, USSD, and mobile money.

---

## TECH STACK

### Backend
- Python FastAPI (async)
- PostgreSQL (via SQLAlchemy async + Alembic migrations)
- Redis (OTP sessions, caching, rate limiting)
- `afri-auth-sms` Python package for OTP authentication (Africa's Talking)
- ZenoPay for payments (M-Pesa, Airtel Money, Tigo Pesa, HaloPesa)
- Google Maps Platform (Places Autocomplete, Distance Matrix, Directions API)
- Africa's Talking SDK for USSD + SMS notifications
- JWT (access + refresh tokens, issued after OTP verification)
- Celery + Redis for background tasks (SMS notifications, payment callbacks)

### Frontend
- React (Vite)
- Tailwind CSS + ShadCN UI
- TanStack Table (data tables)
- React Query (server state)
- Google Maps React wrapper for map UI
- Framer Motion for animations

### Design System
- Color palette: Deep African earth tones anchored by a bold amber-orange primary (#E87C2A), dark forest green (#1A3D2B), off-white (#F5F0E8), and charcoal (#1C1C1E)
- Typography: Display — "Clash Display" or "Cabinet Grotesk"; Body — "General Sans" or "Satoshi"
- Aesthetic: Confident, utilitarian-modern. Inspired by Kobo360 + Sendy but more premium. Think logistics command center, not startup landing page.
- Dark sidebar, light content area. Map always visible on booking flows.

---

## PROJECT STRUCTURE

```

cargolink/
├── backend/ # FastAPI app
│ ├── app/
│ │ ├── main.py
│ │ ├── core/
│ │ │ ├── config.py # Pydantic settings (.env)
│ │ │ ├── database.py # Async SQLAlchemy engine
│ │ │ ├── redis.py # Redis client
│ │ │ ├── security.py # JWT utilities
│ │ │ └── deps.py # FastAPI dependencies
│ │ ├── models/ # SQLAlchemy ORM models
│ │ ├── schemas/ # Pydantic schemas (request/response)
│ │ ├── routers/ # FastAPI routers
│ │ ├── services/ # Business logic
│ │ └── workers/ # Celery tasks
│ ├── alembic/
│ ├── requirements.txt
│ └── .env.example
│
└── frontend/ # React (Vite) application
├── public/
│ └── index.html
│
├── src/
│ ├── pages/ # Route-level pages (Dashboard, Login, etc.)
│ ├── components/ # Reusable UI components
│ ├── layouts/ # App layouts (MainLayout, AuthLayout)
│ ├── hooks/ # Custom React hooks
│ ├── context/ # React Context providers (Auth, Theme, etc.)
│ ├── services/ # API calls (axios/fetch wrappers)
│ ├── utils/ # Helper functions
│ ├── assets/ # Images, icons, fonts
│ ├── styles/ # Global CSS / Tailwind config files
│ ├── router/ # React Router setup
│ ├── App.jsx
│ └── main.jsx
│
├── .env
├── package.json
├── vite.config.js
└── eslint.config.js

````

---

## DATABASE SCHEMA

Create all these PostgreSQL tables via SQLAlchemy models + Alembic:

### users
```sql
id UUID PK
phone VARCHAR(20) UNIQUE NOT NULL
full_name VARCHAR(100)
email VARCHAR(150) UNIQUE
role ENUM('customer', 'provider', 'driver', 'admin')
is_verified BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
profile_photo TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
````

### otp_codes (Redis-backed, but log to DB)

```sql
id UUID PK
phone VARCHAR(20)
code_hash VARCHAR(255)
purpose ENUM('registration', 'login', 'password_reset')
is_used BOOLEAN DEFAULT false
expires_at TIMESTAMP
created_at TIMESTAMP
```

### providers

```sql
id UUID PK
user_id UUID FK → users
company_name VARCHAR(150)
registration_number VARCHAR(100)
rating DECIMAL(3,2) DEFAULT 0.00
total_deliveries INT DEFAULT 0
response_rate DECIMAL(5,2) DEFAULT 0.00
is_approved BOOLEAN DEFAULT false
logo_url TEXT
description TEXT
created_at TIMESTAMP
```

### vehicles

```sql
id UUID PK
provider_id UUID FK → providers
type ENUM('motorcycle', 'van', 'pickup', 'truck', 'refrigerated_truck', 'container')
plate_number VARCHAR(20) UNIQUE
capacity_tons DECIMAL(8,2)
capacity_volume_m3 DECIMAL(8,2)
is_available BOOLEAN DEFAULT true
current_location_lat DECIMAL(10,8)
current_location_lng DECIMAL(11,8)
year_of_manufacture INT
photos JSONB  -- array of URLs
created_at TIMESTAMP
```

### drivers

```sql
id UUID PK
provider_id UUID FK → providers
user_id UUID FK → users
license_number VARCHAR(50)
license_expiry DATE
is_available BOOLEAN DEFAULT true
rating DECIMAL(3,2) DEFAULT 0.00
created_at TIMESTAMP
```

### shipments

```sql
id UUID PK
customer_id UUID FK → users
cargo_type ENUM('agriculture', 'food', 'construction', 'retail', 'industrial', 'other')
description TEXT
weight_tons DECIMAL(8,2)
volume_m3 DECIMAL(8,2)
pickup_address TEXT
pickup_lat DECIMAL(10,8)
pickup_lng DECIMAL(11,8)
destination_address TEXT
destination_lat DECIMAL(10,8)
destination_lng DECIMAL(11,8)
distance_km DECIMAL(8,2)
estimated_duration_minutes INT
urgency ENUM('standard', 'express', 'urgent') DEFAULT 'standard'
status ENUM('pending', 'quoted', 'booked', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending'
requires_refrigeration BOOLEAN DEFAULT false
preferred_departure_date DATE
created_at TIMESTAMP
updated_at TIMESTAMP
```

### bookings

```sql
id UUID PK
shipment_id UUID FK → shipments
provider_id UUID FK → providers
vehicle_id UUID FK → vehicles
driver_id UUID FK → drivers
base_cost DECIMAL(12,2)
service_fee DECIMAL(12,2)
insurance_fee DECIMAL(12,2)
total_cost DECIMAL(12,2)
status ENUM('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending'
tracking_code VARCHAR(20) UNIQUE
pickup_confirmed_at TIMESTAMP
delivered_at TIMESTAMP
notes TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### auctions

```sql
id UUID PK
shipment_id UUID FK → shipments
starts_at TIMESTAMP
ends_at TIMESTAMP
status ENUM('open', 'closed', 'cancelled') DEFAULT 'open'
winning_bid_id UUID FK → auction_bids (nullable)
created_at TIMESTAMP
```

### auction_bids

```sql
id UUID PK
auction_id UUID FK → auctions
provider_id UUID FK → providers
amount DECIMAL(12,2)
notes TEXT
is_winning BOOLEAN DEFAULT false
created_at TIMESTAMP
```

### shared_cargo

```sql
id UUID PK
provider_id UUID FK → providers
vehicle_id UUID FK → vehicles
route_from TEXT
route_from_lat DECIMAL(10,8)
route_from_lng DECIMAL(11,8)
route_to TEXT
route_to_lat DECIMAL(10,8)
route_to_lng DECIMAL(11,8)
departure_date DATE
departure_time TIME
total_capacity_tons DECIMAL(8,2)
used_capacity_tons DECIMAL(8,2) DEFAULT 0
price_per_ton DECIMAL(10,2)
status ENUM('open', 'full', 'departed', 'cancelled') DEFAULT 'open'
created_at TIMESTAMP
```

### shared_cargo_bookings

```sql
id UUID PK
shared_cargo_id UUID FK → shared_cargo
customer_id UUID FK → users
tons_booked DECIMAL(8,2)
total_cost DECIMAL(12,2)
cargo_description TEXT
status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending'
created_at TIMESTAMP
```

### payments

```sql
id UUID PK
booking_id UUID FK → bookings (nullable)
shared_cargo_booking_id UUID FK → shared_cargo_bookings (nullable)
customer_id UUID FK → users
amount DECIMAL(12,2)
currency VARCHAR(10) DEFAULT 'TZS'
payment_method ENUM('mpesa', 'airtel_money', 'tigo_pesa', 'halopesa', 'bank')
provider_reference VARCHAR(100)  -- ZenoPay reference
status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending'
paid_at TIMESTAMP
created_at TIMESTAMP
```

### notifications

```sql
id UUID PK
user_id UUID FK → users
type ENUM('booking_update', 'payment', 'auction', 'system')
title VARCHAR(200)
message TEXT
is_read BOOLEAN DEFAULT false
created_at TIMESTAMP
```

### sms_logs

```sql
id UUID PK
phone VARCHAR(20)
message TEXT
purpose VARCHAR(100)
status ENUM('sent', 'failed', 'pending')
provider_message_id VARCHAR(100)
created_at TIMESTAMP
```

---

## BACKEND — FASTAPI

### Authentication Service (using afri-auth-sms)

Install: `pip install afri-auth-sms`

#### POST /api/auth/send-otp

```python
# Use AfriAuth OTPAuth class
# Accept: { "phone": "+255712345678", "purpose": "registration" | "login" }
# Generate OTP, store in Redis, send SMS via Africa's Talking
# Return: { "message": "OTP sent", "expires_in": 300 }
```

#### POST /api/auth/verify-otp

```python
# Accept: { "phone": "+255712345678", "code": "834721", "purpose": "registration" }
# Use AfriAuth verify_otp()
# On success: create/fetch user, generate JWT access + refresh tokens
# Return: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

#### POST /api/auth/refresh

Standard JWT refresh endpoint.

#### GET /api/auth/me

Return current authenticated user from JWT.

---

### Shipments Service

#### POST /api/shipments

Create new shipment. Trigger Google Maps Distance Matrix to calculate distance_km and estimated_duration_minutes automatically.

#### GET /api/shipments

List shipments for current user (customer sees own; provider sees assigned; admin sees all).

#### GET /api/shipments/{id}

Full shipment detail including booking, payment status, tracking.

#### POST /api/shipments/{id}/quote

System generates price quotes from available providers using the dynamic cost engine.

---

### Dynamic Pricing Engine

Create `services/pricing.py`:

```python
def calculate_cost(
    distance_km: float,
    weight_tons: float,
    volume_m3: float,
    vehicle_type: str,
    urgency: str,
    requires_refrigeration: bool
) -> dict:
    # Base rates per km per vehicle type (TZS)
    BASE_RATES = {
        "motorcycle": 200,
        "van": 350,
        "pickup": 400,
        "truck": 500,
        "refrigerated_truck": 700,
        "container": 900
    }

    # Urgency multipliers
    URGENCY_MULTIPLIERS = {
        "standard": 1.0,
        "express": 1.3,
        "urgent": 1.6
    }

    base = BASE_RATES[vehicle_type] * distance_km
    weight_surcharge = weight_tons * 5000  # TZS per ton
    urgency_adjusted = base * URGENCY_MULTIPLIERS[urgency]
    refrigeration_surcharge = 50000 if requires_refrigeration else 0
    service_fee = urgency_adjusted * 0.08  # 8% platform fee
    insurance = urgency_adjusted * 0.02    # 2% insurance

    total = urgency_adjusted + weight_surcharge + refrigeration_surcharge + service_fee + insurance

    return {
        "base_cost": round(urgency_adjusted + weight_surcharge + refrigeration_surcharge),
        "service_fee": round(service_fee),
        "insurance_fee": round(insurance),
        "total_cost": round(total),
        "currency": "TZS"
    }
```

---

### Google Maps Service

Create `services/maps.py`:

```python
import httpx

GOOGLE_MAPS_API_KEY = settings.GOOGLE_MAPS_API_KEY

async def get_distance_and_duration(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float
) -> dict:
    # Call Google Distance Matrix API
    # Return: { distance_km, duration_minutes }

async def geocode_address(address: str) -> dict:
    # Return: { lat, lng, formatted_address }
```

---

### Providers Service

#### GET /api/providers

List approved providers with filters: vehicle_type, cargo_type, rating.

#### GET /api/providers/{id}

Provider profile: company info, vehicles, drivers, rating, completed deliveries.

#### POST /api/providers/register

Register as a service provider (requires user account).

#### GET /api/providers/dashboard

Provider dashboard: pending jobs, active shipments, earnings summary.

#### POST /api/providers/vehicles

Add a vehicle to provider fleet.

---

### Auctions Service

#### POST /api/auctions

Customer creates auction for a shipment (opens bidding).

#### GET /api/auctions

List open auctions.

#### POST /api/auctions/{id}/bid

Provider places a bid. Validate auction is still open. Notify customer via SMS.

#### GET /api/auctions/{id}/bids

List all bids for an auction.

#### POST /api/auctions/{id}/select-winner

Customer selects a winning bid. Creates booking. Closes auction.

---

### Shared Cargo Service

#### POST /api/shared-cargo

Provider publishes available truck space.

#### GET /api/shared-cargo

List available shared cargo slots. Filter by: route, date, capacity needed.

#### POST /api/shared-cargo/{id}/book

Customer books space on a shared cargo listing. Update used_capacity_tons. Auto-close if full.

---

### Payments Service

#### POST /api/payments/initiate

Initiate ZenoPay payment for a booking.

Request:

```json
{
  "booking_id": "uuid",
  "payment_method": "mpesa",
  "phone": "+255712345678"
}
```

#### POST /api/payments/callback

ZenoPay webhook callback. Verify payment. Update booking status. Send SMS confirmation.

#### GET /api/payments/status/{reference}

Check payment status.

---

### SMS Notification Service

Create `services/sms.py` using Africa's Talking SDK:

Send SMS for these events:

- OTP verification → "Your CargoLink OTP is {code}. Expires in 5 minutes."
- Booking confirmed → "Your shipment #{tracking_code} has been confirmed. Provider: {company}."
- Vehicle dispatched → "Your cargo is on the way! Track: _384_{tracking_code}#"
- Delivery complete → "Cargo delivered successfully. Thank you for using CargoLink Africa."
- New bid received → "New bid of TZS {amount} received for your shipment."
- Auction won → "You won the auction! Proceed to payment."

---

### USSD Service

Create `routers/ussd.py`:

Africa's Talking sends POST to `/api/ussd/callback`.

Menu flow:

```
CON Welcome to CargoLink Africa
1. Track Shipment
2. Delivery Status
3. Payment Status
4. Contact Support

→ 1: CON Enter Tracking Code:
     User inputs: CL-2024-0001
     → CON Shipment CL-2024-0001
        Status: In Transit
        From: Dar es Salaam
        To: Dodoma
        ETA: 4 hours

→ 2: Same as tracking but shows full booking status

→ 3: CON Enter Tracking Code:
     → Shows: Paid / Pending

→ 4: END Contact: +255 800 CARGO (CargoLink Support)
```

Use session_id to track USSD state. Store in Redis.

---

## FRONTEND — INERTIA REACT

### Layout

**AppLayout.tsx**

- Dark sidebar (forest green #1A3D2B) with:
  - CargoLink Africa logo (amber accent)
  - Navigation links with icons
  - User info + role badge at bottom
- Light main content area (#F5F0E8 background)
- Top bar with notifications bell + search

Navigation items vary by role:

- Customer: Dashboard, New Shipment, My Shipments, Marketplace, Shared Cargo, Auctions, Payments
- Provider: Dashboard, Available Jobs, My Fleet, Shared Cargo, Auctions, Earnings
- Admin: Dashboard, Users, Providers, Shipments, Analytics

---

### Pages to Build

#### /login

Phone number input → Send OTP button → OTP input field → Verify → JWT stored → redirect to dashboard.

Design: Split screen. Left: bold CargoLink Africa hero with African route illustration (SVG or CSS art). Right: clean auth form.

#### /register

Same OTP flow but also collect: full_name, email (optional), role selection (Customer / Transport Provider).

#### /dashboard (Customer)

Stats cards:

- Active Shipments
- Total Spent (TZS)
- Completed Deliveries

Recent shipments table.
Quick action: "Book New Shipment" (prominent CTA).
Map panel: show recent pickup/destination routes.

#### /dashboard (Provider)

Stats cards:

- Pending Jobs
- Active Deliveries
- Monthly Earnings
- Fleet Availability

Recent jobs table.
Quick action: "Publish Shared Cargo Space."

#### /shipments/create (multi-step form)

Step 1 — Cargo Details:

- Cargo type (icon grid: Agriculture, Food, Construction, Retail, Industrial)
- Description
- Weight (tons)
- Volume (m³)
- Requires refrigeration (toggle)

Step 2 — Route:

- Pickup location (Google Places Autocomplete)
- Destination (Google Places Autocomplete)
- Google Map preview showing route
- Preferred departure date
- Urgency (Standard / Express / Urgent — with price impact shown)

Step 3 — Review & Quote:

- Summary of shipment details
- Distance and estimated duration (from Google Maps)
- Price breakdown: Base + Service Fee + Insurance + Total (TZS)
- Transport mode recommendation based on weight/cargo type
- "Post to Marketplace" or "Create Auction" buttons

#### /marketplace

Available transport providers grid/list.

Each provider card shows:

- Company name + logo
- Rating (stars)
- Vehicle types available
- Price range
- Response rate
- "Book Now" button

Filters sidebar:

- Vehicle type
- Cargo type
- Max price
- Rating

#### /shipments/{id}

Shipment detail page:

- Status timeline (Pending → Quoted → Booked → In Transit → Delivered)
- Map showing route
- Provider info (if booked)
- Tracking code
- Payment status
- Action buttons by status

#### /auctions

Two tabs: Browse Auctions (provider view) / My Auctions (customer view).

Auction card:

- Route summary
- Cargo type + weight
- Time remaining (countdown)
- Current lowest bid
- Number of bids
- "Place Bid" (provider) / "View Bids" (customer)

#### /shared-cargo

Browse available shared cargo space.

Filter by:

- Route from/to
- Date
- Tons needed

Each listing:

- Provider name + rating
- Route with map mini-preview
- Departure date/time
- Available capacity bar (visual progress bar)
- Price per ton
- "Book Space" button

#### /payments

Payment history table with filters.

Payment initiation modal: shows total, payment method selector (M-Pesa / Airtel / Tigo / HaloPesa), phone input.

#### /fleet (Provider only)

Vehicle list with status badges (Available / Busy / Maintenance).
Add vehicle form (type, plate, capacity, photos).

---

### Key Components

**ShipmentStatusBadge.tsx** — color-coded status chips.

**PriceBreakdownCard.tsx** — itemized cost display (Base / Service Fee / Insurance / Total in TZS formatted).

**ProviderCard.tsx** — reusable card for marketplace.

**AuctionTimer.tsx** — live countdown for open auctions.

**CargoCapacityBar.tsx** — visual remaining space bar for shared cargo.

**GoogleMapPicker.tsx** — Places Autocomplete + map preview.

**TrackingTimeline.tsx** — vertical step-by-step status timeline.

**OTPInput.tsx** — 6-digit OTP input with auto-focus progression.

---

## ENVIRONMENT VARIABLES

```env
# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=your_key_here
AT_SMS_SENDER=CargoLink

# ZenoPay
ZENOPAY_API_KEY=your_key_here
ZENOPAY_ACCOUNT_ID=your_id_here
ZENOPAY_CALLBACK_URL=https://yourdomain.com/api/payments/callback

# Google Maps
GOOGLE_MAPS_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/cargolink

# Redis
REDIS_URL=redis://localhost:6379

# JWT
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# USSD
USSD_CODE=*384*123#
```

---

## DEMO FLOW (Build in this order)

1. Auth: OTP send + verify → JWT → user session
2. Shipment create → Google Maps distance → dynamic pricing
3. Provider marketplace → browse + book
4. Payment initiation → ZenoPay → callback → SMS confirmation
5. Shared cargo → publish listing → book space
6. Auction → create → bid → select winner
7. USSD tracking endpoint

---

## IMPORTANT NOTES

- All monetary values in TZS (Tanzanian Shillings). Format as: `TZS 450,000`
- Phone numbers in E.164 format: `+255XXXXXXXXX`
- AfriAuth handles OTP generation, Redis storage, rate limiting, and SMS delivery — use it as the sole auth mechanism. Do NOT build custom OTP logic.
- All FastAPI routes must be async.
- Use Pydantic v2 schemas.
- Protect all routes with JWT dependency injection (`Depends(get_current_user)`).
- Provider routes require role check: `role == "provider"`.
- Admin routes require role check: `role == "admin"`.
- Use TanStack Table for all data tables on the frontend.
- Use React Query for all API calls — no raw fetch in components.
- Google Maps components must lazy-load to avoid blocking initial render.

```

---
```
