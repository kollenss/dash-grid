import { useEffect, useRef } from 'react'
import { HAState } from '../types'

interface Options {
  onStateChanged: (entityId: string, newState: HAState) => void
  onConnected?: (connected: boolean) => void
}

export function useHAWebSocket({ onStateChanged, onConnected }: Options) {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`

    function connect() {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onmessage = (evt) => {
        let msg: any
        try { msg = JSON.parse(evt.data) } catch { return }

        if (msg.type === 'state_changed' && msg.entity_id && msg.new_state) {
          onStateChanged(msg.entity_id, msg.new_state)
        }
        if (msg.type === 'hassboard_status') {
          onConnected?.(msg.connected)
        }
      }

      ws.onclose = () => {
        onConnected?.(false)
        // Reconnect handled server-side; just retry connection from client too
        setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
