import { useState, useEffect } from 'react'
import '../../styles/glass.css'
import './ClockCard.css'
import { useCore } from '../../core/CoreContext'

interface Props {
  config: {
    format_24h?: boolean
    show_seconds?: boolean
    show_date?: boolean
    title?: string
    show_weather?: boolean
    weather_entity?: string
  }
}

const DAYS_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS     = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CONDITION_ICON: Record<string, string> = {
  'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️',
  lightning: '⛈️', 'lightning-rainy': '⛈️', partlycloudy: '⛅',
  pouring: '🌧️', rainy: '🌦️', snowy: '❄️', 'snowy-rainy': '🌨️',
  sunny: '☀️', windy: '💨', 'windy-variant': '💨', exceptional: '⚠️',
}

const CONDITION_LABEL: Record<string, string> = {
  'clear-night': 'Clear', cloudy: 'Cloudy', fog: 'Fog', hail: 'Hail',
  lightning: 'Thunder', 'lightning-rainy': 'Thunder & rain', partlycloudy: 'Partly cloudy',
  pouring: 'Heavy rain', rainy: 'Rain', snowy: 'Snow', 'snowy-rainy': 'Sleet',
  sunny: 'Sunny', windy: 'Windy', 'windy-variant': 'Windy', exceptional: 'Unusual',
}

// Maps a temperature (°C) to an RGB color across a cold→warm gradient
function tempColor(t: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0,  [77,  184, 232]],  // blue
    [8,  [77,  212, 170]],  // teal
    [14, [168, 224,  99]],  // yellow-green
    [18, [245, 215,  66]],  // yellow
    [23, [245, 166,  35]],  // orange
    [30, [224,  92,  26]],  // red-orange
  ]
  const c = Math.max(0, Math.min(30, t))
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (c >= stops[i][0] && c <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const f = lo[0] === hi[0] ? 0 : (c - lo[0]) / (hi[0] - lo[0])
  const r = Math.round(lo[1][0] + f * (hi[1][0] - lo[1][0]))
  const g = Math.round(lo[1][1] + f * (hi[1][1] - lo[1][1]))
  const b = Math.round(lo[1][2] + f * (hi[1][2] - lo[1][2]))
  return `rgb(${r},${g},${b})`
}

function TempBar({ min, max, current, globalMin, globalMax }: {
  min: number; max: number; current?: number; globalMin: number; globalMax: number
}) {
  const range    = globalMax - globalMin || 1
  const leftPct  = ((min - globalMin) / range) * 100
  const rightPct = ((max - globalMin) / range) * 100
  const dotPct   = current !== undefined ? ((current - globalMin) / range) * 100 : null

  return (
    <div className="clock-temp-track">
      <div
        className="clock-temp-fill"
        style={{
          left: `${leftPct}%`,
          right: `${100 - rightPct}%`,
          background: `linear-gradient(to right, ${tempColor(min)}, ${tempColor(max)})`,
        }}
      />
      {dotPct !== null && (
        <div className="clock-temp-dot" style={{ left: `${dotPct}%` }} />
      )}
    </div>
  )
}

function fmtDateLong(d: Date): string {
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmtDateShort(d: Date): string {
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export default function ClockCard({ config }: Props) {
  const use24       = config.format_24h !== false
  const showSec     = config.show_seconds ?? false
  const showDate    = config.show_date !== false
  const showWeather = config.show_weather === true
  const weatherId   = config.weather_entity ?? ''

  const { states } = useCore()
  const weatherState = showWeather && weatherId ? states[weatherId] : null

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const [forecast, setForecast] = useState<any[]>([])
  useEffect(() => {
    if (!showWeather || !weatherId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/ha/weather-forecast/${encodeURIComponent(weatherId)}`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          setForecast(data.forecast ?? [])
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 15 * 60 * 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [showWeather, weatherId])

  const h    = use24
    ? now.getHours().toString().padStart(2, '0')
    : ((now.getHours() % 12) || 12).toString()
  const m    = now.getMinutes().toString().padStart(2, '0')
  const s    = now.getSeconds().toString().padStart(2, '0')
  const ampm = !use24 ? (now.getHours() < 12 ? 'AM' : 'PM') : ''

  // ── Weather mode ────────────────────────────────────────
  if (showWeather && weatherState) {
    const condition = weatherState.state ?? 'unknown'
    const icon      = CONDITION_ICON[condition] ?? '🌡️'
    const condLabel = CONDITION_LABEL[condition] ?? condition
    const temp      = weatherState.attributes?.temperature ?? null
    const days = forecast.slice(0, 5)

    const allTemps = days.flatMap((d: any) => [d.temperature, d.templow ?? d.temperature])
    const globalMin = allTemps.length ? Math.min(...allTemps) : 0
    const globalMax = allTemps.length ? Math.max(...allTemps) : 30
    const currentTemp = temp !== null ? Number(temp) : undefined

    return (
      <div className="glass-card clock-card clock-weather">
        <div className="clock-w-top">
          <div className="clock-w-icon">{icon}</div>
          <div className="clock-w-right">
            <div className="clock-w-condition">
              {condLabel}{temp !== null ? `, ${Math.round(Number(temp))}°C` : ''}
            </div>
            <div className="clock-w-time">
              {h}:{m}{showSec ? `:${s}` : ''}
            </div>
            {showDate && <div className="clock-w-date">{fmtDateShort(now)}</div>}
          </div>
        </div>

        <div className="clock-w-forecast">
          {days.map((day: any, i: number) => {
            const dayMin = day.templow ?? day.temperature
            const dayMax = day.temperature
            const isToday = i === 0
            return (
              <div key={i} className="clock-fc-row">
                <span className="clock-fc-day">{DAYS_SHORT[new Date(day.datetime).getDay()]}</span>
                <span className="clock-fc-icon">{CONDITION_ICON[day.condition] ?? '🌡️'}</span>
                <span className="clock-fc-lo">{Math.round(dayMin)}°</span>
                <TempBar
                  min={dayMin}
                  max={dayMax}
                  current={isToday ? currentTemp : undefined}
                  globalMin={globalMin}
                  globalMax={globalMax}
                />
                <span className="clock-fc-hi">{Math.round(dayMax)}°</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Default clock mode ───────────────────────────────────
  return (
    <div className="glass-card clock-card">
      <div className="clock-layout">
        <span className="clock-hm">{h}:{m}</span>
        <div className="clock-side">
          {showDate && <span className="clock-date">{fmtDateLong(now)}</span>}
          {ampm && <span className="clock-ampm">{ampm}</span>}
          {showSec && <span className="clock-sec">{s}</span>}
        </div>
      </div>
    </div>
  )
}
