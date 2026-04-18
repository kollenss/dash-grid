import { useState } from 'react'
import '../../styles/glass.css'
import './AlarmCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string; require_pin?: boolean }
  state?: HAState
}

const STATE_LABELS: Record<string, string> = {
  disarmed: 'Disarmed', armed_home: 'Home', armed_away: 'Away',
  armed_night: 'Night', armed_vacation: 'Vacation', armed_custom_bypass: 'Custom',
  arming: 'Arming…', pending: 'Pending…', triggered: 'TRIGGERED!'
}

const STATE_CLASS: Record<string, string> = {
  disarmed: 'alarm-green', armed_home: 'alarm-red', armed_away: 'alarm-red',
  armed_night: 'alarm-red', armed_vacation: 'alarm-red', armed_custom_bypass: 'alarm-red',
  arming: 'alarm-yellow', pending: 'alarm-yellow alarm-pulse', triggered: 'alarm-red alarm-pulse'
}

export default function AlarmCard({ config, state }: Props) {
  const { callService } = useCore()
  const label      = config.title || config.entity_id.replace(/_/g, ' ')
  const alarmState = state?.state ?? 'unknown'
  const requirePin = config.require_pin ?? false

  const [pin, setPin]             = useState('')
  const [pinTarget, setPinTarget] = useState<string | null>(null)

  function armHome() { requirePin ? setPinTarget('arm_home') : callService('alarm_control_panel', 'arm_home',  { entity_id: config.entity_id }) }
  function armAway() { requirePin ? setPinTarget('arm_away') : callService('alarm_control_panel', 'arm_away',  { entity_id: config.entity_id }) }
  function disarm()  { requirePin ? setPinTarget('disarm')   : callService('alarm_control_panel', 'disarm',    { entity_id: config.entity_id }) }

  function confirmPin() {
    if (!pinTarget) return
    callService('alarm_control_panel', pinTarget, { entity_id: config.entity_id, code: pin })
    setPin('')
    setPinTarget(null)
  }

  const stateClass = STATE_CLASS[alarmState] ?? ''

  return (
    <div className="glass-card alarm-card">
      <div className="card-label">{label}</div>

      <div className={`alarm-status ${stateClass}`}>
        {STATE_LABELS[alarmState] ?? alarmState}
      </div>

      <div className="alarm-btns">
        <button className="alarm-btn" onClick={armHome}>🏠 Home</button>
        <button className="alarm-btn" onClick={armAway}>🚗 Away</button>
        <button className="alarm-btn alarm-btn-disarm" onClick={disarm}>🔓 Disarm</button>
      </div>

      {pinTarget && (
        <div className="alarm-pin-overlay">
          <div className="alarm-pin-box">
            <div className="alarm-pin-title">Enter PIN</div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              className="alarm-pin-input"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmPin() }}
            />
            <div className="alarm-pin-actions">
              <button className="alarm-pin-cancel" onClick={() => { setPinTarget(null); setPin('') }}>Cancel</button>
              <button className="alarm-pin-ok" onClick={confirmPin}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
