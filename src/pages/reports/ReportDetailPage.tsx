import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { reportsService } from '@/services/reportsService'
import type { ReportDetail } from '@/services/reportsService'
import { ReportDetail as ReportDetailPanel } from './components/ReportDetail'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: report, isLoading, isError } = useQuery<ReportDetail>({
    queryKey: ['report', id],
    queryFn:  () => reportsService.getReportDetail(id!),
    enabled:  !!id,
  })

  function handleUpdate(reportId: string, changes: Partial<ReportDetail>) {
    queryClient.setQueryData<ReportDetail>(['report', id], (prev) =>
      prev ? { ...prev, ...changes } : prev
    )
    // Also update the inbox cache if present
    queryClient.setQueryData<ReportDetail[]>(['reports'], (list) =>
      list?.map((r) => r.id === reportId ? { ...r, ...changes } : r)
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/reports')}
        className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-600 hover:text-slate-800 w-fit"
      >
        <ArrowLeft size={15} /> Back to reports
      </button>

      <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {isLoading && (
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
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">Failed to load report.</p>
          </div>
        )}

        {report && (
          <ReportDetailPanel
            report={report}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </div>
  )
}
