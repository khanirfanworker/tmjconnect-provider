import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '@/services/authService'

vi.mock('@/services/api', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
  preAuthApi: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
  getErrorMessage: vi.fn((e: unknown) => String(e)),
}))

import { preAuthApi } from '@/services/api'
const mockPre = preAuthApi as unknown as { post: ReturnType<typeof vi.fn> }

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Service contract ────────────────────────────────────────────────────

  describe('service contract', () => {
    it('has all required methods', () => {
      const methods = [
        'register', 'verifyEmail', 'resendVerifyEmail',
        'initMfaSetup', 'verifyMfaSetup',
        'login', 'verifyMfa', 'requestSmsMfa',
        'forgotPassword', 'verifyResetOtp', 'confirmResetPassword',
        'changePassword', 'logout', 'logoutAll', 'refreshTokens',
        'getTosStatus', 'acceptTos',
      ]
      for (const m of methods) {
        expect(typeof (authService as Record<string, unknown>)[m]).toBe('function')
      }
    })
  })

  // ── register ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('posts to /auth/provider/register with full payload', async () => {
      mockPre.post.mockResolvedValueOnce({ data: { user_id: 'u_1', message: 'Check email' } })

      const result = await authService.register({
        email:        'dr@clinic.com',
        password:     'Pass123!',
        first_name:   'Jane',
        last_name:    'Doe',
        license_type: 'DDS',
        specialty:    'TMJ',
        clinic_name:  'Pain Center',
        country:      'US',
      })

      expect(mockPre.post).toHaveBeenCalledWith(
        '/auth/provider/register',
        expect.objectContaining({
          email:      'dr@clinic.com',
          first_name: 'Jane',
          country:    'US',
        })
      )
      expect(result.user_id).toBe('u_1')
    })

    it('unwraps nested data envelope', async () => {
      mockPre.post.mockResolvedValueOnce({
        data: { data: { user_id: 'u_nested', message: 'ok' } },
      })
      const result = await authService.register({
        email: 'a@b.com', password: 'p', first_name: 'A', last_name: 'B',
        license_type: 'DDS', specialty: 'TMJ', clinic_name: 'C', country: 'US',
      })
      expect(result.user_id).toBe('u_nested')
    })
  })

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('posts to /auth/provider/login', async () => {
      mockPre.post.mockResolvedValueOnce({
        data: { mfa_required: true, mfa_token: 'tok_abc' },
      })

      const result = await authService.login({ email: 'dr@clinic.com', password: 'Pass123!' })

      expect(mockPre.post).toHaveBeenCalledWith('/auth/provider/login', {
        email: 'dr@clinic.com', password: 'Pass123!',
      })
      expect(result.mfa_required).toBe(true)
      expect(result.mfa_token).toBe('tok_abc')
    })
  })

  // ── verifyMfa ────────────────────────────────────────────────────────────

  describe('verifyMfa', () => {
    it('sends mfa_token in body (not header)', async () => {
      mockPre.post.mockResolvedValueOnce({
        data: { access_token: 'acc', refresh_token: 'ref' },
      })

      await authService.verifyMfa({ mfa_token: 'tok_abc', code: '123456', type: 'totp' })

      expect(mockPre.post).toHaveBeenCalledWith(
        '/auth/mfa/verify',
        { mfa_token: 'tok_abc', code: '123456', type: 'totp' }
      )
    })

    it('returns access and refresh tokens', async () => {
      mockPre.post.mockResolvedValueOnce({ data: { access_token: 'a', refresh_token: 'r' } })
      const result = await authService.verifyMfa({ mfa_token: 't', code: '000000', type: 'totp' })
      expect(result.access_token).toBe('a')
      expect(result.refresh_token).toBe('r')
    })
  })

  // ── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('posts email to /auth/forgot-password', async () => {
      mockPre.post.mockResolvedValueOnce({ data: {} })
      await authService.forgotPassword('dr@clinic.com')
      expect(mockPre.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'dr@clinic.com' })
    })
  })

  // ── verifyResetOtp ───────────────────────────────────────────────────────

  describe('verifyResetOtp', () => {
    it('posts email + code and returns reset_token', async () => {
      mockPre.post.mockResolvedValueOnce({ data: { reset_token: 'rst_xyz' } })
      const result = await authService.verifyResetOtp('dr@clinic.com', '654321')
      expect(result.reset_token).toBe('rst_xyz')
      expect(mockPre.post).toHaveBeenCalledWith(
        '/auth/reset-password/verify',
        { email: 'dr@clinic.com', code: '654321' }
      )
    })
  })

  // ── confirmResetPassword ─────────────────────────────────────────────────

  describe('confirmResetPassword', () => {
    it('sends reset_token and new_password in snake_case', async () => {
      mockPre.post.mockResolvedValueOnce({ data: {} })
      await authService.confirmResetPassword('rst_xyz', 'NewPass123!')
      expect(mockPre.post).toHaveBeenCalledWith(
        '/auth/reset-password/confirm',
        { reset_token: 'rst_xyz', new_password: 'NewPass123!' }
      )
    })
  })

  // ── refreshTokens ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('posts refresh token and returns new tokens', async () => {
      mockPre.post.mockResolvedValueOnce({ data: { access_token: 'new_acc', refresh_token: 'new_ref' } })
      const result = await authService.refreshTokens('old_refresh')
      expect(mockPre.post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'old_refresh' })
      expect(result.access_token).toBe('new_acc')
    })
  })
})
