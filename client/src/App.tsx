import { useState, useEffect, useCallback, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './styles/globals.css'
import './App.css'
import Grid from './components/Grid/Grid'
import AddCardModal from './components/AddCardModal'
import SettingsPage from './components/settings/SettingsPage'
import DesignSystemPage from './pages/DesignSystemPage'
import PluginGallery from './components/PluginGallery/PluginGallery'
import DesignDrawer from './components/DesignDrawer'
import { useHAStates, callService } from './hooks/useHA'
import { useHAWebSocket } from './hooks/useHAWebSocket'
import { CardConfig } from './types'
import { registry } from './core/CardRegistry'
import { CoreProvider } from './core/CoreContext'
import { applyTheme, applyUserOverrides, applyCustomTheme, getTheme, parseCustomThemes } from './core/themes'

const DASHBOARD_ID = 'default'
const LS_MIN_SCALE = 'hb_min_scale'

function Dashboard() {
  const [cards, setCards]         = useState<CardConfig[]>([])
  const [addModal, setAddModal]   = useState<{ col: number; row: number } | null>(null)
  const [editModal, setEditModal] = useState<CardConfig | null>(null)
  const [haConnected, setHaConnected] = useState(false)
  const [boardName, setBoardName] = useState('Dash Grid')
  const [integrations, setIntegrations] = useState<Record<string, string>>({})
  const [editMode, setEditMode]       = useState(false)
  const [designOpen, setDesignOpen]   = useState(false)
  const [backgroundImage, setBackgroundImage] = useState('')
  const [minScale, setMinScale]   = useState(() => {
    const saved = localStorage.getItem(LS_MIN_SCALE)
    return saved ? parseFloat(saved) : 0.5
  })

  const { states, updateState, loading, error: haError } = useHAStates()

  useHAWebSocket({
    onStateChanged: useCallback((entityId, newState) => {
      updateState(entityId, newState)
    }, [updateState]),
    onConnected: setHaConnected
  })

  useEffect(() => {
    fetch(`/api/dashboards/${DASHBOARD_ID}/cards`)
      .then(r => r.json())
      .then(setCards)
      .catch(() => {})
    fetch('/api/dashboards')
      .then(r => r.json())
      .then((data: any[]) => { if (data[0]?.name) setBoardName(data[0].name) })
      .catch(() => {})
    // Load installed plugin cards before rendering
    fetch('/api/plugins/installed')
      .then(r => r.json())
      .then(async (plugins: Array<{ id: string }>) => {
        for (const p of plugins) {
          try { await import(`/plugins/${p.id}.js`) }
          catch (e) { console.warn(`[Dash Grid] Failed to load plugin '${p.id}':`, e) }
        }
      })
      .catch(() => {})

    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        const resolved: Record<string, string> = {}
        for (const intg of registry.getIntegrations()) {
          const keys = intg.fields ? intg.fields.map(f => f.key) : [intg.id]
          for (const key of keys) resolved[key] = data[key] ?? ''
        }
        setIntegrations(resolved)
        setBackgroundImage(data['background_image'] ?? '')
      })
      .catch(() => {})
  }, [])

  async function handleAddCard(data: {
    type: string
    col: number; row: number; col_span: number; row_span: number
    config: Record<string, any>
  }) {
    const res = await fetch(`/api/dashboards/${DASHBOARD_ID}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const { id } = await res.json()
    setCards(prev => [...prev, { ...data, id, dashboard_id: DASHBOARD_ID }])
    setAddModal(null)
  }

  async function handleUpdateCard(cardId: string, data: { col_span: number; row_span: number; config: Record<string, any> }) {
    const card = cards.find(c => c.id === cardId)!
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...card, ...data })
    })
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...data } : c))
    setEditModal(null)
  }

  async function handleDeleteCard(cardId: string) {
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
    setCards(prev => prev.filter(c => c.id !== cardId))
    setEditModal(null)
  }

  async function handleResizeCard(cardId: string, colSpan: number, rowSpan: number) {
    const card = cards.find(c => c.id === cardId)!
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, col_span: colSpan, row_span: rowSpan } : c))
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...card, col_span: colSpan, row_span: rowSpan })
    })
  }

  async function handleMoveCard(cardId: string, col: number, row: number) {
    const card = cards.find(c => c.id === cardId)!
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, col, row } : c))
    await fetch(`/api/cards/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...card, col, row })
    })
  }

  const missingIntegrationLabels = useMemo(() =>
    registry.getIntegrations()
      .filter(intg => {
        const keys = intg.fields ? intg.fields.map(f => f.key) : [intg.id]
        return keys.some(k => !integrations[k])
      })
      .map(intg => intg.label),
    [integrations]
  )

  useEffect(() => {
    document.body.style.background = backgroundImage
      ? `url(${backgroundImage}) center / cover no-repeat #0b1426`
      : ''
  }, [backgroundImage])

  const coreValue = useMemo(() => ({
    states,
    callService,
    integrations,
    haError,
  }), [states, integrations, haError])

  return (
    <CoreProvider value={coreValue}>
      <div className="app-shell">
        <header className="app-header">
          <span className="app-title">{boardName}</span>
          <div className="header-right">
            <label className="zoom-slider-label">
              <span>Zoom</span>
              <input
                type="range"
                className="zoom-slider"
                min={0.2}
                max={1}
                step={0.05}
                value={minScale}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  setMinScale(v)
                  localStorage.setItem(LS_MIN_SCALE, String(v))
                }}
              />
              <span className="zoom-value">{Math.round(minScale * 100)}%</span>
            </label>
            <button
              className={`edit-mode-btn${editMode ? ' active' : ''}`}
              onClick={() => {
                const next = !editMode
                setEditMode(next)
                if (!next) setDesignOpen(false)
              }}
            >
              Edit
            </button>
            {missingIntegrationLabels.length > 0 && (
              <span
                className="ha-dot missing"
                title={`Missing required configuration: ${missingIntegrationLabels.join(', ')}`}
              />
            )}
            <Link to="/settings" className="header-link">Settings</Link>
            <Link to="/gallery" className="header-link">Cards</Link>
            <Link to="/design" className="header-link">Design</Link>
          </div>
        </header>

        <main className="app-main">
          {loading ? (
            <div className="loading-hint">Loading entities…</div>
          ) : (
            <Grid
              cards={cards}
              editMode={editMode}
              onAddCard={(col, row) => setAddModal({ col, row })}
              onEditCard={cardId => setEditModal(cards.find(c => c.id === cardId) ?? null)}
              onResizeCard={handleResizeCard}
              onMoveCard={handleMoveCard}
              minScale={minScale}
            />
          )}
        </main>

        {/* Add-modal */}
        {addModal && (
          <AddCardModal
            col={addModal.col}
            row={addModal.row}
            onAdd={handleAddCard}
            onClose={() => setAddModal(null)}
          />
        )}

        {/* Edit-modal */}
        {editModal && (
          <AddCardModal
            mode="edit"
            initialCard={editModal}
            onSave={handleUpdateCard}
            onDelete={handleDeleteCard}
            onClose={() => setEditModal(null)}
          />
        )}

        {/* Design drawer & tab — only in edit mode */}
        {editMode && (
          <>
            <button
              className={`design-tab${designOpen ? ' design-tab--open' : ''}`}
              onClick={() => setDesignOpen(v => !v)}
              aria-label="Open design panel"
            >
              <span className="design-tab__label">Design</span>
            </button>
            <DesignDrawer open={designOpen} onClose={() => setDesignOpen(false)} />
          </>
        )}
      </div>
    </CoreProvider>
  )
}

