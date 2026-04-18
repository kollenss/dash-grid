import { useState } from 'react'
import '../../styles/glass.css'
import './SceneCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'

interface Props {
  config: { entity_id: string; title?: string; icon?: string; color?: string }
  state?: HAState
}

export default function SceneCard({ config, state }: Props) {
  const { callService } = useCore()
  const label = config.title || state?.attributes?.friendly_name || config.entity_id.replace(/_/g, ' ')
  const icon  = config.icon || '🎨'
  const color = config.color || 'rgba(255,255,255,0.15)'

  const [pressed, setPressed] = useState(false)

  function activate() {
    setPressed(true)
    callService('scene', 'turn_on', { entity_id: config.entity_id })
    setTimeout(() => setPressed(false), 400)
  }

  return (
    <div
      className={`glass-card scene-card ${pressed ? 'pressed' : ''}`}
      style={{ '--scene-color': color } as any}
      onClick={activate}
    >
      <div className="scene-icon">{icon}</div>
      <div className="scene-label">{label}</div>
    </div>
  )
}
