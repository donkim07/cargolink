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
  Bell,
  Search,
  Container,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import type { UserRole } from '@/types'

const navByRole: Record<UserRole, { to: string; label: string; icon: React.ElementType }[]> = {
  customer: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shipments/create', label: 'New Shipment', icon: PlusCircle },
    { to: '/shipments', label: 'My Shipments', icon: Package },
    { to: '/marketplace', label: 'Marketplace', icon: Store },
    { to: '/shared-cargo', label: 'Shared Cargo', icon: Container },
    { to: '/auctions', label: 'Auctions', icon: Gavel },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ],
  provider: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shipments', label: 'Available Jobs', icon: Package },
    { to: '/fleet', label: 'My Fleet', icon: Truck },
    { to: '/shared-cargo', label: 'Shared Cargo', icon: Container },
    { to: '/auctions', label: 'Auctions', icon: Gavel },
    { to: '/payments', label: 'Earnings', icon: CreditCard },
  ],
  driver: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shipments', label: 'Deliveries', icon: Package },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shipments', label: 'Shipments', icon: Package },
    { to: '/marketplace', label: 'Providers', icon: Users },
    { to: '/payments', label: 'Analytics', icon: BarChart3 },
  ],
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = user ? navByRole[user.role] : []

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — forest green conveys trust & stability */}
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
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
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-amber/20 text-amber-light border-l-2 border-amber'
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-muted font-bold text-sm">
              {user?.full_name?.charAt(0) ?? user?.phone.slice(-2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{user?.full_name ?? user?.phone}</p>
              <Badge variant="secondary" className="mt-0.5 capitalize text-[10px] bg-amber/20 text-amber-light border-0">
                {user?.role}
              </Badge>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} className="text-canvas/50 hover:text-canvas">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content — warm off-white canvas reduces eye strain */}
      <div className="flex flex-1 flex-col overflow-hidden bg-canvas">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-forest/10 bg-white/80 px-6 backdrop-blur-sm">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              placeholder="Search shipments, providers..."
              className="h-9 w-full rounded-lg border border-forest/10 bg-canvas/50 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber/30"
            />
          </div>
          <button className="relative rounded-lg p-2 hover:bg-forest/5">
            <Bell className="h-5 w-5 text-charcoal/60" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
