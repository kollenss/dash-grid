import { FastifyPluginAsync } from 'fastify'
import fs from 'fs'
import path from 'path'

const BACKGROUNDS_DIR = path.join(__dirname, '..', '..', 'backgrounds')

interface BackgroundMeta {
  filename: string
  displayName: string
  category: string
  url: string
}

const CATEGORY_PREFIXES: [string, string][] = [
  ['Abstract-Art-',    'Paintings'],
  ['Abstract-',        'Abstract'],
  ['Bokeh-City-',      'Bokeh City'],
  ['Bokeh-Nature-',    'Bokeh Nature'],
  ['Photo-Nature-',    'Photo Nature'],
]

function parseMeta(filename: string): BackgroundMeta {
  const base = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '')

  let category = 'Other'
  let namePart = base

  for (const [prefix, cat] of CATEGORY_PREFIXES) {
    if (base.startsWith(prefix)) {
      category = cat
      namePart = base.slice(prefix.length)
      break
    }
  }

  const displayName = namePart
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return { filename, displayName, category, url: `/api/backgrounds/${filename}` }
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.webp': 'image/webp',
}

export const backgroundRoutes: FastifyPluginAsync = async (app) => {
  // Metadata list
  app.get('/backgrounds', async () => {
    if (!fs.existsSync(BACKGROUNDS_DIR)) return []
    return fs.readdirSync(BACKGROUNDS_DIR)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort()
      .map(parseMeta)
  })

  // Serve image files
  app.get<{ Params: { filename: string } }>('/backgrounds/:filename', async (req, reply) => {
    const filename = path.basename(req.params.filename) // förhindra path traversal
    const filePath = path.join(BACKGROUNDS_DIR, filename)
    if (!fs.existsSync(filePath)) return reply.code(404).send({ error: 'Not found' })
    const mime = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    reply.header('Content-Type', mime)
    reply.header('Cache-Control', 'public, max-age=86400')
    return reply.send(fs.createReadStream(filePath))
  })
}
