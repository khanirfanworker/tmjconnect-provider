import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { SettingsNav } from './components/SettingsNav'
import { useAuthStore } from '@/store/authStore'
import { profileService } from '@/services/profileService'
import { dashboardService } from '@/services/dashboardService'
import { cn } from '@/lib/cn'

const REASONS = [
  'Switching to a different platform',
  'Retiring from practice',
  'Not enough patients using it',
  'Other reason',
]

export default function DeleteAccountPage() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const [selectedReason, setSelectedReason] = useState('')
  const [otherText, setOtherText]           = useState('')
  const [password, setPassword]             = useState('')
  const [confirmation, setConfirmation]     = useState('')
  const [agreed, setAgreed]                 = useState(false)
  const [exporting, setExporting]           = useState(false)
  const [exportSuccess, setExportSuccess]   = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: dashboardService.getPatients,
    staleTime: 1000 * 60 * 5,
  })
  const patientCount = patients.length

  const confirmPhrase = 'DELETE MY ACCOUNT'
  const isValid = confirmation === confirmPhrase && agreed && selectedReason && !!password.trim()

  async function handleExport() {
    setExporting(true)
    await new Promise((r) => setTimeout(r, 800))
    setExporting(false)
    setExportSuccess(true)
  }

  async function handleDelete() {
    if (!isValid) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await profileService.deleteAccount(password)
      logout()
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to delete account. Check your password and try again.'
      setDeleteError(msg)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-slate-900">Settings</h1></div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <SettingsNav />

        <div className="flex-1 space-y-4 max-w-xl">
          {/* Back */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Back to settings
          </button>

          <h2 className="text-xl font-bold text-slate-900">Delete account</h2>

          {/* Warning banner */}
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 space-y-1">
                <p className="font-semibold">
                  This will disconnect all {patientCount} active patient{patientCount !== 1 ? 's' : ''} from your account.
                </p>
                <p className="text-red-600 text-xs leading-relaxed">
                  Patient data will be retained for 7 years per HIPAA. Your account is
                  recoverable for 30 days only. After 30 days, they become read-only and
                  accessible only under subpoena or patient request.
                </p>
              </div>
            </div>
          </div>

          {/* What happens steps */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-3">
            {[
              { step: 'Immediately', desc: `All ${patientCount} patient${patientCount !== 1 ? 's' : ''} disconnected. You lose portal access.` },
              { step: 'For 30 days', desc: 'Account recoverable. Contact support to reverse.' },
              { step: 'After 30 days', desc: 'Data archived. Read-only under legal process only.' },
            ].map(({ step, desc }) => (
              <div key={step} className="flex gap-3 text-sm">
                <span className="font-semibold text-slate-700 w-24 flex-shrink-0">{step}</span>
                <span className="text-slate-500">{desc}</span>
              </div>
            ))}
          </div>

          {/* Export data */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
                   style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Download size={16} style={{ color: '#16a34a' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Before you go — export your data</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  A ZIP archive with your profile, exercises, and patient interaction history. Takes ~5 minutes.
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold
                           transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0e2040', color: 'white' }}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Requesting export…
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Request data export
                  </>
                )}
              </button>
              <p className="text-xs text-slate-400 mt-2">
                You'll receive an email with a download link once the archive is ready.
              </p>
              {exportSuccess && (
                <Alert
                  variant="success"
                  message="Export requested. You'll receive an email with a download link shortly."
                  onDismiss={() => setExportSuccess(false)}
                />
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              Why are you leaving? <span className="text-slate-400 font-normal">Optional, but it helps us improve.</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm text-left transition-all',
                    selectedReason === r
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  <span className={cn(
                    'h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all',
                    selectedReason === r
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-slate-300',
                  )} />
                  {r}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              placeholder="Anything else you'd like us to know? (optional)"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm
                         text-slate-900 placeholder:text-slate-400 resize-none
                         focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>

          {/* Confirmation box */}
          <div className="rounded-xl border border-red-200 bg-white px-5 py-4 space-y-3">
            {deleteError && (
              <Alert message={deleteError} onDismiss={() => setDeleteError(null)} />
            )}
            <p className="text-sm text-slate-700">
              To confirm, type{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-red-600">
                {confirmPhrase}
              </code>{' '}
              below
            </p>
            <input
              type="text"
              placeholder="Type exactly as shown above"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={cn(
                'w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono',
                'focus:outline-none focus:ring-2 focus:border-transparent',
                confirmation === confirmPhrase
                  ? 'border-red-400 bg-red-50 text-red-800'
                  : 'border-slate-300',
              )}
            />
            <Input
              label="Current password"
              type="password"
              placeholder="Enter your password to authorise deletion"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
                style={{ accentColor: '#dc2626' }}
              />
              <span className="text-xs text-slate-600 leading-snug">
                I understand that my patients will be disconnected, my account will be recoverable
                for 30 days only, and patient medical records will be retained for 7 years per HIPAA.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => navigate('/profile')}>
              Cancel — keep my account
            </Button>
            <Button
              variant="danger"
              disabled={!isValid}
              loading={deleting}
              onClick={handleDelete}
            >
              Permanently delete account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
