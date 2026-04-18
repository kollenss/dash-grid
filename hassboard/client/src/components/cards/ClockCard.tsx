import { useState, useEffect } from 'react'
import '../../styles/glass.css'
import './ClockCard.css'

interface Props {
  config: { format_24h?: boolean; show_seconds?: boolean; show_date?: boolean; title?: string }
  colSpan?: number
  rowSpan?: number
}

const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

function fmtDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function ClockCard({ config, colSpan = 2, rowSpan = 2 }: Props) {
  const use24    = config.format_24h !== false
  const showSec  = config.show_seconds ?? false
  const showDate = config.show_date !== false

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const h    = use24
    ? now.getHours().toString().padStart(2, '0')
    : ((now.getHours() % 12) || 12).toString()
  const m    = now.getMinutes().toString().padStart(2, '0')
  const s    = now.getSeconds().toString().padStart(2, '0')
  const ampm = !use24 ? (now.getHours() < 12 ? 'AM' : 'PM') : ''

  const scale = Math.pow((colSpan + rowSpan) / 2, 1.3)

  return (
    <div className="glass-card clock-card">
      <div className="clock-time" style={{ gap: `${scale * 2}px` }}>
        <span className="clock-hm" style={{
          fontSize: `${scale * 22}px`,
          letterSpacing: `${scale * -0.5}px`,
        }}>
          {h}:{m}
        </span>
        {showSec && (
          <span className="clock-sec" style={{
            fontSize: `${scale * 10}px`,
            paddingBottom: `${scale * 3}px`,
          }}>
            {s}
          </span>
        )}
        {ampm && (
          <span className="clock-ampm" style={{
            fontSize: `${scale * 8}px`,
            paddingBottom: `${scale * 4}px`,
          }}>
            {ampm}
          </span>
        )}
      </div>
      {showDate && (
        <div className="clock-date" style={{
          fontSize: `${scale * 7}px`,
          letterSpacing: `${scale * 0.1}px`,
        }}>
          {fmtDate(now)}
        </div>
      )}
    </div>
  )
}
