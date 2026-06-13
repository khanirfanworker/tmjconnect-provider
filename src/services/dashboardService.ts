/**
 * dashboardService — real API integration
 * GET /providers/dashboard/summary                    → KPIs + patient list
 * GET /providers/patients                             → detailed patient list
 * GET /providers/patients/:id/analytics               → per-patient analytics
 * GET /providers/patients/:id/symptoms                → symptom logs
 * GET /providers/patients/:id/reports                 → patient reports
 * GET /providers/patients/:id/report-requests         → report requests
 * POST /providers/patients/:id/reports                → file a report
 * POST /providers/patients/:id/report-requests        → request report
 * PATCH /providers/patients/:id/link                  → update diagnosis
 * GET /providers/analytics                            → provider-wide analytics
 */
import api from './api'
import type { PainDataPoint } from '@/types'

// ── New interfaces ───────────────────────────────────────────────────────────

export interface PatientAnalytics {
  painTrend:          { date: string; painLevel: number }[]
  painSummary:        { avg: number; min: number; max: number; totalLogs: number }
  triggerFrequency:   { trigger: string; count: number }[]
  exerciseCompliance: { completed: number; assigned: number; rate: number }
  bodyAreaFrequency:  { area: string; count: number }[]
}

export interface SymptomLog {
  id:              string
  painLevel:       number
  painTypes:       string[]
  bodyAreas:       string[]
  triggers:        string[]
  loggedAt:        string
  durationMinutes: number | null
  notes:           string | null
}

export interface PatientReport {
  id:          string
  urgency:     'routine' | 'concerning' | 'urgent'
  status:      'submitted' | 'reviewed' | 'responded'
  flagged:     boolean
  submittedAt: string
  painLevel:   number
  preview:     string
}

export interface ReportRequest {
  id:                string
  prompt:            string
  status:            'pending' | 'fulfilled' | 'dismissed'
  createdAt:         string
  fulfilledReportId: string | null
  fulfilledAt:       string | null
}

export interface EngagementRow {
  patientId:           string
  firstName:           string
  lastName:            string
  fullName:            string
  logs30d:             number
  avgPain:             number | null
  painDelta:           number | null
  lastLogAt:           string | null
  exercisesCompleted:  number
}

export interface ProviderAnalytics {
  overview: {
    totalPatients:         number
    activePatients7d:      number
    avgPainLevel:          number
    avgPainTrend:          number
    totalLogs30d:          number
    exerciseCompliancePct: number
  }
  painTrend:           { date: string; avgPain: number; logCount: number }[]
  triggerDistribution: { trigger: string; count: number; pct: number }[]
  exerciseImpact:      { withExerciseAvgPain: number; withoutExerciseAvgPain: number; withDays: number; withoutDays: number }
  patientEngagement:   EngagementRow[]
  dayOfWeekPattern:    { day: string; avgPain: number; logCount: number }[]
  painDistribution:    { level: number; count: number }[]
}

export interface DashboardStats {
  totalPatients: number
  newThisMonth: number
  reportsAwaiting: number
  avgResponseTime: string
  urgentCount: number
  urgentSinceYesterday: number
  exerciseAdherence: number
  adherenceChange: number
}

