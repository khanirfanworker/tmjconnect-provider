/**
 * authService.ts — verified against TMJConnect Postman collection
 *
 * ALL request/response fields are snake_case.
 *
 * REGISTRATION FLOW:
 *   POST /auth/provider/register     → { user_id, message }
 *   POST /auth/verify-email          → { mfa_setup_required, setup_token }
 *   POST /auth/mfa/setup             → { secret, qr_uri }   [Bearer: setup_token]
 *   POST /auth/mfa/verify-setup      → { backup_codes[], access_token, refresh_token } [Bearer]
 *
 * LOGIN FLOW:
 *   POST /auth/provider/login        → { mfa_required, mfa_token }
 *   POST /auth/mfa/verify            → { access_token, refresh_token }
 *     body: { mfa_token, code, type }  ← token in BODY not header
 *
 * RESET PASSWORD (3-step):
 *   POST /auth/forgot-password       → sends OTP email
 *   POST /auth/reset-password/verify → { reset_token }
 *   POST /auth/reset-password/confirm→ success
 */

import api, { preAuthApi, getErrorMessage } from './api'

// ─── Unwrap: handles { data: {...} } envelope OR flat ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(resp: any): T {
  return resp?.data !== undefined && typeof resp.data === 'object' ? resp.data : resp
}

// ─── Types (all snake_case) ──────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  date_of_birth?: string
  phone?: string
  license_type: string
  specialty: string
  clinic_name: string
  country: string
  timezone?: string
  credentials?: string[]
}

export interface RegisterResponse {
  user_id: string
  message: string
}

export interface VerifyEmailRequest {
  email: string
  code: string
}

export interface VerifyEmailResponse {
  mfa_setup_required: boolean
  setup_token: string
}

export interface MfaSetupResponse {
  secret: string
  qr_uri: string
  setup_token?: string  // may be rotated by the server — use this for verify if present
}

export interface MfaVerifySetupResponse {
  backup_codes: string[]
  access_token: string
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  mfa_required: boolean
  mfa_token: string
}

export interface MfaVerifyRequest {
  mfa_token: string
  code: string
  type: 'totp' | 'sms' | 'backup'
}

export interface MfaVerifyResponse {
  access_token: string
  refresh_token: string
}

export interface ResetPasswordVerifyResponse {
  reset_token: string
}

// ─── Auth service ────────────────────────────────────────────────────────────

