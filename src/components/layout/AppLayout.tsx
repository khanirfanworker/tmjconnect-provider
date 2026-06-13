import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useSessionTimeout()

  // Fetch provider profile if missing (handles page refresh)
  const { provider, setProvider, accessToken } = useAuthStore()
  useEffect(() => {
    if (accessToken && !provider) {
      api.get('/providers/me')
        .then(({ data }) => {
          const p = data?.data ?? data
          if (p) {
            setProvider({
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
        })
        .catch(() => { /* non-critical — sidebar will show fallback */ })
    }
  }, [accessToken, provider, setProvider])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">

      {/* Offline banner — full width at very top, matches design */}
      <OfflineBanner />

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-30 flex lg:hidden">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Topbar
            onMenuClick={() => setSidebarOpen((prev) => !prev)}
            sidebarOpen={sidebarOpen}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

    </div>
  )
}
