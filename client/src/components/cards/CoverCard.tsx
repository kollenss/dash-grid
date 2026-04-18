import '../../styles/glass.css'
import './CoverCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

const STATE_LABELS: Record<string, string> = {
  open: 'Open', closed: 'Closed',
  opening: 'Opening…', closing: 'Closing…', stopped: 'Stopped'
}

export default function CoverCard({ config, state }: Props) {
  const { callService } = useCore()
  const label    = config.title || config.entity_id.replace(/_/g, ' ')
  const coverState = state?.state ?? 'unknown'
  const position   = state?.attributes?.current_position ?? null
  const isMoving   = coverState === 'opening' || coverState === 'closing'

  function send(service: string) {
    callService('cover', service, { entity_id: config.entity_id })
  }

  return (
    <div className="glass-card cover-card">
      <div className="card-label">{label}</div>

      {/* Position bar */}
      <div className="cover-pos-row">
        <div className="cover-pos-track">
          <div
            className={`cover-pos-fill ${isMoving ? 'moving' : ''}`}
            style={{ width: `${position ?? (coverState === 'open' ? 100 : 0)}%` }}
          />
        </div>
        <span className="cover-pos-text">
          {position !== null ? `${position}%` : STATE_LABELS[coverState] ?? coverState}
        </span>
      </div>

      {/* Controls */}
      <div className="cover-btns">
        <button className="cover-btn" onClick={() => send('open_cover')} title="Open">▲</button>
        <button className="cover-btn cover-btn-stop" onClick={() => send('stop_cover')} title="Stop">■</button>
        <button className="cover-btn" onClick={() => send('close_cover')} title="Close">▼</button>
      </div>
    </div>
  )
}
