/**
 * Built-in card registrations.
 *
 * Imported once in main.tsx to register all built-in card types.
 * Third-party cards do the same in their own entry file.
 */

import { registry } from '../../core/CardRegistry'
import type { ConfigUIProps } from '../../core/types'

import SensorCard        from './SensorCard'
import SwitchCard        from './SwitchCard'
import GaugeCard         from './GaugeCard'
import HistoryGraphCard  from './HistoryGraphCard'
import LightCard         from './LightCard'
import CoverCard         from './CoverCard'
import ClimateCard       from './ClimateCard'
import SceneCard         from './SceneCard'
import MediaPlayerCard   from './MediaPlayerCard'
import PersonCard        from './PersonCard'
import WeatherCard       from './WeatherCard'
import CameraCard        from './CameraCard'
import AlarmCard         from './AlarmCard'
import ClockCard         from './ClockCard'
import GreetingCard      from './GreetingCard'
import MarkdownCard      from './MarkdownCard'
import IframeCard        from './IframeCard'

// ─── ConfigUI components ───────────────────────────────────────────────────────
// Rendered inside AddCardModal (step 2 — configuration).
// These use CSS classes from AddCardModal.css which are globally scoped.

function SensorConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label">Unit (optional, overrides HA)
        <input className="modal-input" value={config.unit ?? ''} onChange={e => onChange('unit', e.target.value)} placeholder="°C" />
      </label>
      <label className="modal-label modal-label-check">
        <input type="checkbox" checked={!!config.show_sparkline} onChange={e => onChange('show_sparkline', e.target.checked)} />
        Show sparkline (24h history)
      </label>
    </>
  )
}

function GaugeConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <div className="modal-size-row">
      <label className="modal-label">Min
        <input className="modal-input" type="number" value={config.min ?? 0} onChange={e => onChange('min', Number(e.target.value))} />
      </label>
      <label className="modal-label">Max
        <input className="modal-input" type="number" value={config.max ?? 100} onChange={e => onChange('max', Number(e.target.value))} />
      </label>
    </div>
  )
}

function HistoryGraphConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label">Time period
        <select className="modal-input" value={config.hours ?? 24} onChange={e => onChange('hours', Number(e.target.value))}>
          {[1, 6, 24, 168].map(h => <option key={h} value={h}>{h === 168 ? '7 days' : `${h}h`}</option>)}
        </select>
      </label>
      <label className="modal-label">Line style
        <select className="modal-input" value={config.line_style ?? 'smooth'} onChange={e => onChange('line_style', e.target.value)}>
          <option value="smooth">Smooth — trend line</option>
          <option value="peaks">Trend & Peaks — trend with highs/lows</option>
          <option value="crisp">Crisp — light smoothing</option>
          <option value="sharp">Sharp — raw data</option>
        </select>
      </label>
    </>
  )
}

function SceneConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label">Icon (emoji)
        <input className="modal-input" value={config.icon ?? ''} onChange={e => onChange('icon', e.target.value)} placeholder="🎨" />
      </label>
      <label className="modal-label">Accent color (CSS)
        <input className="modal-input" value={config.color ?? ''} onChange={e => onChange('color', e.target.value)} placeholder="rgba(90,200,250,0.25)" />
      </label>
    </>
  )
}

function AlarmConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <label className="modal-label modal-label-check">
      <input type="checkbox" checked={!!config.require_pin} onChange={e => onChange('require_pin', e.target.checked)} />
      Require PIN to disarm
    </label>
  )
}

function ClockConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label modal-label-check">
        <input type="checkbox" checked={config.format_24h !== false} onChange={e => onChange('format_24h', e.target.checked)} />
        24-hour format
      </label>
      <label className="modal-label modal-label-check">
        <input type="checkbox" checked={!!config.show_seconds} onChange={e => onChange('show_seconds', e.target.checked)} />
        Show seconds
      </label>
      <label className="modal-label modal-label-check">
        <input type="checkbox" checked={config.show_date !== false} onChange={e => onChange('show_date', e.target.checked)} />
        Show date
      </label>
    </>
  )
}

function GreetingConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <label className="modal-label">Name (optional)
      <input className="modal-input" value={config.name ?? ''} onChange={e => onChange('name', e.target.value)} placeholder="Alex" />
    </label>
  )
}

function MarkdownConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <label className="modal-label">Content (Markdown)
      <textarea
        className="modal-input modal-textarea"
        value={config.content ?? ''}
        onChange={e => onChange('content', e.target.value)}
        placeholder="## Heading&#10;Text with **bold**"
        rows={4}
      />
    </label>
  )
}

function IframeConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label">URL
        <input className="modal-input" type="url" value={config.url ?? ''} onChange={e => onChange('url', e.target.value)} placeholder="https://…" required />
      </label>
      <label className="modal-label">Refresh every Xs (0 = never)
        <input className="modal-input" type="number" min={0} value={config.refresh_interval ?? 0} onChange={e => onChange('refresh_interval', Number(e.target.value))} />
      </label>
    </>
  )
}

function WeatherConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <label className="modal-label modal-label-check">
      <input type="checkbox" checked={config.show_forecast !== false} onChange={e => onChange('show_forecast', e.target.checked)} />
      Show 5-day forecast
    </label>
  )
}

// ─── Registrations ─────────────────────────────────────────────────────────────

registry.register({
  type: 'sensor',
  label: 'Sensor',
  icon: '📊',
  group: 'Sensors',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['sensor', 'binary_sensor', 'input_number', 'number'],
  component: SensorCard,
  configUI: SensorConfigUI,
})

registry.register({
  type: 'gauge',
  label: 'Gauge',
  icon: '🎯',
  group: 'Sensors',
  defaultSize: [2, 2],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['sensor', 'input_number', 'number'],
  component: GaugeCard,
  configUI: GaugeConfigUI,
})

registry.register({
  type: 'history_graph',
  label: 'History Graph',
  icon: '📈',
  group: 'Sensors',
  defaultSize: [4, 2],
  minSize: [3, 2],
  needsEntity: true,
  defaultDomains: ['sensor', 'input_number'],
  component: HistoryGraphCard,
  configUI: HistoryGraphConfigUI,
})

registry.register({
  type: 'switch',
  label: 'Switch',
  icon: '🔌',
  group: 'Control',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['switch', 'input_boolean'],
  component: SwitchCard,
})

registry.register({
  type: 'light',
  label: 'Light',
  icon: '💡',
  group: 'Control',
  defaultSize: [2, 3],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['light'],
  component: LightCard,
})

registry.register({
  type: 'cover',
  label: 'Cover',
  icon: '🏠',
  group: 'Control',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['cover'],
  component: CoverCard,
})

registry.register({
  type: 'climate',
  label: 'Thermostat',
  icon: '🌡️',
  group: 'Control',
  defaultSize: [2, 3],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['climate'],
  component: ClimateCard,
})

registry.register({
  type: 'scene',
  label: 'Scene',
  icon: '🎨',
  group: 'Control',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['scene'],
  component: SceneCard,
  configUI: SceneConfigUI,
})

registry.register({
  type: 'media_player',
  label: 'Media Player',
  icon: '🎵',
  group: 'Media',
  defaultSize: [3, 3],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['media_player'],
  component: MediaPlayerCard,
})

registry.register({
  type: 'person',
  label: 'Person',
  icon: '👤',
  group: 'Media',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['person'],
  component: PersonCard,
})

registry.register({
  type: 'weather',
  label: 'Weather',
  icon: '⛅',
  group: 'Media',
  defaultSize: [3, 3],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['weather'],
  component: WeatherCard,
  configUI: WeatherConfigUI,
})

registry.register({
  type: 'camera',
  label: 'Camera',
  icon: '📷',
  group: 'Special',
  defaultSize: [3, 2],
  needsEntity: true,
  defaultDomains: ['camera'],
  component: CameraCard,
})

registry.register({
  type: 'alarm',
  label: 'Alarm',
  icon: '🔒',
  group: 'Special',
  defaultSize: [3, 2],
  minSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['alarm_control_panel'],
  component: AlarmCard,
  configUI: AlarmConfigUI,
})

registry.register({
  type: 'clock',
  label: 'Clock',
  icon: '🕐',
  group: 'Static',
  defaultSize: [2, 2],
  needsEntity: false,
  component: ClockCard,
  configUI: ClockConfigUI,
})

registry.register({
  type: 'greeting',
  label: 'Greeting',
  icon: '👋',
  group: 'Static',
  defaultSize: [3, 1],
  needsEntity: false,
  component: GreetingCard,
  configUI: GreetingConfigUI,
})

registry.register({
  type: 'markdown',
  label: 'Text',
  icon: '📝',
  group: 'Static',
  defaultSize: [3, 2],
  needsEntity: false,
  component: MarkdownCard,
  configUI: MarkdownConfigUI,
})

registry.register({
  type: 'iframe',
  label: 'Webpage',
  icon: '🌐',
  group: 'Static',
  defaultSize: [4, 3],
  needsEntity: false,
  component: IframeCard,
  configUI: IframeConfigUI,
})
