import { useEffect, useState } from 'react'
import '../../styles/glass.css'
import './SensorCard.css'
import { HAState } from '../../types'

interface Props {
  config: { entity_id: string; title?: string; unit?: string; show_sparkline?: boolean }
  state?: HAState
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 200, H = 40
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sparkline-svg">
      <polyline points={pts} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function SensorCard({ config, state }: Props) {
  const label   = config.title || config.entity_id.replace(/_/g, ' ')
  const value   = state?.state ?? '—'
  const unit    = config.unit ?? state?.attributes?.unit_of_measurement ?? ''
  const updated = state?.last_updated ? formatTime(state.last_updated) : null
  const isNum   = !isNaN(parseFloat(value)) && value !== 'unavailable'

  const [sparkData, setSparkData] = useState<number[]>([])

  useEffect(() => {
    if (!config.show_sparkline) return
    fetch(`/api/ha/history/${encodeURIComponent(config.entity_id)}?hours=24`)
      .then(r => r.json())
      .then((data: any[][]) => {
        if (!Array.isArray(data) || !data[0]) return
        const nums = data[0].map((s: any) => parseFloat(s.state)).filter((v: number) => !isNaN(v))
        setSparkData(nums)
      })
      .catch(() => {})
  }, [config.entity_id, config.show_sparkline])

  return (
    <div className="glass-card sensor-card">
      <div className="card-label">{label}</div>
      <div className="sensor-value">
        <span className={isNum ? 'card-value-large' : 'card-value-unavailable'}>{value}</span>
        {unit && isNum && <span className="card-unit">{unit}</span>}
      </div>
      {config.show_sparkline && sparkData.length > 1 && (
        <div className="sensor-sparkline">
          <Sparkline data={sparkData} />
        </div>
      )}
      {updated && <div className="card-sub">Updated {updated}</div>}
    </div>
  )
}
