import { useState, useEffect } from 'react'
import '../../styles/glass.css'
import './IframeCard.css'

interface Props {
  config: { url?: string; title?: string; refresh_interval?: number }
}

export default function IframeCard({ config }: Props) {
  const url      = config.url ?? ''
  const interval = (config.refresh_interval ?? 0) * 1000
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!interval || interval <= 0) return
    const t = setInterval(() => setKey(k => k+1), interval)
    return () => clearInterval(t)
  }, [interval])

  if (!url) {
    return (
      <div className="glass-card iframe-card iframe-empty">
        <span>URL saknas</span>
      </div>
    )
  }

  return (
    <div className="glass-card iframe-card">
      {config.title && <div className="iframe-title">{config.title}</div>}
      <iframe
        key={key}
        src={url}
        className="iframe-embed"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title={config.title ?? 'iframe'}
      />
    </div>
  )
}
