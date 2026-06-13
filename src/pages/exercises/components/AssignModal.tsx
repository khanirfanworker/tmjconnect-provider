import { useState } from 'react'
import { X, CheckCircle2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { exercisesService, ExerciseCard } from '@/services/exercisesService'
import { dashboardService } from '@/services/dashboardService'

const FREQUENCIES = ['1x per day', '2x per day', '3x per day', 'Every other day', 'Weekly']

interface Props {
  exercise: ExerciseCard
  onClose: () => void
}

export function AssignModal({ exercise, onClose }: Props) {
  const [search, setSearch]           = useState('')
  const [selectedPatientId, setSelected] = useState<string | null>(null)
  const [frequency, setFrequency]     = useState('1x per day')
  const [assigning, setAssigning]     = useState(false)
  const [done, setDone]               = useState(false)

  const { data: patients = [] } = useQuery<import('@/services/dashboardService').PatientRow[]>({  
    queryKey: ['patients'],
    queryFn: () => dashboardService.getPatients(),
  })

  const filtered = patients.filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAssign() {
    if (!selectedPatientId) return
    setAssigning(true)
    await exercisesService.assignToPatient(exercise.id, selectedPatientId, frequency)
    setDone(true)
    setAssigning(false)
    setTimeout(onClose, 1200)
  }

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assign exercise</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{exercise.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-slate-800">
                Assigned to {selectedPatient?.fullName}!
              </p>
              <p className="text-xs text-slate-400">Patient will be notified.</p>
            </div>
          ) : (
            <>
              {/* Patient search */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Select patient *</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm
                                 text-left hover:bg-slate-50 transition-colors border-b
                                 border-slate-100 last:border-0"
                      style={{
                        backgroundColor: selectedPatientId === p.id ? '#fdf8ec' : undefined,
                      }}
                    >
                      <div
                        className="h-7 w-7 flex-shrink-0 rounded-full flex items-center
                                   justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: '#6366f1' }}
                      >
                        {(p.fullName ?? '').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{p.fullName}</span>
                      {selectedPatientId === p.id && (
                        <CheckCircle2 size={14} className="ml-auto text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Frequency *</label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: frequency === f ? '#0e2040' : 'white',
                        borderColor:     frequency === f ? '#0e2040' : '#e2e8f0',
                        color:           frequency === f ? 'white'   : '#64748b',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {!done && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              loading={assigning}
              disabled={!selectedPatientId}
              onClick={handleAssign}
            >
              Assign to patient
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
