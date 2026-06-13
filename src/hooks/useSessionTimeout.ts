import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const TIMEOUT_MS = 15 * 60 * 1_000  // 15 minutes — HIPAA requirement

/**
 * useSessionTimeout
 *
 * Enforces the HIPAA 15-minute inactivity timeout.
 * - Listens for mousemove, keydown, click, scroll → resets the timer
 * - Checks every 60s whether the session has expired
 * - On timeout: calls logout() and redirects to /login?reason=timeout
 *
 * Mount this once inside the authenticated layout shell.
 */
export function useSessionTimeout() {
  const { isAuthenticated, mfaVerified, updateActivity, logout } = useAuthStore()
  const navigate = useNavigate()

  const resetTimer = useCallback(() => {
    if (isAuthenticated && mfaVerified) {
      updateActivity()
    }
  }, [isAuthenticated, mfaVerified, updateActivity])

  useEffect(() => {
    if (!isAuthenticated || !mfaVerified) return

    // Reset on any user interaction
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))

    // Poll every 60s to check expiry
    const interval = setInterval(() => {
      const { lastActivityAt } = useAuthStore.getState()
      if (lastActivityAt && Date.now() - lastActivityAt > TIMEOUT_MS) {
        logout()
        navigate('/login?reason=timeout')
      }
    }, 60_000)

    // Seed the timer on mount
    resetTimer()

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      clearInterval(interval)
    }
  }, [isAuthenticated, mfaVerified, resetTimer, logout, navigate])
}
