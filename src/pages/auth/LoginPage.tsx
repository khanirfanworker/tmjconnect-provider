import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Shield, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { authService, getErrorMessage } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setMfaPending, setMfaToken } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)
  const reason = new URLSearchParams(location.search).get('reason')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      // POST /auth/provider/login → { mfa_required, mfa_token }
      const res = await authService.login({ email: data.email, password: data.password })
      if (res.mfa_required && res.mfa_token) {
        setMfaToken(res.mfa_token)
        setMfaPending(true)
        navigate('/mfa', { state: { redirectTo: from } })
      }
    } catch (err) {
      setServerError(getErrorMessage(err, 'Invalid email or password.'))
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
        <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your provider dashboard.</p>
      </div>
      {reason === 'timeout' && <Alert variant="warning" title="Session expired" message="You were signed out after 15 minutes of inactivity." />}
      {serverError && <Alert message={serverError} onDismiss={() => setServerError(null)} />}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Work email" type="email" autoComplete="email" placeholder="m.chen@westsidedental.com" icon={<Mail size={15} />} error={errors.email?.message} {...register('email')} />
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#c49526' }}>Forgot password?</Link>
          </div>
          <Input type="password" autoComplete="current-password" placeholder="••••••••••••" icon={<Lock size={15} />} error={errors.password?.message} {...register('password')} />
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-1">Sign in securely <ArrowRight size={16} /></Button>
      </form>
      <p className="text-center text-sm text-slate-500">New to TMJConnect? <Link to="/register" className="font-semibold hover:underline" style={{ color: '#c49526' }}>Register as a provider →</Link></p>
      <div className="flex items-start gap-3 rounded-xl border px-4 py-3.5" style={{ backgroundColor: '#fdf8ec', borderColor: '#e8d5a0' }}>
        <Shield size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#c49526' }} />
        <p className="text-xs leading-relaxed text-slate-600"><span className="font-semibold text-slate-700">MFA is required</span> for all provider accounts per HIPAA §164.312(a). You'll be asked for a 6-digit code after signing in.</p>
      </div>
    </div>
  )
}
