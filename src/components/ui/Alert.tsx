import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type AlertVariant = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
}

const CONFIG: Record<AlertVariant, {
  wrapper: string
  icon: React.ReactNode
}> = {
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />,
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />,
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />,
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  },
}

export function Alert({ variant = 'error', title, message, onDismiss, className }: AlertProps) {
  const { wrapper, icon } = CONFIG[variant]

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
        wrapper,
        className,
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-snug">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
