import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/glass.css'
import './NewsCard.css'

interface RssItem {
  title: string
  description: string
  link: string
  pubDate: string
  thumbnail: string | null
}

interface Feed {
  title: string
  items: RssItem[]
}

interface Props {
  config: {
    feed_url?: string
    title?: string
    max_items?: number
  }
}

function relativeTime(pubDate: string): string {
  if (!pubDate) return ''
  const ms = Date.now() - new Date(pubDate).getTime()
  if (isNaN(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatDate(pubDate: string): string {
  if (!pubDate) return ''
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return pubDate
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

export default function NewsCard({ config }: Props) {
  const [feed, setFeed] = useState<Feed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RssItem | null>(null)

  const fetchFeed = useCallback(async () => {
    const url = config.feed_url
    if (!url) return
    try {
      const res = await fetch(`/api/rss/feed?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Feed = await res.json()
      setFeed(data)
      setError(null)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load feed')
    }
  }, [config.feed_url])

  useEffect(() => {
    fetchFeed()
    const id = setInterval(fetchFeed, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchFeed])

  const cardTitle = config.title || feed?.title || 'News'
  const items = (feed?.items ?? []).slice(0, config.max_items ?? 15)

  return (
    <div className="glass-card news-card">
      <div className="card-label">{cardTitle}</div>

      {!config.feed_url ? (
        <div className="news-empty">No feed configured</div>
      ) : error ? (
        <div className="news-error">{error}</div>
      ) : !feed ? (
        <div className="news-loading">Loading…</div>
      ) : (
        <ul className="news-list">
          {items.map((item, i) => (
            <li key={i} className="news-item" onClick={() => setSelected(item)}>
              <span className="news-item-title">{item.title}</span>
              <span className="news-item-time">{relativeTime(item.pubDate)}</span>
            </li>
          ))}
        </ul>
      )}

      {selected && createPortal(
        <div className="news-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="news-modal" onClick={e => e.stopPropagation()}>
            <button
              className="news-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="news-modal-title">{selected.title}</h2>
            {selected.pubDate && (
              <div className="news-modal-date">{formatDate(selected.pubDate)}</div>
            )}
            {selected.description ? (
              <div
                className="news-modal-body"
                dangerouslySetInnerHTML={{ __html: sanitize(selected.description) }}
              />
            ) : (
              <div className="news-modal-body news-modal-nobody">No description available.</div>
            )}
            {selected.link && (
              <a
                className="news-modal-link"
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read full article →
              </a>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
