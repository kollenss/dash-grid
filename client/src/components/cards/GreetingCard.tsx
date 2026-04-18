import { useState, useEffect } from 'react'
import '../../styles/glass.css'
import './GreetingCard.css'

interface Props {
  config: { name?: string; title?: string }
}

function getGreeting(h: number): string {
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Good night'
}

export default function GreetingCard({ config }: Props) {
  const [hour, setHour] = useState(new Date().getHours())

  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60000)
    return () => clearInterval(t)
  }, [])

  const greeting = getGreeting(hour)
  const name = config.name ?? config.title

  return (
    <div className="glass-card greeting-card">
      <div className="greeting-text">{greeting}{name ? `, ${name}` : ''}</div>
    </div>
  )
}
