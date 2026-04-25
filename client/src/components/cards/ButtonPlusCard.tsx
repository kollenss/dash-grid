import { useState, useEffect, useRef, useMemo } from 'react'
import '../../styles/glass.css'
import './ButtonPlusCard.css'
import { HAState } from '../../types'
import { useCore } from '../../core/useCore'
import { MdiIcon, getEntityIcon } from '../../lib/mdiIcons'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Config {
  entity_id: string
  title?: string
  icon?: string
  show_histogram?: boolean
  history_hours?: number
  show_slider?: boolean
  accent_color?: string
  ambient_animation?: 'auto' | false
}

interface Props {
  config: Config
  state?: HAState
}

interface HistoryPoint { t: number; v: number }

// ── Slider config per domain ───────────────────────────────────────────────────

interface SliderDef {
  current: (s: HAState) => number | null
  min: number; max: number; step: number
  call: (id: string, v: number) => [string, string, Record<string, any>]
  unit: string
}

function getSliderDef(domain: string, state?: HAState): SliderDef | null {
  switch (domain) {
    case 'light': {
      const modes = (state?.attributes?.supported_color_modes ?? []) as string[]
      // If modes are known and all are 'onoff', no brightness. Otherwise assume dimmable.
      const dimmable = modes.length === 0
        ? state?.attributes?.brightness != null   // fallback: attribute present?
        : modes.some((m: string) => m !== 'onoff')
      if (!dimmable) return null
      return {
        current: s => s.attributes?.brightness != null
          ? Math.round((s.attributes.brightness / 255) * 100) : null,
        min: 1, max: 100, step: 1, unit: '%',
        call: (id, v) => ['light', 'turn_on', { entity_id: id, brightness_pct: v }],
      }
    }
    case 'fan':
      // percentage is the standard; some older integrations omit it when fan is off
      if (state?.attributes?.percentage === undefined && state?.state !== 'on') return null
      return {
        current: s => s.attributes?.percentage ?? null,
        min: 0, max: 100, step: 1, unit: '%',
        call: (id, v) => ['fan', 'set_percentage', { entity_id: id, percentage: v }],
      }
    case 'cover':
      if (state?.attributes?.current_position === undefined) return null
      return {
        current: s => s.attributes?.current_position ?? null,
        min: 0, max: 100, step: 1, unit: '%',
        call: (id, v) => ['cover', 'set_cover_position', { entity_id: id, position: v }],
      }
    case 'media_player': {
      const hasVol = state?.attributes?.volume_level !== undefined
      if (!hasVol) return null
      // Prefer volume_set (smooth); fall back to nothing if only step is supported
      // (step-based doesn't map well to a continuous drag slider)
      if (!mpSupports(state, MP_VOLUME_SET)) return null
      return {
        current: s => s.attributes?.volume_level != null
          ? Math.round(s.attributes.volume_level * 100) : null,
        min: 0, max: 100, step: 1, unit: '%',
        call: (id, v) => ['media_player', 'volume_set', { entity_id: id, volume_level: v / 100 }],
      }
    }
    case 'input_number':
    case 'number':
      return {
        current: s => parseFloat(s.state) ?? null,
        min: state?.attributes?.min ?? 0,
        max: state?.attributes?.max ?? 100,
        step: state?.attributes?.step ?? 1,
        unit: state?.attributes?.unit_of_measurement ?? '',
        call: (id, v) => [domain, 'set_value', { entity_id: id, value: v }],
      }
    case 'climate':
      return {
        current: s => s.attributes?.temperature ?? null,
        min: state?.attributes?.min_temp ?? 15,
        max: state?.attributes?.max_temp ?? 30,
        step: 0.5, unit: '°',
        call: (id, v) => ['climate', 'set_temperature', { entity_id: id, temperature: v }],
      }
    default:
      return null
  }
}

// HA media_player supported_features bitmask
const MP_PAUSE       = 1
const MP_VOLUME_SET  = 4
const MP_PLAY        = 16384
const MP_VOLUME_STEP = 1024

function mpSupports(state: HAState | undefined, flag: number): boolean {
  return ((state?.attributes?.supported_features ?? 0) & flag) !== 0
}

function getToggleCall(domain: string, isOn: boolean): [string, string] {
  switch (domain) {
    // media_player: tap = power. Play/pause is a separate overlay button.
    case 'media_player': return ['media_player', isOn ? 'turn_off' : 'turn_on']
    case 'remote':       return ['remote',        isOn ? 'turn_off' : 'turn_on']
    case 'cover':   return ['cover',  isOn ? 'close_cover' : 'open_cover']
    case 'lock':    return ['lock',   isOn ? 'lock' : 'unlock']
    case 'vacuum':  return ['vacuum', isOn ? 'return_to_base' : 'start']
    default:        return ['homeassistant', isOn ? 'turn_off' : 'turn_on']
  }
}

function isEntityOn(domain: string, state: HAState | undefined): boolean {
  if (!state) return false
  const s = state.state
  switch (domain) {
    case 'media_player': return s === 'playing' || s === 'paused' || s === 'on' || s === 'idle'
    case 'remote':       return s === 'on'
    case 'cover':        return s === 'open' || s === 'opening'
    case 'lock':         return s === 'unlocked'
    case 'climate':      return s !== 'off'
    default:             return s === 'on'
  }
}

// ── Sparkline — "Crisp" smoothing (same as HistoryGraphCard) ─────────────────

interface XY { x: number; y: number }

