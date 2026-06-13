import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, AlertTriangle, Image as ImageIcon, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate, formatTime } from '@/utils/formatters'
import { reportsService, ReportDetail as ReportDetailType } from '@/services/reportsService'

const QUICK_RESPONSES = [
  'Thank you for the update. Please continue your current exercises.',
  'I\'ve reviewed your report. Please come in for an appointment.',
  'This sounds manageable — try applying a warm compress and rest.',
  'Your pain level is a concern. Please call our office immediately.',
]

interface Props {
  report: ReportDetailType
  onUpdate: (id: string, changes: Partial<ReportDetailType>) => void
}

export function ReportDetail({ report, onUpdate }: Props) {
  const navigate = useNavigate()
  const [response, setResponse]       = useState('')
  const [sending, setSending]         = useState(false)
  const [marking, setMarking]         = useState(false)
  const [showReply, setShowReply]     = useState(false)
  const [sent, setSent]               = useState(false)

  const painJump = report.painScore - report.previousPainScore

  async function handleMarkReviewed() {
    setMarking(true)
    await reportsService.markReviewed(report.id)
    onUpdate(report.id, { status: 'reviewed' })
    setMarking(false)
  }

  async function handleSendResponse() {
    if (!response.trim()) return
    setSending(true)
    await reportsService.sendResponse(report.id, response)
    onUpdate(report.id, { status: 'responded' })
    setSent(true)
    setResponse('')
    setShowReply(false)
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Action bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Patient avatar + name */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                       rounded-full text-white text-sm font-bold"
            style={{ backgroundColor: report.patientColor }}
          >
            {report.patientInitials}
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{report.patientName}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{report.patientAge} · {report.patientCondition}</span>
              <span>·</span>
              <span>Linked {report.linkedWeeks} weeks</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {report.status !== 'reviewed' && report.status !== 'responded' ? (
            <Button size="sm" loading={marking} onClick={handleMarkReviewed}>
              <CheckCircle size={13} /> Mark reviewed
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              <CheckCircle size={13} />
              {report.status === 'responded' ? 'Responded' : 'Reviewed'}
            </Button>
          )}
        </div>
      </div>

      {/* ── View full profile link ──────────────────────────────── */}
      <div className="px-6 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => navigate(`/patients/${report.patientId}`)}
          className="text-xs font-semibold hover:underline flex items-center gap-1"
          style={{ color: '#0e2040' }}
        >
          View full profile <ArrowRight size={11} />
        </button>
      </div>

      {/* ── Meta tags row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4 flex-shrink-0">
        {report.urgency === 'urgent' && (
          <span className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
                style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
            <AlertTriangle size={11} /> URGENT
          </span>
        )}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
          Submitted: {formatDate(report.submittedAt)} · {formatTime(report.submittedAt)}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
          Via: {report.submittedVia}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
          Location: {report.location}
        </span>
      </div>

      {/* ── Pain spike alert card ──────────────────────────────── */}
      {painJump >= 2 && (
        <div className="mx-6 mb-4 rounded-xl border border-slate-200 flex overflow-hidden flex-shrink-0">
          {/* Big pain number */}
          <div className="flex flex-col items-center justify-center px-5 py-4 border-r border-slate-200"
               style={{ backgroundColor: '#fafafa', minWidth: 80 }}>
            <span className="text-4xl font-black" style={{ color: '#dc2626' }}>
              {report.painScore}
            </span>
            <span className="text-xs text-slate-400 mt-0.5">/ 10 PAIN</span>
          </div>
          {/* Spike description */}
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Pain spike — crossed urgent threshold
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Previous report {report.previousReportDaysAgo} days ago was {report.previousPainScore}/10.
              This represents a {painJump}-point jump in {report.previousReportDaysAgo * 24} hours.
            </p>
          </div>
        </div>
      )}

      {/* ── Patient's message ──────────────────────────────────── */}
      <div className="px-6 mb-4 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Patient's Message
        </p>
        <p className="text-sm text-slate-700 italic leading-relaxed">
          {report.fullMessage}
        </p>
      </div>

      {/* ── Attached photo ─────────────────────────────────────── */}
      {report.hasPhoto && report.photoFilename && (
        <div className="px-6 mb-4 flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Attached Photo · 1 of 1
          </p>
          <div className="flex items-start gap-3">
            {/* Thumbnail placeholder */}
            <div
              className="flex h-20 w-28 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <ImageIcon size={24} className="text-slate-500" />
              <span className="absolute text-xs font-bold text-white/60 mt-10 ml-1">R-SIDE</span>
            </div>
            <div className="space-y-0.5 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{report.photoFilename}</p>
              <p>Resolution: {report.photoResolution}</p>
              <p>{report.photoTime}</p>
              {report.photoNote && (
                <p className="italic">Patient note: '{report.photoNote}'</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick response templates + reply box ───────────────── */}
      <div className="px-6 pb-6 mt-auto flex-shrink-0">
        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-medium text-center">
            ✓ Response sent to patient
          </div>
        ) : (
          <>
            {!showReply ? (
              <Button fullWidth variant="secondary" onClick={() => setShowReply(true)}>
                <Send size={14} /> Reply to patient
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Quick templates */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Quick responses
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_RESPONSES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setResponse(t)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1
                                 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50
                                 transition-colors text-left"
                    >
                      {t.slice(0, 40)}…
                    </button>
                  ))}
                </div>
                {/* Text area */}
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  placeholder="Write your response to the patient…"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm
                             text-slate-900 placeholder:text-slate-400 resize-none
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: '#c49526' } as React.CSSProperties}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowReply(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" loading={sending} onClick={handleSendResponse} disabled={!response.trim()}>
                    <Send size={13} /> Send response
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
