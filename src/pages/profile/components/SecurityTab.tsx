import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Monitor, Smartphone, Trash2, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { profileService } from '@/services/profileService'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime } from '@/utils/formatters'
import { authService } from '@/services/authService'

const pwSchema = z.object({
  current:  z.string().min(1, 'Required'),
  next:     z.string().min(8, 'At least 8 characters')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^a-zA-Z0-9]/, 'Must include a special character'),
  confirm: z.string(),
}).refine(d => d.next === d.confirm, { message: "Passwords don't match", path: ['confirm'] })

type PwForm = z.infer<typeof pwSchema>

export function SecurityTab() {
  const { logout } = useAuthStore()
  const navigate    = useNavigate()
  const [pwSaved, setPwSaved]   = useState(false)
  const [pwError, setPwError]   = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [localSessions, setLocalSessions] = useState<import('@/services/profileService').SecuritySession[] | null>(null)

  // Must be declared BEFORE any useState that references its type
  const { data: fetchedSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn:  profileService.getSessions,
  })

  const activeSessions = localSessions ?? fetchedSessions

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PwForm>({ resolver: zodResolver(pwSchema) })

  async function onChangePassword(data: PwForm) {
    setPwError(null); setPwSaved(false)
    try {
      await authService.changePassword(data.current, data.next)
      setPwSaved(true)
      reset()
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: unknown) {
      setPwError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to change password.'
      )
    }
  }

  async function revokeSession(id: string) {
    await profileService.revokeSession(id)
    setLocalSessions(activeSessions.filter(s => s.id !== id))
  }

  async function revokeAll() {
    await profileService.getSessions().then(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-8 max-w-xl">

      {/* ── Change password ────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Change password</h3>
        {pwSaved && <Alert variant="success" message="Password changed successfully." className="mb-4" />}
        {pwError && <Alert message={pwError} onDismiss={() => setPwError(null)} className="mb-4" />}
        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <Input label="Current password" type="password" error={errors.current?.message} {...register('current')} />
          <Input label="New password"     type="password" hint="8+ chars, one number, one special char"
                 error={errors.next?.message} {...register('next')} />
          <Input label="Confirm new password" type="password" error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </form>
      </section>

      {/* ── MFA status ─────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Multi-factor authentication</h3>
        <div className="flex items-center justify-between rounded-xl border border-green-200
                        bg-green-50 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">MFA is active</p>
              <p className="text-xs text-green-600">Authenticator app configured · Cannot be disabled (HIPAA)</p>
            </div>
          </div>
          <Button variant="secondary" size="sm">Reconfigure</Button>
        </div>
      </section>

      {/* ── Active sessions ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Active sessions</h3>
          <Button variant="secondary" size="sm" onClick={revokeAll}>
            <LogOut size={13} /> Sign out all devices
          </Button>
        </div>
        <div className="space-y-2">
          {activeSessions.map((session) => (
            <div key={session.id}
                 className="flex items-center justify-between rounded-xl border border-slate-200
                            bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {(session.device_info ?? '').includes('iPhone') || (session.device_info ?? '').includes('Android')
                  ? <Smartphone size={16} className="text-slate-400 flex-shrink-0" />
                  : <Monitor size={16} className="text-slate-400 flex-shrink-0" />
                }
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{session.device_info}</p>
                    {session.is_current && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs
                                       font-semibold text-green-700">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {session.ip_address ?? '—'} · {session.last_active ? formatDateTime(session.last_active) : 'Unknown'}
                  </p>
                </div>
              </div>
              {!session.is_current && (
                <button onClick={() => revokeSession(session.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Session auto-expires after 15 minutes of inactivity (HIPAA §164.312).
        </p>
      </section>

      {/* ── Danger zone ─────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Danger zone</h3>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-800">Delete account</p>
              </div>
              <p className="text-xs text-red-600 mt-1 leading-snug">
                Permanently deletes your provider account, all patient connections, and data.
                This cannot be undone.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          </div>
        </div>
      </section>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} />
      )}
    </div>
  )
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true); setError(null)
    try {
      await profileService.deleteAccount(password)
      logout()
      navigate('/login')
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed. Please try again.'
      )
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Delete your account?</h3>
            <p className="text-xs text-slate-500">This action is permanent and cannot be undone.</p>
          </div>
        </div>
        {error && <Alert message={error} onDismiss={() => setError(null)} />}
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 space-y-1">
          <p>• All patient connections will be severed</p>
          <p>• Exercise assignments will be removed</p>
          <p>• Your account data will be permanently deleted</p>
        </div>
        <Input
          label="Enter your password to confirm"
          type="password"
          placeholder="Your current password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          Dev: type <strong>confirm</strong> as password to proceed.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="danger" fullWidth loading={deleting}
                  disabled={!password} onClick={handleDelete}>
            Delete my account
          </Button>
        </div>
      </div>
    </div>
  )
}
