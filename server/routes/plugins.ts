import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'
import db from '../db'

const MANIFEST_URL = process.env.CARDS_MANIFEST_URL
  ?? 'https://raw.githubusercontent.com/kollenss/dash-grid-cards/main/manifest.json'

export const PLUGINS_DIR = process.env.PLUGINS_DIR
  ?? path.join(__dirname, '..', '..', 'plugins')

fs.mkdirSync(PLUGINS_DIR, { recursive: true })

interface ManifestCard {
  id: string
  name: string
  description: string
  author: string
  version: string
  tags: string[]
  requires?: string[]
  bundleUrl: string
  screenshotUrl?: string
  readmeUrl?: string
}

interface Manifest {
  version: number
  updated: string
  cards: ManifestCard[]
}

let manifestCache: { data: Manifest; expiresAt: number } | null = null

async function fetchManifest(): Promise<Manifest> {
  if (manifestCache && Date.now() < manifestCache.expiresAt) return manifestCache.data
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) throw new Error(`Manifest fetch failed: HTTP ${res.status}`)
  const data = await res.json() as Manifest
  manifestCache = { data, expiresAt: Date.now() + 60 * 60 * 1000 }
  return data
}

export const pluginRoutes: FastifyPluginAsync = async (app) => {

  // Serve compiled plugin bundles from plugins/ dir
  app.get<{ Params: { file: string } }>('/plugins/:file', async (req, reply) => {
    const file = path.basename(req.params.file)
    if (!file.endsWith('.js')) return reply.code(400).send({ error: 'Invalid file' })
    const filePath = path.join(PLUGINS_DIR, file)
    if (!fs.existsSync(filePath)) return reply.code(404).send({ error: 'Plugin not found' })
    reply.header('Content-Type', 'application/javascript')
    reply.header('Cache-Control', 'no-cache')
    return reply.send(fs.createReadStream(filePath))
  })

  // Fetch and return manifest (cached 1h)
  app.get('/api/plugins/manifest', async (_req, reply) => {
    try {
      return await fetchManifest()
    } catch (e: any) {
      return reply.code(503).send({ error: e.message })
    }
  })

  // List installed plugins
  app.get('/api/plugins/installed', async () => {
    return db.prepare('SELECT * FROM plugins ORDER BY installed_at DESC').all()
  })

  // Install a plugin
  app.post<{ Body: { id: string } }>('/api/plugins/install', async (req, reply) => {
    const { id } = req.body
    try {
      const manifest = await fetchManifest()
      const card = manifest.cards.find(c => c.id === id)
      if (!card) return reply.code(404).send({ error: `Card '${id}' not found in manifest` })

      const res = await fetch(card.bundleUrl)
      if (!res.ok) return reply.code(502).send({ error: `Bundle download failed: HTTP ${res.status}` })

      fs.writeFileSync(path.join(PLUGINS_DIR, `${id}.js`), await res.text())

      db.prepare(`
        INSERT INTO plugins (id, name, version, bundle_url, installed_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, version=excluded.version,
          bundle_url=excluded.bundle_url, installed_at=excluded.installed_at
      `).run(id, card.name, card.version, card.bundleUrl, new Date().toISOString())

      return { ok: true, id, version: card.version }
    } catch (e: any) {
      return reply.code(503).send({ error: e.message })
    }
  })

  // Uninstall a plugin
  app.delete<{ Params: { id: string } }>('/api/plugins/:id/uninstall', async (req, reply) => {
    const { id } = req.params
    const file = path.join(PLUGINS_DIR, `${id}.js`)
    if (fs.existsSync(file)) fs.unlinkSync(file)
    db.prepare('DELETE FROM cards WHERE type=?').run(id)
    db.prepare('DELETE FROM plugins WHERE id=?').run(id)
    return { ok: true }
  })

  // Proxy README from GitHub (avoids CORS in browser)
  app.get<{ Params: { id: string } }>('/api/plugins/readme/:id', async (req, reply) => {
    try {
      const manifest = await fetchManifest()
      const card = manifest.cards.find(c => c.id === req.params.id)
      if (!card?.readmeUrl) return reply.code(404).send({ error: 'No README available' })
      const res = await fetch(card.readmeUrl)
      if (!res.ok) return reply.code(res.status).send({ error: `HTTP ${res.status}` })
      reply.header('Content-Type', 'text/plain; charset=utf-8')
      return reply.send(await res.text())
    } catch (e: any) {
      return reply.code(503).send({ error: e.message })
    }
  })
}
