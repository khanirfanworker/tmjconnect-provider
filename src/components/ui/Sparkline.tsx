import { PainDataPoint } from '@/types'

interface SparklineProps {
  data: PainDataPoint[]
  width?: number
  height?: number
  color?: string
  /** ISO date string — patient's link/login date; only show data from this point */
  linkedSince?: string
}

export function Sparkline({ data, width = 120, height = 36, color, linkedSince }: SparklineProps) {
  // Filter to only show data from when the patient linked
  const filtered = linkedSince
    ? (data ?? []).filter((d) => new Date(d.date) >= new Date(linkedSince))
    : (data ?? [])

  // No data or only 1 point — show a flat grey placeholder line
  if (!filtered || filtered.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const values = filtered.map((d) => d.painLevel)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const pad = 2
  const w   = width  - pad * 2
  const h   = height - pad * 2

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w
    const y = pad + h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const polyline = points.join(' ')

  const last      = values[values.length - 1]
  const first     = values[0]
  const diff      = last - first
  const autoColor = color ?? (diff > 1 ? '#dc2626' : diff < -1 ? '#16a34a' : '#d97706')

  const lastPt = points[points.length - 1].split(',')
  const dotX   = parseFloat(lastPt[0])
  const dotY   = parseFloat(lastPt[1])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points={polyline}
        stroke={autoColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={dotX} cy={dotY} r="3" fill={autoColor} />
    </svg>
  )
}
