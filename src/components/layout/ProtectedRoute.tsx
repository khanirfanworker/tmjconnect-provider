import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const { isAuthenticated, mfaVerified, authInitialized } = useAuthStore()
  const location = useLocation()

  // Wait for the startup token refresh before making any routing decisions.
  // This prevents all queries from firing with no token and getting 401s.
  if (!authInitialized) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!mfaVerified) {
    return <Navigate to="/mfa" state={{ from: location }} replace />
  }

  return <Outlet />
}
