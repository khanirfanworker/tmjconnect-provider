import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * OfflineBanner — matches design Screen 29.
 * Red banner at top: "You're offline. Your work is safe."
 * Shows last synced time and auto-retry countdown.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline]     = useState(!navigator.onLine)
  const [retryIn, setRetryIn]         = useState(12)
  const [lastSynced]                  = useState('2 min ago')

  useEffect(() => {
    const online  = () => setIsOffline(false)
    const offline = () => setIsOffline(true)
    window.addEventListener('online',  online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online',  online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  // Countdown timer when offline
  useEffect(() => {
    if (!isOffline) return
    const t = setInterval(() => {
      setRetryIn((n) => {
        if (n <= 1) { return 30 }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [isOffline])

  if (!isOffline) return null

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 text-sm text-white flex-shrink-0"
      style={{ backgroundColor: '#dc2626' }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <WifiOff size={14} className="flex-shrink-0" />
        <span className="font-medium">You're offline.</span>
        <span className="opacity-80">Your work is safe. We'll re-sync as soon as the connection returns.</span>
      </div>
      <div className="flex items-center gap-4 text-xs opacity-80 flex-shrink-0">
        <span>Last synced {lastSynced}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <RefreshCw size={11} className="animate-spin" />
          Retrying in {retryIn}s
        </span>
      </div>
    </div>
  )
}
