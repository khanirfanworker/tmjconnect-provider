/**
 * reportsService — real API integration
 * GET  /reports/inbox           → provider report inbox
 * GET  /reports/:id             → report detail
 * POST /reports/:id/respond     → respond to report
 * PATCH /reports/:id/review     → mark reviewed
 * PATCH /reports/:id/flag       → toggle flag
 * PATCH /reports/inbox/mark-viewed → bulk mark viewed
 */
import api from './api'
import type { UrgencyLevel, ReportStatus } from '@/types'

export interface ReportListItem {
  id: string; patientId: string; patientName: string; patientInitials: string
  patientColor: string; urgency: UrgencyLevel; status: ReportStatus
  painScore: number; submittedAt: string; firstLine: string; hasPhoto: boolean
  isFlagged: boolean; isNew: boolean; location: string
}

export interface ReportRequest {
  id: string; patientId: string; prompt: string
  status: 'pending' | 'fulfilled' | 'dismissed'
  createdAt: string; fulfilledReportId: string | null
  fulfilledAt: string | null; dismissedAt: string | null
  providerFirstName: string; providerLastName: string
}

export interface ReportDetail extends ReportListItem {
  patientAge: number; patientCondition: string; linkedWeeks: number
  fullMessage: string; submittedVia: string; previousPainScore: number
  previousReportDaysAgo: number; photoFilename?: string; photoResolution?: string
  photoTime?: string; photoNote?: string; providerNote?: string
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#ef4444','#10b981','#3b82f6']
function colorFor(n: string) { return COLORS[n.charCodeAt(0) % COLORS.length] }
function initials(n: string) { return n.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReport(r: any): ReportDetail {
  const name = r.patient_name ?? [r.first_name, r.last_name].filter(Boolean).join(' ') ?? 'Patient'
  const urgency: UrgencyLevel = r.urgency === 'urgent' ? 'urgent' : r.urgency === 'concerning' ? 'concerning' : 'routine'
  const status: ReportStatus = r.status === 'responded' ? 'responded' : r.status === 'reviewed' ? 'reviewed' : 'unreviewed'

  return {
    id: r.id, patientId: r.patient_id ?? '', patientName: name,
    patientInitials: initials(name), patientColor: colorFor(name),
    urgency, status,
    painScore: r.pain_level ?? 0,
    submittedAt: r.submitted_at ?? r.created_at ?? '',
    firstLine: r.description ?? '',
    hasPhoto: !!r.photo_url,
    isFlagged: r.flagged ?? r.is_flagged ?? false,
    isNew: r.status === 'submitted' || r.status === 'new',
    location: r.location ?? '',
    patientAge: r.patient_age ?? 0,
    patientCondition: r.patient_condition ?? r.diagnosis ?? '',
    linkedWeeks: r.linked_weeks ?? 0,
    fullMessage: r.description ?? r.patient_notes ?? '',
    submittedVia: r.submitted_via ?? 'Mobile app',
    previousPainScore: r.previous_pain ?? 0,
    previousReportDaysAgo: r.previous_report_days ?? 3,
    photoFilename: r.photo_url?.split('/').pop(),
    photoResolution: r.photo_resolution,
    photoTime: r.photo_time,
    photoNote: r.photo_note ?? r.patient_notes,
    providerNote: r.provider_note ?? r.internal_notes,
  }
}

export const reportsService = {
  async getReports(): Promise<ReportDetail[]> {
    const { data } = await api.get('/reports/inbox')
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    return list.map(mapReport)
  },

  async getReportDetail(id: string): Promise<ReportDetail> {
    const { data } = await api.get(`/reports/${id}`)
    const r = data?.data?.report ?? data?.data ?? data
    return mapReport(r)
  },

  async markReviewed(id: string): Promise<void> {
    await api.patch(`/reports/${id}/review`)
  },

  async flagReport(id: string): Promise<void> {
    await api.patch(`/reports/${id}/flag`)
  },

  async sendResponse(id: string, message: string, internalNotes?: string): Promise<void> {
    await api.post(`/reports/${id}/respond`, { message, internal_notes: internalNotes ?? null })
  },

  async markAllViewed(): Promise<void> {
    await api.patch('/reports/inbox/mark-viewed')
  },

  /** GET /reports/requests — list pending report requests (role-aware: provider sees requests from their linked patients) */
  async getReportRequests(params?: { patientId?: string; status?: string; limit?: number }): Promise<ReportRequest[]> {
    const q = new URLSearchParams()
    if (params?.patientId) q.set('patient_id', params.patientId)
    if (params?.status)    q.set('status', params.status)
    q.set('limit',      String(params?.limit ?? 25))
    q.set('offset',     '0')
    q.set('sortOrder',  'desc')
    const { data } = await api.get(`/reports/requests?${q.toString()}`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((r: any): ReportRequest => ({
      id:                  r.id ?? '',
      patientId:           r.patient_id ?? '',
      prompt:              r.prompt ?? '',
      status:              r.status ?? 'pending',
      createdAt:           r.created_at ?? '',
      fulfilledReportId:   r.fulfilled_report_id ?? null,
      fulfilledAt:         r.fulfilled_at ?? null,
      dismissedAt:         r.dismissed_at ?? null,
      providerFirstName:   r.provider_first_name ?? '',
      providerLastName:    r.provider_last_name ?? '',
    }))
  },

  /** DELETE /reports/requests/:id — dismiss a pending report request */
  async dismissReportRequest(id: string): Promise<void> {
    await api.delete(`/reports/requests/${id}`)
  },
}
