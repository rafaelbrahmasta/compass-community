import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { AdminRole } from '../../types'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  allowedRoles?: AdminRole[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { admin, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  if (allowedRoles && admin?.role && !allowedRoles.includes(admin.role)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Outlet />
}
