import { cn } from '@/lib/cn'
import { PatientStatus } from '@/types'

interface StatusBadgeProps {
  status: PatientStatus | 'improving'
  className?: string
}

const CONFIG = {
  urgent:    { label: 'URGENT',    dot: '#dc2626', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  moderate:  { label: 'MODERATE',  dot: '#d97706', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  stable:    { label: 'STABLE',    dot: '#16a34a', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  improving: { label: 'IMPROVING', dot: '#16a34a', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.stable
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide', className)}
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
