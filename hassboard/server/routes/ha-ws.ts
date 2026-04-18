import { IncomingMessage, Server } from 'http'
import { WebSocket, WebSocketServer } from 'ws'
import db from '../db'

function getHAConfig(): { haUrl: string; haToken: string } {
  const haUrl   = (db.prepare('SELECT value FROM settings WHERE key=?').get('ha_url')   as any)?.value ?? ''
  const haToken = (db.prepare('SELECT value FROM settings WHERE key=?').get('ha_token') as any)?.value ?? ''
  return { haUrl, haToken }
}

function haWsUrl(haUrl: string): string {
  return haUrl.replace(/^http/, 'ws') + '/api/websocket'
}

export function setupHAWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (clientWs: WebSocket) => {
    let haWs: WebSocket | null = null
    let msgId = 1
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    function connect() {
      const { haUrl, haToken } = getHAConfig()
      if (!haUrl || !haToken) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'HA not configured' }))
        return
      }

      haWs = new WebSocket(haWsUrl(haUrl))

      haWs.on('open', () => {
        clientWs.send(JSON.stringify({ type: 'hassboard_status', connected: true }))
      })

      haWs.on('message', (data: Buffer) => {
        let msg: any
        try { msg = JSON.parse(data.toString()) } catch { return }

        if (msg.type === 'auth_required') {
          haWs!.send(JSON.stringify({ type: 'auth', access_token: haToken }))
          return
        }

        if (msg.type === 'auth_ok') {
          // Subscribe to state_changed events
          haWs!.send(JSON.stringify({ id: msgId++, type: 'subscribe_events', event_type: 'state_changed' }))
          return
        }

        if (msg.type === 'auth_invalid') {
          clientWs.send(JSON.stringify({ type: 'error', message: 'HA auth invalid — check token' }))
          return
        }

        // Forward state_changed events to client
        if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'state_changed',
              entity_id: msg.event.data?.entity_id,
              new_state: msg.event.data?.new_state
            }))
          }
        }
      })

      haWs.on('close', () => {
        if (closed) return
        clientWs.send(JSON.stringify({ type: 'hassboard_status', connected: false }))
        reconnectTimer = setTimeout(connect, 5000)
      })

      haWs.on('error', () => {
        // error triggers close automatically
      })
    }

    connect()

    clientWs.on('close', () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      haWs?.close()
    })
  })
}
