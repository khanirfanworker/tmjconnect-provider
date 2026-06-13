import { useLocation, Link } from 'react-router-dom'
import { Bell, Search, Menu, X, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NotificationPanel } from '@/components/ui/NotificationPanel'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { notificationService } from '@/services/notificationService'
import type { Notification } from '@/services/notificationService'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/patients':   'Patients',
  '/reports':    'Reports',
  '/exercises':  'Exercise Library',
  '/profile':    'Settings',
  '/onboarding': 'Get Started',
  '/messages':   'Messages',
  '/education':  'Education',
  '/invite':     'Invite & Link',
  '/help':       'Help & Support',
}

interface TopbarProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export function Topbar({ onMenuClick, sidebarOpen }: TopbarProps) {
  const location = useLocation()
  const { provider } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pageLabel = Object.entries(ROUTE_LABELS).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'Dashboard'

  const initials = (provider?.fullName ?? '')
    .split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'DR'

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getNotifications(),
    staleTime: 1000 * 60,
  })
  const UNREAD_COUNT = notifications.filter((n) => !n.read).length

  return (
    <header className="relative flex h-14 flex-shrink-0 items-center justify-between
                       border-b border-slate-200 bg-white px-4 sm:px-6">

      {/* ── Left: hamburger + breadcrumb ─────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-8 w-8 items-center justify-center
                     rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 hidden sm:block">Workspace</span>
          <span className="text-slate-300 hidden sm:block">/</span>
          <span className="font-semibold text-slate-800">{pageLabel}</span>
        </div>
      </div>

      {/* ── Right: search + icons + avatar ───────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Search bar — opens GlobalSearch modal */}
        <button
          onClick={() => setShowSearch(true)}
          className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200
                     bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-pointer
                     hover:border-slate-300 hover:bg-slate-100 transition-colors"
          style={{ width: 220 }}
        >
          <Search size={13} className="flex-shrink-0 text-slate-400" />
          <span className="flex-1 text-left text-xs text-slate-400">Search patients, reports…</span>
          <kbd
            className="flex-shrink-0 flex items-center gap-0.5 rounded border px-1.5 py-0.5
                       text-xs font-medium leading-none"
            style={{
              backgroundColor: '#f1f5f9',
              borderColor: '#e2e8f0',
              color: '#94a3b8',
              fontSize: '11px',
            }}
          >
            ⌘K
          </kbd>
        </button>

        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

        {/* Fix 2: Notification bell — opens panel */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifs((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg
                       text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
            aria-expanded={showNotifs}
          >
            <Bell size={17} />
            {UNREAD_COUNT > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center
                           justify-center rounded-full px-1 text-xs font-bold text-white"
                style={{ backgroundColor: '#dc2626', fontSize: '10px' }}
              >
                {UNREAD_COUNT}
              </span>
            )}
          </button>

          {showNotifs && (
            <NotificationPanel
              onClose={() => setShowNotifs(false)}
              anchorRef={bellRef}
            />
          )}
        </div>

        {/* Settings icon */}
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-lg
                     text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Settings"
        >
          <Settings size={17} />
        </Link>

        {/* Avatar */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full
                     text-xs font-bold cursor-pointer flex-shrink-0"
          style={{ backgroundColor: '#c49526', color: '#0e2040' }}
          title={provider?.fullName}
        >
          {initials}
        </div>
      </div>

    </header>
  )
}
