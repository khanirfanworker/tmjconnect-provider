/**
 * exercisesService — real API integration
 * GET    /providers/exercises             → list library
 * POST   /providers/exercises             → create exercise
 * PATCH  /providers/exercises/:id         → update
 * DELETE /providers/exercises/:id         → delete
 * POST   /providers/patients/:pid/assignments → assign to patient
 * POST   /uploads/video                   → upload video file
 * POST   /uploads/thumbnail               → upload thumbnail
 */
import api from './api'

export type ExerciseCategoryKey = 'all' | 'jaw_mobility' | 'stretching' | 'strengthening' | 'relaxation'

export interface ExerciseCard {
  id: string; title: string; category: ExerciseCategoryKey; categoryLabel: string
  categoryColor: string; durationSeconds: number; recordedBy: string
  recordedDate: string; assignedCount: number; thumbnailBg: string
  videoUrl?: string; thumbnailUrl?: string
}

export interface PatientAssignment {
  assignmentId: string
  exerciseId: string
  title: string
  frequency: string
  sets: number
  status: 'active' | 'paused' | 'completed'
  assignedAt: string
  durationSeconds: number
  category: string
  videoUrl?: string
  thumbnailUrl?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAssignment(a: any): PatientAssignment {
  return {
    assignmentId:    a.assignment_id ?? a.id ?? '',
    exerciseId:      a.exercise_id ?? '',
    title:           a.title ?? '',
    frequency:       a.frequency ?? '',
    sets:            a.sets ?? 1,
    status:          a.status === 'paused' ? 'paused' : a.status === 'completed' ? 'completed' : 'active',
    assignedAt:      a.assigned_at ?? '',
    durationSeconds: a.duration_seconds ?? 0,
    category:        a.category ?? '',
    videoUrl:        a.video_url,
    thumbnailUrl:    a.thumbnail_url,
  }
}

const CAT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  jaw_mobility:  { label: 'JAW MOBILITY',  color: '#2d5280', bg: '#1e3a5f' },
  stretching:    { label: 'STRETCHING',    color: '#4a3728', bg: '#3d2f24' },
  strengthening: { label: 'STRENGTHENING', color: '#1a3a2a', bg: '#162e21' },
  relaxation:    { label: 'RELAXATION',    color: '#2a2040', bg: '#1e1830' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapExercise(e: any): ExerciseCard {
  const cat = (e.category ?? '').toLowerCase().replace(/\s+/g, '_') as ExerciseCategoryKey
  const cfg = CAT_CFG[cat] ?? CAT_CFG.jaw_mobility
  return {
    id: e.id, title: e.title ?? '', category: cat,
    categoryLabel: cfg.label, categoryColor: cfg.color,
    durationSeconds: e.duration_seconds ?? 0,
    recordedBy: e.provider_name ?? e.created_by ?? 'Dr. Provider',
    recordedDate: e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    assignedCount: e.assignment_count ?? e.assigned_count ?? 0,
    thumbnailBg: cfg.bg,
    videoUrl: e.video_url, thumbnailUrl: e.thumbnail_url,
  }
}

export const exercisesService = {
  async getExercises(): Promise<ExerciseCard[]> {
    const { data } = await api.get('/providers/exercises')
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    return list.map(mapExercise)
  },

  async createExercise(payload: {
    title: string; description?: string; instructions?: string; duration_seconds: number
    category: string; video_url?: string; thumbnail_url?: string
  }): Promise<{ id: string }> {
    const { data } = await api.post('/providers/exercises', payload)
    return data?.data ?? data
  },

  async uploadVideo(file: File): Promise<{ url: string }> {
    const fd = new FormData(); fd.append('file', file)
    const { data } = await api.post('/uploads/video', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data?.data ?? data
  },

  async uploadThumbnail(file: File): Promise<{ url: string }> {
    const fd = new FormData(); fd.append('file', file)
    const { data } = await api.post('/uploads/thumbnail', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data?.data ?? data
  },

  async assignToPatient(patientId: string, exerciseId: string, frequency: string, sets = 3): Promise<void> {
    await api.post(`/providers/patients/${patientId}/assignments`, {
      exercise_id: exerciseId, patient_id: patientId, frequency, sets,
    })
  },

  async updateExercise(id: string, payload: {
    title?: string; description?: string; duration_seconds?: number
    category?: string; instructions?: string; video_url?: string; thumbnail_url?: string
  }): Promise<void> {
    await api.patch(`/providers/exercises/${id}`, payload)
  },

  async deleteExercise(id: string): Promise<void> {
    await api.delete(`/providers/exercises/${id}`)
  },

  // ── Assignment management ──────────────────────────────────────────────────

  async getPatientAssignments(patientId: string): Promise<PatientAssignment[]> {
    const { data } = await api.get(`/providers/patients/${patientId}/assignments`)
    const list = data?.data ?? data
    if (!Array.isArray(list)) return []
    return list.map(mapAssignment)
  },

  async updateAssignment(assignmentId: string, payload: {
    frequency?: string; sets?: number; status?: 'active' | 'paused' | 'completed'
  }): Promise<void> {
    await api.patch(`/providers/assignments/${assignmentId}`, payload)
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    await api.delete(`/providers/assignments/${assignmentId}`)
  },
}
