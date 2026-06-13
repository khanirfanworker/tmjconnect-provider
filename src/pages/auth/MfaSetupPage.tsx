import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Copy, Check, ArrowRight, Smartphone, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'

/**
 * MfaSetupPage
 *
 * Flow:
 * VerifyEmailPage → (navigate with setup_token in state) → MfaSetupPage
 *   → POST /auth/mfa/setup (Bearer: setup_token) → { secret, qr_uri }
 *   → Show QR code + manual secret
 *   → User scans with authenticator app
 *   → POST /auth/mfa/verify-setup (Bearer: setup_token) { code }
 *   → { backup_codes[], access_token, refresh_token }
 *   → Store tokens, navigate to /dashboard
 */

type Step = 'setup' | 'verify' | 'backup_codes'

export default function MfaSetupPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { setTokens, setProvider, setMfaVerified } = useAuthStore()

  const state = location.state as { setupToken?: string; tempToken?: string } | null
  const setupToken = state?.setupToken ?? state?.tempToken ?? ''

  const [step, setStep]               = useState<Step>('setup')
  const [qrUri, setQrUri]             = useState('')
  const [secret, setSecret]           = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [otp, setOtp]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [savedCodes, setSavedCodes]   = useState(false)

  // Redirect if no setupToken
  useEffect(() => {
    if (!setupToken) navigate('/login', { replace: true })
  }, [setupToken, navigate])

  // Initialize MFA setup — get QR code
  useEffect(() => {
    if (!setupToken) return
    async function init() {
      setInitLoading(true)
      try {
        const res = await authService.initMfaSetup(setupToken)
        setQrUri(res.qr_uri)
        setSecret(res.secret)
      } catch (err) {
        setServerError(getErrorMessage(err, 'Failed to initialize MFA setup. Please try again.'))
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [setupToken])

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  async function handleVerify() {
    if (otp.length !== 6) return
    setLoading(true)
    setServerError(null)
    try {
      const res = await authService.verifyMfaSetup(setupToken, otp)
      setBackupCodes(res.backup_codes)
      // Store tokens from the setup response
      setTokens(res.access_token, res.refresh_token)
      // Provider info comes from a separate call after setup
      // Navigate to backup codes step first
      setStep('backup_codes')
    } catch (err) {
      setServerError(getErrorMessage(err, 'Invalid code. Check your authenticator app and try again.'))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  async function handleDone() {
    // Fetch provider profile now that we're authenticated
    try {
      const profileService = await import('@/services/profileService')
      const profile = await profileService.profileService.getProfile()
      setProvider(profile)
    } catch {
      // Continue even if profile fetch fails
    }
    setMfaVerified(true)
    navigate('/dashboard', { replace: true })
  }

  if (!setupToken) return null

  return (
    <div className="space-y-6">

      {/* ── Step indicator ──────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {step === 'setup' ? 'Step 1 of 2' : step === 'verify' ? 'Step 2 of 2' : 'Complete'}
          </span>
          <span style={{ color: '#c49526' }} className="font-semibold">
            {step === 'setup' ? '50%' : step === 'verify' ? '75%' : '100%'}
          </span>
        </div>
        <div className="h-0.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: step === 'setup' ? '50%' : step === 'verify' ? '75%' : '100%',
              backgroundColor: '#c49526',
            }}
          />
        </div>
      </div>

      {serverError && (
        <Alert message={serverError} onDismiss={() => setServerError(null)} />
      )}

      {/* ── STEP: QR Code setup ─────────────────────────── */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} style={{ color: '#c49526' }} />
              <h2 className="text-2xl font-bold text-slate-900">Set up Multi-Factor Authentication</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              HIPAA §164.312(a) requires MFA on accounts with access to protected health information.
              This takes about two minutes.
            </p>
          </div>

          {/* MFA mandatory notice */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldCheck size={15} className="flex-shrink-0 mt-0.5 text-amber-600" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">MFA is mandatory</span> for every provider account on TMJConnect
              and cannot be disabled later. If you lose access to your authenticator, you can recover
              using one of the 10 backup codes we'll generate at the end.
            </p>
          </div>

          {initLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200"
                   style={{ borderTopColor: '#c49526' }} />
            </div>
          ) : (
            <div className="space-y-5">
              {/* QR Code */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-800">Scan with authenticator app</p>
                  <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5
                                   text-xs font-semibold text-green-700">RECOMMENDED</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Open Google Authenticator, Authy, 1Password, or similar and scan this QR code.
                </p>

                {/* QR Code display */}
                {qrUri ? (
                  <div className="flex justify-center">
                    <div className="rounded-xl border-2 border-slate-200 p-3 bg-white">
                      {/* Use Google Charts API to render QR — no extra dependency */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUri)}`}
                        alt="MFA QR Code"
                        width={160}
                        height={160}
                        className="rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-xl bg-slate-100">
                    <p className="text-sm text-slate-400">QR code unavailable</p>
                  </div>
                )}

                {/* Manual entry */}
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">
                    Or enter this setup key manually:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200
                                  bg-slate-50 px-3 py-2.5">
                    <code className="flex-1 text-xs font-mono text-slate-700 tracking-wider break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5
                                 text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: secretCopied ? '#f0fdf4' : '#0e2040',
                        color: secretCopied ? '#16a34a' : 'white',
                      }}
                    >
                      {secretCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                </div>
              </div>

              <Button fullWidth size="lg" onClick={() => setStep('verify')}>
                I've scanned the QR code <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: Enter TOTP code to verify ─────────────── */}
      {step === 'verify' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={20} style={{ color: '#c49526' }} />
              <h2 className="text-2xl font-bold text-slate-900">Enter the 6-digit code</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enter the code shown in your authenticator app to confirm the setup.
              Codes refresh every 30 seconds.
            </p>
          </div>

          {/* 6-digit input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(val)
                setServerError(null)
              }}
              placeholder="000000"
              className={cn(
                'w-full rounded-xl border-2 px-4 py-4 text-center text-3xl font-bold',
                'tracking-[0.5em] focus:outline-none transition-all',
                serverError ? 'border-red-400 bg-red-50 text-red-800' : 'bg-white text-slate-900',
              )}
              style={{
                borderColor: serverError ? '#f87171' : otp.length === 6 ? '#c49526' : '#e2e8f0',
                boxShadow: !serverError && otp.length === 6
                  ? '0 0 0 3px rgba(196,149,38,0.12)' : 'none',
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary" size="lg"
              onClick={() => { setStep('setup'); setOtp(''); setServerError(null) }}
              className="flex-1"
            >
              ← Back
            </Button>
            <Button
              size="lg"
              loading={loading}
              disabled={otp.length !== 6}
              onClick={handleVerify}
              className="flex-1"
            >
              Verify &amp; continue <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: Backup codes ───────────────────────────── */}
      {step === 'backup_codes' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Save your backup codes</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              <span className="font-semibold text-red-600">These codes are shown once only.</span>{' '}
              Save them somewhere safe. Each code can be used once to sign in if you lose
              access to your authenticator.
            </p>
          </div>

          {/* Backup codes grid */}
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i}
                     className="flex items-center rounded-lg bg-white border border-amber-200
                                px-3 py-2">
                  <span className="text-xs text-slate-400 mr-2 w-4">{i + 1}.</span>
                  <code className="text-sm font-mono font-semibold text-slate-800 tracking-wider">
                    {code}
                  </code>
                </div>
              ))}
            </div>

            {/* Copy all */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n'))
                setSavedCodes(true)
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2
                         text-sm font-semibold transition-all"
              style={{
                backgroundColor: savedCodes ? '#f0fdf4' : '#0e2040',
                color: savedCodes ? '#16a34a' : 'white',
              }}
            >
              {savedCodes
                ? <><Check size={14} /> Codes copied to clipboard</>
                : <><Copy size={14} /> Copy all codes</>
              }
            </button>
          </div>

          {/* Acknowledge checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={savedCodes}
              onChange={(e) => setSavedCodes(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              style={{ accentColor: '#c49526' }}
            />
            <span className="text-sm text-slate-600 leading-snug">
              I've saved these backup codes in a secure location. I understand they won't
              be shown again.
            </span>
          </label>

          <Button
            fullWidth size="lg"
            disabled={!savedCodes}
            onClick={handleDone}
          >
            I've saved these — go to dashboard <ArrowRight size={16} />
          </Button>
        </div>
      )}

    </div>
  )
}
