import { api } from './api'
import type {
  AdminAnalytics,
  AdminProvider,
  AdminUser,
  AuthResponse,
  Auction,
  AuctionBid,
  NotificationItem,
  Payment,
  Provider,
  ProviderDashboard,
  QuoteItem,
  SharedCargoListing,
  Shipment,
  User,
  UserRole,
  Vehicle,
} from '@/types'

export const authApi = {
  sendOtp: (phone: string, purpose: 'registration' | 'login') =>
    api.post<{ message: string; expires_in: number; resend_available_in?: number }>('/auth/send-otp', { phone, purpose }),

  resendOtp: (phone: string, purpose: 'registration' | 'login') =>
    api.post<{ message: string; expires_in: number; resend_available_in?: number }>('/auth/resend-otp', { phone, purpose }),

  verifyOtp: (payload: {
    phone: string
    code: string
    purpose: 'registration' | 'login'
    full_name?: string
    email?: string
    role?: UserRole
  }) => api.post<AuthResponse>('/auth/verify-otp', payload),

  me: () => api.get<User>('/auth/me'),
}

export const shipmentsApi = {
  list: () => api.get<Shipment[]>('/shipments'),
  get: (id: string) => api.get<Shipment>(`/shipments/${id}`),
  create: (data: Record<string, unknown>) => api.post<Shipment>('/shipments', data),
  quote: (id: string) => api.post<{ shipment_id: string; quotes: QuoteItem[] }>(`/shipments/${id}/quote`),
}

export const providersApi = {
  list: (params?: { vehicle_type?: string; min_rating?: number }) =>
    api.get<Provider[]>('/providers', { params }),
  get: (id: string) => api.get<Provider>(`/providers/${id}`),
  me: () => api.get<Provider | null>('/providers/me'),
  register: (data: Record<string, unknown>) => api.post<Provider>('/providers/register', data),
  dashboard: () => api.get<ProviderDashboard>('/providers/dashboard'),
  addVehicle: (data: Record<string, unknown>) => api.post<Vehicle>('/providers/vehicles', data),
  book: (shipmentId: string, providerId: string, vehicleId: string) =>
    api.post(`/providers/book/${shipmentId}/${providerId}/${vehicleId}`),
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<NotificationItem[]>('/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id: string) => api.post<NotificationItem>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ marked_read: number }>('/notifications/read-all'),
}

export const searchApi = {
  search: (q: string) => api.get<{ shipments: Shipment[]; providers: Provider[] }>('/search', { params: { q } }),
}

export const adminApi = {
  analytics: () => api.get<AdminAnalytics>('/admin/analytics'),
  listUsers: () => api.get<AdminUser[]>('/admin/users'),
  listProviders: (approved?: boolean) =>
    api.get<AdminProvider[]>('/admin/providers', { params: approved !== undefined ? { approved } : {} }),
  approveProvider: (id: string) => api.post<AdminProvider>(`/admin/providers/${id}/approve`),
  listShipments: () => api.get<Shipment[]>('/admin/shipments'),
  assignShipment: (shipmentId: string, providerId: string, vehicleId: string) =>
    api.post(`/admin/shipments/${shipmentId}/assign`, { provider_id: providerId, vehicle_id: vehicleId }),
  seedDemo: () => api.post('/admin/seed-demo'),
}

export const auctionsApi = {
  list: (params?: { mine?: boolean }) => api.get<Auction[]>('/auctions', { params }),
  create: (shipment_id: string, duration_hours = 24) =>
    api.post<Auction>('/auctions', { shipment_id, duration_hours }),
  bid: (id: string, amount: number, notes?: string) =>
    api.post<AuctionBid>(`/auctions/${id}/bid`, { amount, notes }),
  bids: (id: string) => api.get<AuctionBid[]>(`/auctions/${id}/bids`),
  selectWinner: (id: string, bid_id: string) =>
    api.post(`/auctions/${id}/select-winner`, { bid_id }),
}

export const sharedCargoApi = {
  list: (params?: { route_from?: string; route_to?: string; min_capacity?: number }) =>
    api.get<SharedCargoListing[]>('/shared-cargo', { params }),
  create: (data: Record<string, unknown>) => api.post<SharedCargoListing>('/shared-cargo', data),
  book: (id: string, tons_booked: number, cargo_description?: string) =>
    api.post(`/shared-cargo/${id}/book`, { tons_booked, cargo_description }),
}

export const paymentsApi = {
  initiate: (data: Record<string, unknown>) => api.post('/payments/initiate', data),
  status: (reference: string) => api.get<Payment>(`/payments/status/${reference}`),
}
