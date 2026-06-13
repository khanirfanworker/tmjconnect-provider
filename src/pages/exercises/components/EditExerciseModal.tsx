import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { exercisesService, ExerciseCard } from '@/services/exercisesService'

interface Props {
  exercise: ExerciseCard
  onClose: () => void
}

const CATEGORIES = [
  { value: 'jaw_mobility',   label: 'Jaw Mobility' },
  { value: 'stretching',     label: 'Stretching' },
  { value: 'strengthening',  label: 'Strengthening' },
  { value: 'relaxation',     label: 'Relaxation' },
]

export function EditExerciseModal({ exercise, onClose }: Props) {
  const queryClient = useQueryClient()
  const [title, setTitle]           = useState(exercise.title)
  const [category, setCategory]     = useState(exercise.category)
  const [duration, setDuration]     = useState(String(exercise.durationSeconds))
  const [saving, setSaving]         = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await exercisesService.updateExercise(exercise.id, {
        title:            title.trim(),
        category:         category || undefined,
        duration_seconds: Number(duration) || undefined,
      })
      setDone(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['exercises'] })
        onClose()
      }, 1000)
    } catch {
      setError('Failed to update exercise. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit exercise</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{exercise.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-slate-800">Exercise updated!</p>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Input
                label="Exercise title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Gentle jaw opening, 3 sets"
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Duration (seconds)"
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 120"
              />
            </>
          )}
        </div>

        {!done && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={saving} disabled={!title.trim()} onClick={handleSave}>
              Save changes
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
