import { useNavigate } from 'react-router-dom'
import { Sparkline } from '@/components/ui/Sparkline'
import { StatusBadge } from '@/components/ui/Badge'
import type { PatientRow } from '@/services/dashboardService'
import { timeAgo } from '@/utils/formatters'
import { PatientStatus } from '@/types'

interface PatientTableProps {
  patients: PatientRow[]
  isLoading: boolean
}

/** Avatar with initials fallback */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  // Deterministic color from name
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full
                 text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.33 }}
    >
      {initials}
    </div>
  )
}

/** Skeleton row for loading state */
function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[1,2,3,4,5,6].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function PatientTable({ patients, isLoading }: PatientTableProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-100">
            {['Patient', 'Last Login', 'Pain Level', '14-Day Trend', 'Status', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase
                           tracking-wider text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : patients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                />
              ))}
        </tbody>
      </table>

      {!isLoading && patients.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400">No patients match this filter.</p>
        </div>
      )}
    </div>
  )
}

/** Single patient row */
function PatientRow({ patient, onClick }: { patient: PatientRow; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-50 hover:bg-slate-50/70 cursor-pointer transition-colors"
    >
      {/* Patient name + condition */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={patient.fullName} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {patient.fullName}
            </p>
            {patient.condition && (
              <p className="text-xs text-slate-400 truncate">{patient.condition}</p>
            )}
          </div>
        </div>
      </td>

      {/* Last login */}
      <td className="px-4 py-3.5">
        <p className="text-sm text-slate-600">
          {patient.lastAppLogin ? timeAgo(patient.lastAppLogin) : '—'}
        </p>
      </td>

      {/* Pain level */}
      <td className="px-4 py-3.5">
        {patient.latestPainLevel !== null ? (
          <div className="flex items-baseline gap-1">
            <span
              className="text-lg font-bold"
              style={{
                color: patient.latestPainLevel >= 8
                  ? '#dc2626'
                  : patient.latestPainLevel >= 5
                    ? '#d97706'
                    : '#16a34a',
              }}
            >
              {patient.latestPainLevel}
            </span>
            <span className="text-xs text-slate-400">/10</span>
          </div>
        ) : (
          <span className="text-sm text-slate-300">—</span>
        )}
      </td>

      {/* 14-day sparkline */}
      <td className="px-4 py-3.5">
        <Sparkline data={patient.painTrend} width={110} height={32} linkedSince={patient.linkedSince} />
      </td>

      {/* Status badge */}
      <td className="px-4 py-3.5">
        <StatusBadge status={patient.status as PatientStatus} />
      </td>

    </tr>
  )
}
