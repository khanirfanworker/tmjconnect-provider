import { useEffect } from 'react'
import { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { preAuthApi } from '@/services/api'

/**
 * Proactively refreshes the access token on startup so all React Query calls
 * have a valid token — prevents the 401 wave on page refresh.
 *
 * Uses AbortController so React StrictMode's double-invoke doesn't fire two
 * refresh calls (the first is aborted on cleanup, the second completes cleanly).
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { refreshToken, accessToken, authInitialized, setTokens, logout, setAuthInitialized } = useAuthStore()

  useEffect(() => {
    if (authInitialized) return

    if (accessToken) {
      setAuthInitialized(true)
      return
    }

    if (!refreshToken) {
      setAuthInitialized(true)
      return
    }

    const controller = new AbortController()

    preAuthApi
      .post('/auth/refresh', { refresh_token: refreshToken }, { signal: controller.signal })
      .then(({ data }) => {
        const d = data?.data ?? data
        setTokens(d.access_token, d.refresh_token)
      })
      .catch((err: AxiosError & { code?: string }) => {
        // Ignore aborts — this is StrictMode cleanup, not a real failure
        if (err.code === 'ERR_CANCELED') return

        // Only logout if the server explicitly rejected the refresh token
        const status = err.response?.status
        if (status === 401 || status === 403 || status === 400) {
          logout()
        }
        // Network errors / 5xx: leave isAuthenticated as-is, let interceptor handle per-request
      })
      .finally(() => {
        // Don't mark initialized if we were aborted — the second mount will do it
        if (!controller.signal.aborted) {
          setAuthInitialized(true)
        }
      })

    return () => controller.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