function resampleEvenly(pts: XY[], n: number): XY[] {
  if (pts.length < 2) return pts
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x
  const result: XY[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const x = x0 + (i / (n - 1)) * (x1 - x0)
    while (j < pts.length - 2 && pts[j + 1].x <= x) j++
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)]
    const t = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0
    result.push({ x, y: a.y + t * (b.y - a.y) })
  }
  return result
}

function gaussianSmooth(pts: XY[], sigma: number): XY[] {
  const radius = Math.ceil(sigma * 3)
  return pts.map((p, i) => {
    let wSum = 0, ySum = 0
    const lo = Math.max(0, i - radius)
    const hi = Math.min(pts.length - 1, i + radius)
    for (let j = lo; j <= hi; j++) {
      const d = i - j
      const w = Math.exp(-(d * d) / (2 * sigma * sigma))
      wSum += w; ySum += pts[j].y * w
    }
    return { x: p.x, y: ySum / wSum }
  })
}

// Interpolate the raw history value at a given time fraction (0–1)
function getHistoryValueAt(pts: HistoryPoint[], xFrac: number): number | null {
  if (pts.length < 2) return null
  const minT   = pts[0].t
  const rangeT = pts[pts.length - 1].t - minT || 1
  const t      = minT + xFrac * rangeT
  let idx = pts.findIndex(p => p.t > t)
  if (idx <= 0)             return pts[0].v
  if (idx >= pts.length)    return pts[pts.length - 1].v
  const a = pts[idx - 1], b = pts[idx]
  const frac = (t - a.t) / (b.t - a.t)
  return a.v + frac * (b.v - a.v)
}

function toSvgPoints(pts: HistoryPoint[], w: number, h: number): XY[] {
  const minV  = Math.min(...pts.map(p => p.v))
  const maxV  = Math.max(...pts.map(p => p.v))
  const rangeV = maxV - minV || 1
  const minT  = pts[0].t
  const rangeT = pts[pts.length - 1].t - minT || 1
  // Wave sits in lower 58% of card, leaving headroom for text
  const yTop = h * 0.42
  const yBot = h * 0.98
  return pts.map(p => ({
    x: ((p.t - minT) / rangeT) * w,
    y: yTop + (1 - (p.v - minV) / rangeV) * (yBot - yTop),
  }))
}


function downsample(pts: HistoryPoint[], n: number): HistoryPoint[] {
  if (pts.length <= n) return pts
  const out: HistoryPoint[] = []
  const step = (pts.length - 1) / (n - 1)
  for (let i = 0; i < n; i++) out.push(pts[Math.round(i * step)])
  return out
}

// ── Ambient animation ─────────────────────────────────────────────────────────

type AmbientTheme = 'wind' | 'electricity' | 'battery'

function detectAmbientTheme(unit?: string, deviceClass?: string, entityId?: string): AmbientTheme | null {
  if (deviceClass === 'battery') return 'battery'
  if (!unit) return null
  const u = unit.trim()
  if (['m/s', 'mph', 'km/h'].includes(u)) return 'wind'
  if (['W', 'kW'].includes(u)) return 'electricity'
  if (u === '%' && entityId && entityId.toLowerCase().includes('batt')) return 'battery'
  return null
}

function ambientDuration(theme: AmbientTheme, val: number): string {
  if (!isFinite(val)) return theme === 'wind' ? '2s' : '2.5s'
  if (theme === 'wind') {
    let s = Math.max(0.4, 2.5 - Math.min(val, 10) * 0.18)
    if (val >= 15) s = Math.max(0.3, s * 0.65)
    return `${s.toFixed(2)}s`
  }
  const s = Math.max(0.5, 20 / (1 + val / 30))
  return `${s.toFixed(2)}s`
}

function ambientOpacity(theme: AmbientTheme, val: number): string {
  if (theme !== 'electricity' || !isFinite(val)) return '0.65'
  return Math.min(0.95, Math.max(0.45, 0.45 + (val / 2000) * 0.5)).toFixed(2)
}

const WIND_STREAK_LEN      = 0.055
const MAX_WIND_PARTICLES   = 10

function windParticleCount(val: number): number {
  if (!isFinite(val) || val < 3)  return 1
  if (val < 6)  return 6
  if (val < 10) return 7
  if (val < 20) return 8
  if (val < 25) return 9
  return 10
}

interface WindState {
  phase: 'traveling' | 'veering' | 'idle'
  startMs:    number
  travelMs:   number  // ms for the travel phase
  veerMs:     number  // ms for the spiral phase
  pauseMs:    number  // ms to pause before next particle
  spawnFrac:  number  // 0..1 where on path it spawns
  travelLen:  number  // fraction of path to travel
  spiralCx:   number
  spiralCy:   number
  spiralAngle: number
  spiralR:    number
}

const MAX_HORIZ_PARTICLES  = 3

interface HorizWindState {
  phase:       'traveling' | 'veering' | 'idle'
  startMs:     number
  travelMs:    number
  veerMs:      number
  pauseMs:     number
  yFrac:       number  // vertical position as fraction of card height
  x0:          number  // start x (SVG px, off-screen left)
  x1:          number  // end x (SVG px)
  spiralCx:    number
  spiralCy:    number
  spiralAngle: number
  spiralR:     number
}