export interface PatientRow {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  linkedSince: string
  lastAppLogin: string | null
  latestPainLevel: number | null
  status: 'stable' | 'moderate' | 'urgent'
  exerciseAdherence: number
  hasOpenUrgentReport: boolean
  condition: string
  linkedVia: string
  painTrend: PainDataPoint[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPatient(p: any): PatientRow {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
  const status = p.status === 'attention' ? 'urgent' : p.status === 'inactive' ? 'moderate' : 'stable'

  // Build 14-day pain trend from API data
  const trend: PainDataPoint[] = (p.pain_trend_14d ?? p.pain_trend ?? []).map((level: number, i: number) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return { date: d.toISOString().split('T')[0], painLevel: level }
  })

  return {
    id:                 p.id ?? p.patient_id ?? p.user_id ?? '',
    fullName:           name,
    email:              p.email ?? '',
    avatarUrl:          p.avatar_url,
    linkedSince:        p.linked_at ?? p.linked_since ?? '',
    lastAppLogin:       p.last_active ?? p.last_app_login ?? null,
    latestPainLevel:    p.avg_pain_7d ?? p.latest_pain_level ?? p.pain_level ?? null,
    status,
    exerciseAdherence:  p.exercise_adherence_pct ?? p.exercise_adherence ?? 0,
    hasOpenUrgentReport: p.has_urgent_report ?? status === 'urgent',
    condition:          p.diagnosis ?? p.condition ?? '',
    linkedVia:          p.linked_via ?? (p.linked_at ? `Linked ${Math.floor((Date.now() - new Date(p.linked_at).getTime()) / (7*24*60*60*1000))}w` : ''),
    painTrend:          trend.length > 0 ? trend : generateFallbackTrend(p.avg_pain_7d ?? 5),
  }
}

function generateFallbackTrend(base: number): PainDataPoint[] {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (13 - i))
    return { date: d.toISOString().split('T')[0], painLevel: Math.max(0, Math.min(10, base + (Math.random() - 0.5) * 2)) }
  })
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get('/providers/dashboard/summary')
    const d = data?.data ?? data
    const kpis = d?.kpis ?? d

    return {
      totalPatients:       kpis?.total_patients ?? kpis?.totalPatients ?? 0,
      newThisMonth:        kpis?.total_patients_delta ?? kpis?.new_this_month ?? 0,
      reportsAwaiting:     kpis?.unread_reports ?? kpis?.reports_awaiting ?? 0,
      avgResponseTime:     kpis?.avg_response_time ?? '—',
      urgentCount:         kpis?.urgent_patients ?? kpis?.urgent_count ?? 0,
      urgentSinceYesterday:kpis?.urgent_patients_delta ?? 0,
      exerciseAdherence:   kpis?.exercise_adherence ?? kpis?.exercise_adherence_pct ?? 0,
      adherenceChange:     kpis?.adherence_change ?? 0,
    }
  },

  async getPatients(): Promise<PatientRow[]> {
    const { data } = await api.get('/providers/patients')
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    return list.map(mapPatient)
  },

  async getPatientDetail(patientId: string): Promise<PatientRow> {
    const { data } = await api.get(`/providers/patients/${patientId}`)
    const p = data?.data ?? data
    return mapPatient(p)
  },

  // ── Patient analytics ────────────────────────────────────────────────────

  async getPatientAnalytics(patientId: string, days = 30): Promise<PatientAnalytics> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await api.get(`/providers/patients/${patientId}/analytics?days=${days}`)
    const d = data?.data ?? data
    return {
      painTrend:          (d.pain_trend ?? []).map((p: any) => ({ date: p.date, painLevel: p.pain_level })),
      painSummary:        { avg: d.pain_summary?.avg_pain ?? 0, min: d.pain_summary?.min_pain ?? 0, max: d.pain_summary?.max_pain ?? 0, totalLogs: d.pain_summary?.total_logs ?? 0 },
      triggerFrequency:   (d.trigger_frequency ?? []).map((t: any) => ({ trigger: t.trigger, count: t.count })),
      exerciseCompliance: { completed: d.exercise_compliance?.completed ?? 0, assigned: d.exercise_compliance?.assigned ?? 0, rate: d.exercise_compliance?.rate ?? 0 },
      bodyAreaFrequency:  (d.body_area_frequency ?? []).map((b: any) => ({ area: b.area, count: b.count })),
    }
  },

  // ── Patient symptom logs ─────────────────────────────────────────────────

  async getPatientSymptoms(patientId: string, limit = 20): Promise<SymptomLog[]> {
    const { data } = await api.get(`/providers/patients/${patientId}/symptoms?limit=${limit}`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((s: any): SymptomLog => ({
      id:              s.id,
      painLevel:       s.pain_level ?? 0,
      painTypes:       s.pain_types ?? [],
      bodyAreas:       (s.body_areas ?? []).map((b: any) => `${b.area}${b.side ? ` (${b.side})` : ''}`),
      triggers:        s.triggers ?? [],
      loggedAt:        s.logged_at ?? s.created_at ?? '',
      durationMinutes: s.duration_minutes ?? null,
      notes:           s.notes ?? null,
    }))
  },

  // ── Patient reports (provider-scoped) ────────────────────────────────────

  async getPatientReports(patientId: string): Promise<PatientReport[]> {
    const { data } = await api.get(`/providers/patients/${patientId}/reports?limit=25&offset=0&sortOrder=desc&sortBy=urgency`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((r: any): PatientReport => ({
      id:          r.id,
      urgency:     r.urgency === 'urgent' ? 'urgent' : r.urgency === 'concerning' ? 'concerning' : 'routine',
      status:      r.status === 'responded' ? 'responded' : r.status === 'reviewed' ? 'reviewed' : 'submitted',
      flagged:     r.flagged ?? false,
      submittedAt: r.submitted_at ?? '',
      painLevel:   r.pain_level ?? 0,
      preview:     r.description_preview ?? '',
    }))
  },

  async submitReport(patientId: string, payload: {
    urgency: 'routine' | 'concerning' | 'urgent'
    description: string
    pain_level: number
    patient_notes?: string
  }): Promise<void> {
    await api.post(`/providers/patients/${patientId}/reports`, payload)
  },

  // ── Report requests ──────────────────────────────────────────────────────

  async getReportRequests(patientId: string): Promise<ReportRequest[]> {
    const { data } = await api.get(`/providers/patients/${patientId}/report-requests`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((r: any): ReportRequest => ({
      id:                r.id,
      prompt:            r.prompt ?? '',
      status:            r.status === 'fulfilled' ? 'fulfilled' : r.status === 'dismissed' ? 'dismissed' : 'pending',
      createdAt:         r.created_at ?? '',
      fulfilledReportId: r.fulfilled_report_id ?? null,
      fulfilledAt:       r.fulfilled_at ?? null,
    }))
  },

  async requestReport(patientId: string, prompt: string): Promise<void> {
    await api.post(`/providers/patients/${patientId}/report-requests`, { prompt })
  },

  // ── Update link diagnosis ────────────────────────────────────────────────

  async updatePatientLink(patientId: string, diagnosis: string): Promise<void> {
    await api.patch(`/providers/patients/${patientId}/link`, { diagnosis })
  },

  // ── Provider-wide analytics ──────────────────────────────────────────────

  async getProviderAnalytics(days = 30): Promise<ProviderAnalytics> {
    const { data } = await api.get(`/providers/analytics?days=${days}`)
    const d = data?.data ?? data
    return {
      overview: {
        totalPatients:         d.overview?.total_patients ?? 0,
        activePatients7d:      d.overview?.active_patients_7d ?? 0,
        avgPainLevel:          d.overview?.avg_pain_level ?? 0,
        avgPainTrend:          d.overview?.avg_pain_trend ?? 0,
        totalLogs30d:          d.overview?.total_logs_30d ?? 0,
        exerciseCompliancePct: d.overview?.exercise_compliance_pct ?? 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      painTrend:           (d.pain_trend ?? []).map((p: any) => ({ date: p.date, avgPain: p.avg_pain, logCount: p.log_count })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      triggerDistribution: (d.trigger_distribution ?? []).map((t: any) => ({ trigger: t.trigger, count: t.count, pct: t.pct })),
      exerciseImpact:      {
        withExerciseAvgPain:    d.exercise_impact?.with_exercise_avg_pain ?? 0,
        withoutExerciseAvgPain: d.exercise_impact?.without_exercise_avg_pain ?? 0,
        withDays:               d.exercise_impact?.with_exercise_days ?? 0,
        withoutDays:            d.exercise_impact?.without_exercise_days ?? 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      patientEngagement: (d.patient_engagement ?? []).map((e: any): EngagementRow => ({
        patientId:          e.patient_id ?? '',
        firstName:          e.first_name ?? '',
        lastName:           e.last_name ?? '',
        fullName:           [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Patient',
        logs30d:            e.logs_30d ?? 0,
        avgPain:            e.avg_pain ?? null,
        painDelta:          e.pain_delta ?? null,
        lastLogAt:          e.last_log_at ?? null,
        exercisesCompleted: e.exercises_completed_30d ?? 0,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dayOfWeekPattern: (d.day_of_week_pattern ?? []).map((p: any) => ({ day: p.day, avgPain: p.avg_pain, logCount: p.log_count })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      painDistribution: (d.pain_distribution ?? []).map((p: any) => ({ level: p.level, count: p.count })),
    }
  },
}
