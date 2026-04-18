import { useEffect, useState, useCallback } from 'react'
import '../../styles/glass.css'
import './HistoryGraphCard.css'
import { HAState } from '../../types'

interface Props {
  config: {
    entity_id: string
    entity_ids?: string[]   // up to 3 entities
    title?: string
    hours?: number
    line_style?: 'sharp' | 'crisp' | 'smooth' | 'peaks'
    smooth?: boolean   // legacy — superseded by line_style
  }
  state?: HAState
}

interface Point { x: number; y: number }

const COLORS = ['var(--hb-accent)', 'var(--hb-text-secondary)', 'var(--hb-status-warning)']
const HOURS_OPTIONS = [1, 6, 24, 168]
const HOURS_LABELS: Record<number, string> = { 1: '1h', 6: '6h', 24: '24h', 168: '7d' }

function buildSharpPath(points: Point[]): string {
  if (points.length < 2) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

// Resample an arbitrary point set to n evenly-spaced x positions via linear
// interpolation. This eliminates clustering artifacts (bursts of readings in a
// short window) before smoothing, so sigma becomes a fraction of the time range
// rather than a fraction of raw point count.
function resampleEvenly(pts: Point[], n: number): Point[] {
  if (pts.length < 2) return pts
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x
  const result: Point[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const x = x0 + (i / (n - 1)) * (x1 - x0)
    while (j < pts.length - 2 && pts[j + 1].x <= x) j++
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)]
    const t = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0
    result.push({ x, y: a.y + t * (b.y - a.y) })
  }
  return result
}

// Gaussian kernel on evenly-spaced data. sigma=12 on 300 pts → ~4 % of the
// time range: light smoothing on 1h (≈2 min), heavier trend on 24h (≈58 min).
function gaussianSmooth(pts: Point[], sigma: number): Point[] {
  const radius = Math.ceil(sigma * 3)
  return pts.map((p, i) => {
    let wSum = 0, ySum = 0
    const lo = Math.max(0, i - radius)
    const hi = Math.min(pts.length - 1, i + radius)
    for (let j = lo; j <= hi; j++) {
      const d = i - j
      const w = Math.exp(-(d * d) / (2 * sigma * sigma))
      wSum += w; ySum += pts[j].y * w
    }
    return { x: p.x, y: ySum / wSum }
  })
}

function buildSmoothPath(points: Point[], sigma: number): string {
  if (points.length < 2) return ''
  const resampled = resampleEvenly(points, 300)
  const smoothed  = gaussianSmooth(resampled, sigma)
  return smoothed.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}

function fmtVal(v: number): string {
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)
}

function fmtAxisTime(iso: string, hours: number): string {
  const d = new Date(iso)
  if (hours <= 6) return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  if (hours <= 24) return `${d.getHours().toString().padStart(2,'0')}:00`
  return `${d.getDate()}/${d.getMonth()+1}`
}

