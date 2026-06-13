import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, RefreshCw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { cn } from '@/lib/cn'

const OTP_LENGTH = 6

/**
 * VerifyEmailPage
 *
 * Flow:
 * RegisterPage → (redirect with email in state) → VerifyEmailPage
 *   → POST /auth/verify-email { email, code }
 *   → receives { mfa_setup_required: true, setup_token }
 *   → navigate to /mfa-setup with setup_token in state
 */
export default function VerifyEmailPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // Email passed from RegisterPage via router state
  const email = (location.state as { email?: string })?.email ?? ''

  const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isSubmitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [resendCooldown, setCooldown] = useState(60)  // start with 60s on arrival
  const [resendSuccess, setResendSuccess] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  // Redirect to register if no email in state (direct URL access)
  useEffect(() => {
    if (!email) navigate('/register', { replace: true })
  }, [email, navigate])

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── OTP input handlers ─────────────────────────────────────────────────────

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    setServerError(null)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1) {
      const code = [...next].join('')
      if (code.length === OTP_LENGTH) submitCode(code)
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]; next[index] = ''; setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft'  && index > 0)            inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH-1) inputRefs.current[index + 1]?.focus()
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[lastIdx]?.focus()
    if (pasted.length === OTP_LENGTH) submitCode(pasted)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function submitCode(code: string) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await authService.verifyEmail({ email, code })
      // API returns { mfa_setup_required: true, setup_token }
      // Navigate to MFA setup — pass setup_token via router state
      navigate('/mfa-setup', {
        replace: true,
        state: { setupToken: res.setup_token, email },
      })
    } catch (err) {
      setServerError(getErrorMessage(err, 'Invalid or expired code. Please try again.'))
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResendSuccess(false)
    try {
      await authService.resendVerifyEmail(email)
      setResendSuccess(true)
      setCooldown(60)
      setDigits(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setServerError(getErrorMessage(err, 'Failed to resend code. Please try again.'))
    }
  }

  const otp         = digits.join('')
  const filledCount = digits.filter(Boolean).length

  if (!email) return null

  return (
    <div className="space-y-8">

      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border"
           style={{ backgroundColor: '#fdf8ec', borderColor: '#e8d5a0' }}>
        <Mail size={26} style={{ color: '#c49526' }} />
      </div>

      {/* Heading */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          We sent a 6-digit verification code to{' '}
          <span className="font-semibold text-slate-700">{email}</span>.
          Enter it below to verify your account.
        </p>
      </div>

      {serverError && (
        <Alert message={serverError} onDismiss={() => setServerError(null)} />
      )}

      {resendSuccess && (
        <Alert variant="success" message="New code sent — check your inbox." />
      )}

      {/* OTP boxes */}
      <div className="flex items-center gap-2.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
            className={cn(
              'h-14 w-12 rounded-xl border-2 text-center text-2xl font-bold',
              'transition-all duration-100 focus:outline-none bg-white',
              digit ? 'text-slate-900' : 'text-slate-200',
              serverError ? 'border-red-400 bg-red-50' : '',
            )}
            style={{
              borderColor: serverError
                ? '#f87171'
                : digit
                  ? '#c49526'
                  : i === filledCount
                    ? '#c49526'
                    : '#e2e8f0',
              boxShadow: !serverError && (digit || i === filledCount)
                ? '0 0 0 3px rgba(196,149,38,0.12)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Verify button */}
      <Button
        fullWidth size="lg"
        loading={isSubmitting}
        disabled={otp.length < OTP_LENGTH || isSubmitting}
        onClick={() => submitCode(otp)}
      >
        Verify email <ArrowRight size={16} />
      </Button>

      {/* Resend */}
      <div className="flex items-center justify-center gap-1.5 text-sm">
        <RefreshCw size={13} className="text-slate-400" />
        {resendCooldown > 0 ? (
          <span className="text-slate-500">
            Resend code in{' '}
            <span className="font-semibold tabular-nums" style={{ color: '#c49526' }}>
              {String(resendCooldown).padStart(2, '0')}s
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium hover:underline"
            style={{ color: '#c49526' }}
          >
            Resend verification code
          </button>
        )}
      </div>

      {/* Back to register */}
      <p className="text-center text-sm text-slate-500">
        Wrong email?{' '}
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="font-semibold hover:underline"
          style={{ color: '#c49526' }}
        >
          Go back
        </button>
      </p>
    </div>
  )
}
