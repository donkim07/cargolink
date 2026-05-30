import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Store,
  Truck,
  Gavel,
  CreditCard,
  Users,
  BarChart3,
  LogOut,
  Container,
  Menu,
  X,
  Shield,
  MapPinned,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/shared/SearchBar'
import { NotificationsDropdown } from '@/components/shared/NotificationsDropdown'
import { cn } from '@/utils/cn'
import type { UserRole } from '@/types'

type NavItem = { to: string; label: string; icon: React.ElementType }

const customerNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/shipments/create', label: 'New Shipment', icon: PlusCircle },
  { to: '/shipments', label: 'My Shipments', icon: Package },
  { to: '/track', label: 'Track Cargo', icon: MapPinned },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/shared-cargo', label: 'Shared Cargo', icon: Container },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
  { to: '/payments', label: 'Payments', icon: CreditCard },
]

const providerNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/shipments', label: 'Available Jobs', icon: Package },
  { to: '/track', label: 'Track Cargo', icon: MapPinned },
  { to: '/fleet', label: 'My Fleet', icon: Truck },
  { to: '/shared-cargo', label: 'Shared Cargo', icon: Container },
  { to: '/auctions', label: 'Auctions', icon: Gavel },
  { to: '/payments', label: 'Earnings', icon: CreditCard },
]

const adminNav: NavItem[] = [
  { to: '/dashboard', label: 'Admin Dashboard', icon: Shield },
  { to: '/admin/shipments', label: 'Manage Shipments', icon: Package },
  { to: '/admin/providers', label: 'Manage Providers', icon: Users },
  { to: '/admin/users', label: 'Manage Users', icon: BarChart3 },
  { to: '/track', label: 'Track Cargo', icon: MapPinned },
  { to: '/shipments/create', label: 'New Shipment', icon: PlusCircle },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
]

function buildNav(role: UserRole): NavItem[] {
  if (role === 'admin') return adminNav
  if (role === 'provider') {
    return [
      ...providerNav,
      { to: '/provider/register', label: 'Complete Profile', icon: Truck },
    ]
  }
  if (role === 'driver') {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/shipments', label: 'Deliveries', icon: Package },
      { to: '/track', label: 'Track Cargo', icon: MapPinned },
    ]
  }
  return customerNav
}

function SidebarContent({
  nav,
  user,
  onNavigate,
  onLogout,
}: {
  nav: NavItem[]
  user: ReturnType<typeof useAuth>['user']
  onNavigate?: () => void
  onLogout: () => void
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber font-display text-lg font-bold text-white">
          CL
        </div>
        <div>
          <p className="font-display text-sm font-bold tracking-wide">CargoLink</p>
          <p className="text-[10px] uppercase tracking-widest text-canvas/50">Africa</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'border-l-2 border-amber bg-amber/20 text-amber-light'
                  : 'text-canvas/70 hover:bg-white/5 hover:text-canvas'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-muted text-sm font-bold">
            {user?.full_name?.charAt(0) ?? user?.phone.slice(-2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.full_name ?? user?.phone}</p>
            <Badge variant="secondary" className="mt-0.5 border-0 bg-amber/20 text-[10px] capitalize text-amber-light">
              {user?.role}
            </Badge>
          </div>
          <button onClick={onLogout} className="text-canvas/50 hover:text-canvas" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = user ? buildNav(user.role) : []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarContent nav={nav} user={user} onLogout={handleLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-canvas"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarContent
              nav={nav}
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-forest/10 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SearchBar />
          <NotificationsDropdown />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
