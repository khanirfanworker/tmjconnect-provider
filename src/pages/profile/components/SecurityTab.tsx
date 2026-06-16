import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Monitor, Smartphone, ShieldCheck,
  Key, RefreshCw, MessageSquare, LogOut, Copy, Check, ArrowRight, X, KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { profileService } from '@/services/profileService'
import { useAuthStore } from '@/store/authStore'
import { authService, getErrorMessage } from '@/services/authService'
import { formatDateTime } from '@/utils/formatters'
import { cn } from '@/lib/cn'

type MfaStep = 'confirm' | 'qr' | 'verify' | 'backup'

export function SecurityTab() {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()

  // ── Password ─────────────────────────────────────────────────────────────
  const [showChangePw, setShowChangePw]   = useState(false)
  const [currentPw, setCurrentPw]         = useState('')
  const [newPw, setNewPw]                 = useState('')
  const [confirmPw, setConfirmPw]         = useState('')
  const [pwError, setPwError]             = useState<string | null>(null)
  const [pwSaved, setPwSaved]             = useState(false)
  const [savingPw, setSavingPw]           = useState(false)

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [localSessions, setLocalSessions] = useState<import('@/services/profileService').SecuritySession[] | null>(null)

  const { data: fetchedSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn:  profileService.getSessions,
  })
  const activeSessions = localSessions ?? fetchedSessions

  // ── MFA Reconfigure ───────────────────────────────────────────────────────
  const [mfaStep, setMfaStep]               = useState<MfaStep | null>(null)
  const [mfaSetupToken, setMfaSetupToken]   = useState('')
  const setupTokenRef                        = useRef('')  // ref copy — immune to stale closures
  const [mfaQrUri, setMfaQrUri]             = useState('')
  const [mfaSecret, setMfaSecret]           = useState('')
  const [mfaOtp, setMfaOtp]                 = useState('')
  const [mfaPassword, setMfaPassword]       = useState('')
  const [mfaCurrentCode, setMfaCurrentCode] = useState('')
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([])
  const [mfaLoading, setMfaLoading]         = useState(false)
  const [mfaError, setMfaError]             = useState<string | null>(null)
  const [secretCopied, setSecretCopied]     = useState(false)
  const [codesCopied, setCodesCopied]       = useState(false)

  function startReconfigure() {
    setMfaError(null)
    setMfaPassword('')
    setMfaCurrentCode('')
    setMfaStep('confirm')
  }

  async function handleConfirmIdentity() {
    if (!mfaPassword || mfaCurrentCode.length !== 6) return
    setMfaLoading(true)
    setMfaError(null)
    try {
      const initToken = await authService.reconfigureInit(mfaPassword, mfaCurrentCode)
      const res = await authService.reconfigureMfaSetup(initToken)
      // Server may rotate the setup_token after /auth/mfa/setup — use the new one if present
      const verifyToken = res.setup_token ?? initToken
      setMfaSetupToken(verifyToken)
      setupTokenRef.current = verifyToken
      setMfaQrUri(res.qr_uri)
      setMfaSecret(res.secret)
      setMfaStep('qr')
    } catch (err) {
      setMfaError(getErrorMessage(err, 'Incorrect password or code. Please try again.'))
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleMfaVerify() {
    if (mfaOtp.length !== 6) return
    setMfaLoading(true)
    setMfaError(null)
    try {
      // Step 3: verify with the same setup_token
      const token = setupTokenRef.current || mfaSetupToken
      const res = await authService.reconfigureMfaVerify(token, mfaOtp)
      setMfaBackupCodes(res.backup_codes)
      setMfaStep('backup')
    } catch (err) {
      setMfaError(getErrorMessage(err, 'Invalid code. Check your authenticator app and try again.'))
      setMfaOtp('')
    } finally {
      setMfaLoading(false)
    }
  }

  function closeMfa() {
    setMfaStep(null)
    setMfaSetupToken('')
    setupTokenRef.current = ''
    setMfaOtp('')
    setMfaPassword('')
    setMfaCurrentCode('')
    setMfaError(null)
    setMfaQrUri('')
    setMfaSecret('')
    setMfaBackupCodes([])
    setSecretCopied(false)
    setCodesCopied(false)
  }

  // ── Password handlers ─────────────────────────────────────────────────────
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
        <div className="border-b border-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
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
            <button
              onClick={startReconfigure}
              disabled={mfaLoading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold
                         text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {mfaLoading && !mfaStep
                ? <><div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" /> Starting…</>
                : <><RefreshCw size={11} /> Reconfigure</>
              }
            </button>
          </div>
          {mfaError && !mfaStep && (
            <div className="px-6 pb-4">
              <Alert message={mfaError} onDismiss={() => setMfaError(null)} />
            </div>
          )}
        </div>

        {/* ── MFA reconfigure inline flow ─────────────────────────────── */}
        {mfaStep && (
          <div className="border-t border-slate-100 px-6 py-5" style={{ backgroundColor: '#fafafa' }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} style={{ color: '#c49526' }} />
                <p className="text-sm font-semibold text-slate-900">
                  {mfaStep === 'confirm' && 'Step 1 of 3 — Confirm identity'}
                  {mfaStep === 'qr'      && 'Step 2 of 3 — Scan QR code'}
                  {mfaStep === 'verify'  && 'Step 3 of 3 — Verify new code'}
                  {mfaStep === 'backup'  && 'Complete — Save backup codes'}
                </p>
              </div>
              {mfaStep !== 'backup' && (
                <button onClick={closeMfa} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                  <X size={13} className="text-slate-500" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full rounded-full bg-slate-200 overflow-hidden mb-5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: mfaStep === 'confirm' ? '25%' : mfaStep === 'qr' ? '50%' : mfaStep === 'verify' ? '75%' : '100%',
                  backgroundColor: '#c49526',
                }}
              />
            </div>

            {mfaError && (
              <div className="mb-4">
                <Alert message={mfaError} onDismiss={() => setMfaError(null)} />
              </div>
            )}

            {/* Step: confirm identity */}
            {mfaStep === 'confirm' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  To protect your account, confirm your identity before reconfiguring MFA.
                </p>
                <Input
                  label="Current password"
                  type="password"
                  value={mfaPassword}
                  onChange={(e) => { setMfaPassword(e.target.value); setMfaError(null) }}
                  autoFocus
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Current authenticator code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCurrentCode}
                    onChange={(e) => { setMfaCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(null) }}
                    placeholder="000000"
                    className="w-full rounded-xl border-2 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] focus:outline-none transition-all bg-white text-slate-900"
                    style={{ borderColor: mfaCurrentCode.length === 6 ? '#c49526' : '#e2e8f0' }}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmIdentity()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={closeMfa} className="flex-1">Cancel</Button>
                  <Button
                    size="sm"
                    loading={mfaLoading}
                    disabled={!mfaPassword || mfaCurrentCode.length !== 6}
                    onClick={handleConfirmIdentity}
                    className="flex-1"
                  >
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: QR code */}
            {mfaStep === 'qr' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Open Google Authenticator, Authy, or 1Password and scan this QR code to link your new device.
                  Your previous authenticator will stop working once you verify below.
                </p>

                {/* QR code */}
                <div className="flex justify-center">
                  <div className="rounded-xl border-2 border-slate-200 p-3 bg-white">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mfaQrUri)}`}
                      alt="MFA QR Code"
                      width={160}
                      height={160}
                      className="rounded"
                    />
                  </div>
                </div>

                {/* Manual secret */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Or enter this key manually:</p>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <code className="flex-1 text-xs font-mono text-slate-700 tracking-wider break-all">
                      {mfaSecret}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(mfaSecret); setSecretCopied(true); setTimeout(() => setSecretCopied(false), 2000) }}
                      className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                      style={{ backgroundColor: secretCopied ? '#f0fdf4' : '#0e2040', color: secretCopied ? '#16a34a' : 'white' }}
                    >
                      {secretCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                </div>

                <Button fullWidth onClick={() => setMfaStep('verify')}>
                  I've scanned the QR code <ArrowRight size={15} />
                </Button>
              </div>
            )}

            {/* Step: verify */}
            {mfaStep === 'verify' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound size={15} style={{ color: '#c49526' }} />
                  <p className="text-sm font-medium text-slate-800">Enter the 6-digit code from your authenticator</p>
                </div>
                <p className="text-xs text-slate-500">Codes refresh every 30 seconds.</p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaOtp}
                  onChange={(e) => { setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(null) }}
                  placeholder="000000"
                  className={cn(
                    'w-full rounded-xl border-2 px-4 py-4 text-center text-3xl font-bold',
                    'tracking-[0.5em] focus:outline-none transition-all bg-white text-slate-900',
                  )}
                  style={{
                    borderColor: mfaError ? '#f87171' : mfaOtp.length === 6 ? '#c49526' : '#e2e8f0',
                  }}
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setMfaStep('qr')} className="flex-1">
                    ← Back
                  </Button>
                  <Button
                    size="sm"
                    loading={mfaLoading}
                    disabled={mfaOtp.length !== 6}
                    onClick={handleMfaVerify}
                    className="flex-1"
                  >
                    Verify &amp; activate <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: backup codes */}
            {mfaStep === 'backup' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-red-600">These codes are shown once only.</span>{' '}
                  Save them somewhere safe. Each can be used once to sign in if you lose access to your authenticator.
                </p>

                <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {mfaBackupCodes.map((code, i) => (
                      <div key={i} className="flex items-center rounded-lg bg-white border border-amber-200 px-3 py-2">
                        <span className="text-xs text-slate-400 mr-2 w-4">{i + 1}.</span>
                        <code className="text-sm font-mono font-semibold text-slate-800 tracking-wider">{code}</code>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(mfaBackupCodes.join('\n')); setCodesCopied(true) }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all"
                    style={{ backgroundColor: codesCopied ? '#f0fdf4' : '#0e2040', color: codesCopied ? '#16a34a' : 'white' }}
                  >
                    {codesCopied ? <><Check size={14} /> Codes copied</> : <><Copy size={14} /> Copy all codes</>}
                  </button>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={codesCopied}
                    onChange={(e) => setCodesCopied(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    style={{ accentColor: '#c49526' }}
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    I've saved these backup codes. I understand they won't be shown again.
                  </span>
                </label>

                <Button fullWidth disabled={!codesCopied} onClick={closeMfa}>
                  Done — MFA reconfigured
                </Button>
              </div>
            )}
          </div>
        )}

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
