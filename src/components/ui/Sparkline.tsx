import { PainDataPoint } from '@/types'

interface SparklineProps {
  data: PainDataPoint[]
  width?: number
  height?: number
  color?: string
}

/**
 * Sparkline — minimal SVG line chart for 14-day pain trend.
 * No axes, no labels — just the trend shape. Matches design exactly.
 */
export function Sparkline({ data, width = 120, height = 36, color }: SparklineProps) {
  if (!data || data.length < 2) return null

  const values  = data.map((d) => d.painLevel)
  const min     = Math.min(...values)
  const max     = Math.max(...values)
  const range   = max - min || 1

  const pad  = 2
  const w    = width  - pad * 2
  const h    = height - pad * 2

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w
    const y = pad + h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const polyline = points.join(' ')

  // Determine color from trend direction
  const last    = values[values.length - 1]
  const first   = values[0]
  const diff    = last - first
  const autoColor = color ?? (diff > 1 ? '#dc2626' : diff < -1 ? '#16a34a' : '#d97706')

  // Dot at last point
  const lastPoint  = points[points.length - 1].split(',')
  const dotX       = parseFloat(lastPoint[0])
  const dotY       = parseFloat(lastPoint[1])

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
      {/* End dot */}
      <circle cx={dotX} cy={dotY} r="3" fill={autoColor} />
    </svg>
  )
}
