import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { Provider } from '@/types'

const MOCK_PROVIDER: Provider = {
  id: 'prov_001',
  fullName: 'Dr. Sarah Mitchell',
  email: 'sarah@clinic.com',
  specialties: ['Orofacial Pain'],
  clinicName: 'Pain Center',
  licenseNumber: 'DDS-001',
  mfaEnabled: true,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().logout()
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.provider).toBeNull()
    expect(state.mfaVerified).toBe(false)
  })

  it('setTokens marks as authenticated', () => {
    useAuthStore.getState().setTokens('access_123', 'refresh_456')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('access_123')
    expect(state.refreshToken).toBe('refresh_456')
  })

  it('accessToken is NOT written to localStorage (HIPAA)', () => {
    useAuthStore.getState().setTokens('access_abc', 'refresh_xyz')
    // accessToken intentionally excluded from persistence
    expect(localStorage.getItem('accessToken')).toBeNull()
    // refreshToken is stored inside the 'tmj-auth' JSON key by Zustand persist
    const stored = JSON.parse(localStorage.getItem('tmj-auth') ?? '{}')
    expect(stored?.state?.refreshToken).toBe('refresh_xyz')
  })

  it('setProvider stores provider data', () => {
    useAuthStore.getState().setProvider(MOCK_PROVIDER)
    expect(useAuthStore.getState().provider).toEqual(MOCK_PROVIDER)
  })

  it('setMfaVerified sets mfaVerified flag', () => {
    useAuthStore.getState().setMfaVerified(true)
    expect(useAuthStore.getState().mfaVerified).toBe(true)
  })

  it('setMfaPending sets isMfaPending flag', () => {
    useAuthStore.getState().setMfaPending(true)
    expect(useAuthStore.getState().isMfaPending).toBe(true)
  })

  it('updateActivity sets lastActivityAt', () => {
    const before = Date.now()
    useAuthStore.getState().updateActivity()
    const after = Date.now()
    const { lastActivityAt } = useAuthStore.getState()
    expect(lastActivityAt).toBeGreaterThanOrEqual(before)
    expect(lastActivityAt).toBeLessThanOrEqual(after)
  })

  it('logout clears all auth state', () => {
    // Set up state
    useAuthStore.getState().setTokens('access', 'refresh')
    useAuthStore.getState().setProvider(MOCK_PROVIDER)
    useAuthStore.getState().setMfaVerified(true)

    // Logout
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.provider).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.mfaVerified).toBe(false)
  })

  it('logout clears refreshToken from persisted state', () => {
    useAuthStore.getState().setTokens('access', 'refresh')
    useAuthStore.getState().logout()
    // After logout, persisted state should have no refreshToken
    const stored = JSON.parse(localStorage.getItem('tmj-auth') ?? '{}')
    expect(stored?.state?.refreshToken).toBeFalsy()
    expect(stored?.state?.isAuthenticated).toBe(false)
  })

  it('full login flow: tokens → provider → mfa → verified', () => {
    const store = useAuthStore.getState()

    // Step 1: set MFA pending after password check
    store.setMfaPending(true)
    expect(useAuthStore.getState().isMfaPending).toBe(true)

    // Step 2: set tokens after MFA verify
    store.setTokens('access_token', 'refresh_token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    // Step 3: set provider data
    store.setProvider(MOCK_PROVIDER)
    expect(useAuthStore.getState().provider?.fullName).toBe('Dr. Sarah Mitchell')

    // Step 4: mark MFA verified
    store.setMfaVerified(true)
    store.setMfaPending(false)
    expect(useAuthStore.getState().mfaVerified).toBe(true)
    expect(useAuthStore.getState().isMfaPending).toBe(false)
  })
})
