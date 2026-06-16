import { describe, it, expect, vi, beforeEach } from 'vitest'
import { profileService } from '@/services/profileService'

vi.mock('@/services/api', () => ({
  default: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/services/api'
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

describe('profileService', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── getProfile ──────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('unwraps data envelope', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: { first_name: 'Jane', email: 'jane@clinic.com' } } })
      const result = await profileService.getProfile()
      expect(result.first_name).toBe('Jane')
      expect(result.email).toBe('jane@clinic.com')
    })

    it('handles flat response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { first_name: 'John' } })
      const result = await profileService.getProfile()
      expect(result.first_name).toBe('John')
    })
  })

  // ── updateProfile ───────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('sends PATCH to /providers/me', async () => {
      mockApi.patch.mockResolvedValueOnce({ data: { first_name: 'Updated' } })
      const result = await profileService.updateProfile({ first_name: 'Updated', clinic_name: 'New Clinic' })
      expect(mockApi.patch).toHaveBeenCalledWith('/providers/me', { first_name: 'Updated', clinic_name: 'New Clinic' })
      expect(result.first_name).toBe('Updated')
    })
  })

  // ── uploadAvatar ────────────────────────────────────────────────────────

  describe('uploadAvatar', () => {
    it('sends multipart POST and returns URL', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { data: { url: 'https://cdn.example.com/avatar.jpg' } } })
      const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })
      const url = await profileService.uploadAvatar(file)
      expect(url).toBe('https://cdn.example.com/avatar.jpg')
      expect(mockApi.post).toHaveBeenCalledWith(
        '/uploads/avatar',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      )
    })

    it('returns empty string when url missing from response', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} })
      const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })
      const url = await profileService.uploadAvatar(file)
      expect(url).toBe('')
    })
  })

  // ── getSessions ─────────────────────────────────────────────────────────

  describe('getSessions', () => {
    it('maps sessions with fallback field names', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'sess_1',
              device_info: 'Chrome on Mac',
              ip_address: '1.2.3.4',
              last_active: '2026-06-01T10:00:00Z',
              created_at: '2026-05-01T00:00:00Z',
              is_current: true,
            },
          ],
        },
      })

      const sessions = await profileService.getSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe('sess_1')
      expect(sessions[0].device_info).toBe('Chrome on Mac')
      expect(sessions[0].is_current).toBe(true)
    })

    it('falls back to "Unknown device" when device_info missing', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'sess_2', ip_address: '5.6.7.8', created_at: '2026-01-01T00:00:00Z' }],
      })
      const sessions = await profileService.getSessions()
      expect(sessions[0].device_info).toBe('Unknown device')
    })

    it('returns empty array for non-array response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null })
      const sessions = await profileService.getSessions()
      expect(sessions).toEqual([])
    })
  })

  // ── revokeSession ───────────────────────────────────────────────────────

  describe('revokeSession', () => {
    it('calls DELETE with correct session id', async () => {
      mockApi.delete.mockResolvedValueOnce({})
      await profileService.revokeSession('sess_abc')
      expect(mockApi.delete).toHaveBeenCalledWith('/providers/me/sessions/sess_abc')
    })
  })

  // ── Service contract ────────────────────────────────────────────────────

  describe('service contract', () => {
    it('has all required methods', () => {
      const methods = [
        'getProfile', 'updateProfile', 'uploadAvatar',
        'getNotifPrefs', 'updateNotifPrefs',
        'getSessions', 'revokeSession',
        'getActivityLog', 'getBilling',
        'deleteAccount', 'requestEmailChange',
      ]
      for (const m of methods) {
        expect(typeof (profileService as Record<string, unknown>)[m]).toBe('function')
      }
    })
  })
})
