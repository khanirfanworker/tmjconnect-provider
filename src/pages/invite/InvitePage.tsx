import { useState } from 'react'
import { Copy, Mail, RefreshCw, Check, UserX, Clock, Link as LinkIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { inviteService, LinkCode, ActiveLink } from '@/services/inviteService'
import { formatDate, timeAgo } from '@/utils/formatters'

type TabKey = 'active' | 'pending'

// ── Invite Code Modal ────────────────────────────────────────────────────────
function InviteCodeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [copied, setCopied]     = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailErr, setEmailErr] = useState<string | null>(null)

  // Generate code on modal open
  const { data: codeData, isLoading: generating, error: genError } = useQuery<LinkCode>({
    queryKey: ['generate-code'],
    queryFn:  () => inviteService.generateCode(),
    staleTime: Infinity,   // don't re-generate on re-render
    retry: 1,
  })

  const sendInvite = useMutation({
    mutationFn: () => inviteService.sendEmailInvite(codeData!.code, email, name || undefined),
    onSuccess: () => { setEmailSent(true); setEmailErr(null) },
    onError:   () => setEmailErr('Failed to send invite. Please try again.'),
  })

  function copyCode() {
    if (!codeData?.code) return
    navigator.clipboard.writeText(codeData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(14,32,64,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 space-y-4">

          {/* Icon + title */}
          <div className="text-center space-y-3">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl"
                 style={{ backgroundColor: '#0e2040' }}>
              <LinkIcon size={24} style={{ color: '#c49526' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Invite code</h2>
              <p className="text-xs text-slate-400 mt-1">
                Single-use · expires in 7 days · HIPAA-compliant link
              </p>
            </div>
          </div>

          {/* Code display */}
          {generating ? (
            <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Generating code…
            </div>
          ) : genError ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              Failed to generate code. Please close and try again.
            </div>
          ) : codeData ? (
            <div className="flex items-center justify-between rounded-xl border-2 px-5 py-4"
                 style={{ borderColor: '#c49526', backgroundColor: '#fdf8ec' }}>
              <span className="text-3xl font-black tracking-[0.3em]"
                    style={{ color: '#0e2040', fontFamily: 'monospace' }}>
                {codeData.code}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: copied ? '#f0fdf4' : '#0e2040',
                  color:           copied ? '#15803d' : 'white',
                }}
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          ) : null}

          {codeData && (
            <p className="text-xs text-slate-400 text-center">
              Expires {formatDate(codeData.expires_at)}
            </p>
          )}

          {/* Email invite */}
          {emailSent ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50
                            border border-green-200 px-4 py-3 text-sm text-green-700">
              <Check size={14} /> Invite sent successfully!
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 text-center">
                Or email it directly to the patient
              </p>
              <input
                type="text"
                placeholder="Patient name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:border-transparent"
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="patient@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:border-transparent"
                />
                <Button
                  size="sm"
                  loading={sendInvite.isPending}
                  disabled={!email || !codeData}
                  onClick={() => sendInvite.mutate()}
                >
                  <Mail size={13} /> Email
                </Button>
              </div>
              {emailErr && <p className="text-xs text-red-600">{emailErr}</p>}
            </div>
          )}
        </div>

        <div className="px-6 pb-5">
          <Button variant="secondary" fullWidth onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}

