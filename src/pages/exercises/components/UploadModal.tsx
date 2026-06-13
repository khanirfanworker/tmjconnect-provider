import { useState } from 'react'
import { X, Plus, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { exercisesService } from '@/services/exercisesService'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'jaw_mobility',   label: 'Jaw Mobility' },
  { value: 'stretching',     label: 'Stretching' },
  { value: 'strengthening',  label: 'Strengthening' },
  { value: 'relaxation',     label: 'Relaxation' },
]

export function UploadModal({ onClose, onSuccess }: Props) {
  const [title, setTitle]             = useState('')
  const [category, setCategory]       = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [duration, setDuration]       = useState('')
  const [videoUrl, setVideoUrl]       = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [saving, setSaving]           = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSave() {
    const durationSecs = parseInt(duration, 10)
    if (!title.trim() || !category || isNaN(durationSecs) || durationSecs < 1) return
    setError(null)
    setSaving(true)
    try {
      await exercisesService.createExercise({
        title:            title.trim(),
        category,
        description:      description.trim() || undefined,
        instructions:     instructions.trim() || undefined,
        duration_seconds: durationSecs,
        video_url:        videoUrl.trim()       || undefined,
        thumbnail_url:    thumbnailUrl.trim()   || undefined,
      })
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1200)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create exercise.'
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave = title.trim() && category && duration && parseInt(duration) >= 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add exercise</h2>
            <p className="text-xs text-slate-400 mt-0.5">Create a new exercise in your library</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-slate-800">Exercise created!</p>
              <p className="text-xs text-slate-400">It's now available in your library.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Input
                label="Exercise title *"
                placeholder="e.g. Gentle jaw opening, 3 sets"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 focus:outline-none"
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Duration (seconds) *</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 90"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <Input
                label="Video URL"
                placeholder="https://cdn.example.com/exercise.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />

              <Input
                label="Thumbnail URL"
                placeholder="https://cdn.example.com/thumb.jpg"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description visible to patients…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 placeholder:text-slate-400 resize-none
                             focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Step-by-step instructions for the patient…"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 placeholder:text-slate-400 resize-none
                             focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              loading={saving}
              disabled={!canSave}
              onClick={handleSave}
            >
              <Plus size={13} /> Add exercise
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
