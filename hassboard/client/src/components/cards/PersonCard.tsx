import '../../styles/glass.css'
import './PersonCard.css'
import { HAState } from '../../types'

interface Props {
  config: { entity_id: string; title?: string }
  state?: HAState
}

function relativeTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'Just now'
  if (diff < 60) return `${diff} min ago`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

export default function PersonCard({ config, state }: Props) {
  const name     = config.title || state?.attributes?.friendly_name || config.entity_id.replace(/_/g, ' ')
  const location = state?.state ?? 'unknown'
  const isHome   = location === 'home'
  const initial  = name.charAt(0).toUpperCase()
  const since    = state?.last_changed ? relativeTime(state.last_changed) : null

  return (
    <div className="glass-card person-card">
      <div className="person-avatar">{initial}</div>
      <div className="person-name">{name}</div>
      <div className={`person-status ${isHome ? 'home' : 'away'}`}>
        <span className="person-dot" />
        {isHome ? 'Home' : location === 'not_home' ? 'Away' : location}
      </div>
      {since && <div className="person-since">{since}</div>}
    </div>
  )
}
