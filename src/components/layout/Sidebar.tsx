import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Play,
  LogOut, ChevronRight, GraduationCap,
  Link as LinkIcon, Settings, HelpCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { dashboardService } from '@/services/dashboardService'
import { reportsService } from '@/services/reportsService'
import { cn } from '@/lib/cn'

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { provider, logout } = useAuthStore()
  const navigate = useNavigate()

  // Live patient count
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn:  dashboardService.getPatients,
    staleTime: 1000 * 60 * 5,
  })

  // Live unread/unreviewed reports count
  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn:  reportsService.getReports,
    staleTime: 1000 * 60 * 2,
  })

  const patientCount  = patients.length
  const urgentCount   = reports.filter((r) => r.urgency === 'urgent' && r.status === 'unreviewed').length
  const unreviewedCount = reports.filter((r) => r.status === 'unreviewed').length

  const WORKSPACE_NAV = [
    { to: '/dashboard',  label: 'Dashboard',       Icon: LayoutDashboard, badge: null,                                     badgeUrgent: false },
    { to: '/patients',   label: 'Patients',         Icon: Users,           badge: patientCount || null,                     badgeUrgent: false },
    { to: '/reports',    label: 'Reports',          Icon: FileText,        badge: urgentCount || unreviewedCount || null,   badgeUrgent: urgentCount > 0 },
    { to: '/exercises',  label: 'Exercise Library', Icon: Play,            badge: null,                                     badgeUrgent: false },
    { to: '/education',  label: 'Education',        Icon: GraduationCap,   badge: null,                                     badgeUrgent: false },
  ]

  const MANAGE_NAV = [
    { to: '/invite',  label: 'Invite & Link',  Icon: LinkIcon },
    { to: '/profile', label: 'Settings',       Icon: Settings },
    { to: '/help',    label: 'Help & Support', Icon: HelpCircle },
  ]

  async function handleLogout() {
    try {
      const { authService } = await import('@/services/authService')
      await authService.logout()
    } catch {
      // Always clear local state even if API call fails
    } finally {
      logout()
      navigate('/login')
    }
  }

  const initials = (provider?.fullName ?? '')
    .split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'P'

  return (
    <aside
      className="flex h-full w-60 flex-col flex-shrink-0"
      style={{ backgroundColor: '#0e2040' }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 flex-shrink-0"
          style={{ borderColor: '#c49526' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C9.5 3 7 5 7 8c0 1.5.5 3 1.5 4L9 17c0 .6.4 1 1 1h4
                 c.6 0 1-.4 1-1l.5-5C16.5 11 17 9.5 17 8c0-3-2.5-5-5-5z"
              fill="#c49526"
            />
          </svg>
        </div>
        <div>
          <p className="font-bold text-base leading-none" style={{ color: '#c49526' }}>
            TMJConnect
          </p>
          <p className="text-xs tracking-widest uppercase mt-0.5"
             style={{ color: '#c49526', opacity: 0.6, fontSize: '8px' }}>
            Provider Portal
          </p>
        </div>
      </div>


      {/* ── Workspace section ─────────────────────────────── */}
      <div className="px-3 pb-1">
        <p className="px-2 pb-1.5 text-xs font-semibold tracking-wider uppercase"
           style={{ color: 'rgba(255,255,255,0.35)' }}>
          Workspace
        </p>
        <nav className="space-y-0.5">
          {WORKSPACE_NAV.map(({ to, label, Icon, badge, badgeUrgent }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'hover:bg-white/10'
                )
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(196,149,38,0.2)' : undefined,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{ color: isActive ? '#c49526' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <span className="flex-1">{label}</span>
                  {badge !== null && badge !== undefined && (
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                      style={{
                        backgroundColor: badgeUrgent ? '#dc2626' : 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  {isActive && badge === null && (
                    <ChevronRight size={12} style={{ color: '#c49526', opacity: 0.7 }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Manage section ────────────────────────────────── */}
      <div className="px-3 pt-4 pb-1">
        <p className="px-2 pb-1.5 text-xs font-semibold tracking-wider uppercase"
           style={{ color: 'rgba(255,255,255,0.35)' }}>
          Manage
        </p>
        <nav className="space-y-0.5">
          {MANAGE_NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                   isActive ? 'text-white' : 'hover:bg-white/10')
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'rgba(196,149,38,0.2)' : undefined,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{ color: isActive ? '#c49526' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Logout ───────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                     font-medium transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {/* ── Provider chip ─────────────────────────────────── */}
      <div
        className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
        style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
      >
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                     rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: '#c49526' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {provider?.fullName ?? 'Dr. Provider'}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {provider?.specialties?.[0] ?? 'Specialist'}
          </p>
        </div>
      </div>

    </aside>
  )
}
