/**
 * notificationService
 * GET    /notifications              → list notifications (cursor-paginated)
 * PATCH  /notifications/:id/read    → mark single notification read
 * PATCH  /notifications/read-all    → mark all notifications read
 * GET    /notifications/preferences → (in profileService)
 * PATCH  /notifications/preferences → (in profileService)
 */
import api from './api'

export type NotifType =
  | 'provider_message'
  | 'symptom_checkin'
  | 'report_updates'
  | 'exercise_reminders'
  | 'patient_linked'
  | 'system'

export interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  read: boolean
  createdAt: string
  data?: {
    reportId?: string
    patientId?: string
    providerId?: string
    urgency?: string
    action?: string
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotif(n: any): Notification {
  return {
    id:        n.id ?? '',
    type:      n.type ?? 'system',
    title:     n.title ?? '',
    body:      n.body ?? '',
    read:      n.read ?? false,
    createdAt: n.created_at ?? '',
    data:      n.data ?? {},
  }
}

export const notificationService = {
  /** GET /notifications — latest 20 notifications */
  async getNotifications(cursor?: string): Promise<Notification[]> {
    const params = new URLSearchParams({ limit: '20' })
    if (cursor) params.set('cursor', cursor)
    const { data } = await api.get(`/notifications?${params.toString()}`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    return list.map(mapNotif)
  },

  /** PATCH /notifications/:id/read — mark one notification read */
  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  /** PATCH /notifications/read-all — mark all notifications read */
  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },
}
