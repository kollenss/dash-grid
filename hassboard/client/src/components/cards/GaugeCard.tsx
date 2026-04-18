import '../../styles/glass.css'
import './GaugeCard.css'
import { HAState } from '../../types'

interface Props {
  config: { entity_id: string; title?: string; min?: number; max?: number; unit?: string }
  state?: HAState
}

export default function GaugeCard({ config, state }: Props) {
  const label  = config.title || config.entity_id.replace(/_/g, ' ')
  const min    = config.min ?? 0
  const max    = config.max ?? 100
  const unit   = config.unit ?? state?.attributes?.unit_of_measurement ?? ''
  const rawVal = parseFloat(state?.state ?? '')
  const value  = isNaN(rawVal) ? null : Math.min(Math.max(rawVal, min), max)
  const pct    = value !== null ? (value - min) / (max - min) : 0

  // SVG circle gauge using strokeDasharray
  // Arc spans 240° (2/3 of full circle), gap at bottom (60°)
  const cx = 90, cy = 80, r = 62
  const circ   = 2 * Math.PI * r           // full circumference
  const arcLen = (240 / 360) * circ         // 240° arc
  const gapLen = circ - arcLen              // 120° gap
  const fillLen = pct * arcLen

  // Rotate so arc starts at bottom-left (7 o'clock)
  // 0° in SVG = 3 o'clock. rotate(150°) moves start to 3+150=153° ≈ 5 o'clock.
  // rotate(120°) → start at 3+120=7 o'clock ✓
  const rotDeg = 150

  const color = pct > 0.9 ? '#ff3b30' : pct > 0.7 ? '#ff9f0a' : '#34c759'
  const displayVal = value !== null
    ? value % 1 === 0 ? value : value.toFixed(1)
    : '—'

  return (
    <div className="glass-card gauge-card">
      <div className="card-label">{label}</div>
      <div className="gauge-wrap">
        <svg viewBox="0 0 180 155" className="gauge-svg">
          <g transform={`rotate(${rotDeg}, ${cx}, ${cy})`}>
            {/* Background arc */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="13"
              strokeDasharray={`${arcLen.toFixed(1)} ${gapLen.toFixed(1)}`}
            />
            {/* Value arc */}
            {value !== null && fillLen > 0 && (
              <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={color}
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={`${fillLen.toFixed(1)} ${(circ - fillLen).toFixed(1)}`}
                style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
              />
            )}
          </g>
          {/* Value */}
          <text x={cx} y={cy + 10} textAnchor="middle" className="gauge-val">{String(displayVal)}</text>
          {unit && (
            <text x={cx} y={cy + 27} textAnchor="middle" className="gauge-unit">{unit}</text>
          )}
          {/* Min / Max labels */}
          <text x="14" y="147" textAnchor="middle" className="gauge-minmax">{min}</text>
          <text x="166" y="147" textAnchor="middle" className="gauge-minmax">{max}</text>
        </svg>
      </div>
    </div>
  )
}