// Pre-computed sin/cos lookup table — eliminates Math.cos/sin inside rAF loop
const TRIG_STEPS = 256
const _TRIG_COS = new Float32Array(TRIG_STEPS)
const _TRIG_SIN = new Float32Array(TRIG_STEPS)
for (let i = 0; i < TRIG_STEPS; i++) {
  const a = (i / TRIG_STEPS) * Math.PI * 2
  _TRIG_COS[i] = Math.cos(a)
  _TRIG_SIN[i] = Math.sin(a)
}
function tCos(angle: number): number {
  return _TRIG_COS[((Math.round(angle / (Math.PI * 2) * TRIG_STEPS) % TRIG_STEPS) + TRIG_STEPS) % TRIG_STEPS]
}
function tSin(angle: number): number {
  return _TRIG_SIN[((Math.round(angle / (Math.PI * 2) * TRIG_STEPS) % TRIG_STEPS) + TRIG_STEPS) % TRIG_STEPS]
}

// Horizontal tail + spiral for free-floating swirls
function windHorizSpiralPath(x0: number, x1: number, y: number, cx: number, cy: number, startAngle: number, maxR: number, progress: number): string {
  let d = `M ${x0.toFixed(1)} ${y.toFixed(1)} L ${x1.toFixed(1)} ${y.toFixed(1)}`
  const steps = 64
  const count = Math.round(steps * Math.min(1, progress))
  for (let i = 1; i <= count; i++) {
    const frac  = i / steps
    const angle = startAngle - frac * Math.PI * 2 * 1.15
    const r     = maxR * Math.max(0.05, 1 - frac * 0.72)
    d += ` L ${(cx + tCos(angle) * r).toFixed(1)} ${(cy + tSin(angle) * r).toFixed(1)}`
  }
  return d
}

// Short streak segment traveling along the curve
function windTravelPath(pts: XY[], trailFrac: number, leadFrac: number): string {
  const n = pts.length
  if (n < 2) return ''
  const i0 = Math.max(0, Math.round(Math.max(0, trailFrac) * (n - 1)))
  const i1 = Math.min(n - 1, Math.round(Math.min(1, leadFrac) * (n - 1)))
  if (i0 >= i1) return ''
  return pts.slice(i0, i1 + 1)
    .map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}

// Spiral that grows from the veer-off point.
// The spiral starts at angle `startAngle` (from center to tip) and winds
// counter-clockwise in SVG coords (= clockwise visually), shrinking radius.
// spawnFrac is the fixed tail origin so the full streak stays visible during veer.
function windSpiralPath(
  pts: XY[], spawnFrac: number, endFrac: number,
  cx: number, cy: number,
  startAngle: number, maxR: number,
  progress: number, // 0..1 — how much of the spiral has formed
): string {
  const n = pts.length
  if (n < 2) return ''
  const i1    = Math.min(n - 1, Math.round(Math.min(0.99, endFrac) * (n - 1)))
  const iStart = Math.max(0, Math.round(spawnFrac * (n - 1)))
  let d = pts.slice(iStart, i1 + 1)
    .map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  // Add spiral points (chained via L from tip)
  const REVOLUTIONS = 1.15
  const steps = 64
  const count = Math.round(steps * Math.min(1, progress))
  for (let i = 1; i <= count; i++) {
    const frac = i / steps                           // advances 0→REVOLUTIONS worth of circle
    const angle = startAngle - frac * Math.PI * 2 * REVOLUTIONS
    const r = maxR * Math.max(0.05, 1 - frac * 0.72)  // shrinks to ~28% of max
    d += ` L ${(cx + tCos(angle) * r).toFixed(1)} ${(cy + tSin(angle) * r).toFixed(1)}`
  }
  return d
}

// ── Icon animation class ───────────────────────────────────────────────────────

function getAnimClass(domain: string, state: HAState | undefined): string {
  const s = state?.state
  if (!s || s === 'off' || s === 'unavailable' || s === 'unknown') return ''
  switch (domain) {
    case 'fan':          return 'bp-icon--spin'
    case 'light':        return 'bp-icon--glow'
    case 'media_player': return s === 'playing' ? 'bp-icon--pulse' : ''
    case 'weather':      return 'bp-icon--float'
    default:             return ''
  }
}

// ── Cursor time formatter ─────────────────────────────────────────────────────

