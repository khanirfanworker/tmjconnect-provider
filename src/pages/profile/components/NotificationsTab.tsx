import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { profileService, NotificationPrefs } from '@/services/profileService'

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full
                   transition-colors focus-visible:outline-none focus-visible:ring-2"
        style={{ backgroundColor: checked ? '#c49526' : '#e2e8f0' }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
        />
      </button>
    </div>
  )
}

export function NotificationsTab() {
  const { data: initial } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn:  profileService.getNotifPrefs,
    staleTime: 1000 * 60 * 5,
  })

  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const current = prefs ?? initial

  function update(key: keyof NotificationPrefs, value: boolean | string) {
    setPrefs((prev) => ({ ...(prev ?? initial!), [key]: value }))
    setSaved(false)
  }

  async function save() {
    if (!current) return
    setSaving(true)
    await profileService.updateNotifPrefs(current)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!current) return <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Browser notifications</h3>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4">
          <ToggleRow
            label="Urgent patient reports"
            description="Browser Web Push when a patient submits an urgent report (pain ≥ 8)."
            checked={current.urgentReportsBrowser ?? false}
            onChange={(v) => update('urgentReportsBrowser', v)}
          />
          <ToggleRow
            label="Patient inactive 3+ days"
            description="Alert when a patient hasn't logged a symptom in 3 or more days."
            checked={current.patientInactiveAlert ?? false}
            onChange={(v) => update('patientInactiveAlert', v)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Email notifications</h3>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4">
          <ToggleRow
            label="Urgent reports (immediate)"
            description="Email sent immediately when an urgent report is submitted."
            checked={current.urgentReportsEmail ?? false}
            onChange={(v) => update('urgentReportsEmail', v)}
          />
          <ToggleRow
            label="Concerning reports (same day)"
            description="Daily digest of concerning (moderate) reports."
            checked={current.concerningReportsEmail ?? false}
            onChange={(v) => update('concerningReportsEmail', v)}
          />
          <ToggleRow
            label="Invite accepted"
            description="Email when a patient accepts your invite code."
            checked={current.inviteAcceptedEmail ?? false}
            onChange={(v) => update('inviteAcceptedEmail', v)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Email digest frequency</h3>
        <div className="mt-3 flex gap-2">
          {(['immediate', 'daily', 'weekly'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => update('emailDigest', opt)}
              className="rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all"
              style={{
                backgroundColor: current.emailDigest === opt ? '#0e2040' : 'white',
                borderColor:     current.emailDigest === opt ? '#0e2040' : '#e2e8f0',
                color:           current.emailDigest === opt ? 'white'   : '#64748b',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {saved && <Alert variant="success" message="Notification preferences saved." />}

      <Button onClick={save} loading={saving}>Save preferences</Button>
    </div>
  )
}
