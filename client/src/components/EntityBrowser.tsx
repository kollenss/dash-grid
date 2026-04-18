import { useState, useEffect } from 'react'
import './EntityBrowser.css'
import { HAState } from '../types'

interface Props {
  onSelect: (entityId: string, state: HAState) => void
  onClose:  () => void
  /** Optional domain filter, e.g. ['light','switch'] */
  domains?: string[]
}

const DOMAIN_ICONS: Record<string, string> = {
  light: '💡', switch: '🔌', sensor: '📊', binary_sensor: '🔵',
  climate: '🌡️', cover: '🏠', media_player: '🎵', person: '👤',
  camera: '📷', alarm_control_panel: '🔒', scene: '🎨',
  weather: '⛅', automation: '⚡', script: '📜', input_boolean: '✅',
  input_number: '🔢', fan: '💨', lock: '🔑', vacuum: '🤖',
  number: '🔢', select: '📋', text: '📝', button: '🔘',
  device_tracker: '📍', zone: '📍', sun: '☀️', timer: '⏱️',
}

function getDomain(entityId: string): string {
  return entityId.split('.')[0] ?? 'other'
}

function formatState(state: HAState): string {
  const s = state.state
  const unit = state.attributes?.unit_of_measurement ?? ''
  if (s === 'unavailable') return '—'
  if (s === 'unknown') return '?'
  if (s === 'on')  return 'On'
  if (s === 'off') return 'Off'
  return unit ? `${s} ${unit}` : s
}

export default function EntityBrowser({ onSelect, onClose, domains }: Props) {
  const [allStates, setAllStates] = useState<HAState[]>([])
  const [query, setQuery]         = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/ha/states')
      .then(r => r.json())
      .then((data: HAState[]) => {
        let filtered = data
        if (domains?.length) filtered = data.filter(s => domains.includes(getDomain(s.entity_id)))
        filtered.sort((a, b) => getDomain(a.entity_id).localeCompare(getDomain(b.entity_id)) || a.entity_id.localeCompare(b.entity_id))
        setAllStates(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? allStates.filter(s => {
        const q = query.toLowerCase()
        const name = (s.attributes?.friendly_name ?? '').toLowerCase()
        return s.entity_id.toLowerCase().includes(q) || name.includes(q)
      })
    : allStates

  // Group by domain
  const groups: Record<string, HAState[]> = {}
  for (const s of filtered) {
    const d = getDomain(s.entity_id)
    if (!groups[d]) groups[d] = []
    groups[d].push(s)
  }

  return (
    <div className="eb-backdrop" onClick={onClose}>
      <div className="eb-sheet" onClick={e => e.stopPropagation()}>
        <div className="eb-handle" />

        <div className="eb-search-row">
          <input
            className="eb-search"
            type="text"
            placeholder="Search entity…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button className="eb-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="eb-list">
          {loading && <div className="eb-empty">Loading entities…</div>}
          {!loading && filtered.length === 0 && <div className="eb-empty">No results</div>}
          {!loading && Object.entries(groups).map(([domain, states]) => (
            <div key={domain} className="eb-group">
              <div className="eb-group-header">
                <span>{DOMAIN_ICONS[domain] ?? '●'}</span>
                <span>{domain}</span>
                <span className="eb-group-count">{states.length}</span>
              </div>
              {states.map(s => (
                <button key={s.entity_id} className="eb-row" onClick={() => onSelect(s.entity_id, s)}>
                  <div className="eb-row-main">
                    <div className="eb-row-name">
                      {s.attributes?.friendly_name || s.entity_id}
                    </div>
                    <div className="eb-row-id">{s.entity_id}</div>
                  </div>
                  <div className="eb-row-state">{formatState(s)}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
