import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, Users, Activity, Dumbbell, FileText, ArrowRight } from 'lucide-react'
import { dashboardService } from '@/services/dashboardService'
import type { ProviderAnalytics } from '@/services/dashboardService'
import { timeAgo } from '@/utils/formatters'
import { cn } from '@/lib/cn'

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#ef4444','#10b981','#3b82f6']
function colorFor(s: string) { return COLORS[(s?.charCodeAt(0) ?? 0) % COLORS.length] }
function initials(s: string) { return s.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?' }

type DaysFilter = 7 | 30 | 90

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState<DaysFilter>(30)

  const { data, isLoading } = useQuery<ProviderAnalytics>({
    queryKey: ['provider-analytics', days],
    queryFn:  () => dashboardService.getProviderAnalytics(days),
  })

  const ov = data?.overview

  // Sort day-of-week pattern in Mon→Sun order
  const dowPattern = (data?.dayOfWeekPattern ?? []).sort((a, b) => {
    const ai = DAY_ORDER.findIndex(d => a.day?.toLowerCase().startsWith(d.toLowerCase()))
    const bi = DAY_ORDER.findIndex(d => b.day?.toLowerCase().startsWith(d.toLowerCase()))
    return ai - bi
  })

  const kpiCards = [
    {
      label: 'Total patients',
      value: ov?.totalPatients ?? '—',
      sub:   `${ov?.activePatients7d ?? 0} active last 7 days`,
      icon:  Users,
      color: '#0e2040',
      bg:    '#f0f4ff',
    },
    {
      label: 'Avg pain level',
      value: ov?.avgPainLevel != null ? ov.avgPainLevel.toFixed(1) : '—',
      sub:   ov?.avgPainTrend != null
        ? `${ov.avgPainTrend > 0 ? '+' : ''}${ov.avgPainTrend.toFixed(1)} vs last period`
        : 'vs last period',
      icon:  Activity,
      color: ov?.avgPainTrend != null && ov.avgPainTrend > 0 ? '#dc2626' : '#16a34a',
      bg:    ov?.avgPainTrend != null && ov.avgPainTrend > 0 ? '#fef2f2' : '#f0fdf4',
    },
    {
      label: 'Symptom logs',
      value: ov?.totalLogs30d ?? '—',
      sub:   `Last ${days} days`,
      icon:  FileText,
      color: '#c49526',
      bg:    '#fdf8ec',
    },
    {
      label: 'Exercise compliance',
      value: ov?.exerciseCompliancePct != null ? `${Math.round(ov.exerciseCompliancePct)}%` : '—',
      sub:   'Assignments completed',
      icon:  Dumbbell,
      color: '#16a34a',
      bg:    '#f0fdf4',
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Practice-wide performance metrics across all linked patients
          </p>
        </div>
        {/* Day filter */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {([7, 30, 90] as DaysFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                days === d ? 'text-white' : 'text-slate-500 hover:text-slate-700',
              )}
              style={days === d ? { backgroundColor: '#0e2040' } : {}}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-8 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Day-of-week pain pattern — bar chart */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-900">Pain by day of week</h2>
          <p className="text-xs text-slate-400 mt-0.5">Average pain level per day · last {days} days</p>
        </div>

        {isLoading ? (
          /* Skeleton */
          <div className="flex items-end gap-3" style={{ height: 180 }}>
            {[60, 90, 75, 110, 85, 50, 70].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-slate-100 animate-pulse" style={{ height: h }} />
                <div className="h-3 w-6 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : dowPattern.length === 0 ? (
          /* Fallback — show placeholder bars so chart area isn't blank */
          <DowBarChart bars={DAY_ORDER.map(day => ({ day, avgPain: 0, logCount: 0 }))} days={days} placeholder />
        ) : (
          <DowBarChart bars={dowPattern} days={days} />
        )}
      </div>

      {/* Exercise impact + Trigger distribution — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Exercise impact */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Exercise impact on pain</h2>
          <p className="text-xs text-slate-400 mb-5">Days with vs. without completed exercises</p>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
            </div>
          ) : data?.exerciseImpact ? (
            <div className="space-y-4">
              {[
                { label: 'With exercises', value: data.exerciseImpact.withExerciseAvgPain, days: data.exerciseImpact.withDays, color: '#16a34a' },
                { label: 'Without exercises', value: data.exerciseImpact.withoutExerciseAvgPain, days: data.exerciseImpact.withoutDays, color: '#dc2626' },
              ].map(({ label, value, days: d, color }) => {
                const maxVal = Math.max(data.exerciseImpact.withExerciseAvgPain, data.exerciseImpact.withoutExerciseAvgPain, 1)
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{d} days</span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {value.toFixed(1)}<span className="text-xs font-normal text-slate-400">/10</span>
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-400 pt-1">
                {data.exerciseImpact.withoutExerciseAvgPain > data.exerciseImpact.withExerciseAvgPain
                  ? `Exercises reduce avg pain by ${(data.exerciseImpact.withoutExerciseAvgPain - data.exerciseImpact.withExerciseAvgPain).toFixed(1)} points`
                  : 'Continue monitoring exercise impact'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No data available.</p>
          )}
        </div>

        {/* Top triggers */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Top symptom triggers</h2>
          <p className="text-xs text-slate-400 mb-5">Across all patients · last {days} days</p>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-100 rounded" />
              ))}
            </div>
          ) : (data?.triggerDistribution ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No trigger data available.</p>
          ) : (
            <div className="space-y-3">
              {data!.triggerDistribution.slice(0, 6).map(({ trigger, count, pct }) => (
                <div key={trigger}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 capitalize">{trigger}</span>
                    <span className="text-xs text-slate-400">{count} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: '#c49526' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient engagement table — matches screenshot exactly */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Patient engagement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Individual patient metrics · last {days} days</p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: '#c49526' }}
          >
            All patients <ArrowRight size={11} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Patient', `Logs (${days}d)`, 'Avg Pain', 'Trend', 'Exercises Done', 'Last Active'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {[1,2,3,4,5,6].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.patientEngagement ?? []).length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                        No patient engagement data for this period.
                      </td>
                    </tr>
                  )
                  : (data?.patientEngagement ?? []).map((row) => {
                      const delta = row.painDelta
                      const TrendIcon = delta == null ? Minus : delta > 0 ? TrendingUp : TrendingDown
                      const trendColor = delta == null ? '#94a3b8' : delta > 0 ? '#dc2626' : '#16a34a'

                      return (
                        <tr
                          key={row.patientId}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/patients/${row.patientId}`)}
                        >
                          {/* Patient */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                                           rounded-full text-white text-xs font-bold"
                                style={{ backgroundColor: colorFor(row.fullName) }}
                              >
                                {initials(row.fullName)}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">{row.fullName}</p>
                            </div>
                          </td>

                          {/* Logs */}
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                            {row.logs30d}
                          </td>

                          {/* Avg pain */}
                          <td className="px-4 py-3">
                            {row.avgPain != null ? (
                              <span
                                className="text-sm font-bold"
                                style={{ color: row.avgPain >= 7 ? '#dc2626' : row.avgPain >= 4 ? '#d97706' : '#16a34a' }}
                              >
                                {row.avgPain.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300">—</span>
                            )}
                          </td>

                          {/* Trend */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1" style={{ color: trendColor }}>
                              <TrendIcon size={13} />
                              <span className="text-xs font-semibold">
                                {delta != null
                                  ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
                                  : 'no data'}
                              </span>
                            </div>
                          </td>

                          {/* Exercises done */}
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {row.exercisesCompleted}
                          </td>

                          {/* Last active */}
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {row.lastLogAt ? timeAgo(row.lastLogAt) : '—'}
                          </td>
                        </tr>
                      )
                    })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── DowBarChart ──────────────────────────────────────────────────────────────

const BAR_AREA_H = 140   // px — the drawable bar area (excludes labels)
const MIN_BAR_H  = 8     // px — minimum visible bar even for 0

interface DowBarChartProps {
  bars: { day: string; avgPain: number; logCount: number }[]
  days: number
  placeholder?: boolean
}

function DowBarChart({ bars, placeholder }: DowBarChartProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // "Mon", "Tue"…

  // Ensure all 7 days are present, filling gaps with 0
  const filled = DAY_ORDER.map((d) => {
    const found = bars.find(b => b.day?.toLowerCase().startsWith(d.toLowerCase()))
    return found ?? { day: d, avgPain: 0, logCount: 0 }
  })

  const maxVal = Math.max(...filled.map(b => b.avgPain), 1)

  return (
    <div>
      {/* Y-axis labels on the right */}
      <div className="flex items-stretch gap-3">
        {/* Bar columns */}
        <div className="flex flex-1 items-end gap-3" style={{ height: BAR_AREA_H + 40 }}>
          {filled.map((b, i) => {
            const barH = placeholder
              ? MIN_BAR_H
              : Math.max(Math.round((b.avgPain / maxVal) * BAR_AREA_H), MIN_BAR_H)

            const isToday = b.day?.toLowerCase().startsWith(today.toLowerCase())
            const isWeekend = b.day?.toLowerCase().startsWith('sat') || b.day?.toLowerCase().startsWith('sun')
            const barColor = isToday ? '#14b8a6' : isWeekend ? '#8b8b5c' : '#c49526'

            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center"
                style={{ height: BAR_AREA_H + 40 }}
              >
                {/* Value label above bar */}
                <div
                  className="flex items-end"
                  style={{ height: BAR_AREA_H - barH, minHeight: 0, flexShrink: 0 }}
                >
                  {!placeholder && b.avgPain > 0 && (
                    <span
                      className="text-xs font-bold mb-1"
                      style={{ color: barColor }}
                    >
                      {b.avgPain.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Bar itself */}
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: barH,
                    backgroundColor: placeholder ? '#f1f5f9' : barColor,
                    opacity: placeholder ? 1 : 0.85 + (barH / BAR_AREA_H) * 0.15,
                  }}
                />

                {/* Day label */}
                <span
                  className="mt-2 text-xs font-semibold"
                  style={{ color: isToday ? '#14b8a6' : '#94a3b8' }}
                >
                  {b.day?.slice(0, 3)}
                </span>

                {/* Log count badge */}
                {!placeholder && b.logCount > 0 && (
                  <span className="text-xs text-slate-300 mt-0.5">{b.logCount}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Y-axis scale */}
        <div
          className="flex flex-col justify-between text-right pb-8 pl-2"
          style={{ height: BAR_AREA_H + 40 }}
        >
          {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((v, i) => (
            <span key={i} className="text-xs text-slate-300 leading-none">
              {placeholder ? '' : v.toFixed(0)}
            </span>
          ))}
        </div>
      </div>

      {placeholder && (
        <p className="mt-2 text-center text-xs text-slate-400">
          No data yet — logs will appear as patients submit symptom check-ins.
        </p>
      )}
    </div>
  )
}
