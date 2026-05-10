import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { registry } from '../../core/CardRegistry'
import { useCore } from '../../core/useCore'
import { CardConfig } from '../../types'
import CardErrorBoundary from './CardErrorBoundary'
import './GridCell.css'

const GRID_GAP = 12
const COLS = 12
const ROWS = 8
const DRAG_THRESHOLD = 10

interface Props {
  card: CardConfig
  scale: number
  cellW: number
  cellH: number
  editMode?: boolean
  onEdit: (id: string) => void
  onResize: (id: string, colSpan: number, rowSpan: number) => void
  onDragStart: (id: string, clientX: number, clientY: number) => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: (id: string) => void
  isDragging?: boolean
  dropValid?: boolean
}

export default function GridCell({
  card, scale, cellW, cellH, editMode = false, onEdit, onResize,
  onDragStart, onDragMove, onDragEnd,
  isDragging = false, dropValid = true
}: Props) {
  const { states, integrations, haError } = useCore()
  const navigate = useNavigate()

  // ── Resize-state ─────────────────────────────────────────────────────────
  const [dragSpan, setDragSpan] = useState<{ col: number; row: number } | null>(null)
  const resizeStart = useRef<{ x: number; y: number; colSpan: number; rowSpan: number } | null>(null)
  const latestDragSpan = useRef<{ col: number; row: number } | null>(null)

  const activeColSpan = dragSpan?.col ?? card.col_span
  const activeRowSpan = dragSpan?.row ?? card.row_span

  const style = {
    gridColumn: `${card.col} / span ${activeColSpan}`,
    gridRow:    `${card.row} / span ${activeRowSpan}`
  }

  // ── Overlay pointer-events (tap vs drag) ──────────────────────────────────
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const moveStarted = useRef(false)

  function onOverlayPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pressOrigin.current = { x: e.clientX, y: e.clientY }
    moveStarted.current = false
  }

  function onOverlayPointerMove(e: React.PointerEvent) {
    if (!pressOrigin.current) return
    const dx = e.clientX - pressOrigin.current.x
    const dy = e.clientY - pressOrigin.current.y

    if (!moveStarted.current && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      moveStarted.current = true
      // Skicka initialposition (där användaren tryckte) för korrekt grab-offset
      onDragStart(card.id, pressOrigin.current.x, pressOrigin.current.y)
    }

    if (moveStarted.current) {
      onDragMove(e.clientX, e.clientY)
    }
  }

  function onOverlayPointerUp() {
    if (!pressOrigin.current) return
    if (!moveStarted.current) {
      onEdit(card.id)    // tap → öppna modal
    } else {
      onDragEnd(card.id) // drag → spara ny position
    }
    pressOrigin.current = null
    moveStarted.current = false
  }

  // ── Resize pointer-events ─────────────────────────────────────────────────
  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      colSpan: card.col_span,
      rowSpan: card.row_span
    }
    latestDragSpan.current = null
  }

  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeStart.current) return
    const dx = e.clientX - resizeStart.current.x
    const dy = e.clientY - resizeStart.current.y

    const colDelta = Math.round(dx / scale / (cellW + GRID_GAP))
    const rowDelta = Math.round(dy / scale / (cellH + GRID_GAP))

    const def = registry.get(card.type)
    const minColSpan = def?.minSize?.[0] ?? 1
    const minRowSpan = def?.minSize?.[1] ?? 1

    const newColSpan = Math.max(minColSpan, Math.min(COLS - card.col + 1, resizeStart.current.colSpan + colDelta))
    const newRowSpan = Math.max(minRowSpan, Math.min(ROWS - card.row + 1, resizeStart.current.rowSpan + rowDelta))

    const newSpan = { col: newColSpan, row: newRowSpan }
    latestDragSpan.current = newSpan
    setDragSpan(newSpan)
  }

  function onResizePointerUp() {
    if (!resizeStart.current) return
    const finalSpan = latestDragSpan.current
    if (finalSpan && (finalSpan.col !== card.col_span || finalSpan.row !== card.row_span)) {
      onResize(card.id, finalSpan.col, finalSpan.row)
    }
    resizeStart.current = null
    latestDragSpan.current = null
    setDragSpan(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const state = states[card.config.entity_id]
  const cfg   = card.config

  function renderCard() {
    const def = registry.get(card.type)
    if (!def) {
      return (
        <div className="glass-card">
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Unknown card type: {card.type}
          </span>
        </div>
      )
    }
    if (haError && def.needsEntity) {
      return (
        <div className="glass-card hb-card-error" onClick={() => navigate('/settings')}>
          <span className="hb-card-error__msg">{haError} · Check Home Assistant token in Settings</span>
        </div>
      )
    }
    const Component = def.component
    return (
      <CardErrorBoundary cardType={card.type}>
        <Component config={cfg} state={state} states={states} integrations={integrations} colSpan={activeColSpan} rowSpan={activeRowSpan} />
      </CardErrorBoundary>
    )
  }

  const cellClass = [
    'hb-grid-cell',
    dragSpan       ? 'is-resizing'   : '',
    isDragging     ? 'is-dragging'   : '',
    isDragging && !dropValid ? 'drop-invalid' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={cellClass} style={style}>

      {editMode && (
        <div
          className="hb-edit-overlay"
          onPointerDown={onOverlayPointerDown}
          onPointerMove={onOverlayPointerMove}
          onPointerUp={onOverlayPointerUp}
          onPointerCancel={onOverlayPointerUp}
        />
      )}

      {renderCard()}

      {editMode && (
        <div
          className="hb-resize-handle"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          title="Ändra storlek"
        >
          <span className="hb-resize-grip" />
        </div>
      )}
    </div>
  )
}
