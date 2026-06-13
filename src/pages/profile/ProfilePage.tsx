import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, CheckCircle2, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { profileService } from '@/services/profileService'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { SettingsNav } from './components/SettingsNav'
import { cn } from '@/lib/cn'

const schema = z.object({
  first_name:     z.string().min(1, 'Required'),
  last_name:      z.string().min(1, 'Required'),
  clinic_name:    z.string().min(1, 'Required'),
  specialty:      z.string().min(1, 'Required'),
  license_number: z.string().optional(),
  license_type:   z.string().optional(),
  timezone:       z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
})
type FormData = z.infer<typeof schema>

const SPECIALTIES = [
  'Orofacial Pain', 'TMJ Disorders', 'General Dentistry',
  'Orthodontics', 'Oral Surgery', 'Physical Therapy', 'Neurology',
]

export default function ProfilePage() {
  const { provider, setProvider } = useAuthStore()
  const queryClient = useQueryClient()
  const avatarRef   = useRef<HTMLInputElement>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null)

  // Load real profile from API
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  profileService.getProfile,
  })

  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      values: profile ? {
        first_name:     profile.first_name     ?? '',
        last_name:      profile.last_name      ?? '',
        clinic_name:    profile.clinic_name    ?? '',
        specialty:      profile.specialty      ?? '',
        license_number: profile.license_number ?? '',
        license_type:   profile.license_type   ?? '',
        timezone:       profile.timezone       ?? '',
        city:           profile.city           ?? '',
        state:          profile.state          ?? '',
      } : undefined,
    })

  // Save profile mutation — also uploads avatar if one is pending
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      let avatarUrl: string | undefined
      if (pendingAvatar) {
        avatarUrl = await profileService.uploadAvatar(pendingAvatar)
      }
      return profileService.updateProfile({ ...data, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], (prev: Record<string, unknown>) => ({ ...prev, ...updated }))
      if (provider) {
        setProvider({
          ...provider,
          fullName:    `${updated.first_name ?? ''} ${updated.last_name ?? ''}`.trim(),
          clinicName:  updated.clinic_name ?? provider.clinicName,
          specialties: updated.specialty ? [updated.specialty] : provider.specialties,
          avatarUrl:   updated.avatar_url ?? provider.avatarUrl,
        })
      }
      setPendingAvatar(null)
      setPendingAvatarPreview(null)
      reset({}, { keepValues: true })
    },
  })

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : provider?.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    ?? 'P'

  const avatarUrl = pendingAvatarPreview ?? profile?.avatar_url ?? provider?.avatarUrl

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <SettingsNav />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit((data) => saveMutation.mutateAsync(data))}>
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">Profile</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Shown on your patient-facing profile card.
                  </p>
                </div>

                <div className="px-6 py-5 space-y-5">

                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar"
                             className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full
                                        text-white text-xl font-bold"
                             style={{ backgroundColor: '#c49526' }}>
                          {initials}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => avatarRef.current?.click()}
                        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center
                                   justify-center rounded-full border-2 border-white bg-slate-700
                                   text-white hover:bg-slate-600 transition-colors"
                      >
                        <Camera size={11} />
                      </button>
                      <input
                        ref={avatarRef} type="file" accept="image/jpeg,image/png" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          if (!['image/jpeg', 'image/png'].includes(f.type)) {
                            alert('Only JPEG and PNG images are supported.')
                            e.target.value = ''
                            return
                          }
                          setPendingAvatar(f)
                          setPendingAvatarPreview(URL.createObjectURL(f))
                          e.target.value = ''
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{profile?.email ?? provider?.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Click the camera to update your photo
                      </p>
                    </div>
                  </div>

                  {saveMutation.isSuccess && (
                    <Alert variant="success" message="Profile saved successfully." />
                  )}
                  {saveMutation.isError && (
                    <Alert message={
                      (saveMutation.error as { response?: { data?: { error?: { message?: string } } } })
                        ?.response?.data?.error?.message
                      ?? 'Failed to save profile. Please try again.'
                    } />
                  )}

                  {/* Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="First name *" error={errors.first_name?.message}
                           {...register('first_name')} />
                    <Input label="Last name *" error={errors.last_name?.message}
                           {...register('last_name')} />
                  </div>

                  {/* Email — read only */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Email <span className="text-slate-400 font-normal">· login identifier</span>
                    </label>
                    <div className="relative">
                      <input
                        readOnly
                        value={profile?.email ?? provider?.email ?? ''}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50
                                   px-3.5 py-3 pr-24 text-sm text-slate-500 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center
                                       gap-1 text-xs font-semibold text-green-600">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    </div>
                  </div>

                  {/* License */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        License number <span className="text-slate-400 font-normal">· locked</span>
                      </label>
                      <div className="relative">
                        <input
                          readOnly
                          value={profile?.license_number ?? provider?.licenseNumber ?? ''}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50
                                     px-3.5 py-3 pr-10 text-sm text-slate-400 cursor-not-allowed font-mono"
                        />
                        <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">License type</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                                   text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                        placeholder="DDS, MD, PT…"
                        {...register('license_type')}
                      />
                    </div>
                  </div>

                  {/* Practice */}
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4">Practice & specialty</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Clinic name *" error={errors.clinic_name?.message}
                             placeholder="Bayshore Jaw & Pain Clinic"
                             {...register('clinic_name')} />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700">Specialty *</label>
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3
                                     text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                          {...register('specialty')}
                        >
                          <option value="">Select…</option>
                          {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.specialty && (
                          <p className="text-xs text-red-600">{errors.specialty.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="City" placeholder="San Francisco"
                           {...register('city')} />
                    <Input label="State" placeholder="CA"
                           {...register('state')} />
                  </div>

                  {/* Timezone */}
                  <Input label="Timezone" placeholder="America/Los_Angeles"
                         {...register('timezone')} />
                </div>
              </div>

              {/* Save bar */}
              {(isDirty || !!pendingAvatar || saveMutation.isSuccess) && (
                <div className={cn(
                  'mt-4 flex items-center justify-between rounded-xl border px-5 py-3',
                  saveMutation.isSuccess
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200',
                )}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn(
                      'h-2 w-2 rounded-full',
                      saveMutation.isSuccess ? 'bg-green-500' : 'bg-amber-500'
                    )} />
                    <span className={saveMutation.isSuccess ? 'text-green-800' : 'text-amber-800'}>
                      {saveMutation.isSuccess ? 'Changes saved.' : 'You have unsaved changes.'}
                    </span>
                  </div>
                  {!saveMutation.isSuccess && (
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={() => { reset(); setPendingAvatar(null); setPendingAvatarPreview(null) }}>
                        Discard
                      </Button>
                      <Button size="sm" type="submit" loading={isSubmitting || saveMutation.isPending}>
                        Save changes
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
