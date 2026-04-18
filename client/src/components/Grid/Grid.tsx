import { useState, useEffect, useRef } from 'react'
import './Grid.css'
import GridCell from './GridCell'
import { CardConfig } from '../../types'

const COLS = 12
const ROWS = 8
const BASE_WIDTH  = 1440
const BASE_HEIGHT = 848
const GRID_PADDING = 16
const GRID_GAP = 12
const CELL_W = (BASE_WIDTH  - 2 * GRID_PADDING - (COLS - 1) * GRID_GAP) / COLS
const CELL_H = (BASE_HEIGHT - 2 * GRID_PADDING - (ROWS - 1) * GRID_GAP) / ROWS

interface DragState {
  cardId: string
  offsetCol: number   // grab-offset från kortets vänsterkant i kolumnenheter
  offsetRow: number
  targetCol: number
  targetRow: number
  valid: boolean
}

interface Props {
  cards: CardConfig[]
  editMode?: boolean
  onAddCard: (col: number, row: number) => void
  onEditCard: (cardId: string) => void
  onResizeCard: (cardId: string, colSpan: number, rowSpan: number) => void
  onMoveCard: (cardId: string, col: number, row: number) => void
  minScale?: number
}

export default function Grid({ cards, editMode = false, onAddCard, onEditCard, onResizeCard, onMoveCard, minScale = 0.5 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef      = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [drag, setDrag]   = useState<DragState | null>(null)
  const latestDrag        = useRef<DragState | null>(null)  // synkront spår senaste drag-state

  useEffect(() => {
    function updateScale() {
      const el = containerRef.current
      if (!el) return
      const sx = el.clientWidth  / BASE_WIDTH
      const sy = el.clientHeight / BASE_HEIGHT
      setScale(Math.max(Math.min(sx, sy), minScale))
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [minScale])

  // Konverterar skärmkoordinater → gridcell (1-indexerat)
  function clientToCell(clientX: number, clientY: number): { col: number; row: number } | null {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const designX = (clientX - rect.left) / scale - GRID_PADDING
    const designY = (clientY - rect.top)  / scale - GRID_PADDING
    return {
      col: Math.floor(designX / (CELL_W + GRID_GAP)) + 1,
      row: Math.floor(designY / (CELL_H + GRID_GAP)) + 1
    }
  }

  // Kontrollerar om en position är giltig (inga överlapp, inom gränser)
  function isValidPos(cardId: string, col: number, row: number, colSpan: number, rowSpan: number): boolean {
    if (col < 1 || row < 1 || col + colSpan - 1 > COLS || row + rowSpan - 1 > ROWS) return false
    for (const other of cards) {
      if (other.id === cardId) continue
      if (col < other.col + other.col_span &&
          col + colSpan > other.col &&
          row < other.row + other.row_span &&
          row + rowSpan > other.row) return false
    }
    return true
  }

  function handleDragStart(cardId: string, clientX: number, clientY: number) {
    const card = cards.find(c => c.id === cardId)!
    const cell = clientToCell(clientX, clientY)
    if (!cell) return

    // Grab-offset: hur många celler från kortets hörn tryckte användaren
    const offsetCol = Math.max(0, Math.min(card.col_span - 1, cell.col - card.col))
    const offsetRow = Math.max(0, Math.min(card.row_span - 1, cell.row - card.row))

    const newDrag: DragState = {
      cardId, offsetCol, offsetRow,
      targetCol: card.col, targetRow: card.row,
      valid: true
    }
    latestDrag.current = newDrag
    setDrag(newDrag)
  }

  function handleDragMove(clientX: number, clientY: number) {
    const current = latestDrag.current
    if (!current) return

    const cell = clientToCell(clientX, clientY)
    if (!cell) return

    const card = cards.find(c => c.id === current.cardId)!
    const newCol = Math.max(1, Math.min(COLS - card.col_span + 1, cell.col - current.offsetCol))
    const newRow = Math.max(1, Math.min(ROWS - card.row_span + 1, cell.row - current.offsetRow))
    const valid  = isValidPos(current.cardId, newCol, newRow, card.col_span, card.row_span)

    const newDrag: DragState = { ...current, targetCol: newCol, targetRow: newRow, valid }
    latestDrag.current = newDrag
    setDrag(newDrag)
  }

  function handleDragEnd(cardId: string) {
    const final = latestDrag.current
    if (final?.valid) {
      const card = cards.find(c => c.id === cardId)!
      if (final.targetCol !== card.col || final.targetRow !== card.row) {
        onMoveCard(cardId, final.targetCol, final.targetRow)
      }
    }
    latestDrag.current = null
    setDrag(null)
  }

  // Beräkna occupied med hänsyn till pågående drag
  const occupied = new Set<string>()
  for (const card of cards) {
    const col = drag?.cardId === card.id ? drag.targetCol : card.col
    const row = drag?.cardId === card.id ? drag.targetRow : card.row
    for (let r = row; r < row + card.row_span; r++) {
      for (let c = col; c < col + card.col_span; c++) {
        occupied.add(`${c},${r}`)
      }
    }
  }

  const sizerW = Math.round(BASE_WIDTH  * scale)
  const sizerH = Math.round(BASE_HEIGHT * scale)

  return (
    <div ref={containerRef} className="hb-grid-outer">
      <div style={{ width: sizerW, height: sizerH, position: 'relative', flexShrink: 0 }}>
        <div
          ref={gridRef}
          className="hb-grid"
          style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${scale})` }}
        >
          {editMode && Array.from({ length: ROWS }, (_, ri) =>
            Array.from({ length: COLS }, (_, ci) => {
              const col = ci + 1
              const row = ri + 1
              const key = `${col},${row}`
              if (occupied.has(key)) return null
              return (
                <div
                  key={key}
                  className="hb-empty-cell"
                  style={{ gridColumn: `${col}`, gridRow: `${row}` }}
                  onClick={() => onAddCard(col, row)}
                >
                  <span className="hb-add-icon">+</span>
                </div>
              )
            })
          )}

          {cards.map(card => {
            const isDragging  = drag?.cardId === card.id
            // Under drag: visa kortet på målpositionen
            const displayCard = isDragging
              ? { ...card, col: drag!.targetCol, row: drag!.targetRow }
              : card

            return (
              <GridCell
                key={card.id}
                card={displayCard}
                scale={scale}
                editMode={editMode}
                onEdit={onEditCard}
                onResize={onResizeCard}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDragging={isDragging}
                dropValid={isDragging ? drag!.valid : true}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
