/**
 * PatientAssignModal — multi-exercise assignment modal
 * Matches the design screenshot:
 *  Left:  exercise picker (search + category filter + checkboxes)
 *  Right: frequency, duration, personal note, assign CTA
 */
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Play, CheckCircle2, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { exercisesService } from '@/services/exercisesService'
import type { PatientRow } from '@/services/dashboardService'
import { formatDuration } from '@/utils/formatters'
import { cn } from '@/lib/cn'

type Freq     = '1x_daily' | '2x_daily' | '3x_daily'
type Duration = '1_week' | '2_weeks' | '1_month' | 'ongoing'

const FREQ_OPTIONS: { key: Freq; label: string; recommended?: boolean }[] = [
  { key: '2x_daily', label: '2x daily', recommended: true },
  { key: '1x_daily', label: '1x daily' },
  { key: '3x_daily', label: '3x daily' },
]

const DUR_OPTIONS: { key: Duration; label: string }[] = [
  { key: '1_week',   label: '1 week'  },
  { key: '2_weeks',  label: '2 weeks' },
  { key: '1_month',  label: '1 month' },
  { key: 'ongoing',  label: 'Ongoing' },
]

const CATEGORIES = ['all', 'jaw_mobility', 'stretching', 'strengthening', 'relaxation'] as const
const CAT_LABEL: Record<string, string> = {
  all: 'All', jaw_mobility: 'Mobility', stretching: 'Stretching',
  strengthening: 'Strengthening', relaxation: 'Relaxation',
}

interface Props {
  patient: PatientRow
  onClose: () => void
}

