import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Camera } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { profileService } from '@/services/profileService'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  fullName:      z.string().min(2, 'Required'),
  clinicName:    z.string().min(2, 'Required'),
  licenseNumber: z.string().min(3, 'Required'),
  specialty:     z.string().min(1, 'Required'),
})
type FormData = z.infer<typeof schema>

const SPECIALTIES = [
  'Orofacial Pain', 'TMJ Disorders', 'General Dentistry',
  'Orthodontics', 'Oral Surgery', 'Physical Therapy', 'Neurology',
]

export function ProfileTab() {
  const { provider, setProvider } = useAuthStore()
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName:      provider?.fullName ?? '',
      clinicName:    provider?.clinicName ?? '',
      licenseNumber: provider?.licenseNumber ?? '',
      specialty:     provider?.specialties?.[0] ?? '',
    },
  })

  const initials = provider?.fullName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'P'

  async function onSubmit(data: FormData) {
    setError(null); setSaved(false)
    try {
      const nameParts = (data.fullName || '').trim().split(' ')
      await profileService.updateProfile({
        first_name: nameParts[0] ?? '',
        last_name: nameParts.slice(1).join(' ') || nameParts[0],
        clinic_name: data.clinicName,
        specialty: data.specialty,
      })
      if (provider) {
        setProvider({ ...provider, fullName: data.fullName, clinicName: data.clinicName, specialties: [data.specialty] })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save changes. Please try again.')
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full
                          text-white text-xl font-bold"
               style={{ backgroundColor: '#c49526' }}>
            {initials}
          </div>
          <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center
                             justify-center rounded-full border-2 border-white bg-slate-700
                             text-white hover:bg-slate-600 transition-colors">
            <Camera size={11} />
          </button>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{provider?.fullName}</p>
          <p className="text-sm text-slate-500">{provider?.email}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-medium">Credentials verified</span>
          </div>
        </div>
      </div>

      {saved && <Alert variant="success" message="Profile updated successfully." />}
      {error && <Alert message={error} onDismiss={() => setError(null)} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
        <Input label="Clinic / Practice name" error={errors.clinicName?.message} {...register('clinicName')} />
        <Input label="License number" error={errors.licenseNumber?.message}
               hint="Displayed on your provider profile"
               {...register('licenseNumber')} />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Primary specialty</label>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                             text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                  {...register('specialty')}>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.specialty && <p className="text-xs text-red-600">{errors.specialty.message}</p>}
        </div>

        {/* Read-only email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Email address</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200
                          bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
            {provider?.email}
            <span className="ml-auto text-xs text-slate-400">Cannot be changed</span>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting}>
          {saved ? <><CheckCircle2 size={14} /> Saved</> : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
