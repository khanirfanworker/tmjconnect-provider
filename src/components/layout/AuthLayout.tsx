import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * AuthLayout — matches design exactly:
 * Left panel:  dark navy #0e2040 with gold logo, serif hero, bullet points
 * Right panel: warm off-white #f5f3ef, centered form
 */
export function AuthLayout() {
  const { isAuthenticated, mfaVerified, accessToken } = useAuthStore()

  if (isAuthenticated && mfaVerified && accessToken) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen">

      {/* ── LEFT: Dark navy branding panel — 50% ───────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col flex-shrink-0"
        style={{ backgroundColor: '#0e2040' }}
      >
        {/* Inner content with consistent padding */}
        <div className="flex flex-col h-full px-10 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0"
              style={{ borderColor: '#c49526' }}
            >
              {/* Tooth / jaw icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3C9.5 3 7 5 7 8c0 1.5.5 3 1.5 4L9 17c0 .6.4 1 1 1h4c.6 0
                     1-.4 1-1l.5-5C16.5 11 17 9.5 17 8c0-3-2.5-5-5-5z"
                  fill="#c49526"
                />
                <path d="M10 18v2.5M14 18v2.5" stroke="#c49526" strokeWidth="1.5"
                      strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg leading-none" style={{ color: '#c49526' }}>
                TMJConnect
              </p>
              <p className="text-xs tracking-widest uppercase mt-0.5"
                 style={{ color: '#c49526', opacity: 0.7, fontSize: '9px' }}>
                Provider Portal
              </p>
            </div>
          </div>

          {/* Main content — pushed to middle vertically */}
          <div className="flex-1 flex flex-col justify-center space-y-8">
            {/* Page-aware slot — child pages can override this via context if needed.
                For now shows the default copy that works for all auth pages. */}
            <AuthPanelContent />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {['© 2026 Orofacial Health', 'HIPAA Compliant', 'SOC 2 Type II'].map((item, i) => (
              <span key={item} className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}
                {item}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* ── RIGHT: Warm off-white form panel — 50% ─────────────────── */}
      <div
        className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-16"
        style={{ backgroundColor: '#f5f3ef' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2"
               style={{ borderColor: '#c49526', backgroundColor: '#0e2040' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C9.5 3 7 5 7 8c0 1.5.5 3 1.5 4L9 17c0 .6.4 1 1 1h4c.6
                       0 1-.4 1-1l.5-5C16.5 11 17 9.5 17 8c0-3-2.5-5-5-5z"
                    fill="#c49526"/>
            </svg>
          </div>
          <span className="font-bold text-lg" style={{ color: '#0e2040' }}>TMJConnect</span>
        </div>

        {/* Page form */}
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </div>

    </div>
  )
}

/** Left panel copy — rotates context per auth screen */
function AuthPanelContent() {
  return (
    <div className="space-y-8">
      {/* Eyebrow */}
      <p className="text-xs font-semibold tracking-[0.2em] uppercase"
         style={{ color: '#c49526' }}>
        Care beyond the chair
      </p>

      {/* Hero heading — serif italic matches design */}
      <div>
        <h1 className="text-3xl xl:text-4xl font-bold leading-tight text-white">
          See every patient.{' '}
          <br />
          Between{' '}
          <em className="not-italic font-bold" style={{ color: '#c49526', fontStyle: 'italic' }}>
            every visit.
          </em>
        </h1>
      </div>

      {/* Body */}
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
        Real-time visibility into your patients' pain trends, exercise
        adherence, and clinical reports — all in one HIPAA-compliant workspace.
      </p>

      {/* Divider */}
      <div className="w-8 h-px" style={{ backgroundColor: '#c49526' }} />

      {/* Quote */}
      <blockquote className="space-y-2 border-l-2 pl-4" style={{ borderColor: 'rgba(196,149,38,0.4)' }}>
        <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
          "TMJConnect changed how I follow up with post-op patients.
          I catch issues days earlier than I used to."
        </p>
        <footer className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: '#c49526', opacity: 0.8 }}>
          — Dr. Michael Chen · TMJ Specialist
        </footer>
      </blockquote>
    </div>
  )
}
