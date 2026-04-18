import { useState } from 'react'
import '../../styles/glass.css'
import './LightCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

export default function LightCard({ config, state }: Props) {
  const { callService } = useCore()
  const label         = config.title || config.entity_id.replace(/_/g, ' ')
  const isOn          = state?.state === 'on'
  const isUnavailable = !state || state.state === 'unavailable'

  const [optOn, setOptOn]   = useState<boolean | null>(null)
  const displayOn = optOn !== null ? optOn : isOn

  const brightness = state?.attributes?.brightness != null
    ? Math.round((state.attributes.brightness / 255) * 100)
    : null
  const colorTempK    = state?.attributes?.color_temp_kelvin ?? null
  const minK          = state?.attributes?.min_color_temp_kelvin ?? 2000
  const maxK          = state?.attributes?.max_color_temp_kelvin ?? 6500
  const supportedModes: string[] = state?.attributes?.supported_color_modes ?? []
  const supportsColor  = supportedModes.some(m => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m))
  const supportsTemp   = supportedModes.includes('color_temp')
  const supportsBrightness = supportedModes.some(m => m !== 'onoff')

  function toggle() {
    if (isUnavailable) return
    const next = !displayOn
    setOptOn(next)
    callService('light', next ? 'turn_on' : 'turn_off', { entity_id: config.entity_id })
    setTimeout(() => setOptOn(null), 3000)
  }

  function setBrightness(pct: number) {
    callService('light', 'turn_on', { entity_id: config.entity_id, brightness_pct: pct })
  }

  function setColorTemp(k: number) {
    callService('light', 'turn_on', { entity_id: config.entity_id, color_temp_kelvin: k })
  }

  const rgbColor: [number, number, number] | null = state?.attributes?.rgb_color ?? null
  const rgbStr = rgbColor ? `rgb(${rgbColor.join(',')})` : null

  return (
    <div className="glass-card light-card">
      <div className="card-label">{label}</div>

      {/* On/off row */}
      <div className="light-top-row">
        <span
          className="light-bulb"
          style={{ color: displayOn ? (rgbStr ?? '#ffd60a') : 'rgba(255,255,255,0.25)' }}
        >
          💡
        </span>
        <button
          className={`ios-toggle ${displayOn ? 'on' : 'off'} ${isUnavailable ? 'disabled' : ''}`}
          onClick={toggle}
          disabled={isUnavailable}
        >
          <span className="ios-toggle-thumb" />
        </button>
      </div>

      {/* Brightness slider */}
      {supportsBrightness && isOn && brightness !== null && (
        <label className="light-slider-label">
          <span className="light-slider-name">Brightness {brightness}%</span>
          <input
            type="range" min={1} max={100} value={brightness}
            className="light-slider"
            onChange={e => setBrightness(Number(e.target.value))}
          />
        </label>
      )}

      {/* Color temp slider */}
      {supportsTemp && isOn && colorTempK !== null && (
        <label className="light-slider-label">
          <span className="light-slider-name">Color temp {Math.round(colorTempK)}K</span>
          <input
            type="range" min={minK} max={maxK} value={colorTempK}
            className="light-slider light-slider-temp"
            style={{ '--temp-pct': `${((colorTempK - minK) / (maxK - minK)) * 100}%` } as any}
            onChange={e => setColorTemp(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  )
}
