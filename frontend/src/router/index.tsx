import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout, ProtectedLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ShipmentsPage from '@/pages/ShipmentsPage'
import CreateShipmentPage from '@/pages/CreateShipmentPage'
import ShipmentDetailPage from '@/pages/ShipmentDetailPage'
import MarketplacePage from '@/pages/MarketplacePage'
import AuctionsPage from '@/pages/AuctionsPage'
import SharedCargoPage from '@/pages/SharedCargoPage'
import PaymentsPage from '@/pages/PaymentsPage'
import FleetPage from '@/pages/FleetPage'
import ProviderRegisterPage from '@/pages/ProviderRegisterPage'
import AdminProvidersPage from '@/pages/admin/AdminProvidersPage'
import AdminShipmentsPage from '@/pages/admin/AdminShipmentsPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/shipments', element: <ShipmentsPage /> },
          { path: '/shipments/create', element: <CreateShipmentPage /> },
          { path: '/shipments/:id', element: <ShipmentDetailPage /> },
          { path: '/marketplace', element: <MarketplacePage /> },
          { path: '/auctions', element: <AuctionsPage /> },
          { path: '/shared-cargo', element: <SharedCargoPage /> },
          { path: '/payments', element: <PaymentsPage /> },
          { path: '/fleet', element: <FleetPage /> },
          { path: '/provider/register', element: <ProviderRegisterPage /> },
          { path: '/admin/providers', element: <AdminProvidersPage /> },
          { path: '/admin/shipments', element: <AdminShipmentsPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
