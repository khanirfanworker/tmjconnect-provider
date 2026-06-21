import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTourStore } from '@/store/tourStore'

interface TourStep {
  target: string | null   // CSS selector; null = centered welcome/finish card, no spotlight
  placement: 'right' | 'bottom' | 'left' | 'top' | 'center'
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    target: null,
    placement: 'center',
    title: 'Welcome to TMJConnect',
    body: "Here's a 60-second look at where everything lives. Skip anytime — you can always restart this from Help & Support.",
  },
  {
    target: '[data-tour="nav-dashboard"]',
    placement: 'right',
    title: 'Your Dashboard',
    body: 'A quick pulse-check on every patient — who needs attention, recent activity, and adherence trends.',
  },
  {
    target: '[data-tour="stat-cards"]',
    placement: 'bottom',
    title: 'Live stats',
    body: 'These update in real time: active patients, reports awaiting a response, urgent cases, and exercise adherence.',
  },
  {
    target: '[data-tour="invite-button"]',
    placement: 'bottom',
    title: 'Add your first patient',
    body: "Generate a one-time invite code here — your patient enters it in the TMJConnect mobile app to link to you.",
  },
  {
    target: '[data-tour="nav-patients"]',
    placement: 'right',
    title: 'Patients',
    body: 'Every linked patient lives here. Open one to see symptom logs, exercise adherence, and report history.',
  },
  {
    target: '[data-tour="nav-reports"]',
    placement: 'right',
    title: 'Reports',
    body: 'Patient symptom reports land here, sorted by urgency, so you never miss a flare-up.',
  },
  {
    target: '[data-tour="nav-exercises"]',
    placement: 'right',
    title: 'Exercise Library',
    body: 'Browse the exercise video library and assign any exercise to a patient with a custom frequency.',
  },
  {
    target: '[data-tour="nav-invite"]',
    placement: 'right',
    title: 'Invite & Link',
    body: 'Manage every invite code and active patient link from here.',
  },
  {
    target: null,
    placement: 'center',
    title: "You're all set",
    body: 'That covers the essentials. Revisit this tour anytime from Help & Support.',
  },
]

interface Rect { top: number; left: number; width: number; height: number }

const TOOLTIP_W = 320
const GAP = 16
const PAD = 8

export function ProductTour() {
  const { provider, tourCompletedIds, markTourCompleted } = useAuthStore()
  const { active, stepIndex, start, next, back, close } = useTourStore()
  const location = useLocation()
  const [rect, setRect] = useState<Rect | null>(null)
  const autoStartedRef = useRef(false)

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  // Auto-start once per provider, only once they've landed on the Dashboard.
  useEffect(() => {
    if (autoStartedRef.current) return
    if (!provider) return
    if (location.pathname !== '/dashboard') return
    if (tourCompletedIds.includes(provider.id)) return
    // Only flip the ref once the timer actually fires — StrictMode's mount→cleanup→
    // remount cycle would otherwise cancel this timer and then see the ref already
    // true on the second pass, silently dropping the auto-start altogether.
    const t = window.setTimeout(() => {
      autoStartedRef.current = true
      start()
    }, 700)
    return () => window.clearTimeout(t)
  }, [provider, tourCompletedIds, location.pathname, start])

  function finish() {
    close()
    if (provider) markTourCompleted(provider.id)
  }

  function handleNext() {
    if (isLast) { finish(); return }
    next()
  }

  // Measure the current step's target element; re-measure on resize/scroll.
  useLayoutEffect(() => {
    if (!active) return
    const selector = step.target
    if (!selector) { setRect(null); return }

    function measure() {
      const el = document.querySelector(selector!)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) { setRect(null); return }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    const el = document.querySelector(selector)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    measure()
    const settleTimer = window.setTimeout(measure, 350)

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(settleTimer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, stepIndex, step.target])

  // If a step's target never appears (e.g. mobile drawer closed), skip it rather than stall.
  useEffect(() => {
    if (!active || !step.target) return
    const t = window.setTimeout(() => {
      if (!document.querySelector(step.target!)) handleNext()
    }, 600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex])

  // Keyboard controls
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex])

  if (!active) return null

  const spot = rect ? {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  } : null

  let tooltipStyle: CSSProperties
  if (!spot) {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else {
    const vw = window.innerWidth, vh = window.innerHeight
    switch (step.placement) {
      case 'right':
        tooltipStyle = { top: Math.min(spot.top, vh - 260), left: Math.min(spot.left + spot.width + GAP, vw - TOOLTIP_W - 16) }
        break
      case 'left':
        tooltipStyle = { top: Math.min(spot.top, vh - 260), left: Math.max(spot.left - TOOLTIP_W - GAP, 16) }
        break
      case 'bottom':
        tooltipStyle = { top: Math.min(spot.top + spot.height + GAP, vh - 240), left: Math.min(Math.max(spot.left, 16), vw - TOOLTIP_W - 16) }
        break
      case 'top':
        tooltipStyle = { top: Math.max(spot.top - GAP, 16), left: Math.min(Math.max(spot.left, 16), vw - TOOLTIP_W - 16), transform: 'translateY(-100%)' }
        break
      default:
        tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dimmed backdrop with a rounded cutout around the spotlighted element */}
      <svg className="absolute inset-0" width="100%" height="100%" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect x={spot.left} y={spot.top} width={spot.width} height={spot.height} rx="14" fill="black" />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(14,32,64,0.65)" mask="url(#tour-spotlight-mask)" />
      </svg>

      {/* Glowing ring around the spotlighted element */}
      {spot && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            top: spot.top, left: spot.left, width: spot.width, height: spot.height,
            boxShadow: '0 0 0 2px #c49526, 0 0 0 6px rgba(196,149,38,0.25)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute rounded-2xl bg-white shadow-2xl p-5 transition-all duration-300"
        style={{ ...tooltipStyle, width: TOOLTIP_W }}
      >
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-slate-300 hover:text-slate-500"
          aria-label="Skip tour"
        >
          <X size={16} />
        </button>

        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#c49526' }}>
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h3 className="text-base font-bold text-slate-900 mb-1.5 pr-4">{step.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{step.body}</p>

        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={back}
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ backgroundColor: '#c49526', color: '#0e2040' }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i <= stepIndex ? '#c49526' : '#e2e8f0' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