export function PatientAssignModal({ patient, onClose }: Props) {
  const queryClient = useQueryClient()

  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [freq, setFreq]         = useState<Freq>('2x_daily')
  const [dur, setDur]           = useState<Duration>('2_weeks')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn:  exercisesService.getExercises,
    staleTime: 1000 * 60 * 5,
  })

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchCat = category === 'all' || e.category === category
      const matchQ   = !search || e.title.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchQ
    })
  }, [exercises, category, search])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Map frequency key → API value
  const FREQ_API: Record<Freq, string> = {
    '1x_daily': 'daily',
    '2x_daily': '2x_daily',
    '3x_daily': '3x_daily',
  }

  async function handleAssign() {
    if (selected.size === 0) return
    setSaving(true)
    try {
      await Promise.all(
        [...selected].map((exerciseId) =>
          exercisesService.assignToPatient(patient.id, exerciseId, FREQ_API[freq])
        )
      )
      queryClient.invalidateQueries({ queryKey: ['patient-assignments', patient.id] })
      setDone(true)
      setTimeout(onClose, 1400)
    } finally {
      setSaving(false)
    }
  }

  const initials = patient.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const colors   = ['#6366f1','#8b5cf6','#ec4899','#14b8a6']
  const color    = colors[patient.fullName.charCodeAt(0) % colors.length]

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Patient header ─────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#c49526' }}>
            Assign Exercises
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                            rounded-full text-white text-sm font-bold"
                 style={{ backgroundColor: color }}>
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {patient.fullName}
                {patient.condition && (
                  <span className="text-slate-400 font-normal"> · {patient.condition}</span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {patient.exerciseAdherence}% adherence last 7 days
              </p>
            </div>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle2 size={44} className="text-green-500" />
            <p className="text-base font-bold text-slate-900">
              {selected.size} exercise{selected.size !== 1 ? 's' : ''} assigned!
            </p>
            <p className="text-sm text-slate-400">
              {patient.fullName} will see them in their daily queue tomorrow.
            </p>
          </div>
        ) : (
          <div className="flex overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>

            {/* ── LEFT: Exercise picker ─────────────────────────── */}
            <div className="flex flex-col w-[52%] border-r border-slate-100 overflow-hidden">
              <div className="px-4 pt-4 pb-3 space-y-2.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pick from library
                </p>
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2
                               text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none
                               focus:border-slate-300"
                  />
                </div>
                {/* Category pills */}
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                        category === cat
                          ? 'text-white border-transparent'
                          : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300'
                      )}
                      style={category === cat ? { backgroundColor: '#0e2040' } : {}}
                    >
                      {CAT_LABEL[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise list */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                    ))
                  : filtered.map((ex) => {
                      const isSelected = selected.has(ex.id)
                      return (
                        <button
                          key={ex.id}
                          onClick={() => toggle(ex.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5',
                            'text-left transition-all',
                            isSelected
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              'flex h-4 w-4 flex-shrink-0 items-center justify-center',
                              'rounded border-2 transition-all',
                              isSelected
                                ? 'border-yellow-500 bg-yellow-500'
                                : 'border-slate-300 bg-white'
                            )}
                          >
                            {isSelected && (
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>

                          {/* Thumbnail */}
                          <div
                            className="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden"
                            style={{ backgroundColor: ex.thumbnailBg }}
                          >
                            {ex.thumbnailUrl
                              ? <img src={ex.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              : <Play size={12} fill="white" className="text-white" />
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{ex.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatDuration(ex.durationSeconds)} · {CAT_LABEL[ex.category] ?? ex.category}
                            </p>
                          </div>

                          {isSelected && (
                            <span className="text-xs font-bold flex-shrink-0" style={{ color: '#c49526' }}>
                              SELECTED
                            </span>
                          )}
                        </button>
                      )
                    })
                }
                {!isLoading && filtered.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No exercises found.</p>
                )}
              </div>
            </div>

            {/* ── RIGHT: Assignment settings ────────────────────── */}
            <div className="flex flex-col w-[48%] overflow-y-auto px-5 pt-4 pb-8 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Assignment · {selected.size} selected
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
                  {patient.fullName.split(' ')[0]} will see these in their daily queue starting{' '}
                  <strong>tomorrow</strong> and receive a push notification.
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Frequency</p>
                <div className="space-y-2">
                  {FREQ_OPTIONS.map(({ key, label, recommended }) => (
                    <label
                      key={key}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-4 py-2.5 transition-all',
                        freq === key
                          ? 'border-slate-900 bg-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all',
                            freq === key ? 'border-white bg-white' : 'border-slate-300'
                          )}
                        >
                          {freq === key && (
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0e2040' }} />
                          )}
                        </div>
                        <span className={cn('text-sm font-medium', freq === key ? 'text-white' : 'text-slate-700')}>
                          {label}
                        </span>
                      </div>
                      {recommended && (
                        <span
                          className="text-xs font-semibold rounded-full px-2 py-0.5"
                          style={{ backgroundColor: freq === key ? 'rgba(196,149,38,0.25)' : '#fdf8ec', color: '#c49526' }}
                        >
                          Recommended
                        </span>
                      )}
                      <input
                        type="radio" name="freq" value={key} checked={freq === key}
                        onChange={() => setFreq(key)} className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Duration</p>
                <div className="flex flex-wrap gap-2">
                  {DUR_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setDur(key)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                        dur === key
                          ? 'text-white border-transparent'
                          : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300'
                      )}
                      style={dur === key ? { backgroundColor: '#0e2040' } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal note */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Personal note</p>
                <textarea
                  rows={3}
                  placeholder={`Add a note for ${patient.fullName.split(' ')[0]}…`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3
                             text-xs text-slate-900 placeholder:text-slate-400 resize-none
                             focus:outline-none focus:border-slate-300"
                />
              </div>

              {/* Assign CTA */}
              <button
                type="button"
                disabled={selected.size === 0 || saving}
                onClick={handleAssign}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '9999px',
                  backgroundColor: selected.size === 0 ? '#e2e8f0' : '#c49526',
                  color: selected.size === 0 ? '#94a3b8' : '#0e2040',
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 0.15s',
                  flexShrink: 0,
                }}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Assign {selected.size > 0 ? `${selected.size} ` : ''}exercise{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
