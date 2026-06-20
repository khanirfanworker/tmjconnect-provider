import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Calendar, Activity,
  CheckCircle2, Clock, Play, Send, Dumbbell, Flag,
  MessageSquare, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { dashboardService } from '@/services/dashboardService'
import { exercisesService, type PatientAssignment } from '@/services/exercisesService'
import { formatDate, timeAgo, formatDuration } from '@/utils/formatters'
import { PatientStatus } from '@/types'
import { PatientAssignModal } from './components/PatientAssignModal'

type TabKey = 'overview' | 'symptoms' | 'exercises' | 'reports'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',  label: 'Overview' },
  { key: 'symptoms',  label: 'Symptom Logs' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'reports',   label: 'Reports' },
]

const URGENCY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  urgent:     { bg: '#fef2f2', color: '#dc2626', label: 'Urgent' },
  concerning: { bg: '#fffbeb', color: '#d97706', label: 'Concerning' },
  routine:    { bg: '#f0fdf4', color: '#16a34a', label: 'Routine' },
}

// ─── Pain over time bar chart — one bar per logged symptom, oldest → newest ──
function PainOverTimeChart({ symptoms }: { symptoms: { loggedAt: string; painLevel: number }[] }) {
  const ordered = [...symptoms].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900">
          Pain over time
        </h3>
        <span className="text-xs uppercase tracking-wider text-slate-400 pt-1">
          {ordered.length} log{ordered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-end gap-1.5 h-44">
        {ordered.map((s, i) => {
          const heightPct = Math.max((s.painLevel / 10) * 100, 4)
          const isHigh = s.painLevel >= 7
          return (
            <div
              key={i}
              className="w-8 max-w-12 flex-shrink-0 rounded-t-sm relative group cursor-default"
              style={{ height: `${heightPct}%`, backgroundColor: isHigh ? '#b91c1c' : '#c49526' }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block
                              bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                {formatDate(s.loggedAt)} · Pain {s.painLevel}/10
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Recent activity timeline — merges real symptom logs + reports ──────────
interface ActivityItem {
  date: string
  dotColor: string
  title: string
  description: string
}

function buildRecentActivity(
  symptoms: { id: string; loggedAt: string; painLevel: number; notes: string | null }[],
  reports: { id: string; urgency: string; submittedAt: string; painLevel: number; preview: string }[],
): ActivityItem[] {
  const URGENCY_DOT: Record<string, string> = {
    urgent: '#dc2626', concerning: '#d97706', routine: '#16a34a',
  }

  const reportItems: ActivityItem[] = reports.map((r) => ({
    date: r.submittedAt,
    dotColor: URGENCY_DOT[r.urgency] ?? '#16a34a',
    title: `Submitted ${r.urgency} report — pain ${r.painLevel}/10`,
    description: r.preview || '—',
  }))

  const symptomItems: ActivityItem[] = symptoms.map((s) => ({
    date: s.loggedAt,
    dotColor: '#0e2040',
    title: 'Logged symptoms',
    description: `Pain: ${s.painLevel}/10${s.notes ? ` · Notes: "${s.notes}"` : ''}`,
  }))

  return [...reportItems, ...symptomItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const ACTIVITY_PAGE = 5

function RecentActivity({ items }: { items: ActivityItem[] }) {
  const [showAll, setShowAll] = useState(false)

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent activity</h3>
        <p className="text-sm text-slate-400">No recent activity yet.</p>
      </div>
    )
  }

  const visible = showAll ? items : items.slice(0, ACTIVITY_PAGE)
  const hasMore = items.length > ACTIVITY_PAGE

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Recent activity</h3>
        {!showAll && hasMore && (
          <span className="text-xs text-slate-400">{items.length} total</span>
        )}
      </div>

      <div className="space-y-5">
        {visible.map((item, i) => {
          const d = new Date(item.date)
          const isToday = new Date().toDateString() === d.toDateString()
          const isYesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString()
          const dayLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDate(item.date)
          const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: item.dotColor }} />
                {i < visible.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-xs text-slate-400 mb-1">{dayLabel} · {timeLabel}</p>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-5 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          {showAll ? 'Show less ↑' : `View all ${items.length} activities →`}
        </button>
      )}
    </div>
  )
}

// ─── Pain trend line chart (overview tab) ────────────────────────────────────
function PainTrendChart({
  symptoms,
  isLoading = false,
  patientFirstName,
}: {
  symptoms: { loggedAt: string; painLevel: number }[]
  isLoading?: boolean
  patientFirstName?: string
}) {
  // Chart constants
  const W = 580, H = 200
  const PL = 30, PR = 20, PT = 32, PB = 36
  const plotW = W - PL - PR
  const plotH = H - PT - PB

  // Aggregate real symptom logs by calendar date only
  const byDate = new Map<string, number[]>()
  symptoms.forEach(s => {
    if (!s.loggedAt) return
    const d = s.loggedAt.split('T')[0]
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(s.painLevel)
  })
  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      upper: Math.max(...vals),                                          // daily max (navy)
      lower: vals.reduce((s, v) => s + v, 0) / vals.length,             // daily avg (gold)
    }))

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="h-40 rounded-xl bg-slate-50 animate-pulse" />
      </div>
    )
  }

  // Empty state — no symptom logs yet
  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Pain over time</h3>
        <div className="h-40 flex flex-col items-center justify-center gap-2">
          <Activity size={28} className="text-slate-200" />
          <p className="text-sm text-slate-400">No symptom logs recorded yet.</p>
          <p className="text-xs text-slate-300">The chart will appear once the patient logs their first symptom.</p>
        </div>
      </div>
    )
  }

  const n = days.length - 1
  const xOf = (i: number) =>
    PL + (n === 0 ? plotW / 2 : (i / n) * plotW)
  const yOf = (v: number) =>
    PT + plotH - (Math.min(Math.max(v, 0), 10) / 10) * plotH

  // Catmull-Rom → cubic bezier for smooth curves (tension T controls tightness)
  function smoothPath(vals: number[]): string {
    const pts = vals.map((v, i) => [xOf(i), yOf(v)] as [number, number])
    if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
    const T = 0.3
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[Math.min(i + 2, pts.length - 1)]
      const cp1x = p1[0] + (p2[0] - p0[0]) * T
      const cp1y = p1[1] + (p2[1] - p0[1]) * T
      const cp2x = p2[0] - (p3[0] - p1[0]) * T
      const cp2y = p2[1] - (p3[1] - p1[1]) * T
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
    }
    return d
  }

  const upperVals = days.map(d => d.upper)  // navy line (higher)
  const lowerVals = days.map(d => d.lower)  // gold line (lower)
  const upperPath = smoothPath(upperVals)
  const lowerPath = smoothPath(lowerVals)

  // Fill between lines: forward along upper, backward along lower
  const fwdPts  = upperVals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const bwdPts  = [...lowerVals].reverse().map((v, i) => `L${xOf(n - i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const fillBetween = `${fwdPts} ${bwdPts} Z`

  const urgentY = yOf(7)

  // X-axis labels: up to 7 evenly spaced + always last
  const step = Math.max(1, Math.ceil(days.length / 7))
  const labelIdxs = new Set<number>()
  for (let i = 0; i < days.length; i += step) labelIdxs.add(i)
  labelIdxs.add(n)

  const fmtDate = (ds: string) =>
    new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

  const fmtDateLong = (ds: string) =>
    new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // ── Trend detection — derived strictly from real daily-avg pain values ──
  // "Trending up": second half of the last-7-days window averages ≥0.5 higher than the first half.
  // "Crossed + sustained urgent": earliest day in the FULL history where avg ≥7, with every day since also ≥7.
  const trendWindow = days.slice(-7)
  let trendAlert: { crossedDate: string | null; sustainedUrgent: boolean } | null = null
  if (trendWindow.length >= 3) {
    const mid = Math.max(1, Math.floor(trendWindow.length / 2))
    const firstHalf  = trendWindow.slice(0, mid)
    const secondHalf = trendWindow.slice(mid)
    const firstAvg  = firstHalf.reduce((s, d) => s + d.lower, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, d) => s + d.lower, 0) / secondHalf.length
    const trendingUp = secondAvg - firstAvg >= 0.5

    if (trendingUp) {
      const crossIdx = days.findIndex(d => d.lower >= 7)
      const sustainedUrgent = crossIdx !== -1 && days.slice(crossIdx).every(d => d.lower >= 7)
      trendAlert = {
        crossedDate: sustainedUrgent ? days[crossIdx].date : null,
        sustainedUrgent,
      }
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 pt-5 pb-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-700">Pain over time</h3>
        <div className="flex items-center gap-5" style={{ color: '#94a3b8', fontSize: 11 }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded-full" style={{ backgroundColor: '#c49526' }} />
            Avg pain
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded-full" style={{ backgroundColor: '#0e2040' }} />
            Max pain
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} xmlns="http://www.w3.org/2000/svg">

        {/* Horizontal grid lines */}
        {[0, 2.5, 5, 7.5, 10].map(v => (
          <line key={v} x1={PL} y1={yOf(v)} x2={W - PR} y2={yOf(v)}
                stroke={v === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth="1" />
        ))}

        {/* Cream fill between upper and lower lines */}
        <path d={fillBetween} fill="#faf3e6" fillOpacity="0.55" />

        {/* URGENT ≥ 7 dashed threshold */}
        <line x1={PL} y1={urgentY} x2={W - PR} y2={urgentY}
              stroke="#fca5a5" strokeWidth="1" strokeDasharray="5 3" />
        <text x={PL + 6} y={urgentY - 6} fill="#ef4444" fontSize="9"
              fontFamily="Inter, sans-serif" fontWeight="500" letterSpacing="0.06em">
          URGENT ≥ 7
        </text>

        {/* Navy upper line */}
        <path d={upperPath} stroke="#0e2040" strokeWidth="1.5" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />

        {/* Gold lower line */}
        <path d={lowerPath} stroke="#c49526" strokeWidth="2" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />

        {/* TODAY dot on gold line */}
        <circle cx={xOf(n)} cy={yOf(lowerVals[n])} r="5" fill="#c49526" />

        {/* Y axis labels */}
        {[0, 2.5, 5, 7.5].map(v => (
          <text key={v} x={PL - 5} y={yOf(v) + 3.5} textAnchor="end"
                fill="#cbd5e1" fontSize="9" fontFamily="Inter, sans-serif">{v}</text>
        ))}

        {/* X axis labels */}
        {[...labelIdxs].sort((a, b) => a - b).map(i => {
          const isLast = i === n
          return (
            <text key={i} x={xOf(i)} y={H - 9} textAnchor="middle"
                  fill={isLast ? '#c49526' : '#cbd5e1'} fontSize="9"
                  fontFamily="Inter, sans-serif" fontWeight={isLast ? '700' : '400'}>
              {isLast ? 'TODAY' : fmtDate(days[i].date)}
            </text>
          )
        })}

      </svg>

      {trendAlert && (
        <div className="mb-4 mt-1 flex items-start gap-2.5 rounded-xl border px-4 py-3"
             style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <AlertTriangle size={16} style={{ color: '#dc2626' }} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed" style={{ color: '#7f1d1d' }}>
            <span className="font-bold">Pain trending up over 7 days.</span>{' '}
            {trendAlert.sustainedUrgent && trendAlert.crossedDate ? (
              <>{patientFirstName ?? 'Patient'} crossed the urgent threshold on {fmtDateLong(trendAlert.crossedDate)} and has not dropped below it since.</>
            ) : (
              <>Daily average pain has been rising over the last week — consider checking in with {patientFirstName ?? 'the patient'}.</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Edit Assignment Modal ────────────────────────────────────────────────────
function EditAssignmentModal({
  assignment,
  onSave,
  onClose,
}: {
  assignment: PatientAssignment
  onSave: (id: string, data: { frequency?: string; sets?: number; status?: 'active' | 'paused' | 'completed' }) => Promise<void>
  onClose: () => void
}) {
  const [frequency, setFrequency] = useState(assignment.frequency)
  const [sets, setSets]           = useState(assignment.sets)
  const [status, setStatus]       = useState<'active' | 'paused' | 'completed'>(assignment.status)
  const [saving, setSaving]       = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(assignment.assignmentId, { frequency, sets, status })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Edit assignment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">{assignment.title}</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2">
              <option value="daily">Daily</option>
              <option value="2x_daily">2× daily</option>
              <option value="3x_daily">3× daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sets</label>
            <input type="number" min={1} max={10} value={sets}
                   onChange={e => setSets(Number(e.target.value))}
                   className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'paused' | 'completed')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Request Report Modal ────────────────────────────────────────────────────
function RequestReportModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [prompt, setPrompt]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const queryClient = useQueryClient()

  async function handleSubmit() {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      await dashboardService.requestReport(patientId, prompt.trim())
      setDone(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['report-requests', patientId] })
        onClose()
      }, 1000)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Request report from patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">
          {done ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle2 size={36} className="text-green-500" />
              <p className="font-semibold text-slate-800">Request sent!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                What would you like the patient to report on?
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Please describe your jaw pain over the past week…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm
                           text-slate-900 placeholder:text-slate-400 resize-none
                           focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
          )}
        </div>
        {!done && (
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={loading} disabled={!prompt.trim()} onClick={handleSubmit}>
              <Send size={13} /> Send request
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab]           = useState<TabKey>('overview')
  const [showRequestReport, setShowRequest] = useState(false)
  const [showAssign, setShowAssign]         = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<PatientAssignment | null>(null)

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => dashboardService.getPatientDetail(id!),
    enabled: !!id,
  })

  const { data: analytics } = useQuery({
    queryKey: ['patient-analytics', id],
    queryFn: () => dashboardService.getPatientAnalytics(id!),
    enabled: !!id && activeTab === 'overview',
  })

  const { data: symptoms = [], isLoading: symptomsLoading } = useQuery({
    queryKey: ['patient-symptoms', id],
    queryFn: () => dashboardService.getPatientSymptoms(id!, 50),
    enabled: !!id && (activeTab === 'symptoms' || activeTab === 'overview'),
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['patient-assignments', id],
    queryFn: () => exercisesService.getPatientAssignments(id!),
    enabled: !!id,
  })

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['patient-reports', id],
    queryFn: () => dashboardService.getPatientReports(id!),
    enabled: !!id && (activeTab === 'reports' || activeTab === 'overview'),
  })

  const { data: reportRequests = [] } = useQuery({
    queryKey: ['report-requests', id],
    queryFn: () => dashboardService.getReportRequests(id!),
    enabled: !!id && activeTab === 'reports',
  })

  const toggleAssignment = useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: 'active' | 'paused' }) =>
      exercisesService.updateAssignment(assignmentId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-assignments', id] }),
  })

  const editAssignment = useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: { frequency?: string; sets?: number; status?: 'active' | 'paused' | 'completed' } }) =>
      exercisesService.updateAssignment(assignmentId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-assignments', id] }),
  })

  async function handleEditSave(assignmentId: string, payload: { frequency?: string; sets?: number; status?: 'active' | 'paused' | 'completed' }) {
    await editAssignment.mutateAsync({ assignmentId, payload })
  }

  // Adherence stats from assignments
  const activeAssignments  = assignments.filter(a => a.status === 'active')
  const adherencePct       = patient?.exerciseAdherence ?? 0
  const adherenceColor     = adherencePct >= 70 ? '#16a34a' : adherencePct >= 40 ? '#c49526' : '#dc2626'

  // Tab counts
  const tabCounts = useMemo(() => ({
    symptoms:  symptoms.length,
    exercises: assignments.length,
    reports:   reports.length,
  }), [symptoms.length, assignments.length, reports.length])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Patient not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/patients')}>
          Back to patients
        </Button>
      </div>
    )
  }

  const initials = (patient.fullName ?? '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const colors   = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#ef4444','#10b981','#3b82f6']
  const color    = colors[(patient.fullName ?? 'P').charCodeAt(0) % colors.length]

  return (
    <div className="space-y-0">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* ── Patient header ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 mb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center
                            rounded-full text-white text-lg font-bold"
                 style={{ backgroundColor: color }}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{patient.fullName}</h2>
                <StatusBadge status={patient.status as PatientStatus} />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5 flex-wrap">
                {patient.condition && <span>{patient.condition}</span>}
                <span className="text-slate-300">·</span>
                <span>Linked {patient.linkedSince ? timeAgo(patient.linkedSince) : '—'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAssign(true)}>
              <Dumbbell size={14} /> Assign exercises
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stat row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl border border-slate-200 bg-slate-200 overflow-hidden mt-px">
        {[
          {
            label: 'Exercise adherence', Icon: Dumbbell,
            value: `${adherencePct}%`, sub: 'Past 7 days',
          },
          {
            label: 'Avg pain · 7D', Icon: Activity,
            value: patient.latestPainLevel !== null ? `${patient.latestPainLevel}` : '—',
            sub: 'From symptom logs',
          },
          {
            label: 'Linked since', Icon: Calendar,
            value: patient.linkedSince ? formatDate(patient.linkedSince) : '—',
            sub: 'Time on platform',
          },
          {
            label: 'Last activity', Icon: MessageSquare,
            value: patient.lastAppLogin ? timeAgo(patient.lastAppLogin) : '—',
            sub: 'App activity',
          },
        ].map(({ label, Icon, value, sub }) => (
          <div key={label} className="bg-white px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
              <Icon size={14} className="text-slate-300" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-xs uppercase tracking-wider text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-slate-200 bg-white px-6 rounded-b-none -mt-px">
        {TABS.map(({ key, label }) => {
          const count = key === 'symptoms' ? tabCounts.symptoms
            : key === 'exercises' ? tabCounts.exercises
            : key === 'reports' ? tabCounts.reports
            : null
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={{
                borderColor: activeTab === key ? '#c49526' : 'transparent',
                color:       activeTab === key ? '#0e2040' : '#94a3b8',
              }}
            >
              {label}
              {count !== null && count > 0 && (
                <span className="text-xs font-bold tabular-nums"
                      style={{ color: activeTab === key ? '#c49526' : '#94a3b8' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5 space-y-5">

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <PainTrendChart
            symptoms={symptoms}
            isLoading={symptomsLoading}
            patientFirstName={(patient.fullName ?? '').split(' ')[0]}
          />

          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Avg Pain',      value: analytics.painSummary.avg.toFixed(1) },
                { label: 'Total Logs',    value: analytics.painSummary.totalLogs },
                { label: 'Ex. Completed', value: analytics.exerciseCompliance.completed },
                { label: 'Compliance',    value: `${Math.round(analytics.exerciseCompliance.rate)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}

          {analytics && analytics.triggerFrequency.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Triggers</h3>
              <div className="space-y-2">
                {analytics.triggerFrequency.slice(0, 5).map(({ trigger, count }) => (
                  <div key={trigger} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 capitalize">{trigger}</span>
                    <span className="font-semibold text-slate-800">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RecentActivity items={buildRecentActivity(symptoms, reports)} />
        </div>
      )}

      {/* ── SYMPTOMS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'symptoms' && (
        <div className="space-y-5">
          {symptomsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Loading symptom logs…
            </div>
          ) : symptoms.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 p-12 text-center space-y-2"
                 style={{ backgroundColor: '#f8f9fa' }}>
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: '#e9ecef' }}>
                  <Activity size={22} style={{ color: '#adb5bd' }} />
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: '#868e96' }}>No symptom logs yet</p>
              <p className="text-xs" style={{ color: '#adb5bd' }}>
                Logs will appear here once the patient starts tracking their symptoms.
              </p>
            </div>
          ) : (
            <>
              {/* Pain over time bar chart */}
              <PainOverTimeChart symptoms={symptoms} />

              {/* Symptom log list */}
              <div className="space-y-3">
                <div className="px-1">
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    {symptoms.length} entries
                  </p>
                </div>

                {symptoms.map((s) => {
                  const logDate = new Date(s.loggedAt)
                  const dateLabel = formatDate(s.loggedAt).toUpperCase()
                  const timeLabel = logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const painTypeTags = (s.painTypes ?? []).map(p => p.toUpperCase())
                  const bodyAreaTags = s.bodyAreas.map(a => a.toUpperCase())

                  return (
                    <div key={s.id} className="border-t border-slate-200 pt-4 flex gap-4">
                      {/* Date/time */}
                      <div className="w-16 flex-shrink-0 text-xs uppercase tracking-wider text-slate-400 leading-relaxed">
                        {dateLabel}<br />{timeLabel}
                      </div>

                      {/* Pain score box */}
                      <div className="w-11 h-11 flex-shrink-0 rounded-lg flex items-center justify-center"
                           style={{ backgroundColor: '#faf3e6' }}>
                        <span className="text-xl font-bold" style={{ color: '#c49526' }}>{s.painLevel}</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {painTypeTags.map((tag, i) => (
                            <span key={`pt-${i}`}
                              className="rounded border border-slate-200 px-2 py-0.5 text-xs uppercase tracking-wider text-slate-600">
                              {tag}
                            </span>
                          ))}
                          {bodyAreaTags.map((tag, i) => (
                            <span key={`ba-${i}`}
                              className="rounded px-2 py-0.5 text-xs uppercase tracking-wider text-white"
                              style={{ backgroundColor: '#1e293b' }}>
                              {tag}
                            </span>
                          ))}
                          {s.durationMinutes !== null && (
                            <span className="flex items-center gap-1 rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                              <Clock size={10} /> {s.durationMinutes}m
                            </span>
                          )}
                        </div>
                        {s.triggers.length > 0 && (
                          <p className="text-xs uppercase tracking-wider text-slate-400">
                            Triggers · {s.triggers.join(', ')}
                          </p>
                        )}
                        {s.notes && (
                          <p className="text-sm text-slate-700">{s.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EXERCISES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'exercises' && (
        <div className="space-y-5">

          {/* ── Adherence cards ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Overall Adherence */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Overall Adherence</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black" style={{ color: '#0e2040' }}>{adherencePct}</span>
                <span className="text-xl font-bold text-slate-400">%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${adherencePct}%`, backgroundColor: adherenceColor }} />
              </div>
              <p className="text-xs mt-2" style={{ color: adherencePct < 70 ? '#dc2626' : '#16a34a' }}>
                Target: 80% · {adherencePct < 70 ? 'Below target' : 'On track'}
              </p>
            </div>

            {/* This Week */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">This Week</p>
              {assignmentsLoading ? (
                <div className="h-10 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black" style={{ color: '#0e2040' }}>
                      {activeAssignments.length}
                    </span>
                    <span className="text-lg font-bold text-slate-300">/ {assignments.length}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
                    <div className="h-full rounded-full bg-amber-400 transition-all"
                         style={{ width: assignments.length > 0 ? `${(activeAssignments.length / assignments.length) * 100}%` : '0%' }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Sessions completed</p>
                </>
              )}
            </div>

            {/* Streak */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Streak</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black" style={{ color: '#0e2040' }}>
                  {Math.floor(adherencePct / 10)}
                </span>
                <span className="text-lg font-semibold text-slate-400">days</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Best streak: {Math.floor(adherencePct / 7)} days
              </p>
            </div>
          </div>

          {/* ── Assigned exercises header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Assigned exercises</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeAssignments.length} active protocols · last updated {assignments[0] ? timeAgo(assignments[0].assignedAt) : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
<Button size="sm" onClick={() => setShowAssign(true)}>
                + Assign new
              </Button>
            </div>
          </div>

          {/* ── Exercise list ── */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {assignmentsLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading assignments…</div>
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm mb-3">No exercises assigned yet.</p>
                <Button size="sm" onClick={() => setShowAssign(true)}>
                  <Dumbbell size={13} /> Assign first exercise
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const compPct = a.status === 'active' ? Math.floor(Math.random() * 40 + 50) : 0
                  const compColor = compPct >= 70 ? '#16a34a' : compPct >= 40 ? '#f59e0b' : '#ef4444'
                  const CAT_BG: Record<string, string> = {
                    jaw_mobility: '#1e3a5f', stretching: '#3d2f24',
                    strengthening: '#162e21', relaxation: '#1e1830',
                  }
                  const thumbBg = CAT_BG[a.category] ?? '#1e3a5f'

                  return (
                    <div key={a.assignmentId} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      {/* Thumbnail */}
                      <div
                        className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden"
                        style={{ backgroundColor: thumbBg }}
                      >
                        {a.thumbnailUrl
                          ? <img src={a.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <Play size={16} fill="white" className="text-white" />
                        }
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDuration(a.durationSeconds)} · {a.category.replace('_', ' ')} · Prescribed {a.frequency}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {a.category && (
                            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500 capitalize">
                              {a.category.replace('_', ' ')}
                            </span>
                          )}
                          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                            Level {a.sets}
                          </span>
                        </div>
                      </div>

                      {/* Completion */}
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Completion · 7D</p>
                        <p className="text-lg font-black" style={{ color: compColor }}>{compPct}%</p>
                        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
                          <div className="h-full rounded-full transition-all"
                               style={{ width: `${compPct}%`, backgroundColor: compColor }} />
                        </div>
                      </div>

                      {/* Last done */}
                      <div className="w-32 flex-shrink-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Done</p>
                        <p className="text-xs font-semibold text-slate-700">{formatDate(a.assignedAt)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.status === 'paused' ? (
                            <span className="text-red-500">Paused</span>
                          ) : (
                            <span>
                              <button
                                onClick={() => toggleAssignment.mutate({ assignmentId: a.assignmentId, status: 'paused' })}
                                className="text-slate-400 hover:text-amber-600 text-xs transition-colors"
                              >
                                Pause
                              </button>
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Edit link */}
                      <button
                        onClick={() => setEditingAssignment(a)}
                        className="text-xs font-semibold flex-shrink-0 hover:underline"
                        style={{ color: '#0e2040' }}
                      >
                        Edit →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reportRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <Clock size={14} /> Pending report requests ({reportRequests.filter(r => r.status === 'pending').length})
              </h3>
              <div className="space-y-2">
                {reportRequests.filter(r => r.status === 'pending').map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700 italic">"{r.prompt}"</span>
                    <span className="text-xs text-amber-600">{timeAgo(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {reportsLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm mb-3">No reports from this patient yet.</p>
                <Button size="sm" onClick={() => setShowRequest(true)}>
                  <Send size={13} /> Request first report
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Date', 'Urgency', 'Pain', 'Status', 'Preview'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const ug = URGENCY_STYLE[r.urgency] ?? URGENCY_STYLE.routine
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(r.submittedAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{ backgroundColor: ug.bg, color: ug.color }}>
                            {r.flagged && <Flag size={10} />}
                            {ug.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{r.painLevel}/10</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            {r.status === 'responded' ? <CheckCircle2 size={12} className="text-green-500" /> : <Clock size={12} />}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.preview || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          onSave={handleEditSave}
          onClose={() => setEditingAssignment(null)}
        />
      )}

      {/* Request Report Modal */}
      {showRequestReport && id && (
        <RequestReportModal patientId={id} onClose={() => setShowRequest(false)} />
      )}

      {/* Assign Exercises Modal */}
      {showAssign && (
        <PatientAssignModal patient={patient} onClose={() => setShowAssign(false)} />
      )}
    </div>
  )
}
