/**
 * inviteService — real API integration
 * GET    /linking/metrics             → aggregate metrics
 * GET    /linking/codes               → list generated codes
 * POST   /linking/codes               → generate new code
 * POST   /linking/codes/:code/invite  → send email invite
 * GET    /linking/links               → list active links
 * DELETE /linking/links/:id           → disconnect a link
 * POST   /linking/accept              → accept a linking code (patient-side, available for reference)
 */
import api from './api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(d: any) { return d?.data ?? d }

// ── Interfaces (field names match API response exactly) ──────────────────────

export interface LinkingMetrics {
  total_linked:      number   // active linked patients
  pending_codes:     number   // codes awaiting redemption
  expired_codes:     number   // expired unused codes
  disconnected_30d:  number   // disconnections in last 30 days
}

export interface LinkCode {
  id:         string
  code:       string
  provider_id:string
  status:     'pending' | 'connected' | 'expired'
  expires_at: string
  created_at: string
  patient_id: string | null
}

export interface ActiveLink {
  link_id:      string
  patient_id:   string
  provider_id:  string
  first_name:   string
  last_name:    string
  email:        string
  avatar_url:   string | null
  linked_at:    string
  specialty:    string
  clinic_name:  string
  credentials:  string[] | null
  diagnosis:    string | null
  // computed helper
  fullName:     string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLink(l: any): ActiveLink {
  return {
    link_id:     l.link_id ?? l.id ?? '',
    patient_id:  l.patient_id ?? '',
    provider_id: l.provider_id ?? '',
    first_name:  l.first_name ?? '',
    last_name:   l.last_name ?? '',
    email:       l.email ?? '',
    avatar_url:  l.avatar_url ?? null,
    linked_at:   l.linked_at ?? '',
    specialty:   l.specialty ?? '',
    clinic_name: l.clinic_name ?? '',
    credentials: l.credentials ?? null,
    diagnosis:   l.diagnosis ?? null,
    fullName:    [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Patient',
  }
}

export const inviteService = {

  // ── Metrics ──────────────────────────────────────────────────────────────

  async getMetrics(): Promise<LinkingMetrics> {
    const { data } = await api.get('/linking/metrics')
    const d = unwrap(data)
    return {
      total_linked:     d.total_linked     ?? d.active_links    ?? 0,
      pending_codes:    d.pending_codes    ?? d.pending_invites ?? 0,
      expired_codes:    d.expired_codes    ?? 0,
      disconnected_30d: d.disconnected_30d ?? 0,
    }
  },

  // ── Codes ─────────────────────────────────────────────────────────────────

  async getCodes(): Promise<LinkCode[]> {
    const { data } = await api.get('/linking/codes?limit=25&offset=0&sortOrder=desc&sortBy=expires_at')
    const list = unwrap(data)
    return Array.isArray(list) ? list : []
  },

  async generateCode(): Promise<LinkCode> {
    const { data } = await api.post('/linking/codes')
    return unwrap(data)
  },

  async sendEmailInvite(code: string, patientEmail: string, patientName?: string): Promise<void> {
    await api.post(`/linking/codes/${code}/invite`, {
      patient_email: patientEmail,
      patient_name:  patientName ?? null,
    })
  },

  // ── Links ─────────────────────────────────────────────────────────────────

  async getActiveLinks(): Promise<ActiveLink[]> {
    const { data } = await api.get('/linking/links?limit=100&offset=0&sortOrder=desc&sortBy=last_name')
    const list = unwrap(data)
    return Array.isArray(list) ? list.map(mapLink) : []
  },

  async disconnectLink(linkId: string): Promise<void> {
    await api.delete(`/linking/links/${linkId}`)
  },

  // ── Accept (patient-side — available for provider tools if needed) ────────

  async acceptCode(code: string): Promise<ActiveLink> {
    const { data } = await api.post('/linking/accept', { code })
    return mapLink(unwrap(data))
  },
}