function SettingsWrapper() {
  return (
    <div className="app-shell hb-chrome">
      <header className="app-header">
        <Link to="/" className="app-title" style={{ textDecoration: 'none' }}>← Dash Grid</Link>
      </header>
      <main className="app-main app-main--scrollable">
        <SettingsPage />
      </main>
    </div>
  )
}

function DesignSystemWrapper() {
  return (
    <div className="app-shell hb-chrome">
      <header className="app-header">
        <Link to="/" className="app-title" style={{ textDecoration: 'none' }}>← Dash Grid</Link>
        <span className="header-link" style={{ color: 'var(--hb-text-dim)', cursor: 'default' }}>Design System</span>
      </header>
      <main className="app-main app-main--scrollable">
        <DesignSystemPage />
      </main>
    </div>
  )
}

function GalleryWrapper() {
  return (
    <div className="app-shell hb-chrome">
      <header className="app-header">
        <Link to="/" className="app-title" style={{ textDecoration: 'none' }}>← Dash Grid</Link>
        <span className="header-link" style={{ color: 'var(--hb-text-dim)', cursor: 'default' }}>Card Gallery</span>
      </header>
      <main className="app-main app-main--scrollable">
        <PluginGallery />
      </main>
    </div>
  )
}

export default function App() {
  // Load theme once on app start. Runs only here so navigating between
  // routes never resets the theme the user selected in Settings.
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        const customThemes = parseCustomThemes(data['custom_themes'] ?? '[]')
        const themeId      = data['theme_id'] ?? 'glass-dark'
        const customTheme  = customThemes.find(ct => ct.id === themeId)

        if (customTheme) {
          applyCustomTheme(customTheme)
          return
        }

        const theme = getTheme(themeId)
        applyTheme(theme)
        applyUserOverrides({
          opacity:              data['user_card_opacity']            ? parseFloat(data['user_card_opacity'])            : undefined,
          blurPx:               data['user_card_blur_px']            ? parseFloat(data['user_card_blur_px'])            : undefined,
          radius:               data['user_card_radius']             ? parseFloat(data['user_card_radius'])             : undefined,
          accent:               data['user_accent']                  || undefined,
          bgColor:              data['user_card_bg']                 || undefined,
          textColor:            data['user_text_color']              || undefined,
          textSecondaryOpacity: data['user_text_secondary_opacity']  ? parseFloat(data['user_text_secondary_opacity'])  : undefined,
          textDimOpacity:       data['user_text_dim_opacity']        ? parseFloat(data['user_text_dim_opacity'])        : undefined,
          textSecondaryColor:   data['user_text_secondary_color']    || undefined,
          textDimColor:         data['user_text_dim_color']          || undefined,
          borderColor:          data['user_border_color']            || undefined,
          borderOpacity:        data['user_border_opacity']          ? parseFloat(data['user_border_opacity'])          : undefined,
          borderWidth:          data['user_border_width']            ? parseFloat(data['user_border_width'])            : undefined,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Dashboard />} />
        <Route path="/settings" element={<SettingsWrapper />} />
        <Route path="/gallery"  element={<GalleryWrapper />} />
        <Route path="/design"   element={<DesignSystemWrapper />} />
      </Routes>
    </BrowserRouter>
  )
}
