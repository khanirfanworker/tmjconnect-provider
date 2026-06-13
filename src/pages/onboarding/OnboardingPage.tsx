import { useNavigate } from 'react-router-dom'
import { Users, Play, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

const STEPS = [
  { icon: Users, title: 'Invite your first patient', desc: 'Generate an invite code or send an email invite to link your first patient.', action: 'Invite patient', href: '/invite' },
  { icon: Play,  title: 'Upload an exercise video', desc: 'Add exercises to your library and assign them to patients with a frequency.', action: 'Go to exercises', href: '/exercises' },
  { icon: FileText, title: 'Review patient reports', desc: 'When patients submit symptom reports you\'ll see them in your inbox.', action: 'Go to reports', href: '/reports' },
]

export default function OnboardingPage() {
  const { provider } = useAuthStore()
  const navigate      = useNavigate()
  const firstName     = provider?.fullName?.split(' ')?.[1] ?? 'Doctor'

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
             style={{ backgroundColor: '#0e2040' }}>
          <CheckCircle2 size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, Dr. {firstName}!</h1>
        <p className="text-slate-500 text-sm">
          Your account is verified. Here's how to get started with TMJConnect.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map(({ icon: Icon, title, desc, action, href }, i) => (
          <div key={title}
               className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                 style={{ backgroundColor: '#fdf8ec' }}>
              <Icon size={18} style={{ color: '#c49526' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">STEP {i + 1}</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate(href)}>
              {action} <ArrowRight size={13} />
            </Button>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={() => navigate('/dashboard')}>
          Go to dashboard <ArrowRight size={15} />
        </Button>
        <p className="mt-3 text-xs text-slate-400">
          You can always find this guide from the Help section.
        </p>
      </div>
    </div>
  )
}
