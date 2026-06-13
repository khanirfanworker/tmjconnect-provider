import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { cn } from '@/lib/cn'

/**
 * ForgotPasswordPage — 3-step OTP flow:
 * 1. Enter email → POST /auth/forgot-password → sends OTP
 * 2. Enter 6-digit OTP → POST /auth/reset-password/verify → get reset_token
 * 3. Set new password → POST /auth/reset-password/confirm → success
 */

type Step = 'email' | 'otp' | 'new-password' | 'success'

const emailSchema    = z.object({ email: z.string().email('Enter a valid email') })
const passwordSchema = z.object({
  new_password:     z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need number').regex(/[^a-zA-Z0-9]/, 'Need special character'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, { message: "Passwords don't match", path: ['confirm_password'] })

const OTP_LENGTH = 6

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep]               = useState<Step>('email')
  const [email, setEmail]             = useState('')
  const [resetToken, setResetToken]   = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  // Step 1: Email form
  const emailForm = useForm<{ email: string }>({ resolver: zodResolver(emailSchema) })

  async function handleEmailSubmit(data: { email: string }) {
    setServerError(null)
    try {
      await authService.forgotPassword(data.email)
      setEmail(data.email)
      setStep('otp')
    } catch (err) {
      // Always show OTP screen — don't reveal if email exists
      setEmail(data.email)
      setStep('otp')
    }
  }

  // Step 2: OTP
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [otpLoading, setOtpLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const submittedRef = useRef(false)

  useEffect(() => { if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 100) }, [step])
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c-1), 1000); return () => clearTimeout(t) }, [cooldown])
  useEffect(() => { if (serverError && step === 'otp') { submittedRef.current = false; setDigits(Array(OTP_LENGTH).fill('')); setTimeout(() => inputRefs.current[0]?.focus(), 100) } }, [serverError, step])

  function handleOtpChange(i: number, v: string) {
    if (otpLoading || submittedRef.current) return
    const d = v.replace(/\D/g, '').slice(-1); const n = [...digits]; n[i] = d; setDigits(n); setServerError(null)
    if (d && i < OTP_LENGTH-1) inputRefs.current[i+1]?.focus()
    if (d && i === OTP_LENGTH-1) { const code = n.join(''); if (code.length === OTP_LENGTH && !submittedRef.current) { submittedRef.current = true; handleOtpSubmit(code) } }
  }
  function handleOtpKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') { if (digits[i]) { const n=[...digits]; n[i]=''; setDigits(n) } else if (i>0) inputRefs.current[i-1]?.focus() }
    if (e.key === 'ArrowLeft' && i > 0) inputRefs.current[i-1]?.focus()
    if (e.key === 'ArrowRight' && i < OTP_LENGTH-1) inputRefs.current[i+1]?.focus()
  }
  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault(); const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!p) return; const n=[...digits]; for(let i=0;i<p.length;i++) n[i]=p[i]; setDigits(n)
    inputRefs.current[Math.min(p.length, OTP_LENGTH-1)]?.focus()
    if (p.length === OTP_LENGTH && !submittedRef.current) { submittedRef.current = true; handleOtpSubmit(p) }
  }

  async function handleOtpSubmit(code: string) {
    setOtpLoading(true); setServerError(null)
    try {
      const res = await authService.verifyResetOtp(email, code)
      setResetToken(res.reset_token)
      setStep('new-password')
    } catch (err) {
      submittedRef.current = false
      setServerError(getErrorMessage(err, 'Invalid or expired code.'))
    } finally { setOtpLoading(false) }
  }

  async function handleResend() {
    setCooldown(60); setServerError(null); submittedRef.current = false
    setDigits(Array(OTP_LENGTH).fill('')); inputRefs.current[0]?.focus()
    try { await authService.forgotPassword(email) } catch {}
  }

  // Step 3: New password form
  const pwForm = useForm<{ new_password: string; confirm_password: string }>({ resolver: zodResolver(passwordSchema) })
  async function handlePasswordSubmit(data: { new_password: string }) {
    setServerError(null)
    try {
      await authService.confirmResetPassword(resetToken, data.new_password)
      setStep('success')
    } catch (err) { setServerError(getErrorMessage(err, 'Reset failed. The link may have expired.')) }
  }

  const filledCount = digits.filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* ── Step 1: Email ───────────────────── */}
      {step === 'email' && (
        <>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Reset your password</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send a 6-digit code.</p>
          </div>
          {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} noValidate className="space-y-4">
            <Input label="Email address" type="email" autoComplete="email" placeholder="you@clinic.com"
              icon={<Mail size={15} />} error={emailForm.formState.errors.email?.message} {...emailForm.register('email')} />
            <Button type="submit" fullWidth size="lg" loading={emailForm.formState.isSubmitting}>
              Send reset code <ArrowRight size={16} />
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500">Remembered it? <Link to="/login" className="font-medium hover:underline" style={{ color: '#c49526' }}>Back to sign in</Link></p>
        </>
      )}

      {/* ── Step 2: OTP ─────────────────────── */}
      {step === 'otp' && (
        <>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Enter reset code</h2>
            <p className="mt-2 text-sm text-slate-500">We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>. It expires in 5 minutes.</p>
          </div>
          {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}
          <div className="flex items-center justify-center gap-2.5">
            {digits.map((digit, i) => (
              <input key={i} ref={el => { inputRefs.current[i] = el }}
                type="text" inputMode="numeric" maxLength={1} value={digit} disabled={otpLoading}
                onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)}
                onPaste={i === 0 ? handleOtpPaste : undefined} aria-label={`Digit ${i+1}`}
                className={cn('h-14 w-12 rounded-xl border-2 text-center text-xl font-bold transition-all focus:outline-none bg-white',
                  digit ? 'text-slate-900' : 'text-slate-300', serverError && 'border-red-400 bg-red-50')}
                style={{ borderColor: serverError ? '#f87171' : digit ? '#c49526' : i === filledCount ? '#c49526' : '#d1d5db',
                  boxShadow: !serverError && (digit || i === filledCount) ? '0 0 0 3px rgba(196,149,38,0.12)' : 'none' }} />
            ))}
          </div>
          {otpLoading && <p className="text-center text-sm text-slate-500">Verifying…</p>}
          <div className="flex items-center justify-center text-sm text-slate-500">
            <RefreshCw size={13} className="mr-1.5" />
            {cooldown > 0
              ? <span>Resend in <span className="font-semibold" style={{ color: '#c49526' }}>{cooldown}s</span></span>
              : <button type="button" onClick={handleResend} className="font-medium hover:underline" style={{ color: '#c49526' }}>Resend code</button>}
          </div>
          <button type="button" onClick={() => setStep('email')} className="block mx-auto text-xs text-slate-400 hover:underline">← Change email</button>
        </>
      )}

      {/* ── Step 3: New password ────────────── */}
      {step === 'new-password' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1"><KeyRound size={18} style={{ color: '#c49526' }} /><h2 className="text-2xl font-bold text-slate-800">Set new password</h2></div>
            <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>
          </div>
          {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}
          <form onSubmit={pwForm.handleSubmit(handlePasswordSubmit)} noValidate className="space-y-4">
            <Input label="New password" type="password" autoComplete="new-password" placeholder="Create a strong password"
              hint="At least 8 characters, uppercase, number, special character"
              error={pwForm.formState.errors.new_password?.message} {...pwForm.register('new_password')} />
            <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your new password"
              error={pwForm.formState.errors.confirm_password?.message} {...pwForm.register('confirm_password')} />
            <Button type="submit" fullWidth size="lg" loading={pwForm.formState.isSubmitting}>Reset password <ArrowRight size={16} /></Button>
          </form>
        </>
      )}

      {/* ── Step 4: Success ──────────────────── */}
      {step === 'success' && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Password reset</h2>
            <p className="mt-2 text-sm text-slate-500">Your password has been updated. Sign in with your new password.</p>
          </div>
          <Button fullWidth onClick={() => navigate('/login')}>Sign in <ArrowRight size={16} /></Button>
        </div>
      )}
    </div>
  )
}
