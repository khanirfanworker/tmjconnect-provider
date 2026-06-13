import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { exercisesService, ExerciseCard as ExerciseCardType, ExerciseCategoryKey } from '@/services/exercisesService'
import { ExerciseCard } from './components/ExerciseCard'
import { AssignModal } from './components/AssignModal'
import { VideoPlayerModal } from './components/VideoPlayerModal'
import { cn } from '@/lib/cn'

type SortKey = 'most_assigned' | 'newest' | 'duration'

const CATEGORY_TABS: { key: ExerciseCategoryKey; label: string }[] = [
  { key: 'all',           label: 'All exercises' },
  { key: 'jaw_mobility',  label: 'Jaw Mobility' },
  { key: 'stretching',    label: 'Stretching' },
  { key: 'strengthening', label: 'Strengthening' },
  { key: 'relaxation',    label: 'Relaxation' },
]

export default function ExercisesPage() {
  const [activeCategory, setActiveCategory] = useState<ExerciseCategoryKey>('all')
  const [sortBy, setSortBy]                 = useState<SortKey>('most_assigned')
  const [assignTarget, setAssignTarget]     = useState<ExerciseCardType | null>(null)
  const [previewTarget, setPreviewTarget]   = useState<ExerciseCardType | null>(null)

  const { data: exercises = [], isLoading } = useQuery<ExerciseCardType[]>({
    queryKey: ['exercises'],
    queryFn: (): Promise<ExerciseCardType[]> => exercisesService.getExercises(),
  })

  const filtered = useMemo(() => {
    let list = activeCategory === 'all'
      ? [...exercises]
      : exercises.filter((e) => e.category === activeCategory)

    switch (sortBy) {
      case 'most_assigned': list.sort((a, b) => b.assignedCount - a.assignedCount); break
      case 'newest':        list.sort((a, b) => b.recordedDate.localeCompare(a.recordedDate)); break
      case 'duration':      list.sort((a, b) => a.durationSeconds - b.durationSeconds); break
    }
    return list
  }, [exercises, activeCategory, sortBy])

  function countFor(key: ExerciseCategoryKey) {
    if (key === 'all') return exercises.length
    return exercises.filter((e) => e.category === key).length
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Exercise Library</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {exercises.length} exercises · manage and assign to patients
        </p>
      </div>

      {/* ── Category tabs + sort ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5',
                'text-xs font-semibold border transition-all',
                activeCategory === key
                  ? 'text-white border-transparent'
                  : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300',
              )}
              style={activeCategory === key ? { backgroundColor: '#0e2040' } : {}}
            >
              {label}
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-bold"
                style={{
                  backgroundColor: activeCategory === key ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  color:           activeCategory === key ? 'white' : '#64748b',
                }}
              >
                {countFor(key)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-medium text-slate-600
                        border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
          <ChevronDown size={13} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="most_assigned">Most assigned</option>
            <option value="newest">Newest first</option>
            <option value="duration">Shortest first</option>
          </select>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="h-44 bg-slate-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-2 bg-slate-100 rounded animate-pulse w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onAssign={setAssignTarget}
              onPreview={setPreviewTarget}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 py-20 text-center">
              <p className="text-slate-400 text-sm">No exercises in this category.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {assignTarget && (
        <AssignModal
          exercise={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}
      {previewTarget && (
        <VideoPlayerModal
          exercise={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  )
}
