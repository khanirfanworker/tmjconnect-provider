import { NavLink } from 'react-router-dom'
import {
  User, Shield, Bell,
  FileText, Trash2
} from 'lucide-react'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { section: 'ACCOUNT' },
  { to: '/profile',               label: 'Profile',             Icon: User },
  { to: '/profile/security',      label: 'Security & sessions', Icon: Shield },
  { to: '/profile/notifications', label: 'Notifications',       Icon: Bell },
  { section: 'SUPPORT' },
  { to: '/profile/legal',         label: 'Legal & documents',   Icon: FileText },
  { danger: true },
  { to: '/profile/delete',        label: 'Delete account',      Icon: Trash2, isDanger: true },
]

const NAV_LINKS = NAV_ITEMS.filter(
  (item): item is { to: string; label: string; Icon: typeof User; isDanger?: boolean } =>
    'to' in item
)

export function SettingsNav() {
  return (
    <>
      {/* ── Mobile/Tablet: horizontal scrollable pill tabs ── */}
      <div className="lg:hidden overflow-x-auto scrollbar-none pb-3 mb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 min-w-max">
          {NAV_LINKS.map(({ to, label, isDanger }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold',
                'border transition-all',
                isActive
                  ? isDanger
                    ? 'bg-red-600 text-white border-red-600'
                    : 'border-transparent text-white'
                  : isDanger
                    ? 'border-red-200 text-red-500 hover:bg-red-50'
                    : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
              style={({ isActive }) =>
                isActive && !isDanger
                  ? { backgroundColor: '#0e2040', borderColor: '#0e2040' }
                  : {}
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Desktop: vertical sidebar nav ─────────────────── */}
      <div className="hidden lg:block w-52 flex-shrink-0 space-y-0.5">
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item) {
            return (
              <p key={i}
                 className={cn(
                   'px-3 text-xs font-semibold uppercase tracking-wider text-slate-400',
                   i > 0 ? 'pt-5 pb-1' : 'pb-1'
                 )}>
                {item.section}
              </p>
            )
          }
          if ('danger' in item) {
            return <div key={i} className="border-t border-slate-200 mt-2 pt-2" />
          }
          const { to, label, Icon, isDanger } = item as {
            to: string; label: string; Icon: typeof User; isDanger?: boolean
          }
          return (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? isDanger
                    ? 'bg-red-50 text-red-600'
                    : 'bg-slate-100 text-slate-900'
                  : isDanger
                    ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </div>
    </>
  )
}
