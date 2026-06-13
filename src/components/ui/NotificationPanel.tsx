import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, UserPlus, Play, MessageCircle, Clock, Check, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notificationService } from '@/services/notificationService'
import type { Notification, NotifType } from '@/services/notificationService'
import { timeAgo } from '@/utils/formatters'
import { cn } from '@/lib/cn'

const TYPE_CONFIG: Record<string, { Icon: typeof Bell; color: string; bg: string }> = {
  provider_message:  { Icon: MessageCircle, color: '#0e2040', bg: '#f0f4ff' },
  symptom_checkin:   { Icon: Clock,         color: '#d97706', bg: '#fffbeb' },
  report_updates:    { Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  exercise_reminders:{ Icon: Play,          color: '#c49526', bg: '#fdf8ec' },
  patient_linked:    { Icon: UserPlus,      color: '#16a34a', bg: '#f0fdf4' },
  system:            { Icon: Bell,          color: '#64748b', bg: '#f8fafc' },
}

function cfgFor(type: NotifType) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system
}

/** Derive a nav route from notification data */
function linkFor(notif: Notification): string {
  if (notif.data?.reportId)  return '/reports'
  if (notif.data?.patientId) return `/patients/${notif.data.patientId}`
  if (notif.type === 'patient_linked') return '/patients'
  if (notif.type === 'provider_message') return '/messages'
  return '/dashboard'
}

interface NotificationPanelProps {
  onClose:   () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function NotificationPanel({ onClose, anchorRef }: NotificationPanelProps) {
  const navigate     = useNavigate()
  const panelRef     = useRef<HTMLDivElement>(null)
  const queryClient  = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getNotifications(),
    staleTime: 1000 * 60,   // 1 minute
  })

  const unread    = notifications.filter((n) => !n.read)
  const now       = Date.now()
  const DAY       = 24 * 60 * 60 * 1000
  const today     = notifications.filter((n) => now - new Date(n.createdAt).getTime() < DAY)
  const older     = notifications.filter((n) => now - new Date(n.createdAt).getTime() >= DAY)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) { onClose() }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleMarkAllRead() {
    await notificationService.markAllRead()
    queryClient.setQueryData<Notification[]>(['notifications'], (prev) =>
      prev?.map((n) => ({ ...n, read: true })) ?? []
    )
  }

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      notificationService.markRead(notif.id).then(() => {
        queryClient.setQueryData<Notification[]>(['notifications'], (prev) =>
          prev?.map((n) => n.id === notif.id ? { ...n, read: true } : n) ?? []
        )
      })
    }
    onClose()
    navigate(linkFor(notif))
  }

  const urgentToday = today.filter((n) => n.type === 'report_updates' && !n.read)
  const otherToday  = today.filter((n) => !(n.type === 'report_updates' && !n.read))

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] rounded-2xl border border-slate-200
                 bg-white shadow-xl z-50 overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(14,32,64,0.15)' }}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
          {unread.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full
                             px-1.5 text-xs font-bold text-white"
                  style={{ backgroundColor: '#dc2626' }}>
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold hover:underline"
            style={{ color: '#c49526' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-8 space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-4 py-10 text-center">
            <Bell size={24} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No notifications yet.</p>
          </div>
        )}

        {/* Urgent unread first */}
        {urgentToday.length > 0 && (
          <div className="px-3 pt-3 pb-1">
            <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider"
               style={{ color: '#dc2626' }}>
              Urgent · needs response
            </p>
            {urgentToday.map((n) => (
              <NotifRow key={n.id} notif={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        )}

        {/* Today */}
        {otherToday.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Today
            </p>
            {otherToday.map((n) => (
              <NotifRow key={n.id} notif={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        )}

        {/* Older */}
        {older.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Earlier
            </p>
            {older.map((n) => (
              <NotifRow key={n.id} notif={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {unread.length > 0 ? `${unread.length} unread` : 'All caught up'}
        </span>
        <button
          onClick={() => { onClose(); navigate('/profile/notifications') }}
          className="text-xs font-semibold hover:underline"
          style={{ color: '#c49526' }}
        >
          Notification settings →
        </button>
      </div>
    </div>
  )
}

function NotifRow({ notif, onClick }: { notif: Notification; onClick: () => void }) {
  const { Icon, color, bg } = cfgFor(notif.type)
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors mb-0.5',
        'hover:bg-slate-50',
        !notif.read && 'bg-blue-50/40'
      )}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
           style={{ backgroundColor: bg }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs leading-snug', notif.read ? 'text-slate-600' : 'font-semibold text-slate-900')}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{notif.body}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-slate-400">{timeAgo(notif.createdAt)}</span>
        {!notif.read
          ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#c49526' }} />
          : <Check size={11} className="text-slate-300" />
        }
      </div>
    </button>
  )
}
