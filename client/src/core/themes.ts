/**
 * Dash Grid Theme System
 *
 * A theme is a set of CSS custom property overrides applied to :root.
 * Design tokens are defined in styles/design-system.css — themes only
 * specify the values that differ from the defaults.
 *
 * For developers creating a custom theme:
 *   1. Create an object that satisfies HBTheme
 *   2. Add it to BUILT_IN_THEMES (or load it dynamically in the future)
 *   3. It will appear automatically in the Settings theme picker
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** The CSS variables that themes and user overrides are allowed to set */
export type HBCssVar =
  | '--hb-card-bg-rgb'
  | '--hb-card-opacity'
  | '--hb-card-blur-px'
  | '--hb-card-saturate'
  | '--hb-card-border'
  | '--hb-card-radius'
  | '--hb-card-shadow'
  | '--hb-text-primary'
  | '--hb-text-secondary'
  | '--hb-text-dim'
  | '--hb-accent'
  | '--hb-accent-rgb'
  | '--hb-status-on'
  | '--hb-status-off'
  | '--hb-status-warning'
  | '--hb-status-error'

export interface HBTheme {
  id: string
  name: string
  author?: string        // shown in theme picker for community themes
  description?: string

  /**
   * CSS variable overrides. Only supply values that differ from the
   * defaults in design-system.css. Missing keys fall back to defaults.
   */
  tokens: Partial<Record<HBCssVar, string>>

  /** Optional page (body) background. Falls back to --bg-night if not set. */
  pageBg?: string

  /**
   * Optional explicit modal background. Needed for themes whose card base
   * color is light (e.g. Glass Dark uses white glass cards, so the computed
   * rgba(255,255,255, 0.69) would be nearly opaque white).
   */
  modalBg?: string

  /** Static values used to render the preview swatch in the theme picker */
  preview: {
    cardBg: string   // rgba string for the preview card background
    border: string   // border color string
    accent: string   // accent hex/rgb color
  }
}

/** User-controlled appearance overrides (on top of the active theme) */
export interface UserAppearanceOverrides {
  /** Card transparency  0.05 – 0.60 */
  opacity?: number
  /** Backdrop blur in px  0 – 40 */
  blurPx?: number
  /** Border radius in px  8 – 32 */
  radius?: number
  /** Accent color as hex, e.g. "#ff9f0a" */
  accent?: string
  /** Card (and modal) base color as hex, e.g. "#0c122d" */
  bgColor?: string
  /** Primary text color as hex */
  textColor?: string
  /** Opacity of secondary text (0 – 1) */
  textSecondaryOpacity?: number
  /** Opacity of dim/label text (0 – 1) */
  textDimOpacity?: number
  /** Border color as hex */
  borderColor?: string
  /** Border color opacity (0 – 1) */
  borderOpacity?: number
  /** Border width in px (0 – 4) */
  borderWidth?: number
  /** Independent color for secondary text (hex). When omitted, derives from textColor. */
  textSecondaryColor?: string
  /** Independent color for dim/label text (hex). When omitted, derives from textColor. */
  textDimColor?: string
}

/** A user-created or modified theme stored in the backend */
export interface CustomTheme {
  id: string
  name: string
  basedOn: string
  opacity: number
  blurPx: number
  radius: number
  accent: string
  bgColor: string
  textColor: string
  textSecOpacity: number
  textDimOpacity: number
  textSecColor?: string
  textDimColor?: string
  borderColor: string
  borderOpacity: number
  borderWidth: number
}

/** Applies a saved custom theme (base theme + baked overrides) */
export function applyCustomTheme(ct: CustomTheme): void {
  applyTheme(getTheme(ct.basedOn))
  applyUserOverrides({
    opacity:              ct.opacity,
    blurPx:               ct.blurPx,
    radius:               ct.radius,
    accent:               ct.accent,
    bgColor:              ct.bgColor,
    textColor:            ct.textColor,
    textSecondaryOpacity: ct.textSecOpacity,
    textDimOpacity:       ct.textDimOpacity,
    textSecondaryColor:   ct.textSecColor,
    textDimColor:         ct.textDimColor,
    borderColor:          ct.borderColor,
    borderOpacity:        ct.borderOpacity,
    borderWidth:          ct.borderWidth,
  })
}

