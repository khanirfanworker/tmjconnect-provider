/**
 * profileService — real API integration
 * GET    /providers/me                → provider profile
 * PATCH  /providers/me                → update profile
 * DELETE /providers/me                → delete account
 * GET    /providers/me/sessions       → list sessions
 * DELETE /providers/me/sessions/:id   → revoke session
 * GET    /providers/me/activity       → activity log
 * GET    /providers/me/billing        → billing info
 * POST   /uploads/avatar              → upload avatar
 * GET    /notifications/preferences   → notification prefs
 * PATCH  /notifications/preferences   → update notification prefs
 */
import api from './api'

export interface NotificationPrefs {
  exercise_reminders: boolean
  symptom_checkin: boolean
  provider_messages: boolean
  report_updates: boolean
  tips_updates: boolean
  email_digest: 'instant' | 'daily' | 'weekly' | 'off'
  // UI aliases
  urgentReportsBrowser?: boolean
  urgentReportsEmail?: boolean
  concerningReportsEmail?: boolean
  patientInactiveAlert?: boolean
  inviteAcceptedEmail?: boolean
  emailDigest?: string
}

export interface SecuritySession {
  id: string
  device_info: string
  ip_address: string
  last_active: string
  created_at: string
  is_current: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(d: any) { return d?.data ?? d }

export const profileService = {
  async getProfile() {
    const { data } = await api.get('/providers/me')
    return unwrap(data)
  },

  async updateProfile(payload: Record<string, unknown>) {
    const { data } = await api.patch('/providers/me', payload)
    return unwrap(data)
  },

  async uploadAvatar(file: File): Promise<string> {
    const fd = new FormData(); fd.append('file', file)
    const { data } = await api.post('/uploads/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (unwrap(data))?.url ?? ''
  },

  async getNotifPrefs(): Promise<NotificationPrefs> {
    const { data } = await api.get('/notifications/preferences')
    return unwrap(data)
  },

  async updateNotifPrefs(prefs: Partial<NotificationPrefs>): Promise<void> {
    await api.patch('/notifications/preferences', prefs)
  },

  async getSessions(): Promise<SecuritySession[]> {
    const { data } = await api.get('/providers/me/sessions')
    const list = unwrap(data)
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((s: any): SecuritySession => ({
      id:          s.id ?? s.session_id ?? s.sessionId ?? String(Math.random()),
      device_info: s.device_info ?? s.device ?? s.user_agent ?? s.userAgent ?? s.deviceInfo ?? 'Unknown device',
      ip_address:  s.ip_address ?? s.ip ?? s.ipAddress ?? '—',
      last_active: s.last_active ?? s.lastActive ?? s.last_used ?? s.lastUsed ?? s.updated_at ?? s.created_at ?? new Date().toISOString(),
      created_at:  s.created_at ?? s.createdAt ?? new Date().toISOString(),
      is_current:  s.is_current ?? s.isCurrent ?? s.current ?? false,
    }))
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/providers/me/sessions/${sessionId}`)
  },

  async getActivityLog() {
    const { data } = await api.get('/providers/me/activity')
    return unwrap(data)
  },

  async getBilling() {
    const { data } = await api.get('/providers/me/billing')
    return unwrap(data)
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/providers/me', { data: { password } })
  },

  /** POST /auth/change-email/request — sends verification code to new email */
  async requestEmailChange(newEmail: string, currentPassword: string): Promise<{ expires_at: string }> {
    const { data } = await api.post('/auth/change-email/request', {
      new_email: newEmail,
      current_password: currentPassword,
    })
    return unwrap(data)
  },
}
