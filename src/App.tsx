import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AuthInitializer } from '@/components/layout/AuthInitializer'
import NotFoundPage from '@/pages/NotFoundPage'

// Auth
const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage    = lazy(() => import('@/pages/auth/RegisterPage'))
const MfaPage         = lazy(() => import('@/pages/auth/MfaPage'))
const MfaSetupPage    = lazy(() => import('@/pages/auth/MfaSetupPage'))
const ForgotPassword  = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPassword   = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// App
const DashboardPage   = lazy(() => import('@/pages/dashboard/DashboardPage'))
const PatientsPage    = lazy(() => import('@/pages/patients/PatientsPage'))
const PatientDetail   = lazy(() => import('@/pages/patients/PatientDetailPage'))
const ReportsPage       = lazy(() => import('@/pages/reports/ReportsPage'))
const ReportDetailPage  = lazy(() => import('@/pages/reports/ReportDetailPage'))
const ExercisesPage   = lazy(() => import('@/pages/exercises/ExercisesPage'))
const OnboardingPage  = lazy(() => import('@/pages/onboarding/OnboardingPage'))
const InvitePage      = lazy(() => import('@/pages/invite/InvitePage'))
const HelpPage        = lazy(() => import('@/pages/help/HelpPage'))

// Settings
const AnalyticsPage       = lazy(() => import('@/pages/analytics/AnalyticsPage'))

// Settings
const ProfilePage         = lazy(() => import('@/pages/profile/ProfilePage'))
const SecurityPage        = lazy(() => import('@/pages/profile/SecurityPage'))
const NotificationsPage   = lazy(() => import('@/pages/profile/NotificationsPage'))
const DeleteAccountPage   = lazy(() => import('@/pages/profile/DeleteAccountPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
})

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: '#f5f3ef' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200"
             style={{ borderTopColor: '#c49526' }} />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth */}
            <Route element={<AuthLayout />}>
              <Route path="/login"            element={<LoginPage />} />
              <Route path="/register"         element={<RegisterPage />} />
              <Route path="/mfa"              element={<MfaPage />} />
              <Route path="/mfa-setup"        element={<MfaSetupPage />} />
              <Route path="/forgot-password"  element={<ForgotPassword />} />
              <Route path="/reset-password"   element={<ResetPassword />} />
            </Route>

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/onboarding"              element={<OnboardingPage />} />
                <Route path="/dashboard"               element={<DashboardPage />} />
                <Route path="/patients"                element={<PatientsPage />} />
                <Route path="/patients/:id"            element={<PatientDetail />} />
                <Route path="/reports"                 element={<ReportsPage />} />
                <Route path="/reports/:id"            element={<ReportDetailPage />} />
                <Route path="/education"               element={<NotFoundPage />} />
                <Route path="/exercises"               element={<ExercisesPage />} />
                <Route path="/invite"                  element={<InvitePage />} />
                <Route path="/help"                    element={<HelpPage />} />
                <Route path="/profile"                 element={<ProfilePage />} />
                <Route path="/profile/security"        element={<SecurityPage />} />
                <Route path="/profile/notifications"   element={<NotificationsPage />} />
                <Route path="/profile/delete"          element={<DeleteAccountPage />} />
              </Route>
            </Route>

            <Route path="/"   element={<Navigate to="/dashboard" replace />} />
            <Route path="*"   element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
