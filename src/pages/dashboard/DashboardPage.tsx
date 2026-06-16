import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Download, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { dashboardService } from '@/services/dashboardService'
import { StatCards } from './components/StatCards'
import { PatientFilters, FilterTab, SortOption, TabCounts } from './components/PatientFilters'
import { PatientTable } from './components/PatientTable'
import { PatientRow } from '@/services/dashboardService'
import type { DashboardStats } from '@/services/dashboardService'
import { inviteService } from '@/services/inviteService'

/** Time-aware greeting */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Format today's date: "Saturday, April 19" */
function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default function DashboardPage() {
  const { provider } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [sortBy, setSortBy]       = useState<SortOption>('urgency')

  const firstName = (provider?.fullName ?? '').split(' ').filter(Boolean)[1] ?? (provider?.fullName?.split(' ')[0]) ?? 'Doctor'

  // Fetch stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({ 
    queryKey: ['dashboard-stats'],
    queryFn: (): Promise<DashboardStats> => dashboardService.getStats(),
    staleTime: 1000 * 60 * 2,
  })

  // Fetch patients
  const { data: patients = [], isLoading: patientsLoading, error: patientsError } = useQuery<PatientRow[]>({ 
    queryKey: ['patients'],
    queryFn: (): Promise<PatientRow[]> => dashboardService.getPatients(),
    staleTime: 1000 * 60 * 5,
  })

  // Filter
  const filtered = useMemo(() => {
    let list: PatientRow[] = [...patients]

    switch (activeTab) {
      case 'needs_attention':
        list = list.filter((p) => p.status === 'urgent' || p.hasOpenUrgentReport)
        break
      case 'recent':
        list = list.filter((p) => {
          if (!p.lastAppLogin) return false
          return Date.now() - new Date(p.lastAppLogin).getTime() < 7 * 24 * 60 * 60 * 1000
        })
        break
      case 'no_activity':
        list = list.filter((p) => {
          if (!p.lastAppLogin) return true
          return Date.now() - new Date(p.lastAppLogin).getTime() >= 7 * 24 * 60 * 60 * 1000
        })
        break
      default:
        break
    }

    // Sort
    switch (sortBy) {
      case 'urgency':
        list.sort((a, b) => {
          const order = { urgent: 0, moderate: 1, stable: 2 }
          return (order[a.status] ?? 3) - (order[b.status] ?? 3)
        })
        break
      case 'name':
        list.sort((a, b) => a.fullName.localeCompare(b.fullName))
        break
      case 'last_activity':
        list.sort((a, b) =>
          new Date(b.lastAppLogin ?? 0).getTime() - new Date(a.lastAppLogin ?? 0).getTime()
        )
        break
      case 'pain_level':
        list.sort((a, b) => (b.latestPainLevel ?? 0) - (a.latestPainLevel ?? 0))
        break
      case 'adherence':
        list.sort((a, b) => b.exerciseAdherence - a.exerciseAdherence)
        break
    }

    return list
  }, [patients, activeTab, sortBy])

  const urgentCount = patients.filter((p) => p.status === 'urgent').length

  // Pending invites from linking metrics
  const { data: linkingMetrics } = useQuery({
    queryKey: ['linking-metrics'],
    queryFn:  inviteService.getMetrics,
    staleTime: 1000 * 60 * 2,
  })

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const tabCounts: TabCounts = {
    all:             patients.length,
    needs_attention: patients.filter(p => p.status === 'urgent' || p.hasOpenUrgentReport).length,
    recent:          patients.filter(p => p.lastAppLogin && Date.now() - new Date(p.lastAppLogin).getTime() < WEEK_MS).length,
    no_activity:     patients.filter(p => !p.lastAppLogin || Date.now() - new Date(p.lastAppLogin).getTime() >= WEEK_MS).length,
    pending_invites: linkingMetrics?.pending_codes ?? 0,
  }

  // ── Empty state: no patients yet ────────────────────────────────────────
  if (!patientsLoading && !patientsError && patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full mb-6"
          style={{ backgroundColor: '#0e2040' }}
        >
          <UserRound size={36} style={{ color: '#c49526' }} />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Let's add your first patient.
        </h1>
        <p className="text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
          Generate a one-time invite code and share it with your patient. They'll
          use it to link to your account from the TMJConnect mobile app.
        </p>

        <div className="flex items-center gap-3 mb-12">
          <Button size="md" onClick={() => navigate('/invite')}>
            <UserPlus size={15} /> Generate invite code
          </Button>
          <Button variant="secondary" size="md" disabled>
            Take the product tour
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-2xl">
          {[
            { num: '01', title: 'Generate code', desc: 'A 6-character one-time code, valid for 7 days.' },
            { num: '02', title: 'Share with patient', desc: 'Send via email, text, or hand it on paper in the clinic.' },
            { num: '03', title: 'They connect', desc: "Patient enters the code in the mobile app. You're linked." },
          ].map(({ num, title, desc }) => (
            <div key={num} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left">
              <p className="text-xs font-bold mb-2" style={{ color: '#c49526' }}>{num}</p>
              <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, Dr. {firstName}.
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {todayLabel()}
            {urgentCount > 0 && (
              <span className="ml-2 font-semibold" style={{ color: '#c49526' }}>
                · {urgentCount} patient{urgentCount > 1 ? 's' : ''} need{urgentCount === 1 ? 's' : ''} your attention
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button variant="secondary" size="sm">
            <Download size={14} /> Export
          </Button>
          <Button size="sm">
            <UserPlus size={14} /> Invite patient
          </Button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : statsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load dashboard. <button onClick={() => window.location.reload()} className="underline font-medium">Retry</button>
        </div>
      ) : stats ? (
        <StatCards stats={stats} />
      ) : null}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <PatientFilters
        activeTab={activeTab}
        sortBy={sortBy}
        counts={tabCounts}
        onTabChange={setActiveTab}
        onSortChange={setSortBy}
      />

      {/* ── Patient table ────────────────────────────────────────────── */}
      {patientsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load patients. <button onClick={() => window.location.reload()} className="underline font-medium">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <PatientTable patients={filtered} isLoading={patientsLoading} />
        </div>
      )}

    </div>
  )
}
