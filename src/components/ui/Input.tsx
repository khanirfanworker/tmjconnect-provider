import { forwardRef, InputHTMLAttributes, useState, ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode        // left icon (mail, lock etc — matches design)
  suffix?: ReactNode      // right side element
}

/**
 * Input — matches design exactly:
 * - Thin border, soft rounded corners (not pill)
 * - Icon slot on the left (email uses mail icon, password uses lock)
 * - Password toggle on the right
 * - Error state: red border + red hint text
 * - Clean label above, hint/error below
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const inputId    = id ?? label?.toLowerCase().replace(/\s+/g, '-') ?? Math.random().toString()
    const isPassword = type === 'password'
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left icon */}
          {icon && (
            <div className="pointer-events-none absolute left-3.5 text-slate-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-slate-900',
              'placeholder:text-slate-400 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400',
              error
                ? 'border-red-400 bg-red-50/50 focus:ring-red-400/30 focus:border-red-400'
                : 'border-slate-300 hover:border-slate-400',
              icon     && 'pl-10',
              (isPassword || suffix) && 'pr-11',
              className,
            )}
            {...props}
          />

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {/* Generic right suffix (e.g. "VERIFIED" badge) */}
          {suffix && !isPassword && (
            <div className="absolute right-3.5">{suffix}</div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-red-500 inline-block flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
