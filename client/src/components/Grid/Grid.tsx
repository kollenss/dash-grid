import { useState, useEffect, useRef } from 'react'
import './Grid.css'
import GridCell from './GridCell'
import { CardConfig } from '../../types'

const COLS = 12
const ROWS = 8
const GRID_PADDING = 16
const GRID_GAP = 12

interface DragState {
  cardId: string
  offsetCol: number
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
}

export default function Grid({ cards, editMode = false, onAddCard, onEditCard, onResizeCard, onMoveCard }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef      = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [drag, setDrag] = useState<DragState | null>(null)
  const latestDrag      = useRef<DragState | null>(null)

  useEffect(() => {
    function update() {
      const el = containerRef.current
      if (!el) return
      setSize({ w: el.clientWidth, h: el.clientHeight })
    }
    update()
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const activeCols = editMode || cards.length === 0
    ? COLS
    : Math.max(...cards.map(c => c.col + c.col_span - 1))
  const activeRows = editMode || cards.length === 0
    ? ROWS
    : Math.max(...cards.map(c => c.row + c.row_span - 1))

  const cellW = size.w > 0 ? (size.w - 2 * GRID_PADDING - (activeCols - 1) * GRID_GAP) / activeCols : 0
  const cellH = size.h > 0 ? (size.h - 2 * GRID_PADDING - (activeRows - 1) * GRID_GAP) / activeRows : 0

  function clientToCell(clientX: number, clientY: number): { col: number; row: number } | null {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left - GRID_PADDING
    const y = clientY - rect.top  - GRID_PADDING
    return {
      col: Math.floor(x / (cellW + GRID_GAP)) + 1,
      row: Math.floor(y / (cellH + GRID_GAP)) + 1,
    }
  }

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
    const offsetCol = Math.max(0, Math.min(card.col_span - 1, cell.col - card.col))
    const offsetRow = Math.max(0, Math.min(card.row_span - 1, cell.row - card.row))
    const newDrag: DragState = { cardId, offsetCol, offsetRow, targetCol: card.col, targetRow: card.row, valid: true }
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

  const occupied = new Set<string>()
  for (const card of cards) {
    const col = drag?.cardId === card.id ? drag.targetCol : card.col
    const row = drag?.cardId === card.id ? drag.targetRow : card.row
    for (let r = row; r < row + card.row_span; r++)
      for (let c = col; c < col + card.col_span; c++)
        occupied.add(`${c},${r}`)
  }

  return (
    <div ref={containerRef} className="hb-grid-outer">
      <div ref={gridRef} className="hb-grid" style={{
        gridTemplateColumns: `repeat(${activeCols}, 1fr)`,
        gridTemplateRows:    `repeat(${activeRows}, 1fr)`,
      }}>
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
          const displayCard = isDragging ? { ...card, col: drag!.targetCol, row: drag!.targetRow } : card
          return (
            <GridCell
              key={card.id}
              card={displayCard}
              cellW={cellW}
              cellH={cellH}
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
  )
}
