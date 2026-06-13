import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  // Fix 3: gold bg + NAVY text (#0e2040), not white
  primary:
    'font-semibold shadow-sm hover:shadow hover:brightness-105 active:brightness-95 ' +
    'disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed',
  secondary:
    'bg-white text-slate-800 border border-slate-300 ' +
    'hover:bg-slate-50 active:bg-slate-100 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'bg-transparent text-white border border-white/40 ' +
    'hover:bg-white/10 active:bg-white/20 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'text-slate-600 hover:bg-slate-100 active:bg-slate-200 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm:  'h-9  px-4   text-sm  gap-1.5',
  md:  'h-11 px-5   text-sm  gap-2',
  lg:  'h-12 px-6   text-[15px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false,
     className, children, disabled, style, ...props }, ref) => {

    // Primary gets gold bg + navy text inline (most reliable)
    const primaryStyle = variant === 'primary'
      ? { backgroundColor: '#c49526', color: '#0e2040', ...style }
      : style

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={primaryStyle}
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-offset-2 select-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 size={15} className="animate-spin flex-shrink-0" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
