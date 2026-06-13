import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Provider } from '@/types'

/**
 * AUTH STORE
 *
 * Tokens: accessToken stored in memory (store) — NOT localStorage.
 * refreshToken stored in store (and sent via httpOnly cookie by backend).
 * We persist only non-sensitive state (provider info, mfaVerified).
 *
 * HIPAA: accessToken intentionally NOT persisted — forces re-auth after
 * browser close. refreshToken IS persisted for "trust this device" flow.
 */

interface AuthState {
  provider: Provider | null
  accessToken: string | null      // in-memory only — NOT persisted
  refreshToken: string | null     // persisted for refresh flow
  isAuthenticated: boolean
  mfaVerified: boolean
  lastActivityAt: number
  isMfaPending: boolean
  mfaToken: string | null         // short-lived token between login → MFA verify

  setTokens: (access: string, refresh: string) => void
  setProvider: (provider: Provider) => void
  setMfaVerified: (verified: boolean) => void
  setMfaPending: (pending: boolean) => void
  setMfaToken: (token: string | null) => void
  updateActivity: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      provider: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mfaVerified: false,
      lastActivityAt: 0,
      isMfaPending: false,
      mfaToken: null,

      setTokens: (access, refresh) => {
        set({
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        })
      },

      setProvider: (provider) => set({ provider }),

      setMfaVerified: (verified) => set({ mfaVerified: verified }),

      setMfaPending: (pending) => set({ isMfaPending: pending }),

      setMfaToken: (token) => set({ mfaToken: token }),

      updateActivity: () => set({ lastActivityAt: Date.now() }),

      logout: () => {
        set({
          provider: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mfaVerified: false,
          lastActivityAt: 0,
          isMfaPending: false,
          mfaToken: null,
        })
      },
    }),
    {
      name: 'tmj-auth',
      // Persist provider info and refresh token — NOT the access token
      partialize: (state) => ({
        provider:        state.provider,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        mfaVerified:     state.mfaVerified,
        lastActivityAt:  state.lastActivityAt,
      }),
    }
  )
)
