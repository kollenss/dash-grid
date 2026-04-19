import { useState, useEffect } from 'react'
import '../../styles/glass.css'
import './ClockCard.css'

interface Props {
  config: { format_24h?: boolean; show_seconds?: boolean; show_date?: boolean; title?: string }
}

const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

function fmtDate(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function ClockCard({ config }: Props) {
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

  return (
    <div className="glass-card clock-card">
      <div className="clock-layout">
        <span className="clock-hm">{h}:{m}</span>
        <div className="clock-side">
          {showDate && <span className="clock-date">{fmtDate(now)}</span>}
          {ampm && <span className="clock-ampm">{ampm}</span>}
          {showSec && <span className="clock-sec">{s}</span>}
        </div>
      </div>
    </div>
  )
}
