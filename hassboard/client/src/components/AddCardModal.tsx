import { useState, useEffect, Component, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './AddCardModal.css'
import EntityBrowser from './EntityBrowser'
import { CardConfig } from '../types'
import { registry } from '../core/CardRegistry'
import { useCore } from '../core/useCore'
import type { CardDefinition } from '../core/types'
import { getMissingIntegrations } from '../utils/checkIntegrations'

// ── Error boundary — fångar kraschar i kortkomponenten under preview ────────
class PreviewBoundary extends Component<{ children: ReactNode; resetKey: string }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.crashed) {
      this.setState({ crashed: false })
    }
  }
  render() {
    if (this.state.crashed) return (
      <div className="glass-card modal-preview-placeholder">
        <span>Preview unavailable</span>
      </div>
    )
    return this.props.children
  }
}

// ── Gridens designkonstanter (matchar Grid.tsx / Grid.css) ─────────────────
const GRID_PADDING = 16
const GRID_GAP     = 12
const COLS         = 12
const ROWS         = 8
const BASE_WIDTH   = 1440
const BASE_HEIGHT  = 848
const CELL_W = (BASE_WIDTH  - 2 * GRID_PADDING - (COLS - 1) * GRID_GAP) / COLS
const CELL_H = (BASE_HEIGHT - 2 * GRID_PADDING - (ROWS - 1) * GRID_GAP) / ROWS

// Max storlek på preview-containern i modalen
const PREVIEW_MAX_W = 400
const PREVIEW_MAX_H = 180

// ── Add-mode props ──────────────────────────────────────────────────────────
interface AddProps {
  mode?: 'add'
  col: number
  row: number
  onAdd: (card: {
    type: string
    col: number; row: number; col_span: number; row_span: number
    config: Record<string, any>
  }) => void
  onClose: () => void
}

// ── Edit-mode props ─────────────────────────────────────────────────────────
interface EditProps {
  mode: 'edit'
  initialCard: CardConfig
  onSave: (cardId: string, data: { col_span: number; row_span: number; config: Record<string, any> }) => void
  onDelete: (cardId: string) => void
  onClose: () => void
}

type Props = AddProps | EditProps

