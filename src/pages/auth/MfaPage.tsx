import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RefreshCw, Smartphone, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'

const OTP_LENGTH = 6

/**
 * MfaPage — verify TOTP code to complete login.
 *
 * API: POST /auth/mfa/verify
 * Body: { mfa_token, code, type: "totp" }
 * → { access_token, refresh_token }
 *
 * The mfa_token goes in the BODY — NOT as a Bearer header.
 */
export default function MfaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { mfaToken, setTokens, setMfaVerified, setMfaPending, setMfaToken } = useAuthStore()
  const redirectTo = (location.state as { redirectTo?: string })?.redirectTo ?? '/dashboard'

  const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [resendCooldown, setCooldown] = useState(0)
  const submittedRef = useRef(false)
  const inputRefs    = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])
  useEffect(() => { if (!mfaToken) navigate('/login', { replace: true }) }, [mfaToken, navigate])
  useEffect(() => {
    if (serverError) { submittedRef.current = false; setDigits(Array(OTP_LENGTH).fill('')); setTimeout(() => inputRefs.current[0]?.focus(), 100) }
  }, [serverError])
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleChange(index: number, value: string) {
    if (isSubmitting || submittedRef.current) return
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[index] = digit; setDigits(next); setServerError(null)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1) {
      const code = next.join('')
      if (code.length === OTP_LENGTH && !submittedRef.current) { submittedRef.current = true; submitOtp(code) }
    }
  }
  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') { if (digits[index]) { const n=[...digits]; n[index]=''; setDigits(n) } else if (index>0) inputRefs.current[index-1]?.focus() }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index-1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH-1) inputRefs.current[index+1]?.focus()
  }
  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!p) return
    const n=[...digits]; for(let i=0;i<p.length;i++) n[i]=p[i]; setDigits(n)
    inputRefs.current[Math.min(p.length, OTP_LENGTH-1)]?.focus()
    if (p.length === OTP_LENGTH && !submittedRef.current) { submittedRef.current = true; submitOtp(p) }
  }

  async function submitOtp(code: string) {
    if (!mfaToken || isSubmitting) return
    setSubmitting(true); setServerError(null)
    try {
      // POST /auth/mfa/verify — mfa_token in BODY, not Bearer
      const res = await authService.verifyMfa({
        mfa_token: mfaToken,
        code,
        type: 'totp',
      })
      setTokens(res.access_token, res.refresh_token)
      setMfaVerified(true)
      setMfaPending(false)
      setMfaToken(null)

      // Fetch provider profile now that we have tokens
      try {
        const { default: api } = await import('@/services/api')
        const { data: profileData } = await api.get('/providers/me')
        const p = profileData?.data ?? profileData
        if (p) {
          const { useAuthStore: store } = await import('@/store/authStore')
          store.getState().setProvider({
            id:            p.id ?? p.user_id ?? '',
            fullName:      [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Provider',
            email:         p.email ?? '',
            specialties:   p.specialty ? [p.specialty] : [],
            clinicName:    p.clinic_name ?? '',
            licenseNumber: p.license_number ?? '',
            mfaEnabled:    true,
            createdAt:     p.created_at ?? new Date().toISOString(),
          })
        }
      } catch { /* profile fetch failed — non-critical, dashboard still loads */ }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      submittedRef.current = false
      setServerError(getErrorMessage(err, 'Invalid code. Please try again.'))
    } finally { setSubmitting(false) }
  }

  function handleSmsResend() {
    if (!mfaToken) return
    setCooldown(30); setServerError(null); submittedRef.current = false
    setDigits(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus()
    authService.requestSmsMfa(mfaToken).catch(() => {})
  }

  const otp = digits.join(''); const filledCount = digits.filter(Boolean).length
  if (!mfaToken) return null

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ backgroundColor: '#f5f3ef', borderColor: '#e5e2db' }}>
          <Smartphone size={26} className="text-slate-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Verify your identity</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">Enter the 6-digit code from your authenticator app. Codes refresh every 30 seconds.</p>
      </div>

      {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}

      <div className="flex items-center justify-center gap-2.5 sm:gap-3">
        {digits.map((digit, i) => (
          <input key={i} ref={el => { inputRefs.current[i] = el }}
            type="text" inputMode="numeric" maxLength={1} value={digit} disabled={isSubmitting}
            onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined} aria-label={`Digit ${i+1}`}
            className={cn('h-14 w-12 rounded-xl border-2 text-center text-xl font-bold transition-all duration-150 focus:outline-none bg-white',
              digit ? 'text-slate-900' : 'text-slate-300',
              serverError && 'border-red-400 bg-red-50', isSubmitting && 'opacity-60')}
            style={{ borderColor: serverError ? '#f87171' : digit ? '#c49526' : i === filledCount ? '#c49526' : '#d1d5db',
              boxShadow: !serverError && (digit || i === filledCount) ? '0 0 0 3px rgba(196,149,38,0.12)' : 'none' }} />
        ))}
      </div>

      <Button fullWidth size="lg" loading={isSubmitting} disabled={otp.length < OTP_LENGTH || isSubmitting}
        onClick={() => { if (!submittedRef.current) { submittedRef.current = true; submitOtp(otp) } }}>
        Verify &amp; continue <ShieldCheck size={16} />
      </Button>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-500"><RefreshCw size={13} />
          {resendCooldown > 0
            ? <span>Resend in <span className="font-semibold tabular-nums" style={{ color: '#c49526' }}>00:{String(resendCooldown).padStart(2, '0')}</span></span>
            : <button type="button" onClick={handleSmsResend} className="font-medium hover:underline" style={{ color: '#c49526' }}>Resend</button>}
        </div>
        <button type="button" className="font-medium text-slate-600 hover:underline" onClick={handleSmsResend}>Send to phone instead</button>
      </div>

      <p className="text-center text-sm text-slate-500">Lost your device? <button type="button" className="font-semibold hover:underline" style={{ color: '#c49526' }}>Use a recovery code →</button></p>
      <p className="text-center text-xs text-slate-400">Wrong account? <button type="button" onClick={() => { setMfaToken(null); navigate('/login') }} className="font-medium hover:underline text-slate-500">Back to sign in</button></p>
    </div>
  )
}
