import { FastifyPluginAsync } from 'fastify'
import db from '../db'

function getHAConfig(): { haUrl: string; haToken: string } {
  const haUrl   = (db.prepare('SELECT value FROM settings WHERE key=?').get('ha_url')   as any)?.value ?? ''
  const haToken = (db.prepare('SELECT value FROM settings WHERE key=?').get('ha_token') as any)?.value ?? ''
  return { haUrl, haToken }
}

function haHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export const haProxyRoutes: FastifyPluginAsync = async (app) => {
  // GET all states
  app.get('/states', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    const res = await fetch(`${haUrl}/api/states`, { headers: haHeaders(haToken) })
    reply.code(res.status)
    return res.json()
  })

  // GET single state
  app.get<{ Params: { entityId: string } }>('/states/:entityId', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    const res = await fetch(`${haUrl}/api/states/${req.params.entityId}`, { headers: haHeaders(haToken) })
    reply.code(res.status)
    return res.json()
  })

  // POST call service
  app.post<{ Params: { domain: string; service: string }; Body: any }>('/services/:domain/:service', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    const res = await fetch(`${haUrl}/api/services/${req.params.domain}/${req.params.service}`, {
      method: 'POST',
      headers: haHeaders(haToken),
      body: JSON.stringify(req.body ?? {})
    })
    reply.code(res.status)
    return res.json()
  })

  // GET history for an entity
  app.get<{ Params: { entityId: string }; Querystring: { hours?: string } }>('/history/:entityId', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    const hours = parseInt((req.query as any).hours ?? '24', 10)
    const start = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    const url = `${haUrl}/api/history/period/${start}?filter_entity_id=${req.params.entityId}&minimal_response=true&no_attributes=true`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const res = await fetch(url, { headers: haHeaders(haToken), signal: controller.signal })
      clearTimeout(timer)
      reply.code(res.status)
      return res.json()
    } catch (e: any) {
      clearTimeout(timer)
      reply.code(503)
      return { error: e.message }
    }
  })

  // GET camera snapshot (still image)
  app.get<{ Params: { entityId: string } }>('/camera/:entityId', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    try {
      const res = await fetch(`${haUrl}/api/camera_proxy/${req.params.entityId}`, {
        headers: { Authorization: `Bearer ${haToken}` }
      })
      const contentType = res.headers.get('content-type') ?? 'image/jpeg'
      reply.raw.statusCode = res.status
      reply.raw.setHeader('Content-Type', contentType)
      reply.raw.setHeader('Cache-Control', 'no-store')
      const buf = Buffer.from(await res.arrayBuffer())
      reply.raw.end(buf)
    } catch (e: any) {
      reply.code(503).send({ error: e.message })
    }
  })

  // POST render HA template
  app.post<{ Body: { template: string } }>('/template', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    try {
      const res = await fetch(`${haUrl}/api/template`, {
        method: 'POST',
        headers: haHeaders(haToken),
        body: JSON.stringify({ template: req.body?.template ?? '' })
      })
      reply.code(res.status).type('text/plain')
      return reply.send(await res.text())
    } catch (e: any) {
      reply.code(503)
      return { error: e.message }
    }
  })

  // GET proxy arbitrary HA image path (for media player artwork etc.)
  app.get<{ Querystring: { path: string } }>('/media-image', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ error: 'HA not configured' })
    const path = (req.query as any).path
    if (!path || !path.startsWith('/')) return reply.code(400).send({ error: 'Invalid path' })
    try {
      const res = await fetch(`${haUrl}${path}`, {
        headers: { Authorization: `Bearer ${haToken}` }
      })
      const contentType = res.headers.get('content-type') ?? 'image/jpeg'
      reply.raw.statusCode = res.status
      reply.raw.setHeader('Content-Type', contentType)
      reply.raw.setHeader('Cache-Control', 'max-age=30')
      const buf = Buffer.from(await res.arrayBuffer())
      reply.raw.end(buf)
    } catch (e: any) {
      reply.code(503).send({ error: e.message })
    }
  })

  // GET test connection
  app.get('/test', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    if (!haUrl || !haToken) return reply.code(503).send({ ok: false, error: 'Not configured' })
    try {
      const res = await fetch(`${haUrl}/api/config`, { headers: haHeaders(haToken) })
      const data = await res.json() as any
      return { ok: res.ok, version: data?.version }
    } catch (e: any) {
      reply.code(503)
      return { ok: false, error: e.message }
    }
  })
}
