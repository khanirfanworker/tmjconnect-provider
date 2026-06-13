/**
 * GlobalSearch — Cmd+K patient / report search
 * Rendered via React Portal at document.body to avoid fixed-positioning
 * conflicts with parent transforms/overflow.
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, FileText, X } from 'lucide-react'
import { dashboardService } from '@/services/dashboardService'
import { reportsService } from '@/services/reportsService'
import { cn } from '@/lib/cn'

// ── Types (outside component — no hoisting surprises) ──────────────────────
type PatientResult = { kind: 'patient'; id: string; name: string; email: string; status: string }
type ReportResult  = { kind: 'report';  id: string; preview: string; urgency: string }
type ResultItem    = PatientResult | ReportResult

function highlight(text: string, query: string): React.ReactNode {
  if (!query || !text) return text ?? ''
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-sm px-px">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface GlobalSearchProps {
  onClose: () => void
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const navigate  = useNavigate()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [query, setQuery]           = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Pull from cache — zero extra network requests
  const { data: patients = [] } = useQuery({
    queryKey:  ['patients'],
    queryFn:   dashboardService.getPatients,
    staleTime: 1000 * 60 * 5,
  })
  const { data: reports = [] } = useQuery({
    queryKey:  ['reports'],
    queryFn:   reportsService.getReports,
    staleTime: 1000 * 60 * 2,
  })

  const q = query.trim().toLowerCase()

  const filteredPatients = useMemo<PatientResult[]>(() => {
    const base = !q ? patients.slice(0, 5) : patients.filter((p) =>
      (p.fullName ?? '').toLowerCase().includes(q) ||
      (p.email    ?? '').toLowerCase().includes(q)
    ).slice(0, 6)
    return base.map((p) => ({
      kind:   'patient',
      id:     p.id,
      name:   p.fullName ?? '',
      email:  p.email    ?? '',
      status: p.status   ?? 'stable',
    }))
  }, [q, patients])

  const filteredReports = useMemo<ReportResult[]>(() => {
    if (!q) return []
    return reports
      .filter((r) =>
        (r.firstLine  ?? '').toLowerCase().includes(q) ||
        (r.urgency    ?? '').toLowerCase().includes(q) ||
        (r.patientName ?? '').toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((r) => ({
        kind:    'report',
        id:      r.id,
        preview: r.firstLine  ?? r.patientName ?? '',
        urgency: r.urgency    ?? 'routine',
      }))
  }, [q, reports])

  const results = useMemo<ResultItem[]>(
    () => [...filteredPatients, ...filteredReports],
    [filteredPatients, filteredReports]
  )

  // Navigate to result
  const go = useCallback((item: ResultItem) => {
    if (item.kind === 'patient') navigate(`/patients/${item.id}`)
    else                         navigate(`/reports/${item.id}`)
    onClose()
  }, [navigate, onClose])

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0) }, [query])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     { onClose(); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter')      { const item = results[selectedIdx]; if (item) go(item) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, selectedIdx, onClose, go])

  const statusColor: Record<string, string> = {
    stable:   '#16a34a',
    moderate: '#d97706',
    urgent:   '#dc2626',
  }
  const urgencyColor: Record<string, string> = {
    routine:    '#64748b',
    concerning: '#d97706',
    urgent:     '#dc2626',
  }

  const modal = (
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', zIndex: 9999 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white overflow-hidden mx-4"
        style={{ boxShadow: '0 20px 60px rgba(14,32,64,0.25)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="flex-shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name or email…"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="flex-shrink-0 rounded border px-1.5 py-0.5 text-xs text-slate-400"
               style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[340px] overflow-y-auto">

          {results.length === 0 && q ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">
                No results for "<strong>{query}</strong>"
              </p>
            </div>
          ) : null}

          {/* Section header for recent patients (no query) */}
          {!q && filteredPatients.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent patients</p>
            </div>
          )}

          {/* Patient results */}
          {filteredPatients.length > 0 && (
            <div className="px-3 pb-2">
              {q && (
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Users size={11} className="text-slate-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Patients</p>
                </div>
              )}
              {filteredPatients.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => go(item)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors mb-0.5',
                    selectedIdx === i ? 'bg-slate-100' : 'hover:bg-slate-50'
                  )}
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                               rounded-full text-white text-xs font-bold"
                    style={{ backgroundColor: '#0e2040' }}
                  >
                    {(item.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {highlight(item.name, query)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {highlight(item.email, query)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold capitalize flex-shrink-0"
                        style={{ color: statusColor[item.status] ?? '#64748b' }}>
                    {item.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Report results */}
          {filteredReports.length > 0 && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <FileText size={11} className="text-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reports</p>
              </div>
              {filteredReports.map((item, i) => {
                const absIdx = filteredPatients.length + i
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item)}
                    onMouseEnter={() => setSelectedIdx(absIdx)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors mb-0.5',
                      selectedIdx === absIdx ? 'bg-slate-100' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                      <FileText size={13} style={{ color: urgencyColor[item.urgency] ?? '#64748b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        {highlight(item.preview, query)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold capitalize flex-shrink-0"
                          style={{ color: urgencyColor[item.urgency] ?? '#64748b' }}>
                      {item.urgency}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border px-1 py-0.5 text-xs text-slate-400"
                 style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>↑↓</kbd>
            <span className="text-xs text-slate-400">navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border px-1 py-0.5 text-xs text-slate-400"
                 style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>↵</kbd>
            <span className="text-xs text-slate-400">open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border px-1 py-0.5 text-xs text-slate-400"
                 style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>ESC</kbd>
            <span className="text-xs text-slate-400">close</span>
          </div>
        </div>
      </div>
    </div>
  )

  // Render at document.body via portal — escapes any parent CSS stacking context
  return createPortal(modal, document.body)
}
