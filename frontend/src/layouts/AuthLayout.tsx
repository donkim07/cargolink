import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function AuthLayout() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center bg-canvas">Loading...</div>
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function ProtectedLayout() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center bg-canvas">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
