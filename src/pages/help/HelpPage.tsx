import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, FileText, Video, MessageCircle, ChevronDown, ChevronRight, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import api from '@/services/api'

async function submitTicket(payload: { category: string; subject: string; body: string; attach_diagnostic: boolean }) {
  const { data } = await api.post('/support/tickets', payload)
  return data
}

const FAQS = [
  { q: 'How do I invite a new patient to the platform?', a: "Go to Patients → Generate invite code. You'll get a 6-character code that expires in 7 days or single use. Share it in clinic or email it directly from the portal." },
  { q: 'Can a patient be linked to more than one provider?', a: 'Yes. Patients can link to multiple providers simultaneously. Each provider sees the full clinical data.' },
  { q: 'How do I reset my MFA if I lose access to my authenticator?', a: "Use one of your 10 recovery codes (Settings → Security). If you've exhausted those, contact support with your license number for identity verification." },
  { q: 'What happens when a patient submits an urgent report?', a: 'You receive an immediate browser push notification and email simultaneously. The report appears at the top of your Reports inbox flagged red.' },
  { q: 'Is patient data HIPAA compliant?', a: 'Yes. TMJConnect is HIPAA-compliant by design. All PHI is encrypted at rest and in transit. A BAA is available on request.' },
]

export default function HelpPage() {
  const [search, setSearch]   = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // ── Support ticket state ──────────────────────────────────
  const [category, setCategory]           = useState('technical')
  const [subject, setSubject]             = useState('')
  const [message, setMessage]             = useState('')
  const [attachDiagnostic, setAttachDiag] = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [ticketError, setTicketError]     = useState<string | null>(null)

  const { mutate: sendTicket, isPending } = useMutation({
    mutationFn: submitTicket,
    onSuccess: () => {
      setSubmitted(true)
      setSubject('')
      setMessage('')
      setAttachDiag(false)
      setTicketError(null)
    },
    onError: (err: unknown) => {
      setTicketError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to submit ticket. Please try again.'
      )
    },
  })

  function handleSubmitTicket() {
    if (!subject.trim() || message.trim().length < 10) {
      setTicketError('Please fill in both subject and a message of at least 10 characters.')
      return
    }
    setTicketError(null)
    sendTicket({ category, subject: subject.trim(), body: message.trim(), attach_diagnostic: attachDiagnostic })
  }

  const filteredFaqs = FAQS.filter(f => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="rounded-2xl px-8 py-8 space-y-5" style={{ backgroundColor: '#0e2040' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#c49526' }}>Help Center</p>
          <h1 className="text-2xl font-bold text-white">How can we help today, Dr. Chen?</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Search our documentation, browse common questions, or reach our support team. We respond to all provider inquiries within 4 business hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for answers…" className="w-full rounded-xl px-4 pl-10 py-3 text-sm focus:outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }} />
          </div>
          <Button size="md">Search</Button>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span>Popular:</span>
          {['Invite a patient', 'Reset MFA', 'Billing & BAA'].map(link => <button key={link} onClick={() => setSearch(link)} className="hover:underline" style={{ color: '#c49526' }}>{link}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, title: 'Documentation', desc: 'Full guides for every feature — onboarding, exercises, reports.', cta: '42 articles →' },
          { icon: Video, title: 'Video tutorials', desc: 'Walkthroughs from the TMJConnect clinical team. Under 5 minutes each.', cta: '12 videos →' },
          { icon: MessageCircle, title: 'Contact support', desc: 'Human support via email or live chat. 4-hour response on business days.', cta: 'Start a conversation →', onCta: () => document.getElementById('still-need-help')?.scrollIntoView({ behavior: 'smooth' }) },
        ].map(({ icon: Icon, title, desc, cta, onCta }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200"><Icon size={18} className="text-slate-600" /></div>
            <div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p></div>
            <button onClick={onCta} className="text-xs font-semibold hover:underline" style={{ color: '#c49526' }}>{cta}</button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Frequently asked</h2><p className="text-xs text-slate-400 mt-0.5">Sorted by how often providers ask.</p></div>
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="border-b border-slate-50 last:border-0">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors text-left gap-4">
                <span>{faq.q}</span>
                {openFaq === i ? <ChevronDown size={15} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-slate-400 flex-shrink-0" />}
              </button>
              {openFaq === i && <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</div>}
            </div>
          ))}
        </div>
        <div id="still-need-help" className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Still need help?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Submit a ticket — we reply within 4 business hours.</p>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Ticket submitted!</p>
                <p className="text-xs text-slate-500 mt-0.5">We'll reply to your registered email within 4 business hours.</p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-semibold hover:underline"
                style={{ color: '#c49526' }}
              >
                Submit another ticket
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ticketError && (
                <Alert message={ticketError} onDismiss={() => setTicketError(null)} />
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-0"
                  style={{ '--tw-ring-color': '#c49526' } as React.CSSProperties}
                >
                  <option value="technical">Technical issue</option>
                  <option value="billing">Billing</option>
                  <option value="clinical">Clinical</option>
                  <option value="feature">Feature request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachDiagnostic}
                  onChange={e => setAttachDiag(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                <span className="text-xs text-slate-500">Attach diagnostic info to help us debug faster</span>
              </label>

              <Button
                fullWidth
                size="sm"
                loading={isPending}
                disabled={!subject.trim() || message.trim().length < 10}
                onClick={handleSubmitTicket}
              >
                <ArrowRight size={13} /> Submit ticket
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </div>
  )
}
