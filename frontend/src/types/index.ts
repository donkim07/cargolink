export type UserRole = 'customer' | 'provider' | 'driver' | 'admin'

export type ShipmentStatus =
  | 'pending'
  | 'quoted'
  | 'booked'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

export type CargoType =
  | 'agriculture'
  | 'food'
  | 'construction'
  | 'retail'
  | 'industrial'
  | 'other'

export type UrgencyLevel = 'standard' | 'express' | 'urgent'

export type VehicleType =
  | 'motorcycle'
  | 'van'
  | 'pickup'
  | 'truck'
  | 'refrigerated_truck'
  | 'container'

export type PaymentMethod = 'mpesa' | 'airtel_money' | 'tigo_pesa' | 'halopesa' | 'bank'

export interface User {
  id: string
  phone: string
  full_name: string | null
  email: string | null
  role: UserRole
  is_verified: boolean
  is_active: boolean
  profile_photo: string | null
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Shipment {
  id: string
  customer_id: string
  cargo_type: CargoType
  description: string | null
  weight_tons: number | null
  volume_m3: number | null
  pickup_address: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  destination_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  distance_km: number | null
  estimated_duration_minutes: number | null
  urgency: UrgencyLevel
  status: ShipmentStatus
  requires_refrigeration: boolean
  preferred_departure_date: string | null
  created_at: string
  updated_at: string
  bookings?: BookingSummary[]
}

export interface BookingSummary {
  id: string
  tracking_code: string
  status: string
  total_cost: number
  provider_id: string
}

export interface PriceBreakdown {
  base_cost: number
  service_fee: number
  insurance_fee: number
  total_cost: number
  currency: string
}

export interface QuoteItem {
  provider_id: string
  provider_name: string
  vehicle_type: VehicleType
  vehicle_id: string | null
  pricing: PriceBreakdown
}

export interface Provider {
  id: string
  user_id: string
  company_name: string
  registration_number: string | null
  rating: number
  total_deliveries: number
  response_rate: number
  is_approved: boolean
  logo_url: string | null
  description: string | null
  created_at: string
  vehicles: Vehicle[]
}

export interface Vehicle {
  id: string
  type: VehicleType
  plate_number: string
  capacity_tons: number | null
  capacity_volume_m3: number | null
  is_available: boolean
  year_of_manufacture: number | null
  photos: string[] | null
}

export interface Auction {
  id: string
  shipment_id: string
  starts_at: string
  ends_at: string
  status: string
  winning_bid_id: string | null
  created_at: string
  bids?: AuctionBid[]
  lowest_bid?: number | null
  bid_count?: number
  pickup_address?: string | null
  destination_address?: string | null
}

export interface AuctionBid {
  id: string
  auction_id: string
  provider_id: string
  amount: number
  notes: string | null
  is_winning: boolean
  created_at: string
}

export interface SharedCargoListing {
  id: string
  provider_id: string
  vehicle_id: string
  route_from: string
  route_to: string
  departure_date: string
  departure_time: string | null
  total_capacity_tons: number
  used_capacity_tons: number
  price_per_ton: number
  status: string
  created_at: string
  available_capacity_tons?: number
}

export interface Payment {
  id: string
  booking_id: string | null
  shared_cargo_booking_id: string | null
  customer_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  provider_reference: string | null
  status: string
  paid_at: string | null
  created_at: string
}

export interface ProviderDashboard {
  pending_jobs: number
  active_deliveries: number
  monthly_earnings: number
  fleet_available: number
  recent_jobs: Array<{
    id: string
    tracking_code: string
    status: string
    total_cost: number
  }>
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface AdminAnalytics {
  total_users: number
  total_providers: number
  total_shipments: number
  active_shipments: number
  total_revenue: number
}

export interface AdminProvider {
  id: string
  user_id: string
  company_name: string
  is_approved: boolean
  rating: number
  total_deliveries: number
  created_at: string
  user_phone: string | null
  vehicles?: Vehicle[]
}

export interface AdminUser {
  id: string
  phone: string
  full_name: string | null
  email: string | null
  role: UserRole
  is_verified: boolean
  is_active: boolean
  created_at: string
}