function formatCursorTime(d: Date): string {
  const now      = new Date()
  const timeStr  = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const sameDay  = d.toDateString() === now.toDateString()
  if (sameDay) return timeStr
  const dateStr  = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${dateStr} · ${timeStr}`
}

// ── State label ───────────────────────────────────────────────────────────────

function makeStateLabel(
  domain: string,
  state: HAState | undefined,
  sliderDef: SliderDef | null,
  sliderVal: number,
): string {
  if (!state) return 'Unavailable'
  const s = state.state
  if (s === 'unavailable' || s === 'unknown') return 'Unavailable'

  const valStr = sliderDef
    ? `${sliderVal}${sliderDef.unit}`
    : null

  switch (domain) {
    case 'light':
      return s === 'on'
        ? (valStr ? `On · ${valStr}` : 'On')
        : 'Off'
    case 'fan':
      return s === 'on'
        ? (valStr ? `On · ${valStr}` : 'On')
        : 'Off'
    case 'media_player': {
      const media = state.attributes?.media_title as string | undefined
      const base  = media ? (media.length > 22 ? media.slice(0, 22) + '…' : media) : (s[0].toUpperCase() + s.slice(1))
      return valStr ? `${base} · ${valStr}` : base
    }
    case 'climate': {
      const cur = state.attributes?.current_temperature
      const tgt = state.attributes?.temperature
      if (cur != null && tgt != null) return `${cur}° → ${tgt}°`
      if (cur != null) return `${cur}°`
      return s[0].toUpperCase() + s.slice(1)
    }
    case 'cover': {
      const pos = state.attributes?.current_position
      return pos != null ? `${pos}%` : (s[0].toUpperCase() + s.slice(1))
    }
    case 'sensor':
    case 'number':
    case 'input_number': {
      const unit    = state.attributes?.unit_of_measurement ?? ''
      const numeric = parseFloat(s)
      const display = isFinite(numeric) ? numeric.toFixed(1) : s
      return `${display}${unit ? '\u202f' + unit : ''}`
    }
    default:
      return s[0].toUpperCase() + s.slice(1)
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ButtonPlusCard({ config, state }: Props) {
  const { callService } = useCore()
  const entityId = config.entity_id ?? ''
  const domain   = entityId.split('.')[0]

  const isOn          = isEntityOn(domain, state)
  const isUnavailable = !state || state.state === 'unavailable' || state.state === 'unknown'
  const accentColor   = config.accent_color ?? null
  const iconName      = config.icon ?? getEntityIcon(domain, state)
  const label         = config.title ?? (state?.attributes?.friendly_name ?? entityId.replace(/_/g, ' '))

  // ── Optimistic toggle
  const [optOn, setOptOn]   = useState<boolean | null>(null)
  const displayOn = optOn !== null ? optOn : isOn

  // ── Battery detection (early — needed for fillPct)
  const rawNumeric    = state ? parseFloat(state.state) : NaN
  const stateUnit     = state?.attributes?.unit_of_measurement ?? ''
  const isBattery     = state?.attributes?.device_class === 'battery'
    || (stateUnit === '%' && entityId.toLowerCase().includes('batt'))
  const batteryPct    = isBattery ? rawNumeric : NaN

  // ── Slider
  const showSlider = config.show_slider !== false
  const sliderDef  = showSlider ? getSliderDef(domain, state) : null
  const hasSlider  = sliderDef !== null && state != null && !isUnavailable
  const rawSlider  = hasSlider && sliderDef ? sliderDef.current(state!) : null
  const [optSlider, setOptSlider] = useState<number | null>(null)
  const sliderVal  = optSlider ?? rawSlider ?? 0
  const sliderMin  = sliderDef?.min ?? 0
  const sliderMax  = sliderDef?.max ?? 100

  // Fill percent (0–100) → CSS --bp-fill-pct
  const fillPct = hasSlider && sliderMax > sliderMin
    ? ((sliderVal - sliderMin) / (sliderMax - sliderMin)) * 100
    : (displayOn ? 100 : 0)

  // Glow intensity (0–1)
  const intensity = fillPct / 100

  // ── Sparkline
  const showHistogram = config.show_histogram !== false
  const historyHours  = config.history_hours ?? 6
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const sparkRef = useRef<SVGSVGElement>(null)
  const [sparkSize, setSparkSize] = useState({ w: 200, h: 80 })

  useEffect(() => {
    if (!showHistogram || !entityId) return
    fetch(`/api/ha/history/${encodeURIComponent(entityId)}?hours=${historyHours}`)
      .then(r => r.json())
      .then((data: any) => {
        const raw = Array.isArray(data?.[0]) ? data[0] : []
        const pts: HistoryPoint[] = raw
          .map((s: any) => ({
            t: new Date(s.last_changed ?? s.last_updated ?? 0).getTime(),
            v: parseFloat(s.state),
          }))
          .filter((p: HistoryPoint) => isFinite(p.v))
        setHistory(downsample(pts, 80))
      })
      .catch(() => setHistory([]))
  }, [entityId, historyHours, showHistogram])

  useEffect(() => {
    if (!sparkRef.current) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width <= 0 || height <= 0) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        setSparkSize(prev => (prev.w === width && prev.h === height ? prev : { w: width, h: height }))
      }, 100)
    })
    ro.observe(sparkRef.current)
    return () => { ro.disconnect(); if (timer) clearTimeout(timer) }
  }, [])

  // Smoothed sparkline points cached for cursor Y-lookup during drag.
  // useMemo with primitive deps avoids recompute when sparkSize object
  // reference changes but actual dimensions are identical.
  const smoothedPtsRef = useRef<XY[]>([])
  const smoothedPts = useMemo(() => {
    if (history.length < 2 || !sparkSize.w || !sparkSize.h) return []
    const raw       = toSvgPoints(history, sparkSize.w, sparkSize.h)
    const resampled = resampleEvenly(raw, 300)
    return gaussianSmooth(resampled, 4)
  }, [history, sparkSize.w, sparkSize.h])
  useEffect(() => { smoothedPtsRef.current = smoothedPts }, [smoothedPts])

  // Cursor state: position + label shown during slider drag
  const [cursor, setCursor] = useState<{ x: number; y: number; label: string; time: string } | null>(null)

  function getCursorY(xCard: number): number {
    const pts = smoothedPtsRef.current
    if (!pts.length) return sparkSize.h * 0.7  // fallback: lower area
    // Points are evenly spaced in x from 0→sparkSize.w, so index is proportional
    const idx = Math.round((xCard / sparkSize.w) * (pts.length - 1))
    return pts[Math.max(0, Math.min(pts.length - 1, idx))].y
  }

  // ── Drag-to-slider on full card ───────────────────────────────────────────────
  const cardRef      = useRef<HTMLDivElement>(null)
  const dragActive   = useRef(false)
  const dragStartX   = useRef(0)
  const dragMoved    = useRef(false)

  // Throttle: send to HA at most once per THROTTLE_MS; always send on release.
  const THROTTLE_MS  = 150
  const lastSentAt   = useRef(0)
  const pendingVal   = useRef(0)        // latest stepped value, read on pointer-up
  const sliderTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function sendToHA(stepped: number) {
    if (!sliderDef) return
    lastSentAt.current = Date.now()
    const [d, s, data] = sliderDef.call(entityId, stepped)
    callService(d, s, data)
  }

  function applySlider(v: number, forceFlush = false) {
    const clamped = Math.max(sliderMin, Math.min(sliderMax, v))
    const stepped = sliderDef
      ? Math.round(clamped / sliderDef.step) * sliderDef.step
      : clamped

    // Always update visual state immediately
    pendingVal.current = stepped
    setOptSlider(stepped)
    if (sliderTimer.current) clearTimeout(sliderTimer.current)
    sliderTimer.current = setTimeout(() => setOptSlider(null), 3000)

    // Send to HA only when throttle window has elapsed or forced
    if (forceFlush || Date.now() - lastSentAt.current >= THROTTLE_MS) {
      sendToHA(stepped)
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isUnavailable) return
    dragActive.current = true
    dragMoved.current  = false
    dragStartX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragActive.current || !cardRef.current) return
    const dx = e.clientX - dragStartX.current
    if (Math.abs(dx) > 6) dragMoved.current = true
    if (!dragMoved.current) return

    const rect  = cardRef.current.getBoundingClientRect()
    const xCard = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const xFrac = xCard / rect.width

    // ── Slider: adjust entity value (only for controllable entities)
    if (hasSlider) {
      applySlider(xFrac * (sliderMax - sliderMin) + sliderMin)
    }

    // ── Scrubber cursor: rides sparkline, shows historical value at that time
    if (showHistogram && smoothedPtsRef.current.length) {
      const y       = getCursorY(xCard)
      const histVal = getHistoryValueAt(history, xFrac)
      const unit    = state?.attributes?.unit_of_measurement ?? sliderDef?.unit ?? ''
      const label   = histVal != null
        ? `${histVal.toFixed(1)}${unit ? '\u202f' + unit : ''}`
        : ''
      // Interpolate timestamp at this x position
      const t       = history.length >= 2
        ? new Date(history[0].t + xFrac * (history[history.length - 1].t - history[0].t))
        : null
      const time    = t ? formatCursorTime(t) : ''
      if (label) setCursor({ x: xCard, y, label, time })
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragActive.current) return
    dragActive.current = false
    setCursor(null)

    if (dragMoved.current) {
      // Drag ended — flush final value unconditionally so HA always lands on
      // the exact position the user released at, even if throttle suppressed it.
      if (Date.now() - lastSentAt.current > 50) sendToHA(pendingVal.current)
      return
    }

    // Tap → toggle (only for controllable domains, not read-only sensors)
    const readOnly = ['sensor', 'binary_sensor', 'weather', 'sun'].includes(domain)
    if (readOnly) return
    if (isUnavailable) return
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, key: ++rippleKey.current })
    const next = !displayOn
    setOptOn(next)
    const [svcDomain, svcName] = getToggleCall(domain, displayOn)
    callService(svcDomain, svcName, { entity_id: entityId })
    setTimeout(() => setOptOn(null), 3000)
  }

  // ── Ripple
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const rippleKey = useRef(0)

  // Build path strings from already-memoized smoothedPts — avoids re-running
  // the full toSvgPoints→resampleEvenly→gaussianSmooth pipeline on every render.
  const { sparkLinePath, sparkFillPath } = useMemo(() => {
    if (smoothedPts.length < 2) return { sparkLinePath: '', sparkFillPath: '' }
    const line = smoothedPts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
    const fill = `${line} L ${sparkSize.w.toFixed(1)} ${sparkSize.h} L 0 ${sparkSize.h} Z`
    return { sparkLinePath: line, sparkFillPath: fill }
  }, [smoothedPts, sparkSize.w, sparkSize.h])

  const stateLabel    = makeStateLabel(domain, state, hasSlider ? sliderDef : null, sliderVal)

  // Big value display: shown for numeric sensor entities (not sliders)
  const hasNumericVal = isFinite(rawNumeric) && !hasSlider
  const bigNumber     = hasNumericVal
    ? (rawNumeric % 1 === 0 ? String(rawNumeric) : rawNumeric.toFixed(1))
    : ''

  // Play/pause overlay: only when HA confirms the integration supports it
  const isMediaPlayer  = domain === 'media_player'
  const isPlaying      = state?.state === 'playing'
  const isPaused       = state?.state === 'paused'
  const canPlayPause   = mpSupports(state, MP_PAUSE) || mpSupports(state, MP_PLAY)
  const showPlayPause  = isMediaPlayer && (isPlaying || isPaused) && canPlayPause

  function handlePlayPause(e: React.PointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    callService('media_player', 'media_play_pause', { entity_id: entityId })
  }

  // ── Battery
  const batteryTrend  = useMemo((): 'charging' | 'draining' | 'stable' => {
    if (!isBattery || history.length < 4) return 'stable'
    const slice  = Math.max(1, Math.floor(history.length * 0.2))
    const oldAvg = history.slice(0, slice).reduce((s, p) => s + p.v, 0) / slice
    const newAvg = history.slice(-slice).reduce((s, p) => s + p.v, 0) / slice
    const delta  = newAvg - oldAvg
    return delta > 1 ? 'charging' : delta < -1 ? 'draining' : 'stable'
  }, [isBattery, history])

  // ── Ambient animation
  const unit         = state?.attributes?.unit_of_measurement as string | undefined
  const ambientOn    = config.ambient_animation !== false
  const ambientTheme = ambientOn && showHistogram
    ? detectAmbientTheme(unit, state?.attributes?.device_class, entityId)
    : null
  const numericVal   = state ? parseFloat(state.state) : NaN
  const animDuration = ambientTheme ? ambientDuration(ambientTheme, numericVal) : '2s'
  const animOpacity  = ambientTheme ? ambientOpacity(ambientTheme, numericVal) : '0.7'

  // Fallback path for battery with no history: horizontal line in lower card area
  const batteryPath  = sparkLinePath
    || (ambientTheme === 'battery' && sparkSize.w > 0
      ? `M 0 ${(sparkSize.h * 0.72).toFixed(1)} L ${sparkSize.w.toFixed(1)} ${(sparkSize.h * 0.72).toFixed(1)}`
      : '')

  // ── Wind rAF animation — up to MAX_WIND_PARTICLES simultaneous particles
  const windElsRef    = useRef<(SVGPathElement | null)[]>(Array(MAX_WIND_PARTICLES).fill(null))
  const windDurRef    = useRef(2000)
  const windCountRef  = useRef(1)
  const windStatesRef = useRef<WindState[]>(
    Array.from({ length: MAX_WIND_PARTICLES }, (_, i) => ({
      phase: 'idle' as const,
      startMs: 0,
      travelMs: 2000, veerMs: 1400,
      // Stratified random: divide 0–4000ms into slots, pick randomly within each
      pauseMs: (i / MAX_WIND_PARTICLES) * 4000 + Math.random() * (4000 / MAX_WIND_PARTICLES),
      spawnFrac: Math.random(),  // fully random initial position
      travelLen: 0.05 + Math.random() * 0.15,
      spiralCx: 0, spiralCy: 0, spiralAngle: 0, spiralR: 10,
    }))
  )

  const windHorizElsRef    = useRef<(SVGPathElement | null)[]>(Array(MAX_HORIZ_PARTICLES).fill(null))
  const windHorizCountRef  = useRef(0)
  const windHorizStatesRef = useRef<HorizWindState[]>(
    Array.from({ length: MAX_HORIZ_PARTICLES }, (_, i) => ({
      phase: 'idle' as const, startMs: 0,
      travelMs: 2000, veerMs: 2000,
      pauseMs: (i / MAX_HORIZ_PARTICLES) * 3000 + Math.random() * (3000 / MAX_HORIZ_PARTICLES),
      yFrac: 0.15 + i * 0.16,
      x0: -10, x1: 100,
      spiralCx: 0, spiralCy: 0, spiralAngle: 0, spiralR: 10,
    }))
  )

  useEffect(() => {
    windDurRef.current   = (parseFloat(animDuration) || 2) * 1000
    windCountRef.current = windParticleCount(numericVal)
    windHorizCountRef.current  = !isFinite(numericVal) || numericVal < 10 ? 0
      : numericVal < 15 ? 2
      : 3
  }, [animDuration, numericVal])

  useEffect(() => {
    if (ambientTheme !== 'wind') return
    const pts   = smoothedPtsRef.current
    const hasPts = pts.length >= 2

    const states      = windStatesRef.current
    const horizStates = windHorizStatesRef.current
    let rafId: number
    let isVisible = true
    let lastFrameTime = 0

    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting },
      { threshold: 0 }
    )
    if (cardRef.current) observer.observe(cardRef.current)

    const now0 = performance.now()
    states.forEach(w       => { if (w.startMs  === 0) w.startMs  = now0 })
    horizStates.forEach(hw => { if (hw.startMs === 0) hw.startMs = now0 })

    function spawnParticle(w: WindState, now: number, idx: number, count: number) {
      const PATH_START = 0.04
      const PATH_END   = 0.90
      const zoneWidth  = (PATH_END - PATH_START) / count
      const zoneStart  = PATH_START + idx * zoneWidth
      Object.assign(w, {
        phase: 'traveling', startMs: now,
        travelMs:  windDurRef.current * (1.5 + Math.random() * 1.2),
        veerMs:    windDurRef.current * (1.5 + Math.random() * 1.2),
        pauseMs:   250 + Math.random() * 1100,
        spawnFrac: zoneStart + Math.random() * zoneWidth * 0.85,
        travelLen: 0.05 + Math.random() * 0.15,
      })
    }

    function spawnHorizParticle(hw: HorizWindState, now: number, idx: number) {
      const yFrac = 0.12 + (idx / MAX_HORIZ_PARTICLES) * 0.76 + Math.random() * (0.76 / MAX_HORIZ_PARTICLES) * 0.85
      const R  = 6.5 + Math.random() * 4.5
      const x1 = sparkSize.w * (0.20 + Math.random() * 0.50)
      Object.assign(hw, {
        phase: 'traveling', startMs: now,
        travelMs: windDurRef.current * (1.5 + Math.random() * 1.2),
        veerMs:   windDurRef.current * (0.6 + Math.random() * 0.4),
        pauseMs:  500 + Math.random() * 1500,
        yFrac, x0: -(sparkSize.w * 0.6 + 100), x1,
        spiralCx: x1, spiralCy: 0, spiralAngle: Math.PI / 2, spiralR: R,
      })
    }

    function frame(now: number) {
      if (!isVisible || now - lastFrameTime < 33) { rafId = requestAnimationFrame(frame); return }
      lastFrameTime = now
      const numActive = windCountRef.current

      // ── Sparkline-following particles ──
      if (hasPts) for (let i = 0; i < MAX_WIND_PARTICLES; i++) {
        const el = windElsRef.current[i]
        if (!el) continue

        const w = states[i]

        // Deactivate particles beyond current count
        if (i >= numActive) {
          el.setAttribute('d', ''); el.style.opacity = '0'
          if (w.phase !== 'idle') { w.phase = 'idle'; w.startMs = now }
          continue
        }

        const elapsed = now - w.startMs

        if (w.phase === 'traveling') {
          const progress = elapsed / w.travelMs
          if (progress >= 1) {
            const leadFrac = Math.min(0.98, w.spawnFrac + w.travelLen)
            const i1 = Math.min(pts.length - 1, Math.round(leadFrac * (pts.length - 1)))
            const iPrev = Math.max(0, i1 - 8)
            const dx = pts[i1].x - pts[iPrev].x
            const dy = pts[i1].y - pts[iPrev].y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const tx = dx / len, ty = dy / len
            const R = 6.5 + Math.random() * 4.5
            w.spiralCx = pts[i1].x + ty * R
            w.spiralCy = pts[i1].y - tx * R
            w.spiralAngle = Math.atan2(pts[i1].y - w.spiralCy, pts[i1].x - w.spiralCx)
            w.spiralR = R
            w.phase = 'veering'; w.startMs = now
            continue
          }
          // Tail fixed at spawnFrac, leading edge grows. No dissolve during travel.
          const leadFrac = w.spawnFrac + progress * w.travelLen
          const op = progress < 0.08 ? 0.70 * (progress / 0.08) : 0.70
          el.setAttribute('d', windTravelPath(pts, w.spawnFrac, leadFrac))
          el.style.opacity = op.toFixed(3)
          el.style.filter = 'blur(2.5px)'

        } else if (w.phase === 'veering') {
          const vp = elapsed / w.veerMs
          if (vp >= 1) {
            el.setAttribute('d', ''); el.style.opacity = '0'; el.style.transform = ''
            w.phase = 'idle'; w.startMs = now
            continue
          }
          const FADE_START = 0.15
          const op = vp < FADE_START ? 0.70 : 0.70 * (1 - (vp - FADE_START) / (1 - FADE_START))
          const blurT = vp < FADE_START ? 0 : (vp - FADE_START) / (1 - FADE_START)
          const drift = vp * vp * 28  // ease-in rightward drift, max ~28px
          const leadFrac = Math.min(0.98, w.spawnFrac + w.travelLen)
          el.setAttribute('d', windSpiralPath(pts, w.spawnFrac, leadFrac, w.spiralCx, w.spiralCy, w.spiralAngle, w.spiralR, vp))
          el.style.opacity = op.toFixed(3)
          el.style.filter = `blur(${(2.5 + blurT * 5.5).toFixed(2)}px)`
          el.style.transform = `translateX(${drift.toFixed(1)}px)`

        } else {
          el.setAttribute('d', ''); el.style.opacity = '0'; el.style.transform = ''
          if (elapsed >= w.pauseMs) spawnParticle(w, now, i, numActive)
        }
      } // end hasPts loop

      // ── Free horizontal particles (val ≥ 15) ──
      const horizCount = windHorizCountRef.current
      for (let i = 0; i < MAX_HORIZ_PARTICLES; i++) {
        const el = windHorizElsRef.current[i]
        if (!el) continue
        const hw = horizStates[i]

        if (i >= horizCount) {
          el.setAttribute('d', ''); el.style.opacity = '0'; el.style.transform = ''
          if (hw.phase !== 'idle') { hw.phase = 'idle'; hw.startMs = now }
          continue
        }

        const elapsed = now - hw.startMs
        const y = hw.yFrac * sparkSize.h

        if (hw.phase === 'traveling') {
          const progress = elapsed / hw.travelMs
          if (progress >= 1) {
            hw.spiralCy = y - hw.spiralR
            hw.phase = 'veering'; hw.startMs = now
            continue
          }
          const currentX = hw.x0 + progress * (hw.x1 - hw.x0)
          const op = progress < 0.08 ? 0.70 * (progress / 0.08) : 0.70
          el.setAttribute('d', `M ${hw.x0.toFixed(1)} ${y.toFixed(1)} L ${currentX.toFixed(1)} ${y.toFixed(1)}`)
          el.style.opacity = op.toFixed(3)
          el.style.filter = 'blur(5px)'
          el.style.transform = ''

        } else if (hw.phase === 'veering') {
          const vp = elapsed / hw.veerMs
          if (vp >= 1) {
            el.setAttribute('d', ''); el.style.opacity = '0'; el.style.transform = ''
            hw.phase = 'idle'; hw.startMs = now
            continue
          }
          const FADE_START = 0.35
          const op    = vp < FADE_START ? 0.70 : 0.70 * (1 - (vp - FADE_START) / (1 - FADE_START))
          const blurT = vp < FADE_START ? 0 : (vp - FADE_START) / (1 - FADE_START)
          const drift = vp * 90
          el.setAttribute('d', windHorizSpiralPath(hw.x0, hw.x1, y, hw.spiralCx, hw.spiralCy, hw.spiralAngle, hw.spiralR, vp))
          el.style.opacity   = op.toFixed(3)
          el.style.filter    = `blur(${(5 + blurT * 7).toFixed(2)}px)`
          el.style.transform = `translateX(${drift.toFixed(1)}px)`

        } else {
          el.setAttribute('d', ''); el.style.opacity = '0'; el.style.transform = ''
          if (elapsed >= hw.pauseMs) spawnHorizParticle(hw, now, i)
        }
      }

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafId); observer.disconnect() }
  }, [ambientTheme, history, sparkSize])

  const cssVars: React.CSSProperties = {
    ...(accentColor   ? { '--bp-accent':      accentColor }           : {}),
    ...(isBattery     ? { '--bp-batt-pct':    `${batteryPct.toFixed(1)}%` } : {}),
    '--bp-intensity':     intensity.toFixed(3),
    '--bp-fill-pct':      `${fillPct.toFixed(1)}%`,
    '--bp-anim-duration': animDuration,
    '--bp-anim-opacity':  animOpacity,
  } as React.CSSProperties

  return (
    <div
      ref={cardRef}
      className={`glass-card bp-card ${displayOn ? 'bp-on' : 'bp-off'} ${isUnavailable ? 'bp-unavailable' : ''} ${hasSlider ? 'bp-has-slider' : ''} ${isBattery && !showHistogram ? 'bp-battery' : ''} ${isBattery ? `bp-batt-${batteryTrend}` : ''} ${isBattery && batteryPct < 10 ? 'bp-batt-crit' : isBattery && batteryPct < 20 ? 'bp-batt-warn' : ''}`}
      style={cssVars}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── Background: gradient fill ── */}
      {(hasSlider || displayOn) && (
        <div className="bp-fill-bg" aria-hidden="true" />
      )}

      {/* ── Battery bar ── */}
      {isBattery && !showHistogram && (
        <div className="bp-battery-bar" aria-hidden="true">
          <div className="bp-battery-bar-fill" />
        </div>
      )}

      {/* ── Background: sparkline ── */}
      {showHistogram && (
        <svg
          ref={sparkRef}
          className="bp-spark-bg"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {sparkFillPath && <path d={sparkFillPath} className="bp-spark-fill" />}
          {sparkLinePath && <path d={sparkLinePath} className="bp-spark-line" strokeWidth="1.5" fill="none" />}
          {history.length >= 2 && ambientTheme === 'wind' && (<>
            {Array.from({ length: MAX_WIND_PARTICLES }, (_, i) => (
              <path key={i} ref={el => { windElsRef.current[i] = el }}
                className="bp-spark-wind-streak" strokeWidth="1.6" fill="none" d="" />
            ))}
            {Array.from({ length: MAX_HORIZ_PARTICLES }, (_, i) => (
              <path key={`h${i}`} ref={el => { windHorizElsRef.current[i] = el }}
                className="bp-spark-wind-streak" strokeWidth="3" fill="none" d="" />
            ))}
          </>)}
          {batteryPath && ambientTheme === 'battery' && (
            <path
              d={batteryPath}
              className={`bp-spark-batt-flow bp-spark-batt-flow--${batteryTrend}`}
              strokeWidth="3.5"
              fill="none"
            />
          )}
          {sparkLinePath && ambientTheme === 'electricity' && (
            <g style={{ opacity: `var(--bp-anim-opacity, 0.65)` }}>
              <path d={sparkLinePath} className="bp-spark-elec-halo"  strokeWidth="9"   fill="none" />
              <path d={sparkLinePath} className="bp-spark-elec-flow"  strokeWidth="2"   fill="none" />
              <path d={sparkLinePath} className="bp-spark-elec-spark" strokeWidth="1.5" fill="none" />
            </g>
          )}
        </svg>
      )}

      {/* ── Content (above backgrounds) ── */}
      <div className="bp-content">
        <div className={`bp-icon-wrap ${getAnimClass(domain, state)}`}>
          <MdiIcon icon={iconName} size={22} className="bp-icon-svg" />
        </div>
        <div className="bp-info">
          <span className="bp-name">{label}</span>
          {!hasNumericVal && <span className="bp-state">{stateLabel}</span>}
        </div>

        {hasNumericVal && (
          <div className="bp-value">
            <span className="bp-value-number">{bigNumber}</span>
            {stateUnit && <span className="bp-value-unit">{stateUnit}</span>}
          </div>
        )}

        {/* Play/pause button — media_player only, visible when playing or paused */}
        {showPlayPause && (
          <button
            className={`bp-playpause ${isPlaying ? 'bp-playpause--playing' : ''}`}
            onPointerDown={handlePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <MdiIcon icon={isPlaying ? 'mdi:pause-circle' : 'mdi:play-circle'} size={26} />
          </button>
        )}
      </div>

      {/* ── Cursor: rides the sparkline during drag ── */}
      {cursor && (
        <div
          className={`bp-cursor${cursor.y < sparkSize.h * 0.3 ? ' bp-cursor--below' : ''}`}
          style={{ left: cursor.x, top: cursor.y }}
          aria-hidden="true"
        >
          <div className="bp-cursor-dot" />
          <div className="bp-cursor-label">
            {cursor.label}
            {cursor.time && <div className="bp-cursor-time">{cursor.time}</div>}
          </div>
        </div>
      )}

      {/* ── Ripple ── */}
      {ripple && (
        <span
          key={ripple.key}
          className="bp-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={() => setRipple(null)}
        />
      )}
    </div>
  )
}