/** Safe JSON parse of the custom_themes settings key */
export function parseCustomThemes(json: string): CustomTheme[] {
  try { return JSON.parse(json) as CustomTheme[] }
  catch { return [] }
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** All CSS vars that applyTheme manages — used to reset before each apply */
const ALL_THEME_VARS: HBCssVar[] = [
  '--hb-card-bg-rgb',
  '--hb-card-opacity',
  '--hb-card-blur-px',
  '--hb-card-saturate',
  '--hb-card-border',
  '--hb-card-radius',
  '--hb-card-shadow',
  '--hb-text-primary',
  '--hb-text-secondary',
  '--hb-text-dim',
  '--hb-accent',
  '--hb-accent-rgb',
  '--hb-status-on',
  '--hb-status-off',
  '--hb-status-warning',
  '--hb-status-error',
]

// ── Built-in themes ────────────────────────────────────────────────────────

export const BUILT_IN_THEMES: HBTheme[] = [
  {
    id: 'glass-dark',
    name: 'Glass Dark',
    description: 'Default frosted glass look',
    tokens: {},   // all values come from design-system.css defaults
    // pageBg not set — falls back to --bg-night in globals.css
    // Card base color is white, so the computed modal bg would be near-opaque
    // white. Override with a dark backdrop that matches the page background.
    modalBg: 'rgba(11, 20, 38, 0.92)',
    preview: {
      cardBg: 'rgba(255, 255, 255, 0.14)',
      border: 'rgba(255, 255, 255, 0.18)',
      accent: '#5ac8fa',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blue, purple accent',
    tokens: {
      '--hb-card-bg-rgb':    '12, 18, 45',
      '--hb-card-opacity':   '0.72',
      '--hb-card-blur-px':   '32',
      '--hb-card-saturate':  '1.4',
      '--hb-card-border':    'rgba(100, 90, 255, 0.28)',
      '--hb-accent':         '#7c63ff',
      '--hb-accent-rgb':     '124, 99, 255',
      '--hb-text-primary':   '#e8e4ff',
      '--hb-text-secondary': 'rgba(200, 190, 255, 0.70)',
      '--hb-text-dim':       'rgba(180, 170, 255, 0.50)',
    },
    pageBg: 'linear-gradient(180deg, #04091a 0%, #090f2a 55%, #050c20 100%)',
    preview: {
      cardBg: 'rgba(12, 18, 45, 0.72)',
      border: 'rgba(100, 90, 255, 0.28)',
      accent: '#7c63ff',
    },
  },
  {
    id: 'frosted',
    name: 'Frosted',
    description: 'Heavy blur, bright glass, warm accent',
    tokens: {
      '--hb-card-bg-rgb':   '255, 255, 255',
      '--hb-card-opacity':  '0.28',
      '--hb-card-blur-px':  '40',
      '--hb-card-saturate': '2.0',
      '--hb-card-border':   'rgba(255, 255, 255, 0.42)',
      '--hb-accent':        '#ff6b35',
      '--hb-accent-rgb':    '255, 107, 53',
    },
    pageBg: 'linear-gradient(180deg, #1c2535 0%, #28334a 55%, #1c2535 100%)',
    preview: {
      cardBg: 'rgba(255, 255, 255, 0.28)',
      border: 'rgba(255, 255, 255, 0.42)',
      accent: '#ff6b35',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Flat dark, no blur, clean edges',
    tokens: {
      '--hb-card-bg-rgb':   '22, 22, 28',
      '--hb-card-opacity':  '0.88',
      '--hb-card-blur-px':  '0',
      '--hb-card-saturate': '1.0',
      '--hb-card-border':   'rgba(255, 255, 255, 0.09)',
      '--hb-card-radius':   '12px',
      '--hb-card-shadow':   '0 2px 12px rgba(0, 0, 0, 0.28)',
      '--hb-accent':        '#30d158',
      '--hb-accent-rgb':    '48, 209, 88',
    },
    pageBg: 'linear-gradient(180deg, #07070d 0%, #0d0d14 55%, #07070d 100%)',
    preview: {
      cardBg: 'rgba(22, 22, 28, 0.88)',
      border: 'rgba(255, 255, 255, 0.09)',
      accent: '#30d158',
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Amber tones, cozy amber accent',
    tokens: {
      '--hb-card-bg-rgb':    '40, 25, 10',
      '--hb-card-opacity':   '0.65',
      '--hb-card-blur-px':   '28',
      '--hb-card-saturate':  '1.5',
      '--hb-card-border':    'rgba(255, 180, 80, 0.22)',
      '--hb-accent':         '#ff9f0a',
      '--hb-accent-rgb':     '255, 159, 10',
      '--hb-text-primary':   '#fff5e0',
      '--hb-text-secondary': 'rgba(255, 235, 190, 0.70)',
      '--hb-text-dim':       'rgba(255, 220, 160, 0.50)',
    },
    pageBg: 'linear-gradient(180deg, #160a02 0%, #1e1004 55%, #120802 100%)',
    preview: {
      cardBg: 'rgba(40, 25, 10, 0.65)',
      border: 'rgba(255, 180, 80, 0.22)',
      accent: '#ff9f0a',
    },
  },
]

// ── Default values (mirrors design-system.css) ────────────────────────────

const DEFAULTS = {
  bgRgb:               '255, 255, 255',
  opacity:             0.14,
  blurPx:              24,
  saturate:            1.6,
  border:              'rgba(255, 255, 255, 0.18)',
  borderWidth:         1,
  radius:              '20px',
  shadow:              '0 4px 24px rgba(0, 0, 0, 0.18)',
  accent:              '#5ac8fa',
  accentRgb:           '90, 200, 250',
  textPrimary:         '#ffffff',
  textSecondaryOpacity: 0.65,
  textDimOpacity:       0.55,
}

// Tracks the active theme so applyUserOverrides can recompute derived values
let _activeTheme: HBTheme = BUILT_IN_THEMES[0]

// ── Style tag injection ────────────────────────────────────────────────────
// Using a <style> tag instead of element.style.setProperty avoids a browser
// quirk where inline styles on :root are ignored when the same custom property
// is also defined in an external stylesheet via var() references.

const STYLE_TAG_ID = 'hb-theme-vars'

function writeStyleTag(vars: Record<string, string>): void {
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = STYLE_TAG_ID
  }
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')
  tag.textContent = `:root {\n${lines}\n}`
  // Always move to end of <head> (belt-and-suspenders with !important)
  document.head.appendChild(tag)
}

// Tracks user overrides so applyTheme can merge them
let _userOverrides: UserAppearanceOverrides = {}

// ── Apply functions ────────────────────────────────────────────────────────

/** Builds the full :root variable map from theme + user overrides and writes it. */
function flushTheme(theme: HBTheme, overrides: UserAppearanceOverrides): void {
  const t = theme.tokens

  const bgRgb = overrides.bgColor
    ? (hexToRgb(overrides.bgColor) ?? DEFAULTS.bgRgb)
    : (t['--hb-card-bg-rgb'] ?? DEFAULTS.bgRgb)
  const opacity  = overrides.opacity  ?? parseFloat(t['--hb-card-opacity']  ?? String(DEFAULTS.opacity))
  const blurPx   = overrides.blurPx   ?? parseFloat(t['--hb-card-blur-px']  ?? String(DEFAULTS.blurPx))
  const saturate = parseFloat(t['--hb-card-saturate'] ?? String(DEFAULTS.saturate))
  const radius   = overrides.radius !== undefined
    ? overrides.radius + 'px'
    : (t['--hb-card-radius'] ?? DEFAULTS.radius)
  const accent    = overrides.accent ?? (t['--hb-accent']     ?? DEFAULTS.accent)
  const accentRgb = overrides.accent
    ? (hexToRgb(overrides.accent) ?? DEFAULTS.accentRgb)
    : (t['--hb-accent-rgb'] ?? DEFAULTS.accentRgb)

  // Modal background: same color as card but more opaque for readability.
  // Themes with a light card base color (e.g. Glass Dark uses white) must
  // supply an explicit modalBg to avoid a near-opaque white overlay.
  const modalOpacity = Math.min(opacity + 0.55, 0.95)
  const modalBg = theme.modalBg ?? `rgba(${bgRgb}, ${modalOpacity})`

  // Border
  const themeBorder   = t['--hb-card-border'] ?? DEFAULTS.border
  const borderColorHex = overrides.borderColor ?? rgbaToHex(themeBorder)
  const borderOpacity  = overrides.borderOpacity ?? (parseRgbaOpacity(themeBorder) ?? 0.18)
  const borderWidth    = overrides.borderWidth ?? DEFAULTS.borderWidth

  // Text colors — if user has any text override, compute secondary/dim from
  // their respective colors + opacity sliders. Otherwise let theme values apply.
  const hasTextOverride = overrides.textColor !== undefined
    || overrides.textSecondaryOpacity !== undefined
    || overrides.textDimOpacity !== undefined
    || overrides.textSecondaryColor !== undefined
    || overrides.textDimColor !== undefined

  const vars: Record<string, string> = {
    '--hb-card-bg':          `rgba(${bgRgb}, ${opacity})`,
    '--hb-modal-bg':         modalBg,
    '--hb-card-blur':        `blur(${blurPx}px) saturate(${saturate})`,
    '--hb-card-border':      `rgba(${hexToRgb(borderColorHex) ?? '255, 255, 255'}, ${borderOpacity})`,
    '--hb-card-border-width': `${borderWidth}px`,
    '--hb-card-radius':      radius,
    '--hb-card-shadow':      t['--hb-card-shadow'] ?? DEFAULTS.shadow,
    '--hb-accent':           accent,
    '--hb-accent-rgb':       accentRgb,
    '--hb-accent-dim':       `rgba(${accentRgb}, 0.2)`,
  }

  if (hasTextOverride) {
    const textColor  = overrides.textColor ?? t['--hb-text-primary'] ?? DEFAULTS.textPrimary
    const textRgb    = hexToRgb(textColor) ?? '255, 255, 255'
    const secOpacity = overrides.textSecondaryOpacity
      ?? (parseRgbaOpacity(t['--hb-text-secondary'] ?? '') ?? DEFAULTS.textSecondaryOpacity)
    const dimOpacity = overrides.textDimOpacity
      ?? (parseRgbaOpacity(t['--hb-text-dim'] ?? '') ?? DEFAULTS.textDimOpacity)
    // Secondary/dim may have their own independent color; fall back to primary RGB.
    const secRgb = overrides.textSecondaryColor ? (hexToRgb(overrides.textSecondaryColor) ?? textRgb) : textRgb
    const dimRgb = overrides.textDimColor       ? (hexToRgb(overrides.textDimColor)       ?? textRgb) : textRgb
    vars['--hb-text-primary']   = textColor
    vars['--hb-text-secondary'] = `rgba(${secRgb}, ${secOpacity})`
    vars['--hb-text-dim']       = `rgba(${dimRgb}, ${dimOpacity})`
  }

  // Optional theme overrides for text (when no user override) and status
  const optionals: HBCssVar[] = [
    '--hb-status-on', '--hb-status-off', '--hb-status-warning', '--hb-status-error',
  ]
  if (!hasTextOverride) {
    optionals.push('--hb-text-primary', '--hb-text-secondary', '--hb-text-dim')
  }
  for (const v of optionals) {
    if (t[v]) vars[v] = t[v]!
  }

  // Per-theme page background (body). Falls back to --bg-night via CSS if not set.
  if (theme.pageBg) {
    vars['--hb-page-bg'] = theme.pageBg
  }

  writeStyleTag(vars)
}

/**
 * Applies a theme. Merges with any existing user overrides so sliders
 * are preserved when switching themes.
 */
export function applyTheme(theme: HBTheme): void {
  _activeTheme = theme
  flushTheme(theme, _userOverrides)
}

/**
 * Applies user-controlled appearance overrides on top of the active theme.
 */
export function applyUserOverrides(overrides: UserAppearanceOverrides): void {
  _userOverrides = { ..._userOverrides, ...overrides }
  flushTheme(_activeTheme, _userOverrides)
}

/**
 * Clears all user overrides so the active theme's own defaults apply cleanly.
 * Call this when "Reset to theme defaults" is clicked or when switching themes
 * without any active customizations.
 */
export function clearUserOverrides(): void {
  _userOverrides = {}
  flushTheme(_activeTheme, _userOverrides)
}

/** Converts a hex color ("#rrggbb" or "#rgb") to "r, g, b" string */
export function hexToRgb(hex: string): string | null {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const m = h.match(/.{2}/g)
  if (!m || m.length < 3) return null
  return m.slice(0, 3).map(s => parseInt(s, 16)).join(', ')
}

/**
 * Extracts the alpha/opacity from an rgba() string.
 * Returns null if the input is not an rgba color.
 */
export function parseRgbaOpacity(val: string): number | null {
  const m = val.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/)
  return m ? parseFloat(m[1]) : null
}

/**
 * Converts an rgba()/rgb() string to "#rrggbb" hex.
 * Falls back to the input if it already looks like a hex, or "#ffffff".
 */
export function rgbaToHex(val: string): string {
  const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')
  if (val.startsWith('#')) return val
  return '#ffffff'
}

/** Converts a "r, g, b" string to a hex color "#rrggbb" */
export function rgbStringToHex(rgb: string): string {
  const parts = rgb.split(',').map(s => parseInt(s.trim(), 10))
  if (parts.length < 3 || parts.some(isNaN)) return '#ffffff'
  return '#' + parts.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join('')
}

/** Looks up a built-in theme by id, falls back to the first theme */
export function getTheme(id: string): HBTheme {
  return BUILT_IN_THEMES.find(t => t.id === id) ?? BUILT_IN_THEMES[0]
}
