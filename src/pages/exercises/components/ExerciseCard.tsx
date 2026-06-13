import { Play } from 'lucide-react'
import type { ExerciseCard as ExerciseCardType } from '@/services/exercisesService'
import { formatDuration } from '@/utils/formatters'

interface Props {
  exercise:  ExerciseCardType
  onAssign:  (exercise: ExerciseCardType) => void
  onPreview: (exercise: ExerciseCardType) => void
}

export function ExerciseCard({ exercise, onAssign, onPreview }: Props) {
  const barWidth = Math.min(100, (exercise.assignedCount / 60) * 100)

  return (
    <div className="rounded-2xl bg-white overflow-hidden border border-slate-200
                    hover:shadow-lg transition-shadow group cursor-pointer"
         onClick={() => onPreview(exercise)}>

      {/* ── Thumbnail ───────────────────────────────── */}
      <div
        className="relative h-44 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: exercise.thumbnailBg }}
      >
        {exercise.thumbnailUrl && (
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Subtle dark overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all" />

        {/* Category badge — gold pill, top-left */}
        <span
          className="absolute top-3 left-3 z-10 rounded-full px-2.5 py-1
                     text-xs font-bold tracking-widest uppercase"
          style={{ backgroundColor: '#c49526', color: 'white' }}
        >
          {exercise.categoryLabel}
        </span>

        {/* Play button */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full
                        bg-white/90 shadow-md group-hover:scale-105 transition-transform">
          <Play size={20} fill="#0e2040" className="ml-0.5" style={{ color: '#0e2040' }} />
        </div>

        {/* Duration badge — bottom-right */}
        <span className="absolute bottom-3 right-3 z-10 rounded-md bg-black/60 px-2 py-0.5
                         text-xs font-semibold text-white tabular-nums">
          {formatDuration(exercise.durationSeconds)}
        </span>
      </div>

      {/* ── Card body ──────────────────────────────── */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
            {exercise.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Recorded by {exercise.recordedBy} · {exercise.recordedDate}
          </p>
        </div>

        {/* Assigned count + bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Assigned to{' '}
              <span className="font-semibold text-slate-700">{exercise.assignedCount}</span>{' '}
              patients
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(exercise) }}
              className="text-xs font-semibold hover:underline transition-colors flex-shrink-0"
              style={{ color: '#c49526' }}
            >
              Assign →
            </button>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${barWidth}%`, backgroundColor: '#c49526' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