// ── Disconnect Confirm Modal ─────────────────────────────────────────────────
function DisconnectModal({
  link,
  onConfirm,
  onCancel,
  isPending,
}: {
  link: ActiveLink
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const initials = link.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b']
  const color  = colors[link.fullName.charCodeAt(0) % colors.length]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
         onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
           onMouseDown={(e) => e.stopPropagation()}>

        {/* Icon */}
        <div className="flex justify-center pt-7 pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full"
               style={{ backgroundColor: '#fff1f2', border: '2px solid #fecaca' }}>
            <UserX size={24} style={{ color: '#dc2626' }} />
          </div>
        </div>

        <div className="px-6 pb-6 text-center space-y-2">
          <h2 className="text-base font-bold text-slate-900">Disconnect patient?</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            This will remove your link with
          </p>

          {/* Patient chip */}
          <div className="flex items-center justify-center gap-2.5 py-2">
            <div className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center
                            text-white text-xs font-bold"
                 style={{ backgroundColor: color }}>
              {initials}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{link.fullName}</p>
              <p className="text-xs text-slate-400">{link.email}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The patient will lose access to your exercises and you will no longer receive their reports.
            <span className="font-semibold text-slate-600"> This cannot be undone.</span>
          </p>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm
                       font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white
                       transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#dc2626' }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function InvitePage() {
  const [activeTab, setActiveTab]           = useState<TabKey>('active')
  const [showModal, setShowModal]           = useState(false)
  const [disconnectTarget, setDisconnectTarget] = useState<ActiveLink | null>(null)
  const queryClient = useQueryClient()

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: metrics } = useQuery({
    queryKey: ['linking-metrics'],
    queryFn:  () => inviteService.getMetrics(),
    staleTime: 1000 * 60 * 2,
  })

  const { data: links = [], isLoading: linksLoading } = useQuery<ActiveLink[]>({
    queryKey: ['active-links'],
    queryFn:  () => inviteService.getActiveLinks(),
    enabled:  activeTab === 'active',
  })

  const { data: codes = [], isLoading: codesLoading } = useQuery<LinkCode[]>({
    queryKey: ['linking-codes'],
    queryFn:  () => inviteService.getCodes(),
    enabled:  activeTab === 'pending',
  })

  // ── Disconnect mutation ────────────────────────────────────────────────
  const disconnect = useMutation({
    mutationFn: (linkId: string) => inviteService.disconnectLink(linkId),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['active-links'] })
      queryClient.invalidateQueries({ queryKey: ['linking-metrics'] })
      setDisconnectTarget(null)
    },
  })

  const pendingCodes  = codes.filter(c => c.status === 'pending')
  const expiredCodes  = codes.filter(c => c.status === 'expired')

  const TABS = [
    { key: 'active'  as TabKey, label: 'Active links',    count: metrics?.total_linked   ?? links.length },
    { key: 'pending' as TabKey, label: 'Pending codes',   count: metrics?.pending_codes  ?? pendingCodes.length },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invite & Link Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Securely connect new patients or manage existing connections
            {metrics && (
              <> · <span className="font-semibold text-slate-700">{metrics.total_linked} active</span></>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <RefreshCw size={14} /> Generate invite code
        </Button>
      </div>

      {/* Stats cards — real data from /linking/metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Links',       value: metrics?.total_linked     ?? '—', icon: LinkIcon, color: '#0e2040' },
          { label: 'Pending Codes',      value: metrics?.pending_codes    ?? '—', icon: Clock,    color: '#d97706' },
          { label: 'Expired Codes',      value: metrics?.expired_codes    ?? '—', icon: Clock,    color: '#94a3b8' },
          { label: 'Disconnected · 30d', value: metrics?.disconnected_30d ?? '—', icon: UserX,    color: '#dc2626' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <Icon size={14} style={{ color }} className="flex-shrink-0" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-0 border-b border-slate-100 px-4 pt-3 pb-0">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs
                         font-semibold border-b-2 transition-colors"
              style={{
                borderColor: activeTab === key ? '#c49526' : 'transparent',
                color:       activeTab === key ? '#0e2040' : '#94a3b8',
              }}
            >
              {label}
              <span className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: activeTab === key ? '#0e2040' : '#f1f5f9',
                      color:           activeTab === key ? 'white'   : '#64748b',
                    }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Active Links Tab ──────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Patient', 'Email', 'Linked since', 'Diagnosis', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linksLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {[1,2,3,4,5].map((j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : links.length === 0
                    ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                        No active links yet. Generate an invite code to connect your first patient.
                      </td></tr>
                    )
                    : links.map((link) => {
                        const initials = link.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b']
                        const color  = colors[link.fullName.charCodeAt(0) % colors.length]
                        return (
                          <tr key={link.link_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 flex-shrink-0 rounded-full flex items-center
                                                justify-center text-white text-xs font-bold"
                                     style={{ backgroundColor: color }}>
                                  {initials}
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{link.fullName}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{link.email}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(link.linked_at)}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{link.diagnosis ?? '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDisconnectTarget(link)}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline transition-colors"
                              >
                                Disconnect
                              </button>
                            </td>
                          </tr>
                        )
                      })
                }
              </tbody>
            </table>
            {!linksLoading && links.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                Showing {links.length} active {links.length === 1 ? 'link' : 'links'}
              </div>
            )}
          </div>
        )}

        {/* ── Pending Codes Tab ─────────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Code', 'Status', 'Created', 'Expires', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codesLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {[1,2,3,4,5].map((j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : codes.length === 0
                    ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                        No codes generated yet.
                      </td></tr>
                    )
                    : [...pendingCodes, ...expiredCodes].map((c) => (
                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-slate-800 tracking-widest">{c.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                  style={{
                                    backgroundColor: c.status === 'pending'   ? '#fffbeb'
                                                   : c.status === 'connected' ? '#f0fdf4' : '#f1f5f9',
                                    color:           c.status === 'pending'   ? '#d97706'
                                                   : c.status === 'connected' ? '#16a34a' : '#64748b',
                                  }}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap"
                              style={{ color: c.status === 'expired' ? '#dc2626' : '#64748b' }}>
                            {timeAgo(c.expires_at)}
                          </td>
                          <td className="px-4 py-3">
                            {c.status === 'pending' && (
                              <button
                                onClick={() => navigator.clipboard.writeText(c.code)}
                                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                                style={{ color: '#c49526' }}
                              >
                                <Copy size={11} /> Copy
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <InviteCodeModal onClose={() => {
          setShowModal(false)
          queryClient.invalidateQueries({ queryKey: ['linking-codes'] })
          queryClient.invalidateQueries({ queryKey: ['linking-metrics'] })
          queryClient.removeQueries({ queryKey: ['generate-code'] })
        }} />
      )}

      {disconnectTarget && (
        <DisconnectModal
          link={disconnectTarget}
          isPending={disconnect.isPending}
          onConfirm={() => disconnect.mutate(disconnectTarget.link_id)}
          onCancel={() => setDisconnectTarget(null)}
        />
      )}
    </div>
  )
}
