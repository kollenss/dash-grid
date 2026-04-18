import { useState } from 'react'
import '../../styles/glass.css'
import './ClimateCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

const HVAC_LABELS: Record<string, string> = {
  heat: 'Heating', cool: 'Cooling', heat_cool: 'Auto',
  off: 'Off', auto: 'Auto', dry: 'Dry', fan_only: 'Fan', idle: 'Standby'
}
const HVAC_COLORS: Record<string, string> = {
  heat: '#ff6b35', cool: '#5ac8fa', heat_cool: '#ffd60a',
  off: 'rgba(255,255,255,0.25)', auto: '#5ac8fa', dry: '#a8d8ff', fan_only: '#fff', idle: 'rgba(255,255,255,0.35)'
}

export default function ClimateCard({ config, state }: Props) {
  const { callService } = useCore()
  const label       = config.title || config.entity_id.replace(/_/g, ' ')
  const hvacMode    = state?.state ?? 'off'
  const currentTemp = state?.attributes?.current_temperature ?? null
  const targetTemp  = state?.attributes?.temperature ?? null
  const minTemp     = state?.attributes?.min_temp ?? 5
  const maxTemp     = state?.attributes?.max_temp ?? 35

  const [optimisticTarget, setOptimistic] = useState<number | null>(null)
  const displayTarget = optimisticTarget ?? targetTemp

  function adjustTemp(delta: number) {
    if (displayTarget == null) return
    const next = Math.max(minTemp, Math.min(maxTemp, displayTarget + delta))
    setOptimistic(next)
    callService('climate', 'set_temperature', { entity_id: config.entity_id, temperature: next })
    setTimeout(() => setOptimistic(null), 5000)
  }

  const hvacColor = HVAC_COLORS[hvacMode] ?? 'rgba(255,255,255,0.35)'

  return (
    <div className="glass-card climate-card">
      <div className="card-label">{label}</div>

      {/* Current temperature */}
      {currentTemp !== null && (
        <div className="climate-current">
          <span className="card-value-hero">{Number(currentTemp).toFixed(1)}</span>
          <span className="card-unit">°C</span>
        </div>
      )}

      {/* HVAC mode badge */}
      <div className="climate-mode" style={{ color: hvacColor }}>
        {HVAC_LABELS[hvacMode] ?? hvacMode}
      </div>

      {/* Target temperature control */}
      {displayTarget !== null && (
        <div className="climate-target-row">
          <button className="climate-adj-btn" onClick={() => adjustTemp(-0.5)}>−</button>
          <span className="climate-target">
            {Number(displayTarget).toFixed(1)}°
          </span>
          <button className="climate-adj-btn" onClick={() => adjustTemp(0.5)}>+</button>
        </div>
      )}
    </div>
  )
}
