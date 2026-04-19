import { useState, useEffect } from 'react'
import './PluginGallery.css'

interface ManifestCard {
  id: string
  name: string
  description: string
  author: string
  version: string
  tags: string[]
  requires?: string[]
  screenshotUrl?: string
  readmeUrl?: string
}

interface InstalledPlugin {
  id: string
  name: string
  version: string
  installed_at: string
}

type InstallState = 'idle' | 'installing' | 'uninstalling' | 'error'

export default function PluginGallery() {
  const [cards, setCards]         = useState<ManifestCard[]>([])
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [versions, setVersions]   = useState<Record<string, string>>({})
  const [selected, setSelected]   = useState<ManifestCard | null>(null)
  const [readme, setReadme]       = useState<string | null>(null)
  const [loadingReadme, setLoadingReadme] = useState(false)
  const [busy, setBusy]           = useState<Record<string, InstallState>>({})
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<'all' | 'installed'>('all')

  useEffect(() => {
    async function load() {
      try {
        const manifestRes = await fetch('/api/plugins/manifest')
        const manifest = manifestRes.ok ? await manifestRes.json() : null
        if (!manifest || manifest.error) {
          setManifestError(manifest?.error ?? `HTTP ${manifestRes.status}`)
        } else {
          setCards(manifest.cards ?? [])
        }
      } catch (e: any) {
        setManifestError(e.message)
      }

      try {
        const instRes = await fetch('/api/plugins/installed')
        const inst: InstalledPlugin[] = instRes.ok ? await instRes.json() : []
        const ids = new Set(inst.map(p => p.id))
        const vers: Record<string, string> = {}
        inst.forEach(p => { vers[p.id] = p.version })
        setInstalled(ids)
        setVersions(vers)
      } catch {
        // installed list failing is non-fatal — gallery still usable
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selected) { setReadme(null); return }
    setLoadingReadme(true)
    setReadme(null)
    fetch(`/api/plugins/readme/${selected.id}`)
      .then(r => r.ok ? r.text() : null)
      .then(text => setReadme(text))
      .catch(() => setReadme(null))
      .finally(() => setLoadingReadme(false))
  }, [selected])

  async function install(card: ManifestCard) {
    setBusy(b => ({ ...b, [card.id]: 'installing' }))
    try {
      const res = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await import(`/plugins/${card.id}.js`).catch(e =>
        console.warn(`[Dash Grid] Failed to load plugin '${card.id}':`, e)
      )
      setInstalled(s => new Set([...s, card.id]))
      setVersions(v => ({ ...v, [card.id]: card.version }))
      setBusy(b => ({ ...b, [card.id]: 'idle' }))
    } catch {
      setBusy(b => ({ ...b, [card.id]: 'error' }))
      setTimeout(() => setBusy(b => ({ ...b, [card.id]: 'idle' })), 3000)
    }
  }

  async function uninstall(card: ManifestCard) {
    setBusy(b => ({ ...b, [card.id]: 'uninstalling' }))
    try {
      await fetch(`/api/plugins/${card.id}/uninstall`, { method: 'DELETE' })
      setTimeout(() => window.location.reload(), 300)
    } catch {
      setBusy(b => ({ ...b, [card.id]: 'error' }))
      setTimeout(() => setBusy(b => ({ ...b, [card.id]: 'idle' })), 3000)
    }
  }

  const hasUpdate = (card: ManifestCard) =>
    installed.has(card.id) && versions[card.id] && versions[card.id] !== card.version

  const displayed = filter === 'installed'
    ? cards.filter(c => installed.has(c.id))
    : cards

  if (loading) return <div className="pg-loading">Loading card registry…</div>

  return (
    <div className="pg-root">
      {/* Left: card list */}
      <div className="pg-list">
        <div className="pg-toolbar">
          <button
            className={`pg-filter-btn${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >All</button>
          <button
            className={`pg-filter-btn${filter === 'installed' ? ' active' : ''}`}
            onClick={() => setFilter('installed')}
          >Installed</button>
        </div>

        {manifestError && (
          <div className="pg-error">
            Unable to reach card registry.<br />
            <small>{manifestError}</small>
          </div>
        )}

        {!manifestError && displayed.length === 0 && (
          <div className="pg-empty">
            {filter === 'installed' ? 'No cards installed yet.' : 'No cards available.'}
          </div>
        )}

        {displayed.map(card => {
          const state = busy[card.id] ?? 'idle'
          const isInstalled = installed.has(card.id)
          const updateAvailable = hasUpdate(card)

          return (
            <div
              key={card.id}
              className={`pg-card${selected?.id === card.id ? ' pg-card--selected' : ''}`}
              onClick={() => setSelected(card)}
            >
              <div className="pg-card-header">
                <span className="pg-card-name">{card.name}</span>
                {isInstalled && !updateAvailable && (
                  <span className="pg-badge pg-badge--installed">Installed</span>
                )}
                {updateAvailable && (
                  <span className="pg-badge pg-badge--update">Update</span>
                )}
              </div>
              <p className="pg-card-desc">{card.description}</p>
              <div className="pg-card-footer">
                <span className="pg-card-meta">v{card.version} · {card.author}</span>
                <div className="pg-tags">
                  {card.tags.map(t => <span key={t} className="pg-tag">{t}</span>)}
                </div>
                <button
                  className={`pg-action-btn${isInstalled ? ' pg-action-btn--uninstall' : ''}`}
                  disabled={state !== 'idle'}
                  onClick={e => { e.stopPropagation(); isInstalled ? uninstall(card) : install(card) }}
                >
                  {state === 'installing'   ? 'Installing…'   :
                   state === 'uninstalling' ? 'Removing…'     :
                   state === 'error'        ? 'Error'         :
                   isInstalled && updateAvailable ? 'Update'  :
                   isInstalled             ? 'Uninstall'      : 'Install'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Right: detail panel */}
      <div className={`pg-detail${selected ? ' pg-detail--open' : ''}`}>
        {selected ? (
          <>
            <button className="pg-detail-close" onClick={() => setSelected(null)}>✕</button>
            {selected.screenshotUrl && (
              <img className="pg-screenshot" src={selected.screenshotUrl} alt={selected.name} />
            )}
            <h2 className="pg-detail-title">{selected.name}</h2>
            <p className="pg-detail-desc">{selected.description}</p>
            <div className="pg-detail-meta">
              <span>Version {selected.version}</span>
              <span>by {selected.author}</span>
              {selected.requires && selected.requires.length > 0 && (
                <span>Requires: {selected.requires.join(', ')}</span>
              )}
            </div>
            {loadingReadme && <div className="pg-readme-loading">Loading README…</div>}
            {readme && <pre className="pg-readme">{readme}</pre>}
          </>
        ) : (
          <div className="pg-detail-placeholder">Select a card to see details</div>
        )}
      </div>
    </div>
  )
}
