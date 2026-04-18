import { useState, useEffect, useRef } from 'react'
import '../../styles/glass.css'
import './MediaPlayerCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}

export default function MediaPlayerCard({ config, state }: Props) {
  const { callService } = useCore()
  const label       = config.title || config.entity_id.replace(/_/g, ' ')
  const playerState = state?.state ?? 'off'
  const isPlaying   = playerState === 'playing'
  const isActive    = playerState !== 'off' && playerState !== 'unavailable'

  const title   = state?.attributes?.media_title ?? null
  const artist  = state?.attributes?.media_artist ?? null
  const artwork = state?.attributes?.entity_picture ?? null
  const volume  = state?.attributes?.volume_level ?? null   // 0.0–1.0
  const duration = state?.attributes?.media_duration ?? null
  const position = state?.attributes?.media_position ?? null
  const posUpdated = state?.attributes?.media_position_updated_at ?? null

  // Estimate live position
  const [livePos, setLivePos] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isPlaying || position == null) { setLivePos(position); return }
    const base = position
    const updAt = posUpdated ? new Date(posUpdated).getTime() : Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - updAt) / 1000
      setLivePos(base + elapsed)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, position, posUpdated])

  function send(service: string, extra?: Record<string, any>) {
    callService('media_player', service, { entity_id: config.entity_id, ...extra })
  }

  const pct = duration && livePos != null ? Math.min(1, livePos / duration) * 100 : null

  return (
    <div className="glass-card media-card">
      <div className="card-label">{label}</div>

      <div className="media-main">
        {/* Artwork */}
        <div className="media-art">
          {artwork ? (
            <img src={`/api/ha/media-image?path=${encodeURIComponent(artwork)}`} alt="" className="media-art-img" />
          ) : (
            <div className="media-art-placeholder">🎵</div>
          )}
        </div>

        {/* Info */}
        <div className="media-info">
          <div className="media-title">{isActive ? (title ?? '—') : playerState === 'off' ? 'Off' : 'Inactive'}</div>
          {artist && <div className="media-artist">{artist}</div>}
        </div>
      </div>

      {/* Progress */}
      {pct !== null && (
        <div className="media-progress-track">
          <div className="media-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      {duration && livePos != null && (
        <div className="media-time-row">
          <span>{fmtDuration(livePos)}</span>
          <span>{fmtDuration(duration)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="media-controls">
        <button className="media-btn" onClick={() => send('media_previous_track')} disabled={!isActive}>⏮</button>
        <button className="media-btn media-btn-main" onClick={() => send('media_play_pause')} disabled={!isActive}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="media-btn" onClick={() => send('media_next_track')} disabled={!isActive}>⏭</button>
      </div>

      {/* Volume */}
      {volume !== null && (
        <div className="media-vol-row">
          <span className="media-vol-icon">{volume < 0.01 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
          <input
            type="range" min={0} max={100} value={Math.round(volume * 100)}
            className="media-vol-slider"
            onChange={e => send('volume_set', { volume_level: Number(e.target.value) / 100 })}
          />
          <span className="media-vol-pct">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  )
}
