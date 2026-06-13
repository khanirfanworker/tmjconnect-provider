import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * ProtectedRoute
 *
 * Guards all app routes. Three checks in order:
 * 1. Not logged in → /login
 * 2. Logged in but MFA not verified → /mfa
 * 3. All good → render children via <Outlet />
 *
 * We save the attempted URL in `state.from` so after login
 * we can redirect the user back to where they were going.
 */
export function ProtectedRoute() {
  const { isAuthenticated, mfaVerified } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!mfaVerified) {
    return <Navigate to="/mfa" state={{ from: location }} replace />
  }

  return <Outlet />
}
