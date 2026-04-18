import { useState } from 'react'
import '../../styles/glass.css'
import './SwitchCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function SwitchCard({ config, state }: Props) {
  const { callService } = useCore()
  const label          = config.title || config.entity_id.replace(/_/g, ' ')
  const isOn           = state?.state === 'on'
  const isUnavailable  = !state || state.state === 'unavailable'
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const displayOn = optimistic !== null ? optimistic : isOn

  function handleToggle() {
    if (isUnavailable) return
    const next = !displayOn
    setOptimistic(next)
    const domain = config.entity_id.startsWith('light.') ? 'light' : 'switch'
    callService(domain, next ? 'turn_on' : 'turn_off', { entity_id: config.entity_id })
    setTimeout(() => setOptimistic(null), 3000)
  }

  const lastChanged = state?.last_changed ? fmtTime(state.last_changed) : null

  return (
    <div className="glass-card switch-card" onClick={handleToggle}>
      <div className="card-label">{label}</div>
      <div className="switch-body">
        <div>
          <span className={`switch-status ${displayOn ? 'on' : 'off'}`}>
            {isUnavailable ? 'Unavailable' : displayOn ? 'On' : 'Off'}
          </span>
          {lastChanged && !isUnavailable && (
            <div className="switch-last-changed">
              {displayOn ? 'On' : 'Off'} since {lastChanged}
            </div>
          )}
        </div>
        <button
          className={`ios-toggle ${displayOn ? 'on' : 'off'} ${isUnavailable ? 'disabled' : ''}`}
          onClick={e => { e.stopPropagation(); handleToggle() }}
          disabled={isUnavailable}
          aria-label={displayOn ? 'Turn off' : 'Turn on'}
        >
          <span className="ios-toggle-thumb" />
        </button>
      </div>
    </div>
  )
}
