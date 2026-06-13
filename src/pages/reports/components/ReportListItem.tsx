import { cn } from '@/lib/cn'
import { timeAgo } from '@/utils/formatters'
import type { ReportDetail } from '@/services/reportsService'

interface Props {
  report: ReportDetail
  isSelected: boolean
  onClick: () => void
}

const URGENCY_CONFIG = {
  urgent:     { label: 'URGENT',     color: '#dc2626', bg: '#fef2f2' },
  concerning: { label: 'MODERATE',   color: '#d97706', bg: '#fffbeb' },
  routine:    { label: 'ROUTINE',    color: '#64748b', bg: '#f8fafc' },
}

export function ReportListItem({ report, isSelected, onClick }: Props) {
  const cfg = URGENCY_CONFIG[report.urgency]

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-4 py-3.5 cursor-pointer border-l-4 transition-colors',
        isSelected
          ? 'bg-blue-50/60 border-l-[#0e2040]'
          : 'border-l-transparent hover:bg-slate-50',
        'border-b border-slate-100',
      )}
    >
      {/* Row 1: avatar + name + time */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                     rounded-full text-white text-xs font-bold"
          style={{ backgroundColor: report.patientColor }}
        >
          {report.patientInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{report.patientName}</p>
            <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(report.submittedAt)}</span>
          </div>
          {/* Urgency + pain */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-bold" style={{ color: cfg.color }}>
              ▲ {cfg.label} · PAIN {report.painScore}/10
            </span>
          </div>
        </div>
      </div>

      {/* Message preview */}
      <p className="text-xs text-slate-500 leading-snug line-clamp-2 ml-10">
        {report.firstLine}
      </p>

      {/* Tags row */}
      <div className="flex items-center gap-2 mt-2 ml-10">
        {report.status === 'unreviewed' && !report.isNew && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            UNANSWERED
          </span>
        )}
        {report.isNew && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            NEW
          </span>
        )}
        {report.status === 'responded' && (
          <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}>
            RESPONDED
          </span>
        )}
        {report.hasPhoto && (
          <span className="text-xs text-slate-400">📎 1 photo attached</span>
        )}
        {report.isFlagged && (
          <span className="text-xs text-amber-500 font-medium">⚑ Flagged</span>
        )}
      </div>
    </div>
  )
}
