import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exercisesService } from '@/services/exercisesService'

// Mock the api module
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

describe('exercisesService', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getExercises ────────────────────────────────────────────────────────

  describe('getExercises', () => {
    it('maps API response array to ExerciseCard[]', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'ex_1',
              title: 'Jaw Open-Close',
              category: 'jaw_mobility',
              duration_seconds: 120,
              provider_name: 'Dr. Smith',
              created_at: '2026-01-15T00:00:00Z',
              assignment_count: 10,
              video_url: 'https://cdn.example.com/video.mp4',
              thumbnail_url: 'https://cdn.example.com/thumb.jpg',
            },
          ],
        },
      })

      const result = await exercisesService.getExercises()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ex_1')
      expect(result[0].title).toBe('Jaw Open-Close')
      expect(result[0].category).toBe('jaw_mobility')
      expect(result[0].durationSeconds).toBe(120)
      expect(result[0].assignedCount).toBe(10)
      expect(result[0].videoUrl).toBe('https://cdn.example.com/video.mp4')
    })

    it('returns empty array when API returns non-array', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null })
      const result = await exercisesService.getExercises()
      expect(result).toEqual([])
    })

    it('handles flat data envelope', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'ex_2', title: 'Chin Tuck', category: 'stretching', duration_seconds: 60, assignment_count: 5 }],
      })
      const result = await exercisesService.getExercises()
      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('stretching')
    })

    it('falls back to jaw_mobility config for unknown category', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [{ id: 'ex_3', title: 'Unknown', category: 'unknown_cat', duration_seconds: 30 }],
      })
      const result = await exercisesService.getExercises()
      expect(result[0].categoryLabel).toBe('JAW MOBILITY')
    })
  })

  // ── assignToPatient ─────────────────────────────────────────────────────

  describe('assignToPatient', () => {
    it('calls correct endpoint with snake_case payload', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} })

      await exercisesService.assignToPatient('patient_1', 'ex_1', '2x_daily')

      expect(mockApi.post).toHaveBeenCalledWith(
        '/providers/patients/patient_1/assignments',
        expect.objectContaining({
          exercise_id: 'ex_1',
          patient_id:  'patient_1',
          frequency:   '2x_daily',
        })
      )
    })

    it('uses default sets=3 when not specified', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} })
      await exercisesService.assignToPatient('p1', 'e1', 'daily')
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sets: 3 })
      )
    })
  })

  // ── getPatientAssignments ───────────────────────────────────────────────

  describe('getPatientAssignments', () => {
    it('maps assignment response to PatientAssignment[]', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'assign_1',
              exercise_id: 'ex_1',
              title: 'Jaw Open-Close',
              frequency: 'daily',
              sets: 3,
              status: 'active',
              assigned_at: '2026-01-01T00:00:00Z',
              duration_seconds: 90,
              category: 'jaw_mobility',
            },
          ],
        },
      })

      const result = await exercisesService.getPatientAssignments('patient_1')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Jaw Open-Close')
      expect(result[0].frequency).toBe('daily')
      expect(result[0].status).toBe('active')
    })

    it('maps paused and completed statuses correctly', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: [
          { id: 'a1', exercise_id: 'e1', title: 'A', status: 'paused',    frequency: 'daily', sets: 1, assigned_at: '', duration_seconds: 0 },
          { id: 'a2', exercise_id: 'e2', title: 'B', status: 'completed', frequency: 'daily', sets: 1, assigned_at: '', duration_seconds: 0 },
          { id: 'a3', exercise_id: 'e3', title: 'C', status: 'other',     frequency: 'daily', sets: 1, assigned_at: '', duration_seconds: 0 },
        ],
      })

      const result = await exercisesService.getPatientAssignments('p1')
      expect(result[0].status).toBe('paused')
      expect(result[1].status).toBe('completed')
      expect(result[2].status).toBe('active')
    })

    it('returns empty array for non-array response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null })
      const result = await exercisesService.getPatientAssignments('p1')
      expect(result).toEqual([])
    })
  })

  // ── Service contract ────────────────────────────────────────────────────

  describe('service contract', () => {
    it('has all required methods', () => {
      expect(typeof exercisesService.getExercises).toBe('function')
      expect(typeof exercisesService.assignToPatient).toBe('function')
      expect(typeof exercisesService.getPatientAssignments).toBe('function')
      expect(typeof exercisesService.updateAssignment).toBe('function')
      expect(typeof exercisesService.deleteAssignment).toBe('function')
      expect(typeof exercisesService.createExercise).toBe('function')
      expect(typeof exercisesService.updateExercise).toBe('function')
      expect(typeof exercisesService.deleteExercise).toBe('function')
    })
  })
})
