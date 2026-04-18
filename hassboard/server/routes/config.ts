import { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'
import db from '../db'

export const configRoutes: FastifyPluginAsync = async (app) => {
  // GET all dashboards
  app.get('/dashboards', async () => {
    return db.prepare('SELECT * FROM dashboards ORDER BY sort_order').all()
  })

  // GET cards for a dashboard
  app.get<{ Params: { id: string } }>('/dashboards/:id/cards', async (req) => {
    const cards = db.prepare('SELECT * FROM cards WHERE dashboard_id = ?').all(req.params.id)
    return cards.map((c: any) => ({ ...c, config: JSON.parse(c.config) }))
  })

  // POST add card
  app.post<{ Params: { id: string }; Body: any }>('/dashboards/:id/cards', async (req, reply) => {
    const { type, col, row, col_span = 1, row_span = 1, config } = req.body as any
    const id = randomUUID()
    db.prepare(
      'INSERT INTO cards (id, dashboard_id, type, col, row, col_span, row_span, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, req.params.id, type, col, row, col_span, row_span, JSON.stringify(config))
    reply.code(201)
    return { id }
  })

  // PUT update card
  app.put<{ Params: { cardId: string }; Body: any }>('/cards/:cardId', async (req) => {
    const { col, row, col_span, row_span, config } = req.body as any
    db.prepare(
      'UPDATE cards SET col=?, row=?, col_span=?, row_span=?, config=? WHERE id=?'
    ).run(col, row, col_span, row_span, JSON.stringify(config), req.params.cardId)
    return { ok: true }
  })

  // DELETE card
  app.delete<{ Params: { cardId: string } }>('/cards/:cardId', async (req) => {
    db.prepare('DELETE FROM cards WHERE id=?').run(req.params.cardId)
    return { ok: true }
  })

  // GET settings
  app.get('/settings', async () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const out: Record<string, string> = {}
    // Keys that are returned as plaintext (not secrets)
    const plaintextKeys = new Set([
      'ha_url',
      'background_image',
      'theme_id',
      'custom_themes',
      'user_card_opacity',
      'user_card_blur_px',
      'user_card_radius',
      'user_card_bg',
      'user_accent',
      'user_accent_rgb',
      'user_text_color',
      'user_text_secondary_color',
      'user_text_dim_color',
      'user_text_secondary_opacity',
      'user_text_dim_opacity',
      'user_border_color',
      'user_border_opacity',
      'user_border_width',
    ])
    for (const r of rows) {
      if (plaintextKeys.has(r.key)) {
        out[r.key] = r.value
      } else {
        out[r.key] = r.value ? '***saved***' : ''
      }
    }
    // Migration shim: expose 'vasttrafik' as saved if only the legacy 'vt_token' key exists
    if (!out['vasttrafik'] && out['vt_token'] === '***saved***') {
      out['vasttrafik'] = '***saved***'
    }
    return out
  })

  // PUT settings
  app.put<{ Body: Record<string, string> }>('/settings', async (req) => {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    const get    = db.prepare('SELECT value FROM settings WHERE key=?')
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        if (k === 'ha_url' || k === 'background_image') {
          upsert.run(k, v)
          continue
        }
        // Never overwrite a secret with the mask placeholder
        if (v === '***saved***') {
          // Migration: copy legacy 'vt_token' → 'vasttrafik' on first save if not yet migrated
          if (k === 'vasttrafik') {
            const existing = (get.get('vasttrafik') as any)?.value
            if (!existing) {
              const legacy = (get.get('vt_token') as any)?.value
              if (legacy) upsert.run('vasttrafik', legacy)
            }
          }
          continue
        }
        upsert.run(k, v)
      }
    })
    tx(Object.entries(req.body))
    return { ok: true }
  })

  // PUT dashboard name
  app.put<{ Params: { id: string }; Body: { name: string } }>('/dashboards/:id', async (req) => {
    db.prepare('UPDATE dashboards SET name=? WHERE id=?').run(req.body.name, req.params.id)
    return { ok: true }
  })
}
