import Fastify from 'fastify'
import staticPlugin from '@fastify/static'
import cors from '@fastify/cors'
import path from 'path'
import fs from 'fs'
import { configRoutes } from './routes/config'
import { haProxyRoutes } from './routes/ha-proxy'
import { vasttrafikProxyRoutes } from './routes/vasttrafik-proxy'
import { backgroundRoutes } from './routes/backgrounds'
import { pluginRoutes } from './routes/plugins'
import { setupHAWebSocket } from './routes/ha-ws'
import './db' // init DB on startup

async function main() {
  const app = Fastify({ logger: { level: 'info' } })

  // CORS for dev (Vite runs on :5173, server on :3001)
  await app.register(cors, { origin: ['http://localhost:5173'] })

  // API routes
  await app.register(configRoutes, { prefix: '/api' })
  await app.register(haProxyRoutes, { prefix: '/api/ha' })
  await app.register(vasttrafikProxyRoutes, { prefix: '/api/vasttrafik' })
  await app.register(backgroundRoutes, { prefix: '/api' })
  await app.register(pluginRoutes)

  // Serve built SPA in production (only if dist/client exists)
  const distPath = path.join(__dirname, '..', 'dist', 'client')
  if (fs.existsSync(distPath)) {
    await app.register(staticPlugin, { root: distPath, wildcard: false })
    app.get('/*', (_req, reply) => reply.sendFile('index.html'))
  }

  const port = Number(process.env.PORT ?? 3001)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Dash Grid server running on http://0.0.0.0:${port}`)

  // Attach WebSocket bridge after server is listening
  setupHAWebSocket(app.server)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
