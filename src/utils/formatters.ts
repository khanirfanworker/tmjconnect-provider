import { UrgencyLevel, PatientStatus, ExerciseCategory } from '@/types'

/** "2025-03-15T10:30:00Z" → "Mar 15, 2025" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** "2025-03-15T10:30:00Z" → "10:30 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/** "2025-03-15T10:30:00Z" → "Mar 15 at 10:30 AM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return `${formatDate(iso)} at ${formatTime(iso)}`
}

/** Relative time: "2 hours ago", "3 days ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1)   return 'just now'
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)      return `${days}d ago`
  return formatDate(iso)
}

/** 183 seconds → "3:03" */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** "jaw_mobility" → "Jaw Mobility" */
export function formatCategory(cat: ExerciseCategory): string {
  return cat.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

/** Urgency → human label */
export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  urgent:      'Urgent',
  concerning:  'Concerning',
  routine:     'Routine',
}

/** Patient status → Tailwind color classes */
export const STATUS_CLASSES: Record<PatientStatus, { dot: string; badge: string; label: string }> = {
  stable:   { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200',  label: 'Stable' },
  moderate: { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'Moderate' },
  urgent:   { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',        label: 'Urgent' },
}

/** Urgency → Tailwind color classes */
export const URGENCY_CLASSES: Record<UrgencyLevel, { badge: string; border: string }> = {
  urgent:     { badge: 'bg-red-50 text-red-700 border-red-200',     border: 'border-l-red-500' },
  concerning: { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-500' },
  routine:    { badge: 'bg-slate-50 text-slate-600 border-slate-200', border: 'border-l-slate-400' },
}
