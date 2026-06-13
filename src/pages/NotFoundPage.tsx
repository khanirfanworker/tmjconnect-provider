import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Play, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * 404 page — matches design Screen 28.
 * Big "404" with jaw curve, HIPAA reassurance, attempted URL, quick nav links.
 */
export default function NotFoundPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const QUICK_LINKS = [
    { icon: Users,         label: 'Your 24 patients',  to: '/patients' },
    { icon: FileText,      label: 'Reports inbox (2)', to: '/reports' },
    { icon: Play,          label: 'Exercise library',  to: '/exercises' },
    { icon: HelpCircle,    label: 'Help center',       to: '/help' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center"
         style={{ backgroundColor: '#f5f3ef' }}>
      <div className="w-full max-w-xl px-6 text-center space-y-6">

        {/* Big 404 — matches oversized serif design */}
        <div className="relative">
          <p className="text-[120px] font-black leading-none select-none"
             style={{ color: '#e8e4dc', fontFamily: 'Georgia, serif' }}>
            404
          </p>
          {/* Gold dot accent */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-2 w-2
                          rounded-full" style={{ backgroundColor: '#c49526' }} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest"
             style={{ color: '#c49526' }}>
            Error · 404
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            This page couldn't be found.
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            The link may be broken, the patient may have disconnected, or the
            report may have been archived. No patient data was lost —
            everything is still safely stored in your account.
          </p>
        </div>

        {/* Attempted URL */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200
                        bg-white px-4 py-2.5 text-sm mx-auto max-w-sm">
          <span className="text-slate-400 flex-shrink-0 text-xs">Attempted:</span>
          <code className="text-slate-600 truncate font-mono text-xs">
            {location.pathname}
          </code>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={14} /> Back to dashboard
          </Button>
          <Button variant="secondary" onClick={() => navigate('/help')}>
            Contact support
          </Button>
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Were you looking for
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            {QUICK_LINKS.map(({ icon: Icon, label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center gap-2 rounded-lg border border-slate-200
                           bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300
                           hover:bg-slate-50 transition-colors text-left"
              >
                <Icon size={14} className="text-slate-400 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
