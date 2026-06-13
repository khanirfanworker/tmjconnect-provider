import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, RefreshCw, Shield, Copy } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/cn'

// ─── Step types ───────────────────────────────────────────────────────────────
// 1. 'form'        — fill in registration details
// 2. 'verify'      — enter 6-digit email OTP
// 3. 'mfa-setup'   — scan QR code with authenticator app
// 4. 'backup'      — save backup codes

type FlowStep = 'form' | 'verify' | 'mfa-setup' | 'backup'

// ─── Validation ───────────────────────────────────────────────────────────────
const schema = z.object({
  first_name:     z.string().min(1, 'Required').max(50),
  last_name:      z.string().min(1, 'Required').max(50),
  email:          z.string().email('Enter a valid email'),
  date_of_birth:  z.string().min(1, 'Date of birth is required')
    .refine((d) => {
      const date = new Date(d)
      const age  = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      return age >= 18 && age <= 100
    }, 'Must be a valid date of birth'),
  phone:          z.string().optional(),
  license_type:   z.string().min(1, 'Select a credential'),
  specialty:      z.string().min(1, 'Select a specialty'),
  clinic_name:    z.string().min(2, 'Clinic name is required'),
  country:        z.string().min(1, 'Select a country'),
  password:       z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
  agreedToTerms:  z.literal(true, { message: 'You must accept the Terms of Service' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const COUNTRIES = [
  { value: 'US',     label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'India',  label: 'India' },
]

const CREDENTIALS = [
  { value: 'DDS', label: 'DDS' },
  { value: 'DMD', label: 'DMD' },
  { value: 'PT',  label: 'PT'  },
  { value: 'OMS', label: 'OMS' },
  { value: 'MD',  label: 'MD'  },
]
const SPECIALTIES = [
  { value: 'TMJ/Orofacial Pain', label: 'TMJ / Orofacial Pain' },
  { value: 'General Dentistry',  label: 'General Dentistry' },
  { value: 'Orthodontics',       label: 'Orthodontics' },
  { value: 'Oral Surgery',       label: 'Oral Surgery' },
  { value: 'Physical Therapy',   label: 'Physical Therapy' },
  { value: 'Neurology',          label: 'Neurology' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div className="space-y-1.5 mb-8">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">Step {step} of {total}</span>
        <span style={{ color: '#c49526' }} className="font-semibold">{pct}%</span>
      </div>
      <div className="h-0.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: '#c49526' }} />
      </div>
    </div>
  )
}


function DesignSelect({ label, options, error, ...props }: {
  label: string
  options: { value: string; label: string }[]
  error?: string
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <select
          className={cn(
            'w-full appearance-none rounded-lg border bg-white px-3.5 py-3 pr-8',
            'text-sm text-slate-900 transition-colors',
            'focus:outline-none focus:ring-2 focus:border-transparent',
            error ? 'border-red-400' : 'border-slate-300 hover:border-slate-400',
          )}
          {...props}
        >
          <option value="">Select…</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── OTP input — 6 boxes ─────────────────────────────────────────────────────
const OTP_LENGTH = 6

function OtpInput({
  onComplete, error, onClearError,
}: {
  onComplete: (code: string) => void
  error: string | null
  onClearError: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    onClearError()
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1) {
      const code = next.join('')
      if (code.length === OTP_LENGTH) onComplete(code)
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
    if (pasted.length === OTP_LENGTH) onComplete(pasted)
  }

  const filledCount = digits.filter(Boolean).length

  return (
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
          aria-label={`Digit ${i + 1}`}
          className={cn(
            'h-13 w-11 rounded-lg border-2 text-center text-xl font-bold',
            'transition-all duration-100 focus:outline-none bg-white',
            digit ? 'text-slate-900' : 'text-slate-300',
            error ? 'border-red-400 bg-red-50' : '',
          )}
          style={{
            borderColor: error ? '#f87171'
              : digit ? '#c49526'
              : i === filledCount ? '#c49526'
              : '#d1d5db',
            boxShadow: !error && (digit || i === filledCount)
              ? '0 0 0 3px rgba(196,149,38,0.12)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ─── Step: Verify Email ───────────────────────────────────────────────────────
function VerifyEmailStep({
  email,
  onVerified,
}: {
  email: string
  onVerified: (setupToken: string) => void
}) {
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [cooldown, setCooldown]   = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleComplete(code: string) {
    setError(null)
    setLoading(true)
    try {
      // POST /auth/verify-email → returns { mfa_setup_required: true, setup_token }
      const res = await authService.verifyEmail({ email, code })
      onVerified(res.setup_token)
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid or expired code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setCooldown(60)
    try {
      await authService.resendVerifyEmail(email)
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-slate-700">{email}</span>.
          Enter it below to verify your account.
        </p>
      </div>

      {error && <Alert message={error} onDismiss={() => setError(null)} />}

      <OtpInput
        onComplete={handleComplete}
        error={error}
        onClearError={() => setError(null)}
      />

      {loading && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300"
            style={{ borderTopColor: '#c49526' }} />
          Verifying…
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-slate-500">
          <RefreshCw size={13} />
          {cooldown > 0 ? (
            <span>Resend in <span className="font-semibold tabular-nums"
              style={{ color: '#c49526' }}>
              {String(cooldown).padStart(2, '0')}s
            </span></span>
          ) : (
            <button type="button" onClick={handleResend}
              className="font-medium hover:underline" style={{ color: '#c49526' }}>
              Resend code
            </button>
          )}
        </div>
        <Link to="/login" className="text-slate-400 hover:text-slate-600 text-xs">
          Back to sign in
        </Link>
      </div>

      <div className="rounded-xl border px-4 py-3"
        style={{ backgroundColor: '#fdf8ec', borderColor: '#e8d5a0' }}>
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Didn't receive it?</span>{' '}
          Check your spam folder or click "Resend code" above.
        </p>
      </div>
    </div>
  )
}

// ─── Step: MFA Setup ─────────────────────────────────────────────────────────
function MfaSetupStep({
  setupToken,
  onComplete,
}: {
  setupToken: string
  onComplete: (backupCodes: string[], accessToken: string, refreshToken: string) => void
}) {
  const [qrUri, setQrUri]         = useState<string | null>(null)
  const [secret, setSecret]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)

  // Load QR code on mount
  useEffect(() => {
    authService.initMfaSetup(setupToken)
      .then(res => { setQrUri(res.qr_uri); setSecret(res.secret) })
      .catch(() => setError('Failed to initialize MFA setup. Please try again.'))
  }, [setupToken])

  function copySecret() {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleComplete(code: string) {
    setError(null)
    setLoading(true)
    try {
      // POST /auth/mfa/verify-setup → returns backup_codes + access_token + refresh_token
      const res = await authService.verifyMfaSetup(setupToken, code)
      onComplete(res.backup_codes, res.access_token, res.refresh_token)
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid code. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Set up two-factor authentication</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          HIPAA §164.312(a) requires MFA for all provider accounts.
          Scan the QR code with Google Authenticator, Authy, or 1Password.
        </p>
      </div>

      {error && <Alert message={error} onDismiss={() => setError(null)} />}

      {/* QR code display */}
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200
                      bg-slate-50 p-6">
        {qrUri ? (
          <>
            {/* Render QR as an image using a QR API — avoids external lib */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUri)}`}
              alt="MFA QR Code"
              className="rounded-lg"
              width={160}
              height={160}
            />
            <p className="text-xs text-slate-500 text-center">
              Can't scan? Enter this key manually in your authenticator app:
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200
                            bg-white px-4 py-2">
              <code className="text-sm font-mono font-semibold text-slate-800 tracking-wider">
                {secret}
              </code>
              <button onClick={copySecret} className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Copy secret">
                <Copy size={14} />
              </button>
              {copied && <span className="text-xs text-green-600">Copied!</span>}
            </div>
          </>
        ) : (
          <div className="flex h-40 w-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200"
              style={{ borderTopColor: '#c49526' }} />
          </div>
        )}
      </div>

      {/* Enter TOTP code to confirm setup */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">
          Enter the 6-digit code from your authenticator app to confirm setup:
        </p>
        <OtpInput
          onComplete={handleComplete}
          error={error}
          onClearError={() => setError(null)}
        />
        {loading && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300"
              style={{ borderTopColor: '#c49526' }} />
            Verifying…
          </p>
        )}
      </div>

      <div className="rounded-xl border px-4 py-3"
        style={{ backgroundColor: '#fdf8ec', borderColor: '#e8d5a0' }}>
        <div className="flex items-start gap-2.5">
          <Shield size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#c49526' }} />
          <p className="text-xs text-slate-600">
            <span className="font-semibold">MFA cannot be disabled</span> for provider accounts
            per HIPAA safety policy.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Backup Codes ───────────────────────────────────────────────────────
function BackupCodesStep({
  codes,
  onDone,
}: {
  codes: string[]
  onDone: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied]       = useState(false)

  function copyAll() {
    navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Save your backup codes</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          These 10 codes can each be used once if you lose access to your authenticator.
          <strong className="text-slate-700"> They will never be shown again.</strong>
        </p>
      </div>

      {/* Backup codes grid */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {codes.map((code) => (
            <code key={code}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2
                         text-sm font-mono font-semibold text-slate-800 text-center
                         tracking-wider">
              {code}
            </code>
          ))}
        </div>
        <button onClick={copyAll}
          className="flex w-full items-center justify-center gap-2 rounded-lg border
                     border-slate-200 bg-white px-3 py-2 text-xs font-semibold
                     text-slate-600 hover:bg-slate-50 transition-colors">
          <Copy size={13} />
          {copied ? 'Copied to clipboard!' : 'Copy all codes'}
        </button>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
          style={{ accentColor: '#c49526' }}
        />
        <span className="text-sm text-slate-600 leading-snug">
          I've saved these backup codes in a secure location.
          I understand they'll never be shown again.
        </span>
      </label>

      <Button fullWidth size="lg" disabled={!confirmed} onClick={onDone}>
        Go to dashboard <ArrowRight size={16} />
      </Button>
    </div>
  )
}

// ─── Main RegisterPage ────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setTokens, setProvider, setMfaVerified } = useAuthStore()

  // Form steps (registration form only)
  const [formStep, setFormStep]       = useState(1)
  // Overall flow step
  const [flowStep, setFlowStep]       = useState<FlowStep>('form')
  const [serverError, setServerError] = useState<string | null>(null)

  // State passed between steps
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [setupToken, setSetupToken]           = useState('')
  const [backupCodes, setBackupCodes]         = useState<string[]>([])

  const { register, handleSubmit, trigger, control,
    formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function nextFormStep() {
    const valid = await trigger([
      'first_name', 'last_name', 'email', 'date_of_birth',
      'license_type', 'specialty', 'clinic_name', 'country',
    ])
    if (valid) setFormStep(2)
  }

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      // POST /auth/provider/register
      await authService.register({
        first_name:    data.first_name,
        last_name:     data.last_name,
        email:         data.email,
        date_of_birth: data.date_of_birth,
        phone:         data.phone || undefined,
        license_type:  data.license_type,
        specialty:     data.specialty,
        clinic_name:   data.clinic_name,
        country:       data.country,
        password:      data.password,
      })
      // Move to verify email step immediately
      setRegisteredEmail(data.email)
      setFlowStep('verify')
    } catch (err) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'))
    }
  }

  function handleEmailVerified(token: string) {
    setSetupToken(token)
    setFlowStep('mfa-setup')
  }

  function handleMfaSetupComplete(
    codes: string[],
    accessToken: string,
    refreshToken: string,
  ) {
    // Store tokens — provider is now fully authenticated
    setTokens(accessToken, refreshToken)
    setBackupCodes(codes)
    setFlowStep('backup')
  }

  async function handleBackupDone() {
    // Fetch provider profile then go to dashboard
    try {
      const { profileService } = await import('@/services/profileService')
      const provider = await profileService.getProfile()
      setProvider(provider)
    } catch {
      // Profile fetch failed — still proceed, dashboard will retry
    }
    setMfaVerified(true)
    navigate('/dashboard', { replace: true })
  }

  // ── Render flow step ───────────────────────────────────────────────────────

  if (flowStep === 'verify') {
    return (
      <VerifyEmailStep
        email={registeredEmail}
        onVerified={handleEmailVerified}
      />
    )
  }

  if (flowStep === 'mfa-setup') {
    return (
      <MfaSetupStep
        setupToken={setupToken}
        onComplete={handleMfaSetupComplete}
      />
    )
  }

  if (flowStep === 'backup') {
    return (
      <BackupCodesStep
        codes={backupCodes}
        onDone={handleBackupDone}
      />
    )
  }

  // ── Registration form ──────────────────────────────────────────────────────

  return (
    <div>
      <StepBar step={formStep} total={2} />

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Tell us about you and your practice. We'll verify your credentials before granting access.
          </p>
        </div>

        {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* ── Step 1: Professional info ────────────────────── */}
          {formStep === 1 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input label="First name *" placeholder="Michael"
                  error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Last name *" placeholder="Chen"
                  error={errors.last_name?.message} {...register('last_name')} />
              </div>

              <Input label="Work email *" type="email"
                placeholder="m.chen@westsidedental.com"
                hint="We'll send a verification code to this address."
                error={errors.email?.message} {...register('email')} />

              <Input
                label="Date of birth *"
                type="date"
                hint="Required for account verification"
                error={errors.date_of_birth?.message}
                {...register('date_of_birth')}
              />

              <Input label="Phone (optional)" type="tel"
                placeholder="+1 (415) 555-0198"
                hint="E.164 format — used as SMS MFA fallback"
                error={errors.phone?.message}
                {...register('phone')} />

              <div className="flex gap-3">
                <DesignSelect label="Credential *" options={CREDENTIALS}
                  error={errors.license_type?.message} {...register('license_type')} />
                <DesignSelect label="Specialty *" options={SPECIALTIES}
                  error={errors.specialty?.message} {...register('specialty')} />
              </div>

              <Input label="Clinic / Practice name *"
                placeholder="Westside Dental & Orofacial Center"
                error={errors.clinic_name?.message} {...register('clinic_name')} />

              <DesignSelect label="Country *" options={COUNTRIES}
                error={errors.country?.message} {...register('country')} />

              <Button type="button" fullWidth size="lg" onClick={nextFormStep} className="mt-2">
                Continue to security setup <ArrowRight size={16} />
              </Button>

              <p className="text-center text-sm text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: '#c49526' }}>
                  Sign in →
                </Link>
              </p>
            </div>
          )}

          {/* ── Step 2: Password + Terms ──────────────────────── */}
          {formStep === 2 && (
            <div className="space-y-4">
              <Input label="Password *" type="password" autoComplete="new-password"
                placeholder="Create a strong password"
                hint="At least 8 characters, one uppercase, one number, one special character"
                error={errors.password?.message} {...register('password')} />

              <Input label="Confirm password *" type="password" autoComplete="new-password"
                placeholder="Repeat your password"
                error={errors.confirmPassword?.message} {...register('confirmPassword')} />

              <Controller
                name="agreedToTerms"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked || undefined)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        style={{ accentColor: '#c49526' }} />
                      <span className="text-sm text-slate-600 leading-snug">
                        I agree to the{' '}
                        <Link to="/terms" className="font-medium hover:underline" style={{ color: '#c49526' }}>
                          Terms of Service
                        </Link>{' '}and{' '}
                        <Link to="/privacy" className="font-medium hover:underline" style={{ color: '#c49526' }}>
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.agreedToTerms && (
                      <p className="text-xs text-red-600 pl-6">{errors.agreedToTerms.message}</p>
                    )}
                  </div>
                )}
              />

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" size="lg"
                  onClick={() => setFormStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button type="submit" size="lg" loading={isSubmitting} className="flex-1">
                  Create account <ArrowRight size={16} />
                </Button>
              </div>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: '#c49526' }}>
                  Sign in →
                </Link>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
