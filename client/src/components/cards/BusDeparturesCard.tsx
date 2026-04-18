import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/glass.css'
import './BusDeparturesCard.css'

interface Line {
  designation?: string
  name?: string
  backgroundColor?: string
  foregroundColor?: string
  transportMode?: string
}

interface ServiceJourney {
  direction?: string
  line?: Line
}

interface Departure {
  serviceJourney?: ServiceJourney
  plannedTime: string
  estimatedOtherwisePlannedTime?: string
  estimatedTime?: string
  isCancelled?: boolean
  stopPoint?: { name?: string; designation?: string }
}

interface Props {
  config: { stop_area_gid: string; title?: string; limit?: number; warn_minutes?: number; hide_now?: boolean }
  colSpan?: number
  rowSpan?: number
}

const TRANSPORT_ICON: Record<string, string> = {
  bus: '🚌', tram: '🚃', train: '🚆', ferry: '⛴️', taxi: '🚕'
}

function minutesUntil(isoTime: string): number {
  return Math.round((new Date(isoTime).getTime() - Date.now()) / 60000)
}

function formatTime(isoTime: string): string {
  const d = new Date(isoTime)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function BusDeparturesCard({ config, colSpan = 3, rowSpan = 4 }: Props) {
  const navigate = useNavigate()
  const [departures, setDepartures] = useState<Departure[]>([])
  const [nextDeparture, setNextDeparture] = useState<Departure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const stopGid = config.stop_area_gid
  const limit = config.limit ?? 8

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/vasttrafik/departures/${stopGid}?limit=${limit}&timeSpanInMinutes=90`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = (err as any).error ?? `HTTP ${res.status}`
        setError(res.status === 401
          ? `${msg} — Check Västtrafik token in Settings`
          : msg)
        return
      }
      const data = await res.json()
      const results: Departure[] = data.results ?? []
      setDepartures(results)
      setLastUpdated(new Date())
      setError(null)

      if (results.length === 0) {
        // Find next planned departure within 24h
        const next = await fetch(
          `/api/vasttrafik/departures/${stopGid}?limit=1&timeSpanInMinutes=1440`
        )
        if (next.ok) {
          const nextData = await next.json()
          setNextDeparture(nextData.results?.[0] ?? null)
        }
      } else {
        setNextDeparture(null)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }, [stopGid, limit])

  useEffect(() => {
    fetchDepartures()
    const timer = setInterval(fetchDepartures, 60_000)
    return () => clearInterval(timer)
  }, [fetchDepartures])

  // Re-render every 10s so "min" counts stay fresh
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const title = config.title ?? 'Departures'

  // Responsiva beräkningar baserade på kortets storlek
  const compact = rowSpan === 1
  const minimal = colSpan === 1 && rowSpan === 1   // bara 1x1
  const showDirection = colSpan >= 3
  // Hur många avgångar som ryms visuellt
  const displayLimit = Math.min(
    config.limit ?? 8,
    compact  ? 1                :           // Nx1 → en avgång
    (rowSpan - 1) * 2 + 1                  // NxM → ~3 per extra rad
  )
  const filteredDepartures = config.hide_now
    ? departures.filter(d => minutesUntil(d.estimatedOtherwisePlannedTime ?? d.plannedTime) > 0)
    : departures
  const visibleDepartures = filteredDepartures.slice(0, displayLimit)

  const cardClass = [
    'glass-card bus-card',
    minimal  ? 'bus-card--minimal'  : '',
    compact && !minimal ? 'bus-card--compact' : '',
    !showDirection && !minimal ? 'bus-card--narrow' : '',
  ].filter(Boolean).join(' ')

  // ── Minimal 1xN-layout (vertikal kolumn) ─────────────────────────────────
  if (minimal) {
    return (
      <div className={cardClass}>
        <span className="bus-minimal-label">{title}</span>
        {error || departures.length === 0 ? (
          <span className="bus-minimal-empty">—</span>
        ) : (
          visibleDepartures.map((dep, i) => {
            const line = dep.serviceJourney?.line
            const bg   = line?.backgroundColor ?? '#555'
            const fg   = line?.foregroundColor ?? '#fff'
            const designation = line?.designation ?? line?.name ?? '?'
            const bestTime = dep.estimatedOtherwisePlannedTime ?? dep.plannedTime
            const mins = minutesUntil(bestTime)
            return (
              <div key={i} className={`bus-minimal-row${dep.isCancelled ? ' bus-row--cancelled' : ''}`}>
                <span className="bus-line-badge" style={{ backgroundColor: bg, color: fg }}>
                  {designation}
                </span>
                <span className="bus-minimal-mins">
                  {dep.isCancelled
                    ? <span className="bus-cancelled">X</span>
                    : mins <= 0 ? <span className="bus-now">Nu</span>
                    : <><strong>{mins}</strong> min</>}
                </span>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── Normal layout (compact 1-rad, eller full multi-rad) ───────────────────
  return (
    <div className={cardClass}>
      <div className="bus-card-header">
        <span className="card-label">{title}</span>
        {lastUpdated && !compact && colSpan > 1 && (
          <span className="bus-updated">
            {formatTime(lastUpdated.toISOString())}
          </span>
        )}
      </div>

      {error ? (
        <div className="bus-error" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>{error} · Öppna Inställningar</div>
      ) : departures.length === 0 ? (
        <div className="bus-empty">
          {compact ? 'Inga avgångar' : 'Inga avgångar inom 90 min.'}
          {nextDeparture && !compact && (
            <div className="bus-next">
              Nästa: {nextDeparture.serviceJourney?.line?.designation && (
                <span
                  className="bus-next-badge"
                  style={{
                    backgroundColor: nextDeparture.serviceJourney.line.backgroundColor ?? '#555',
                    color: nextDeparture.serviceJourney.line.foregroundColor ?? '#fff',
                  }}
                >
                  {nextDeparture.serviceJourney.line.designation}
                </span>
              )}
              {' '}{nextDeparture.serviceJourney?.direction} kl {formatTime(nextDeparture.plannedTime)}
            </div>
          )}
        </div>
      ) : (
        <div className="bus-list">
          {visibleDepartures.map((dep, i) => {
            const line = dep.serviceJourney?.line
            const direction = dep.serviceJourney?.direction ?? '—'
            const bg = line?.backgroundColor ?? '#555'
            const fg = line?.foregroundColor ?? '#fff'
            const designation = line?.designation ?? line?.name ?? '?'
            const mode = line?.transportMode?.toLowerCase() ?? 'bus'
            const modeIcon = TRANSPORT_ICON[mode] ?? '🚌'
            const bestTime = dep.estimatedOtherwisePlannedTime ?? dep.plannedTime
            const mins = minutesUntil(bestTime)
            const delayMins = dep.estimatedTime
              ? Math.round((new Date(dep.estimatedTime).getTime() - new Date(dep.plannedTime).getTime()) / 60000)
              : 0
            const isDelayed = delayMins > 0
            const cancelled = dep.isCancelled

            return (
              <div key={i} className={`bus-row ${cancelled ? 'bus-row--cancelled' : ''}`}>
                <span
                  className="bus-line-badge"
                  style={{ backgroundColor: bg, color: fg }}
                  title={modeIcon + ' ' + (line?.name ?? '')}
                >
                  {designation}
                </span>
                {showDirection && (
                  <span className="bus-direction">{direction}</span>
                )}
                <span className="bus-time-col">
                  {cancelled ? (
                    <span className="bus-cancelled">Inställd</span>
                  ) : (() => {
                    const isWarn = !!config.warn_minutes && mins > 0 && mins <= config.warn_minutes
                    const badgeStyle = mins <= 0
                      ? { background: 'var(--hb-status-error)', color: '#fff' }
                      : isWarn
                        ? { background: 'var(--hb-status-warning)', color: '#1a1a1a' }
                        : undefined
                    return (
                      <span className="bus-mins-badge" style={badgeStyle}>
                        {mins <= 0
                          ? <span className="bus-mins-now">Nu</span>
                          : <><strong>{mins}</strong><span className="bus-mins-unit"> min</span></>}
                      </span>
                    )
                  })()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
