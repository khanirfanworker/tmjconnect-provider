import { cn } from '@/lib/cn'

interface ToggleProps {
  on: boolean
  locked?: boolean
  onChange: () => void
  size?: 'sm' | 'md'
}

/**
 * Toggle — matches design exactly.
 * ON:  gold (#c49526) track, white thumb
 * OFF: slate-200 track, white thumb
 * LOCKED: disabled pointer, slightly dimmed
 *
 * Key fix: thumb uses precise pixel positioning via inline style
 * to avoid Tailwind translate issues at small sizes.
 */
export function Toggle({ on, locked, onChange, size = 'md' }: ToggleProps) {
  const trackW  = size === 'sm' ? 36 : 44
  const trackH  = size === 'sm' ? 20 : 24
  const thumbSz = size === 'sm' ? 14 : 18
  const thumbOff = 3  // padding from edge
  const thumbOn  = trackW - thumbSz - thumbOff

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={locked ? undefined : onChange}
      className={cn(
        'relative flex-shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-1',
        locked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
      )}
      style={{
        width:  trackW,
        height: trackH,
        backgroundColor: on ? '#c49526' : '#cbd5e1',
      }}
    >
      {/* Thumb */}
      <span
        className="absolute rounded-full bg-white shadow-sm transition-all duration-200"
        style={{
          width:  thumbSz,
          height: thumbSz,
          top:    (trackH - thumbSz) / 2,
          left:   on ? thumbOn : thumbOff,
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}
