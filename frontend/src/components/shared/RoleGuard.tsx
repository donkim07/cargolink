import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  allow: UserRole[]
  redirectTo?: string
}

export function RoleGuard({ allow, redirectTo = '/dashboard' }: RoleGuardProps) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }
  return <Outlet />
}
