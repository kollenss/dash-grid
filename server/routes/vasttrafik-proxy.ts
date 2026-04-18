import { FastifyPluginAsync } from 'fastify'
import db from '../db'

const VT_BASE  = 'https://ext-api.vasttrafik.se/pr/v4'
const VT_TOKEN = 'https://ext-api.vasttrafik.se/token'

interface TokenCache { token: string; expiresAt: number }
let cache: TokenCache | null = null

function getCredentials(): { clientId: string; clientSecret: string } | null {
  const idRow     = db.prepare('SELECT value FROM settings WHERE key=?').get('vasttrafik_client_id')     as any
  const secretRow = db.prepare('SELECT value FROM settings WHERE key=?').get('vasttrafik_client_secret') as any
  const clientId     = idRow?.value?.trim()
  const clientSecret = secretRow?.value?.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

async function getAccessToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt) return cache.token

  const creds = getCredentials()
  if (!creds) throw new Error('Västtrafik credentials not configured')

  const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')
  const res = await fetch(VT_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token request failed ${res.status}: ${text}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  // Expire 60 s before actual expiry to avoid edge cases
  cache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return cache.token
}

export const vasttrafikProxyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/test', async (_req, reply) => {
    if (!getCredentials()) return reply.code(503).send({ ok: false, error: 'Västtrafik credentials not configured' })
    try {
      const token = await getAccessToken()
      const res = await fetch(`${VT_BASE}/locations/by-text?q=centralstationen&limit=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      if (res.ok) return { ok: true }
      return reply.code(res.status).send({ ok: false, error: `HTTP ${res.status}` })
    } catch (e: any) {
      return reply.code(503).send({ ok: false, error: e.message })
    }
  })

  app.get<{ Querystring: { q: string } }>('/locations/search', async (req, reply) => {
    let token: string
    try { token = await getAccessToken() } catch (e: any) {
      return reply.code(503).send({ error: e.message })
    }

    const q = (req.query as any).q ?? ''
    if (!q.trim()) return reply.send({ results: [] })

    const url = `${VT_BASE}/locations/by-text?q=${encodeURIComponent(q)}&types=StopArea&limit=8`
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      })
      reply.code(res.status)
      return res.json()
    } catch (e: any) {
      reply.code(503)
      return { error: e.message }
    }
  })

  app.get<{
    Params: { stopAreaGid: string }
    Querystring: { limit?: string; timeSpanInMinutes?: string }
  }>('/departures/:stopAreaGid', async (req, reply) => {
    let token: string
    try { token = await getAccessToken() } catch (e: any) {
      return reply.code(503).send({ error: e.message })
    }

    const { stopAreaGid } = req.params
    if (!stopAreaGid || stopAreaGid === 'undefined')
      return reply.code(400).send({ error: 'stopAreaGid is required' })

    const limit = (req.query as any).limit ?? '10'
    const timeSpan = (req.query as any).timeSpanInMinutes ?? '60'
    const startDateTime = (req.query as any).startDateTime

    const params = new URLSearchParams({
      limit,
      timeSpanInMinutes: timeSpan,
      maxDeparturesPerLineAndDirection: '2',
    })
    if (startDateTime) params.set('startDateTime', startDateTime)

    const url = `${VT_BASE}/stop-areas/${stopAreaGid}/departures?${params}`

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })
      reply.code(res.status)
      return res.json()
    } catch (e: any) {
      reply.code(503)
      return { error: e.message }
    }
  })
}
