import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw } from 'lucide-react'
import type { ExerciseCard } from '@/services/exercisesService'
import { formatDuration } from '@/utils/formatters'

interface Props {
  exercise: ExerciseCard
  onClose: () => void
}

export function VideoPlayerModal({ exercise, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying]     = useState(false)
  const [muted, setMuted]         = useState(false)
  const [currentTime, setCurrent] = useState(0)
  const [duration, setDuration]   = useState(exercise.durationSeconds ?? 0)
  const [loaded, setLoaded]       = useState(false)
  const [error, setError]         = useState(false)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v) return
    setCurrent(v.currentTime)
  }

  function handleLoadedMetadata() {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    setLoaded(true)
  }

  function handleEnded() {
    setPlaying(false)
    setCurrent(0)
    if (videoRef.current) videoRef.current.currentTime = 0
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * duration
    setCurrent(v.currentTime)
  }

  function handleFullscreen() {
    videoRef.current?.requestFullscreen?.()
  }

  function handleRestart() {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.play()
    setPlaying(true)
    setCurrent(0)
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Close button ─────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center
                     rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <X size={15} />
        </button>

        {/* ── Video element ────────────────────────────── */}
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          {exercise.videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={exercise.videoUrl}
                poster={exercise.thumbnailUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={() => setError(true)}
                playsInline
              />

              {/* Big play overlay — shown when paused */}
              {!playing && loaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full
                                  bg-white/20 backdrop-blur-sm border-2 border-white/40
                                  hover:bg-white/30 transition-all">
                    <Play size={28} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              )}

              {/* Loading spinner */}
              {!loaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20"
                       style={{ borderTopColor: '#c49526' }} />
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <p className="text-white/60 text-sm">Could not load video.</p>
                  <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold underline"
                    style={{ color: '#c49526' }}
                  >
                    Open in new tab →
                  </a>
                </div>
              )}
            </>
          ) : (
            /* No video URL — show placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                 style={{ backgroundColor: exercise.thumbnailBg }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/20">
                <Play size={28} className="text-white ml-1" fill="white" />
              </div>
              <p className="text-white/70 text-sm">No video file attached to this exercise.</p>
            </div>
          )}
        </div>

        {/* ── Controls bar ─────────────────────────────── */}
        <div className="px-4 pt-3 pb-4 space-y-2.5" style={{ backgroundColor: '#111827' }}>

          {/* Progress bar */}
          <div
            ref={progressRef}
            className="h-1.5 w-full rounded-full cursor-pointer group"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{ width: `${pct}%`, backgroundColor: '#c49526' }}
            >
              {/* Scrubber handle */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
                              h-3 w-3 rounded-full bg-white opacity-0 group-hover:opacity-100
                              transition-opacity" />
            </div>
          </div>

          {/* Buttons + time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={!loaded || error}
                className="flex h-8 w-8 items-center justify-center rounded-full
                           bg-white/10 hover:bg-white/20 text-white transition-colors
                           disabled:opacity-40"
              >
                {playing
                  ? <Pause size={14} fill="white" />
                  : <Play  size={14} fill="white" className="ml-0.5" />
                }
              </button>

              {/* Restart */}
              <button
                onClick={handleRestart}
                disabled={!loaded || error}
                className="text-white/50 hover:text-white transition-colors disabled:opacity-40"
                title="Restart"
              >
                <RotateCcw size={14} />
              </button>

              {/* Mute */}
              <button
                onClick={toggleMute}
                className="text-white/50 hover:text-white transition-colors"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              {/* Time */}
              <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white/50 hover:text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* ── Exercise info footer ─────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-t"
             style={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-sm font-semibold text-white">{exercise.title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {exercise.categoryLabel} · {formatDuration(exercise.durationSeconds)} · by {exercise.recordedBy}
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: exercise.categoryColor }}
          >
            {exercise.categoryLabel}
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
