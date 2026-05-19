import { FastifyPluginAsync } from 'fastify'

interface RssItem {
  title: string
  description: string
  link: string
  pubDate: string
  thumbnail: string | null
}

interface ParsedFeed {
  title: string
  items: RssItem[]
}

function extractCdata(text: string): string {
  const m = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return (m ? m[1] : text).trim()
}

function getTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? extractCdata(m[1].trim()) : ''
}

function getAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["']`, 'i')
  return xml.match(re)?.[1] ?? ''
}

function getLink(xml: string): string {
  // RSS 2.0: <link>url</link>
  const text = xml.match(/<link[^>]*>([^<]+)<\/link>/)
  if (text) return text[1].trim()
  // Atom: <link href="url" rel="alternate"/> or <link rel="alternate" href="url"/>
  const atom = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/)
  return atom?.[1] ?? ''
}

function parseRss(xml: string): ParsedFeed {
  // Feed title: first <title> before any <item>
  const beforeItems = xml.replace(/<item[\s\S]*?<\/item>/g, '')
  const feedTitle = getTag(beforeItems, 'title')

  const items: RssItem[] = []
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1]
    const thumbnail =
      getAttr(item, 'media:content', 'url') ||
      getAttr(item, 'media:thumbnail', 'url') ||
      getAttr(item, 'enclosure', 'url') ||
      null

    items.push({
      title: getTag(item, 'title'),
      description: getTag(item, 'description'),
      link: getLink(item),
      pubDate: getTag(item, 'pubDate') || getTag(item, 'dc:date'),
      thumbnail,
    })

    if (items.length >= 20) break
  }

  return { title: feedTitle, items }
}

export const rssProxyRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { url?: string } }>('/feed', async (req, reply) => {
    const { url } = req.query
    if (!url) return reply.code(400).send({ error: 'Missing url parameter' })

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DashGrid/1.0 RSS reader' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) return reply.code(502).send({ error: `Upstream returned ${res.status}` })

      const xml = await res.text()
      const feed = parseRss(xml)

      reply.header('Cache-Control', 'public, max-age=300')
      return feed
    } catch (e: any) {
      return reply.code(502).send({ error: e.message ?? 'Fetch failed' })
    }
  })
}
