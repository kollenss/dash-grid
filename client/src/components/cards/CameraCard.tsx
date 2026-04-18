import { useState, useEffect, useRef } from 'react'
import '../../styles/glass.css'
import './CameraCard.css'
import { HAState } from '../../types'

interface Props {
  config: { entity_id: string; title?: string; refresh_interval?: number }
  state?: HAState
}

export default function CameraCard({ config, state }: Props) {
  const label    = config.title || state?.attributes?.friendly_name || config.entity_id.replace(/_/g, ' ')
  const interval = (config.refresh_interval ?? 5) * 1000
  const cardRef  = useRef<HTMLDivElement>(null)

  const [visible, setVisible]       = useState(false)
  const [imgKey, setImgKey]         = useState(0)
  const [timestamp, setTimestamp]   = useState<string | null>(null)
  const [error, setError]           = useState(false)

  // Lazy load: wait until card is in viewport
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) setVisible(true)
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!visible || interval <= 0) return
    const t = setInterval(() => {
      setImgKey(k => k + 1)
      setTimestamp(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, interval)
    return () => clearInterval(t)
  }, [visible, interval])

  const src = `/api/ha/camera/${encodeURIComponent(config.entity_id)}?_=${imgKey}`

  return (
    <div className="glass-card camera-card" ref={cardRef}>
      <div className="camera-label">{label}</div>
      {visible ? (
        <>
          <div className="camera-img-wrap">
            {error ? (
              <div className="camera-error">📷 Unavailable</div>
            ) : (
              <img
                src={src}
                alt={label}
                className="camera-img"
                onLoad={() => { setError(false); setTimestamp(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })) }}
                onError={() => setError(true)}
              />
            )}
          </div>
          <div className="camera-footer">
            {timestamp && <span className="camera-ts">{timestamp}</span>}
            <button className="camera-refresh-btn" onClick={() => { setImgKey(k => k+1); setError(false) }}>↻</button>
          </div>
        </>
      ) : (
        <div className="camera-placeholder">📷</div>
      )}
    </div>
  )
}
