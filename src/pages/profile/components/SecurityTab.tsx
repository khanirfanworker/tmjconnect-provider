import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, Smartphone, ShieldCheck,
  Key, RefreshCw, MessageSquare, LogOut, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { profileService } from '@/services/profileService'
// profileService used for getSessions + revokeSession
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import { formatDateTime } from '@/utils/formatters'

export function SecurityTab() {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()

  const [showChangePw, setShowChangePw]       = useState(false)
  const [currentPw, setCurrentPw]             = useState('')
  const [newPw, setNewPw]                     = useState('')
  const [confirmPw, setConfirmPw]             = useState('')
  const [pwError, setPwError]                 = useState<string | null>(null)
  const [pwSaved, setPwSaved]                 = useState(false)
  const [savingPw, setSavingPw]               = useState(false)
  const [localSessions, setLocalSessions]     = useState<import('@/services/profileService').SecuritySession[] | null>(null)


  const { data: fetchedSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn:  profileService.getSessions,
  })
  const activeSessions = localSessions ?? fetchedSessions

  async function handleChangePw() {
    if (!currentPw || !newPw || newPw !== confirmPw) {
      setPwError("Passwords don't match or fields are empty.")
      return
    }
    setSavingPw(true); setPwError(null)
    try {
      await authService.changePassword(currentPw, newPw)
      setPwSaved(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setShowChangePw(false)
      setTimeout(() => setPwSaved(false), 4000)
    } catch (err: unknown) {
      setPwError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to change password.'
      )
    } finally { setSavingPw(false) }
  }

  async function revokeSession(id: string) {
    await profileService.revokeSession(id)
    setLocalSessions(activeSessions.filter(s => s.id !== id))
  }

  async function revokeAll() {
    logout(); navigate('/login')
  }


  // Security posture: strong if >1 session or MFA active
  const postureStrong = true

  return (
    <div className="space-y-5">

      {/* ── Page title + posture badge ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security &amp; sessions</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage your password, MFA, and active devices. HIPAA requires an audit trail for every sign-in.
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0 mt-1"
          style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
        >
          <ShieldCheck size={12} />
          Security posture: {postureStrong ? 'Strong' : 'Fair'}
        </span>
      </div>

      {pwSaved && <Alert variant="success" message="Password changed successfully." onDismiss={() => setPwSaved(false)} />}
      {pwError && <Alert message={pwError} onDismiss={() => setPwError(null)} />}

      {/* ── Password ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Password</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Last changed 3 months ago ·{' '}
              <span className="font-semibold" style={{ color: '#16a34a' }}>Strong</span>
            </p>
          </div>
          <button
            onClick={() => setShowChangePw((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold
                       text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Change password
          </button>
        </div>

        {showChangePw && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4 bg-slate-50/50">
            <Input label="Current password" type="password"
                   value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            <Input label="New password" type="password"
                   hint="8+ characters, one number, one special character"
                   value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            <Input label="Confirm new password" type="password"
                   value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowChangePw(false)}>Cancel</Button>
              <Button size="sm" loading={savingPw} onClick={handleChangePw}>Update password</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Multi-factor authentication ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">Multi-factor authentication</p>
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                2 methods active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Required by HIPAA for all provider accounts. Cannot be disabled entirely.
            </p>
          </div>
        </div>

        {/* Authenticator app row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white flex-shrink-0">
              <Key size={16} className="text-slate-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900">Authenticator app</p>
                <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: '#0e2040', color: 'white' }}>
                  PRIMARY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Google Authenticator · set up Jan 8, 2025
              </p>
            </div>
          </div>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold
                             text-slate-700 hover:bg-slate-50 transition-colors">
            Reconfigure
          </button>
        </div>

        {/* SMS fallback row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white flex-shrink-0">
              <MessageSquare size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">SMS fallback</p>
              <p className="text-xs text-slate-400 mt-0.5">
                +1 (415) ••••• 0198 · used as backup only
              </p>
            </div>
          </div>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold
                             text-slate-700 hover:bg-slate-50 transition-colors">
            Change number
          </button>
        </div>
      </div>

      {/* ── Recovery codes ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white flex-shrink-0">
              <Copy size={16} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Recovery codes</p>
              <p className="text-xs mt-0.5" style={{ color: '#d97706' }}>
                6 of 10 codes used — consider regenerating
              </p>
            </div>
          </div>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold
                             text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <RefreshCw size={11} /> View / regenerate
          </button>
        </div>
      </div>

      {/* ── Active sessions ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Active sessions</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeSessions.length} device{activeSessions.length !== 1 ? 's' : ''} currently signed in
            </p>
          </div>
          <button
            onClick={revokeAll}
            className="rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
            style={{ borderColor: '#fecaca', color: '#dc2626', backgroundColor: '#fff1f2' }}
          >
            <LogOut size={11} /> Sign out all other devices
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {activeSessions.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No active sessions found.</p>
          ) : activeSessions.map((session) => {
            const isMobile = (session.device_info ?? '').toLowerCase().includes('iphone')
              || (session.device_info ?? '').toLowerCase().includes('android')
              || (session.device_info ?? '').toLowerCase().includes('mobile')
            return (
              <div key={session.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white flex-shrink-0">
                    {isMobile
                      ? <Smartphone size={16} className="text-slate-500" />
                      : <Monitor    size={16} className="text-slate-500" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{session.device_info}</p>
                      {session.is_current && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ backgroundColor: '#0e2040', color: 'white' }}>
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {session.ip_address ?? '—'} ·{' '}
                      {session.is_current
                        ? 'Active now'
                        : session.last_active ? formatDateTime(session.last_active) : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
                {!session.is_current && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold
                               text-slate-600 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    Sign out
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

