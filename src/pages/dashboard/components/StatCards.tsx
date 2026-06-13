import { AlertTriangle, TrendingUp, FileText, Users } from 'lucide-react'
import { DashboardStats } from '@/services/dashboardService'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

      {/* Total Patients */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Patients
          </p>
          <Users size={15} className="text-slate-300" />
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.totalPatients}</p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">+{stats.newThisMonth}</span> new this month
        </p>
      </div>

      {/* Reports Awaiting */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reports Awaiting
          </p>
          <FileText size={15} className="text-slate-300" />
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.reportsAwaiting}</p>
        <p className="mt-1 text-xs text-slate-500">
          Avg response{' '}
          <span className="font-semibold text-slate-700">{stats.avgResponseTime}</span>
        </p>
      </div>

      {/* Urgent — highlighted red card, matches design */}
      <div
        className="rounded-2xl border px-5 py-4"
        style={{ backgroundColor: '#fff5f5', borderColor: '#fecaca' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#dc2626' }}>
            Urgent · Pain &gt; 8
          </p>
          <AlertTriangle size={15} style={{ color: '#dc2626' }} />
        </div>
        <p className="text-3xl font-bold" style={{ color: '#dc2626' }}>
          {stats.urgentCount}
        </p>
        <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
          <span className="font-semibold">+{stats.urgentSinceYesterday}</span> since yesterday
        </p>
      </div>

      {/* Exercise Adherence */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Exercise Adherence
          </p>
          <TrendingUp size={15} className="text-slate-300" />
        </div>
        <p className="text-3xl font-bold text-slate-900">{stats.exerciseAdherence}%</p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-green-600">+{stats.adherenceChange}%</span> vs last week
        </p>
      </div>

    </div>
  )
}
