import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, AlertTriangle, Activity, Dumbbell, Info, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { profileService } from '@/services/profileService'
import type { NotificationPrefs } from '@/services/profileService'
import { SettingsNav } from './components/SettingsNav'

interface PrefRow {
  key: keyof NotificationPrefs
  label: string
  description: string
  locked?: boolean
}

const PREF_ROWS: PrefRow[] = [
  {
    key: 'report_updates',
    label: 'Patient report updates',
    description: 'Notified whenever a patient submits a new health report or there is a status change.',
  },
  {
    key: 'exercise_reminders',
    label: 'Exercise & adherence alerts',
    description: "Alerts when a patient's exercise adherence drops significantly or they miss sessions.",
  },
  {
    key: 'symptom_checkin',
    label: 'Symptom check-in submissions',
    description: 'Receive a notification each time a linked patient logs symptoms.',
  },
  {
    key: 'provider_messages',
    label: 'Provider messages',
    description: 'In-platform messages from colleagues, admins, or the TMJConnect team.',
  },
  {
    key: 'tips_updates',
    label: 'Tips & platform updates',
    description: 'Occasional product tips, feature announcements, and best-practice guides.',
  },
]

const DIGEST_OPTIONS: { value: string; label: string }[] = [
  { value: 'instant', label: 'Instant : notify me right away' },
  { value: 'daily',   label: 'Daily digest : one email per day' },
  { value: 'weekly',  label: 'Weekly digest : one email per week' },
  { value: 'off',     label: 'Off : no email notifications' },
]

function Toggle({ on, locked, onChange }: { on: boolean; locked?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
                 transition-colors focus:outline-none"
      style={{
        backgroundColor: on ? '#0e2040' : '#e2e8f0',
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.6 : 1,
      }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                   transform transition-transform"
        style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export default function NotificationsPage() {
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs | null>(null)
  const [saved, setSaved]           = useState(false)

  const { data: fetchedPrefs, isLoading, isError } = useQuery<NotificationPrefs>({
    queryKey: ['notif-prefs'],
    queryFn:  profileService.getNotifPrefs,
    staleTime: 1000 * 60 * 5,
  })

  // Sync remote prefs into local state on first load
  useEffect(() => {
    if (fetchedPrefs && !localPrefs) setLocalPrefs(fetchedPrefs)
  }, [fetchedPrefs]) // eslint-disable-line react-hooks/exhaustive-deps

  const prefs = localPrefs ?? fetchedPrefs

  const saveMutation = useMutation({
    mutationFn: (p: Partial<NotificationPrefs>) => profileService.updateNotifPrefs(p),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function toggle(key: keyof NotificationPrefs) {
    if (!prefs) return
    setLocalPrefs({ ...prefs, [key]: !prefs[key] })
    setSaved(false)
  }

  function setDigest(value: string) {
    if (!prefs) return
    setLocalPrefs({ ...prefs, email_digest: value as NotificationPrefs['email_digest'] })
    setSaved(false)
  }

  async function handleSave() {
    if (!localPrefs) return
    await saveMutation.mutateAsync(localPrefs)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <SettingsNav />
          <div className="flex-1 space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-slate-900">Settings</h1></div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <SettingsNav />

        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Notification preferences</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Control what alerts you receive and how often.
              </p>
            </div>
            <Button size="sm" loading={saveMutation.isPending} onClick={handleSave}>
              {saved ? 'âœ" Saved' : 'Save changes'}
            </Button>
          </div>

          {isError && (
            <Alert message="Could not load notification preferences. Showing defaults." />
          )}
          {saveMutation.isError && (
            <Alert message="Failed to save preferences. Please try again." />
          )}
          {saved && (
            <Alert variant="success" message="Notification preferences saved." />
          )}

          {/* Notification toggles */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
              <Bell size={15} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Notification types</h3>
              <span className="ml-auto text-xs text-slate-400">Toggle to enable / disable</span>
            </div>

            {PREF_ROWS.map((row, i) => {
              const isOn = prefs ? !!prefs[row.key] : false
              const icons: Record<string, typeof Bell> = {
                report_updates:    AlertTriangle,
                symptom_checkin:   Activity,
                exercise_reminders:Dumbbell,
                provider_messages: Info,
                tips_updates:      Bell,
              }
              const RowIcon = icons[row.key as string] ?? Bell

              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between gap-4 px-5 py-4
                              ${i < PREF_ROWS.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                                    rounded-lg bg-slate-100 mt-0.5">
                      <RowIcon size={14} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                        {row.locked && (
                          <span className="flex items-center gap-1 rounded-full border border-slate-200
                                           bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            <Lock size={9} /> LOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{row.description}</p>
                    </div>
                  </div>
                  <Toggle on={isOn} locked={row.locked} onChange={() => toggle(row.key)} />
                </div>
              )
            })}
          </div>

          {/* Email digest */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
              <Bell size={15} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Email digest frequency</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs text-slate-400 mb-3">
                Controls how often you receive email summaries of activity. Individual urgent alerts
                are always sent immediately regardless of this setting.
              </p>
              {DIGEST_OPTIONS.map(({ value, label }) => {
                const selected = (prefs?.email_digest ?? 'daily') === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDigest(value)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3
                                text-sm text-left transition-all
                                ${selected
                                  ? 'border-[#0e2040] bg-slate-50 text-slate-900'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    <span className={`h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all
                                      ${selected ? 'border-[#0e2040] bg-[#0e2040]' : 'border-slate-300'}`} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Save footer */}
          <div className="flex justify-end">
            <Button size="sm" loading={saveMutation.isPending} onClick={handleSave}>
              {saved ? 'âœ" Saved' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

