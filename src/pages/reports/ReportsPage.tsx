import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, ArrowLeft, ArrowRight, MessageSquare, X, Clock, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { reportsService } from '@/services/reportsService'
import type { ReportDetail, ReportRequest } from '@/services/reportsService'
import { ReportListItem } from './components/ReportListItem'
import { ReportDetail as ReportDetailPanel } from './components/ReportDetail'
import { Button } from '@/components/ui/Button'
import { timeAgo, formatDate } from '@/utils/formatters'
import { cn } from '@/lib/cn'

type Tab = 'all' | 'urgent' | 'awaiting' | 'responded' | 'flagged' | 'requests'

const INBOX_TABS: { key: Tab; label: string; filter: (r: ReportDetail) => boolean }[] = [
  { key: 'all',       label: 'All',       filter: () => true },
  { key: 'urgent',    label: 'Urgent',    filter: (r) => r.urgency === 'urgent' },
  { key: 'awaiting',  label: 'Awaiting',  filter: (r) => r.status === 'unreviewed' },
  { key: 'responded', label: 'Responded', filter: (r) => r.status === 'responded' },
  { key: 'flagged',   label: 'Flagged',   filter: (r) => r.isFlagged },
]

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#ef4444','#10b981','#3b82f6']
function colorFor(s: string) { return COLORS[(s.charCodeAt(0) ?? 0) % COLORS.length] }
function initials(s: string) {
  return s.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const STATUS_CFG = {
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fffbeb' },
  fulfilled: { label: 'Fulfilled', color: '#16a34a', bg: '#f0fdf4' },
  dismissed: { label: 'Dismissed', color: '#94a3b8', bg: '#f8fafc' },
}

export default function ReportsPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab]           = useState<Tab>('all')
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [localReports, setLocalReports]     = useState<ReportDetail[] | null>(null)
  const [detailData, setDetailData]         = useState<ReportDetail | null>(null)
  const [detailLoading, setDetailLoading]   = useState(false)
  const [showDetail, setShowDetail]         = useState(false)

  // ── Requests tab state ────────────────────────────────────────────────────
  const [selectedReqId, setSelectedReqId]   = useState<string | null>(null)
  const [dismissingId, setDismissingId]     = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: fetchedReports = [], isLoading } = useQuery<ReportDetail[]>({
    queryKey: ['reports'],
    queryFn:  reportsService.getReports,
  })

  const { data: reportRequests = [], isLoading: reqLoading } = useQuery<ReportRequest[]>({
    queryKey: ['report-requests'],
    queryFn:  () => reportsService.getReportRequests({ status: 'pending' }),
  })

  // Bulk-mark inbox as viewed once reports load
  useEffect(() => {
    if (fetchedReports.length > 0) {
      reportsService.markAllViewed().catch(() => { /* non-critical */ })
    }
  }, [fetchedReports.length])

  const reports: ReportDetail[] = localReports ?? fetchedReports

  const filtered = useMemo(() => {
    const tabFn = INBOX_TABS.find((t) => t.key === activeTab)?.filter ?? (() => true)
    return reports.filter(tabFn)
  }, [reports, activeTab])

  const inboxSelected     = reports.find((r) => r.id === selectedId) ?? null
  const effectiveSelected = detailData ?? inboxSelected
  const selectedRequest   = reportRequests.find((r) => r.id === selectedReqId) ?? null

  async function handleSelectReport(id: string) {
    setSelectedId(id)
    setShowDetail(true)
    setDetailData(null)
    setDetailLoading(true)
    try {
      const full = await reportsService.getReportDetail(id)
      setDetailData(full)
    } catch {
      // fall back to inbox data
    } finally {
      setDetailLoading(false)
    }
  }

  function handleUpdate(id: string, changes: Partial<ReportDetail>) {
    setLocalReports(
      (localReports ?? fetchedReports).map((r) => r.id === id ? { ...r, ...changes } : r)
    )
  }

  async function handleDismissRequest(id: string) {
    setDismissingId(id)
    try {
      await reportsService.dismissReportRequest(id)
      queryClient.setQueryData<ReportRequest[]>(['report-requests'], (prev) =>
        prev?.filter((r) => r.id !== id) ?? []
      )
      if (selectedReqId === id) setSelectedReqId(null)
    } finally {
      setDismissingId(null)
    }
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setSelectedId(null)
    setSelectedReqId(null)
    setShowDetail(false)
    setDetailData(null)
  }

  const tabCounts: Record<Tab, number> = {
    all:       reports.length,
    urgent:    reports.filter((r) => r.urgency === 'urgent').length,
    awaiting:  reports.filter((r) => r.status === 'unreviewed').length,
    responded: reports.filter((r) => r.status === 'responded').length,
    flagged:   reports.filter((r) => r.isFlagged).length,
    requests:  reportRequests.length,
  }

  const isRequestsTab = activeTab === 'requests'

  // Which "selected" to use for tablet hide/show logic
  const hasDetailOpen = isRequestsTab
    ? (showDetail && !!selectedRequest)
    : (showDetail && !!effectiveSelected)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>

      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Reports inbox</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          <span className="font-semibold text-slate-700">{tabCounts.awaiting} awaiting response</span>
          {tabCounts.urgent > 0 && (
            <span className="font-semibold ml-1.5" style={{ color: '#dc2626' }}>
              · {tabCounts.urgent} urgent
            </span>
          )}
          {tabCounts.requests > 0 && (
            <span className="font-semibold ml-1.5" style={{ color: '#d97706' }}>
              · {tabCounts.requests} pending {tabCounts.requests === 1 ? 'request' : 'requests'}
            </span>
          )}
        </p>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden relative">

        {/* LEFT: list */}
        <div className={cn(
          'flex flex-col border-r border-slate-100 flex-shrink-0',
          'w-full lg:w-[360px]',
          hasDetailOpen ? 'hidden lg:flex' : 'flex'
        )}>
          {/* Tabs */}
          <div className="flex-shrink-0 border-b border-slate-100">
            <div className="flex items-center justify-between px-3 pt-3 pb-0">
              <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
                {([...INBOX_TABS, { key: 'requests' as Tab, label: 'Requests' }]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className="flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-xs
                               font-semibold border-b-2 transition-colors"
                    style={{
                      borderColor: activeTab === key ? '#0e2040' : 'transparent',
                      color:       activeTab === key ? '#0e2040' : '#94a3b8',
                    }}
                  >
                    {label}
                    <span
                      className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs"
                      style={{
                        backgroundColor: activeTab === key
                          ? (key === 'requests' ? '#d97706' : '#0e2040')
                          : '#f1f5f9',
                        color: activeTab === key ? 'white' : '#64748b',
                      }}
                    >
                      {tabCounts[key]}
                    </span>
                  </button>
                ))}
              </div>
              {!isRequestsTab && (
                <button className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500
                                   hover:text-slate-700 ml-1 pb-2">
                  <Filter size={12} /> Filters
                </button>
              )}
            </div>
          </div>

          {/* Sub-header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 flex-shrink-0">
            <span className="text-xs text-slate-400">
              {isRequestsTab ? `${tabCounts.requests} requests` : `${filtered.length} reports`}
            </span>
            {!isRequestsTab && (
              <select className="text-xs text-slate-600 font-medium bg-transparent border-none focus:outline-none cursor-pointer">
                <option>Sort: Urgency</option>
                <option>Sort: Newest</option>
              </select>
            )}
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── INBOX LIST ── */}
            {!isRequestsTab && (
              <>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-4 py-4 border-b border-slate-100">
                        <div className="flex gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                          </div>
                        </div>
                      </div>
                    ))
                  : filtered.map((report) => (
                      <ReportListItem
                        key={report.id}
                        report={report}
                        isSelected={report.id === effectiveSelected?.id}
                        onClick={() => handleSelectReport(report.id)}
                      />
                    ))
                }
                {!isLoading && filtered.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-400">No reports here.</p>
                  </div>
                )}
              </>
            )}

            {/* ── REQUESTS LIST ── */}
            {isRequestsTab && (
              <>
                {reqLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-4 py-4 border-b border-slate-100">
                        <div className="flex gap-2.5 animate-pulse">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                            <div className="h-3 bg-slate-100 rounded w-3/4" />
                          </div>
                        </div>
                      </div>
                    ))
                  : reportRequests.map((req) => {
                      const patientName = [req.providerFirstName, req.providerLastName].filter(Boolean).join(' ') || 'Patient'
                      const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending
                      return (
                        <div
                          key={req.id}
                          onClick={() => { setSelectedReqId(req.id); setShowDetail(true) }}
                          className={cn(
                            'px-4 py-3.5 cursor-pointer border-l-4 border-b border-slate-100 transition-colors',
                            selectedReqId === req.id
                              ? 'bg-amber-50/50 border-l-amber-500'
                              : 'border-l-transparent hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                                         rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: colorFor(patientName) }}
                            >
                              {initials(patientName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
                                <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(req.createdAt)}</span>
                              </div>
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-xs font-bold mt-0.5"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}
                              >
                                {cfg.label.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 leading-snug line-clamp-2 ml-10">
                            {req.prompt || '(No prompt provided)'}
                          </p>
                        </div>
                      )
                    })
                }
                {!reqLoading && reportRequests.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-400">No pending report requests.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <div className={cn(
          'flex-1 min-w-0 flex-col',
          hasDetailOpen ? 'flex' : 'hidden lg:flex'
        )}>

          {/* Back button — tablet only */}
          {hasDetailOpen && (
            <button
              onClick={() => setShowDetail(false)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 text-sm font-medium
                         text-slate-600 hover:text-slate-800 border-b border-slate-100"
            >
              <ArrowLeft size={15} /> Back to {isRequestsTab ? 'requests' : 'reports'}
            </button>
          )}

          {/* ── REPORT DETAIL ── */}
          {!isRequestsTab && (
            <>
              {(effectiveSelected || (detailLoading && selectedId)) ? (
                <div className="flex-1 overflow-hidden">
                  {detailLoading && !detailData ? (
                    <div className="p-6 space-y-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-100 rounded w-1/3" />
                          <div className="h-3 bg-slate-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-24 bg-slate-100 rounded-xl" />
                      <div className="h-32 bg-slate-100 rounded-xl" />
                    </div>
                  ) : effectiveSelected ? (
                    <ReportDetailPanel
                      key={effectiveSelected.id}
                      report={effectiveSelected}
                      onUpdate={handleUpdate}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-slate-400">Select a report to view details</p>
                </div>
              )}
            </>
          )}

          {/* ── REQUEST DETAIL ── */}
          {isRequestsTab && (
            <>
              {selectedRequest ? (
                <RequestDetailPanel
                  request={selectedRequest}
                  dismissing={dismissingId === selectedRequest.id}
                  onDismiss={() => handleDismissRequest(selectedRequest.id)}
                  onViewPatient={() => navigate(`/patients/${selectedRequest.patientId}`)}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-slate-400">Select a request to view details</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Request detail panel (inline component) ───────────────────────────────────

interface RequestDetailPanelProps {
  request:    ReportRequest
  dismissing: boolean
  onDismiss:  () => void
  onViewPatient: () => void
}

function RequestDetailPanel({ request, dismissing, onDismiss, onViewPatient }: RequestDetailPanelProps) {
  const patientName = [request.providerFirstName, request.providerLastName].filter(Boolean).join(' ') || 'Patient'
  const cfg         = STATUS_CFG[request.status] ?? STATUS_CFG.pending

  const StatusIcon = request.status === 'fulfilled'
    ? CheckCircle2
    : request.status === 'dismissed'
      ? X
      : Clock

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Action bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                       rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: colorFor(patientName) }}
          >
            {initials(patientName)}
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{patientName}</p>
            <p className="text-xs text-slate-400">Requested {timeAgo(request.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {request.status === 'pending' && (
            <Button
              variant="secondary" size="sm"
              loading={dismissing}
              onClick={onDismiss}
            >
              <X size={13} /> Dismiss
            </Button>
          )}
          <Button size="sm" onClick={onViewPatient}>
            View patient <ArrowRight size={13} />
          </Button>
        </div>
      </div>

      {/* Status + date badges */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-4 flex-shrink-0">
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          <StatusIcon size={11} />
          {cfg.label}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
          Submitted: {formatDate(request.createdAt)}
        </span>
        {request.fulfilledAt && (
          <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
            Fulfilled: {formatDate(request.fulfilledAt)}
          </span>
        )}
        {request.dismissedAt && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400">
            Dismissed: {formatDate(request.dismissedAt)}
          </span>
        )}
      </div>

      {/* Prompt */}
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} className="text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Patient's Request
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {request.prompt || '(No prompt provided — patient requested a general report)'}
          </p>
        </div>
      </div>

      {/* Fulfilled report link */}
      {request.fulfilledReportId && (
        <div className="px-6 pb-4 flex-shrink-0">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">Request fulfilled</p>
              <p className="text-xs text-green-600 mt-0.5">A report was submitted for this request</p>
            </div>
            <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Empty state for pending */}
      {request.status === 'pending' && (
        <div className="px-6 pb-6 mt-auto flex-shrink-0">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Action required</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              This patient is waiting for a report based on their request. You can view their full
              profile to submit a report, or dismiss this request if it is no longer relevant.
            </p>
            <button
              onClick={onViewPatient}
              className="mt-3 text-xs font-semibold flex items-center gap-1"
              style={{ color: '#92400e' }}
            >
              Go to patient profile <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