export default function AddCardModal(props: Props) {
  const isEdit = props.mode === 'edit'
  const { states, integrations } = useCore()

  // ── Form-state, initialiserad från initialCard i edit-läge ─────────────
  const [step, setStep]         = useState<'type' | 'config'>(() => isEdit ? 'config' : 'type')
  const [selected, setSelected] = useState<CardDefinition | null>(() => {
    if (!isEdit) return null
    return registry.get((props as EditProps).initialCard.type) ?? null
  })
  const [entityId, setEntityId] = useState(() =>
    isEdit ? ((props as EditProps).initialCard.config.entity_id ?? '') : ''
  )
  const [title, setTitle] = useState(() => {
    if (!isEdit) return ''
    const { title: t } = (props as EditProps).initialCard.config
    return t ?? ''
  })
  const [cardConfig, setCardConfig] = useState<Record<string, any>>(() => {
    if (!isEdit) return {}
    const { entity_id: _e, title: _t, ...rest } = (props as EditProps).initialCard.config
    return rest
  })
  const [colSpan, setColSpan] = useState(() =>
    isEdit ? (props as EditProps).initialCard.col_span : 2
  )
  const [rowSpan, setRowSpan] = useState(() =>
    isEdit ? (props as EditProps).initialCard.row_span : 2
  )
  const [showBrowser, setShowBrowser]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!deleteConfirm) return
    const t = setTimeout(() => setDeleteConfirm(false), 3000)
    return () => clearTimeout(t)
  }, [deleteConfirm])

  // ── Preview: live-config och kortdimensioner ────────────────────────────
  const liveConfig: Record<string, any> = { ...cardConfig }
  if (selected?.needsEntity && entityId) liveConfig.entity_id = entityId
  if (title) liveConfig.title = title

  const haState   = entityId ? states[entityId] : undefined
  const cardW     = colSpan * CELL_W + (colSpan - 1) * GRID_GAP
  const cardH     = rowSpan * CELL_H + (rowSpan - 1) * GRID_GAP
  const previewScale = Math.min(PREVIEW_MAX_W / cardW, PREVIEW_MAX_H / cardH, 1)
  const previewW  = Math.round(cardW * previewScale)
  const previewH  = Math.round(cardH * previewScale)

  // ── Handlers ───────────────────────────────────────────────────────────
  function selectType(def: CardDefinition) {
    setSelected(def)
    setColSpan(Math.max(def.defaultSize[0], def.minSize?.[0] ?? 1))
    setRowSpan(Math.max(def.defaultSize[1], def.minSize?.[1] ?? 1))
    setCardConfig({})
    setEntityId('')
    setTitle('')
    setStep('config')
  }

  function updateConfig(k: string, v: any) {
    setCardConfig(prev => ({ ...prev, [k]: v }))
  }

  function handleEntitySelect(id: string) {
    setEntityId(id)
    if (!title) setTitle(id.split('.')[1]?.replace(/_/g, ' ') ?? '')
    setShowBrowser(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (selected.needsEntity && !entityId.trim()) return

    const config: Record<string, any> = { ...cardConfig }
    if (selected.needsEntity) config.entity_id = entityId.trim()
    if (title.trim()) config.title = title.trim()

    if (isEdit) {
      const ep = props as EditProps
      ep.onSave(ep.initialCard.id, { col_span: colSpan, row_span: rowSpan, config })
    } else {
      const ap = props as AddProps
      ap.onAdd({ type: selected.type, col: ap.col, row: ap.row, col_span: colSpan, row_span: rowSpan, config })
    }
  }

  function handleDeleteClick() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    const ep = props as EditProps
    ep.onDelete(ep.initialCard.id)
    props.onClose()
  }

  const groups   = registry.getGroups()
  const allCards = registry.getAll()

  return (
    <div className="modal-backdrop hb-chrome" onClick={props.onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>

        {/* ── Steg 1: Välj korttyp ─────────────────────────────────────── */}
        {step === 'type' && (<>
          <h2 className="modal-title">Choose card type</h2>
          {groups.map(group => {
            const items = allCards.filter(c => c.group === group)
            return (
              <div key={group} className="modal-type-group">
                <div className="modal-group-label">{group}</div>
                <div className="modal-type-grid">
                  {items.map(def => (
                    <button key={def.type} className="modal-type-tile" onClick={() => selectType(def)}>
                      <span className="modal-type-icon">{def.icon}</span>
                      <span className="modal-type-name">{def.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <button className="btn-cancel" style={{ marginTop: 8 }} onClick={props.onClose}>Cancel</button>
        </>)}

        {/* ── Steg 2: Konfigurera ──────────────────────────────────────── */}
        {step === 'config' && selected && (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-back-row">
              {!isEdit && (
                <button type="button" className="modal-back-btn" onClick={() => setStep('type')}>← Back</button>
              )}
              <span className="modal-step-title">{selected.icon} {selected.label}</span>
            </div>

            {/* ── Integrationskontroll ────────────────────────────────── */}
            {(() => {
              const missing = getMissingIntegrations(selected, integrations)
              return missing.length > 0 ? (
                <div className="modal-integration-warning">
                  <span className="modal-integration-warning__icon">⚠</span>
                  <span>
                    Requires setup: {missing.map(i => i.label).join(', ')}
                  </span>
                  <Link to="/settings" className="modal-integration-warning__link" onClick={props.onClose}>
                    Go to Settings →
                  </Link>
                </div>
              ) : null
            })()}

            {/* ── Live-förhandsgranskning ─────────────────────────────── */}
            <div className="modal-preview-outer" style={{ width: previewW, height: previewH }}>
              {selected.needsEntity && !entityId.trim() ? (
                // Entitet ej vald ännu — visa platshållare istället för att krascha
                <div className="glass-card modal-preview-placeholder">
                  <span>Select an entity to preview</span>
                </div>
              ) : (
                <PreviewBoundary resetKey={selected.type + entityId}>
                  <div style={{ width: cardW, height: cardH, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                    <selected.component config={liveConfig} state={haState} colSpan={colSpan} rowSpan={rowSpan} />
                  </div>
                </PreviewBoundary>
              )}
            </div>

            {/* Entity-väljare */}
            {selected.needsEntity && (
              <label className="modal-label">
                Entity
                <div className="modal-entity-row">
                  <input
                    className="modal-input modal-entity-input"
                    type="text"
                    value={entityId}
                    onChange={e => setEntityId(e.target.value)}
                    placeholder={`${selected.defaultDomains?.[0] ?? 'sensor'}.min_sensor`}
                    required
                  />
                  <button type="button" className="modal-browse-btn" onClick={() => setShowBrowser(true)}>
                    Browse
                  </button>
                </div>
              </label>
            )}

            {/* Titel */}
            <label className="modal-label">
              Title (optional)
              <input className="modal-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="My entity" />
            </label>

            {/* Kortspecifika fält */}
            {selected.configUI && (
              <selected.configUI config={cardConfig} onChange={updateConfig} />
            )}

            {/* Storlek */}
            <div className="modal-size-row">
              <label className="modal-label">
                Width (cols)
                <select className="modal-input" value={colSpan} onChange={e => setColSpan(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6, 12].map(n => (
                    <option key={n} value={n} disabled={n < (selected?.minSize?.[0] ?? 1)}>
                      {n}{n < (selected?.minSize?.[0] ?? 1) ? ' (too small)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-label">
                Height (rows)
                <select className="modal-input" value={rowSpan} onChange={e => setRowSpan(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n} disabled={n < (selected?.minSize?.[1] ?? 1)}>
                      {n}{n < (selected?.minSize?.[1] ?? 1) ? ' (too small)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Spara / Avbryt */}
            <div className="modal-actions">
              <button type="submit" className="btn-primary">
                {isEdit ? 'Save' : 'Add card'}
              </button>
              <button type="button" className="btn-cancel" onClick={props.onClose}>Cancel</button>
            </div>

            {/* Ta bort-knapp — enbart i edit-läge */}
            {isEdit && (
              <button
                type="button"
                className={`btn-delete${deleteConfirm ? ' btn-delete--confirm' : ''}`}
                onClick={handleDeleteClick}
              >
                {deleteConfirm ? 'Confirm delete?' : 'Remove card'}
              </button>
            )}
          </form>
        )}
      </div>

      {showBrowser && selected && (
        <EntityBrowser
          domains={selected.defaultDomains}
          onSelect={handleEntitySelect}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}