export const authService = {

  // ── Registration ───────────────────────────────────────────────────────────

  /** POST /auth/provider/register */
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const { data } = await preAuthApi.post('/auth/provider/register', payload)
    return unwrap<RegisterResponse>(data)
  },

  /** POST /auth/verify-email — 6-digit OTP, 5 min expiry */
  async verifyEmail(payload: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    const { data } = await preAuthApi.post('/auth/verify-email', payload)
    return unwrap<VerifyEmailResponse>(data)
  },

  /** POST /auth/resend-verify-email */
  async resendVerifyEmail(email: string): Promise<void> {
    await preAuthApi.post('/auth/resend-verify-email', { email })
  },

  /** POST /auth/mfa/setup — Bearer: setup_token (onboarding) */
  async initMfaSetup(setupToken: string): Promise<MfaSetupResponse> {
    const { data } = await preAuthApi.post('/auth/mfa/setup', {}, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
    return unwrap<MfaSetupResponse>(data)
  },

  /** POST /auth/mfa/verify-setup — Bearer: setup_token, body: { code } (onboarding) */
  async verifyMfaSetup(setupToken: string, code: string): Promise<MfaVerifySetupResponse> {
    const { data } = await preAuthApi.post('/auth/mfa/verify-setup', { code }, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
    return unwrap<MfaVerifySetupResponse>(data)
  },

  /** POST /auth/mfa/reconfigure/init — Bearer: access_token, body: { password, code } → { setup_token } */
  async reconfigureInit(password: string, code: string): Promise<string> {
    const { data } = await api.post('/auth/mfa/reconfigure/init', { password, code })
    const d = data?.data ?? data
    const token = d.setup_token ?? d.setupToken ?? d.token ?? d.mfa_token
    if (!token) throw new Error('No setup token returned from server')
    return token
  },

  /** POST /auth/mfa/setup — Bearer: setup_token (reconfigure, same as registration) */
  async reconfigureMfaSetup(setupToken: string): Promise<MfaSetupResponse> {
    const { data } = await preAuthApi.post('/auth/mfa/setup', {}, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
    return unwrap<MfaSetupResponse>(data)
  },

  /** POST /auth/mfa/verify-setup — Bearer: setup_token, body: { code } (reconfigure) */
  async reconfigureMfaVerify(setupToken: string, code: string): Promise<MfaVerifySetupResponse> {
    const { data } = await preAuthApi.post('/auth/mfa/verify-setup', { code }, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
    return unwrap<MfaVerifySetupResponse>(data)
  },

  // ── Login ──────────────────────────────────────────────────────────────────

  /** POST /auth/provider/login → { mfa_required, mfa_token } */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await preAuthApi.post('/auth/provider/login', payload)
    return unwrap<LoginResponse>(data)
  },

  /**
   * POST /auth/mfa/verify — completes login with MFA code
   * Body: { mfa_token, code, type } — token in BODY, NOT Bearer header
   */
  async verifyMfa(payload: MfaVerifyRequest): Promise<MfaVerifyResponse> {
    const { data } = await preAuthApi.post('/auth/mfa/verify', payload)
    return unwrap<MfaVerifyResponse>(data)
  },

  /** POST /auth/mfa/sms — request SMS fallback, body: { mfa_token } */
  async requestSmsMfa(mfaToken: string): Promise<void> {
    await preAuthApi.post('/auth/mfa/sms', { mfa_token: mfaToken })
  },

  // ── Password reset (3-step) ────────────────────────────────────────────────

  /** POST /auth/forgot-password — sends 5-min OTP to email */
  async forgotPassword(email: string): Promise<void> {
    await preAuthApi.post('/auth/forgot-password', { email })
  },

  /** POST /auth/reset-password/verify — verify OTP → get reset_token */
  async verifyResetOtp(email: string, code: string): Promise<ResetPasswordVerifyResponse> {
    const { data } = await preAuthApi.post('/auth/reset-password/verify', { email, code })
    return unwrap<ResetPasswordVerifyResponse>(data)
  },

  /** POST /auth/reset-password/confirm — set new password with reset_token */
  async confirmResetPassword(resetToken: string, newPassword: string): Promise<void> {
    await preAuthApi.post('/auth/reset-password/confirm', {
      reset_token: resetToken,
      new_password: newPassword,
    })
  },

  // ── Authenticated endpoints ────────────────────────────────────────────────

  /** PATCH /auth/change-password — Bearer required */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },

  /** DELETE /auth/logout — Bearer + body: { refresh_token } */
  async logout(): Promise<void> {
    const { useAuthStore } = await import('@/store/authStore')
    const rt = useAuthStore.getState().refreshToken
    try { await api.delete('/auth/logout', { data: { refresh_token: rt } }) } catch { /* ok */ }
  },

  /** DELETE /auth/logout-all — Bearer required */
  async logoutAll(): Promise<void> {
    await api.delete('/auth/logout-all')
  },

  /** POST /auth/refresh — body: { refresh_token } */
  async refreshTokens(refreshToken: string): Promise<MfaVerifyResponse> {
    const { data } = await preAuthApi.post('/auth/refresh', { refresh_token: refreshToken })
    return unwrap<MfaVerifyResponse>(data)
  },

  // ── Terms of Service ───────────────────────────────────────────────────────

  /** GET /auth/tos/current — Bearer */
  async getTosStatus(): Promise<{ version: string; accepted: boolean }> {
    const { data } = await api.get('/auth/tos/current')
    return unwrap(data)
  },

  /** POST /auth/tos/accept — Bearer, body: { version } */
  async acceptTos(version: string): Promise<void> {
    await api.post('/auth/tos/accept', { version })
  },
}



export { getErrorMessage }