export default function HistoryGraphCard({ config, state }: Props) {
  const entityIds = config.entity_ids?.length
    ? config.entity_ids.slice(0, 3)
    : [config.entity_id]
  const label = config.title || entityIds[0]?.replace(/_/g, ' ') || 'Graf'

  // Derive line style — honour legacy `smooth` boolean for old saved cards
  const lineStyle = config.line_style ?? (config.smooth === false ? 'sharp' : 'smooth')
  const [hours, setHours] = useState(config.hours ?? 24)
  useEffect(() => { setHours(config.hours ?? 24) }, [config.hours])
  const [series, setSeries] = useState<Array<Array<{ t: number; v: number }>>>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.all(
        entityIds.map(id =>
          fetch(`/api/ha/history/${encodeURIComponent(id)}?hours=${hours}`)
            .then(r => r.json())
            .then((data: any[][]) => {
              if (!Array.isArray(data) || !data[0]) return []
              return data[0]
                .map((s: any) => ({ t: new Date(s.last_changed ?? s.last_updated ?? 0).getTime(), v: parseFloat(s.state) }))
                .filter((p: any) => !isNaN(p.v))
            })
        )
      )
      setSeries(results)
    } catch {
      setSeries([])
    } finally {
      setLoading(false)
    }
  }, [entityIds.join(','), hours])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // SVG dimensions
  const W = 320, H = 100, PAD = { l: 8, r: 8, t: 6, b: 18 }
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b

  // Compute global min/max across all series
  const allVals = series.flatMap(s => s.map(p => p.v))
  const allTimes = series.flatMap(s => s.map(p => p.t))
  const vMin = allVals.length ? Math.min(...allVals) : 0
  const vMax = allVals.length ? Math.max(...allVals) : 1
  const tMin = allTimes.length ? Math.min(...allTimes) : 0
  const tMax = allTimes.length ? Math.max(...allTimes) : 1
  const vRange = vMax - vMin || 1
  const tRange = tMax - tMin || 1

  function toPoint(p: { t: number; v: number }): Point {
    return {
      x: PAD.l + ((p.t - tMin) / tRange) * plotW,
      y: PAD.t + plotH - ((p.v - vMin) / vRange) * plotH
    }
  }

  // Axis ticks (time)
  const tickCount = hours <= 6 ? 4 : 5
  const axisTicks = Array.from({ length: tickCount }, (_, i) => {
    const t = tMin + (i / (tickCount - 1)) * tRange
    const x = PAD.l + (i / (tickCount - 1)) * plotW
    return { x, label: fmtAxisTime(new Date(t).toISOString(), hours) }
  })

  return (
    <div className="glass-card history-graph-card">
      <div className="hg-header">
        <span className="card-label">{label}</span>
        <div className="hg-hours-btns">
          {HOURS_OPTIONS.map(h => (
            <button
              key={h}
              className={`hg-hours-btn ${h === hours ? 'active' : ''}`}
              onClick={() => setHours(h)}
            >
              {HOURS_LABELS[h]}
            </button>
          ))}
        </div>
      </div>
      <div className="hg-body">
        {!loading && allVals.length > 0 && (
          <div className="hg-yaxis">
            <span className="hg-yaxis-label" style={{ top: `${(PAD.t / H * 100).toFixed(1)}%` }}>{fmtVal(vMax)}</span>
            <span className="hg-yaxis-label" style={{ top: `${((PAD.t + plotH / 2) / H * 100).toFixed(1)}%` }}>{fmtVal((vMin + vMax) / 2)}</span>
            <span className="hg-yaxis-label" style={{ bottom: `${(PAD.b / H * 100).toFixed(1)}%` }}>{fmtVal(vMin)}</span>
          </div>
        )}
        {loading ? (
          <div className="hg-loading">Laddar…</div>
        ) : allVals.length === 0 ? (
          <div className="hg-loading">Ingen data</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="hg-svg" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
              const y = PAD.t + f * plotH
              return <line key={f} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} style={{ stroke: 'var(--hb-card-border)' }} strokeWidth="1" />
            })}
            {/* Lines per series — use style.stroke so CSS variables resolve */}
            {series.map((pts, si) => {
              const svgPts = pts.map(toPoint)
              const d =
                lineStyle === 'sharp' ? buildSharpPath(svgPts) :
                lineStyle === 'crisp' ? buildSmoothPath(svgPts, 4) :
                                        buildSmoothPath(svgPts, 12)
              const sw = lineStyle === 'sharp' ? 1.5 : 2
              return d ? (
                <path key={si} d={d} fill="none" style={{ stroke: COLORS[si] }} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
              ) : null
            })}
            {/* Peak markers — only in 'peaks' mode */}
            {lineStyle === 'peaks' && series.flatMap((pts, si) => {
              if (pts.length === 0) return []
              const maxPt = pts.reduce((a, b) => b.v > a.v ? b : a)
              const minPt = pts.reduce((a, b) => b.v < a.v ? b : a)
              const color = COLORS[si]
              return [maxPt, minPt].map((pt, pi) => {
                const { x, y } = toPoint(pt)
                const isMax = pi === 0
                const anchor = x < PAD.l + 16 ? 'start' : x > W - PAD.r - 16 ? 'end' : 'middle'
                const labelY = isMax
                  ? Math.max(PAD.t + 7, y - 5)
                  : Math.min(PAD.t + plotH - 2, y + 10)
                return (
                  <g key={`${si}-${pi}`}>
                    <circle cx={x} cy={y} r={2.5} style={{ fill: color }} opacity={0.9} />
                    <text x={x} y={labelY} textAnchor={anchor} className="hg-peak-label">
                      {fmtVal(pt.v)}
                    </text>
                  </g>
                )
              })
            })}
            {/* Time axis */}
            {axisTicks.map((tick, i) => {
              const anchor = i === 0 ? 'start' : i === axisTicks.length - 1 ? 'end' : 'middle'
              return <text key={i} x={tick.x} y={H - 2} textAnchor={anchor} className="hg-axis-label">{tick.label}</text>
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
