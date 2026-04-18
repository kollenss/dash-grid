import { useEffect, useState } from 'react'
import {
  BUILT_IN_THEMES,
  applyTheme,
  applyUserOverrides,
  applyCustomTheme,
  clearUserOverrides,
  getTheme,
  hexToRgb,
  rgbStringToHex,
  rgbaToHex,
  parseRgbaOpacity,
  parseCustomThemes,
  type CustomTheme,
} from '../core/themes'
import BackgroundGallery from './settings/BackgroundGallery'
import './DesignDrawer.css'

const DEFAULT_OPACITY          = 0.14
const DEFAULT_BLUR_PX          = 24
const DEFAULT_RADIUS           = 20
const DEFAULT_ACCENT           = '#5ac8fa'
const DEFAULT_BG_COLOR         = '#ffffff'
const DEFAULT_TEXT_COLOR       = '#ffffff'
const DEFAULT_TEXT_SEC_OPACITY = 0.65
const DEFAULT_TEXT_DIM_OPACITY = 0.55
const DEFAULT_BORDER_COLOR     = '#ffffff'
const DEFAULT_BORDER_OPACITY   = 0.18
const DEFAULT_BORDER_WIDTH     = 1

interface Props {
  open: boolean
  onClose: () => void
}

export default function DesignDrawer({ open, onClose }: Props) {
  // ── Slider / color state ─────────────────────────────────────────────────
  const [themeId,        setThemeId]        = useState('glass-dark')
  const [opacity,        setOpacity]        = useState(DEFAULT_OPACITY)
  const [blurPx,         setBlurPx]         = useState(DEFAULT_BLUR_PX)
  const [radius,         setRadius]         = useState(DEFAULT_RADIUS)
  const [accent,         setAccent]         = useState(DEFAULT_ACCENT)
  const [bgColor,        setBgColor]        = useState(DEFAULT_BG_COLOR)
  const [textColor,      setTextColor]      = useState(DEFAULT_TEXT_COLOR)
  const [textSecColor,   setTextSecColor]   = useState(DEFAULT_TEXT_COLOR)
  const [textDimColor,   setTextDimColor]   = useState(DEFAULT_TEXT_COLOR)
  const [textSecOpacity, setTextSecOpacity] = useState(DEFAULT_TEXT_SEC_OPACITY)
  const [textDimOpacity, setTextDimOpacity] = useState(DEFAULT_TEXT_DIM_OPACITY)
  const [borderColor,    setBorderColor]    = useState(DEFAULT_BORDER_COLOR)
  const [borderOpacity,  setBorderOpacity]  = useState(DEFAULT_BORDER_OPACITY)
  const [borderWidth,    setBorderWidth]    = useState(DEFAULT_BORDER_WIDTH)
  const [hasCustom,      setHasCustom]      = useState(false)
  const [backgroundImage, setBackgroundImage] = useState('')
  const [themeOptionsOpen, setThemeOptionsOpen] = useState(false)

  // ── Custom themes ────────────────────────────────────────────────────────
  const [customThemes,   setCustomThemes]   = useState<CustomTheme[]>([])

  // ── Save dialog ──────────────────────────────────────────────────────────
  const [saveDialog,     setSaveDialog]     = useState(false)
  const [saveName,       setSaveName]       = useState('')
  const [saveError,      setSaveError]      = useState('')
  const [saved,          setSaved]          = useState(false)

  // ── Derived: active theme info ───────────────────────────────────────────
  const activeCustom   = customThemes.find(ct => ct.id === themeId)
  const activeBuiltIn  = BUILT_IN_THEMES.find(t => t.id === themeId)
  const activeThemeName = activeCustom?.name ?? activeBuiltIn?.name ?? themeId
  const basedOnId       = activeCustom?.basedOn ?? themeId

  // Built-in themes whose IDs have a custom override are hidden from the picker
  const overriddenIds   = new Set(
    customThemes.filter(ct => ct.id.startsWith('override_')).map(ct => ct.basedOn)
  )
  const visibleBuiltIns = BUILT_IN_THEMES.filter(t => !overriddenIds.has(t.id))

  // Extracts the hex color from a theme's rgba() text token, or falls back to primary
  function themeTextHex(token: string | undefined, primaryHex: string): string {
    if (!token) return primaryHex
    const hex = rgbaToHex(token)
    return hex === '#ffffff' && !token.startsWith('rgba(255') ? primaryHex : hex
  }

  // ── Load settings on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Record<string, string>) => {
      const cts = parseCustomThemes(data['custom_themes'] ?? '[]')
      setCustomThemes(cts)

      const tid    = data['theme_id'] ?? 'glass-dark'
      const ct     = cts.find(c => c.id === tid)

      setBackgroundImage(data['background_image'] ?? '')

      if (ct) {
        loadCustomThemeIntoState(ct)
        return
      }

      setThemeId(tid)
      const savedOpacity   = data['user_card_opacity']           ? parseFloat(data['user_card_opacity'])           : undefined
      const savedBlur      = data['user_card_blur_px']           ? parseFloat(data['user_card_blur_px'])           : undefined
      const savedRadius    = data['user_card_radius']            ? parseFloat(data['user_card_radius'])            : undefined
      const savedAccent    = data['user_accent']                 || undefined
      const savedBgColor   = data['user_card_bg']                || undefined
      const savedTextColor = data['user_text_color']             || undefined
      const savedTextSecOp  = data['user_text_secondary_opacity'] ? parseFloat(data['user_text_secondary_opacity']) : undefined
      const savedTextDimOp  = data['user_text_dim_opacity']       ? parseFloat(data['user_text_dim_opacity'])       : undefined
      const savedTextSecCol = data['user_text_secondary_color']   || undefined
      const savedTextDimCol = data['user_text_dim_color']         || undefined
      const savedBorderCol = data['user_border_color']           || undefined
      const savedBorderOp  = data['user_border_opacity']         ? parseFloat(data['user_border_opacity'])         : undefined
      const savedBorderW   = data['user_border_width']           ? parseFloat(data['user_border_width'])           : undefined

      if (savedOpacity !== undefined) setOpacity(savedOpacity)
      if (savedBlur    !== undefined) setBlurPx(savedBlur)
      if (savedRadius  !== undefined) setRadius(savedRadius)

      const theme          = getTheme(tid)
      const t              = theme.tokens
      setAccent(savedAccent           ?? t['--hb-accent']      ?? DEFAULT_ACCENT)
      setBgColor(savedBgColor         ?? (t['--hb-card-bg-rgb'] ? rgbStringToHex(t['--hb-card-bg-rgb']!) : DEFAULT_BG_COLOR))
      const primaryHex = savedTextColor ?? t['--hb-text-primary'] ?? DEFAULT_TEXT_COLOR
      setTextColor(primaryHex)
      setTextSecColor(savedTextSecCol ?? themeTextHex(t['--hb-text-secondary'], primaryHex))
      setTextDimColor(savedTextDimCol ?? themeTextHex(t['--hb-text-dim'],       primaryHex))
      setTextSecOpacity(savedTextSecOp ?? (parseRgbaOpacity(t['--hb-text-secondary'] ?? '') ?? DEFAULT_TEXT_SEC_OPACITY))
      setTextDimOpacity(savedTextDimOp ?? (parseRgbaOpacity(t['--hb-text-dim']       ?? '') ?? DEFAULT_TEXT_DIM_OPACITY))
      const themeBorder = t['--hb-card-border'] ?? 'rgba(255, 255, 255, 0.18)'
      setBorderColor(savedBorderCol   ?? rgbaToHex(themeBorder))
      setBorderOpacity(savedBorderOp  ?? (parseRgbaOpacity(themeBorder) ?? DEFAULT_BORDER_OPACITY))
      setBorderWidth(savedBorderW     ?? DEFAULT_BORDER_WIDTH)

      setHasCustom(!!(
        savedOpacity !== undefined || savedBlur !== undefined || savedRadius !== undefined ||
        savedAccent || savedBgColor || savedTextColor ||
        savedTextSecOp !== undefined || savedTextDimOp !== undefined ||
        savedTextSecCol || savedTextDimCol ||
        savedBorderCol || savedBorderOp !== undefined || savedBorderW !== undefined
      ))
    }).catch(() => {})
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function loadCustomThemeIntoState(ct: CustomTheme) {
    setThemeId(ct.id)
    setOpacity(ct.opacity)
    setBlurPx(ct.blurPx)
    setRadius(ct.radius)
    setAccent(ct.accent)
    setBgColor(ct.bgColor)
    setTextColor(ct.textColor)
    setTextSecColor(ct.textSecColor ?? ct.textColor)
    setTextDimColor(ct.textDimColor ?? ct.textColor)
    setTextSecOpacity(ct.textSecOpacity)
    setTextDimOpacity(ct.textDimOpacity)
    setBorderColor(ct.borderColor)
    setBorderOpacity(ct.borderOpacity)
    setBorderWidth(ct.borderWidth)
    setHasCustom(false)
  }

  function updateBackground(url: string) {
    setBackgroundImage(url)
    document.body.style.background = url
      ? `url(${url}) center / cover no-repeat #0b1426`
      : ''
  }

  // ── Theme selection ──────────────────────────────────────────────────────

  function selectBuiltInTheme(id: string) {
    setThemeId(id)
    const theme = getTheme(id)
    const t     = theme.tokens
    const rawOpacity = parseFloat(t['--hb-card-opacity'] ?? '')
    const rawBlurPx  = parseFloat(t['--hb-card-blur-px'] ?? '')
    const rawRadius  = parseFloat(t['--hb-card-radius']  ?? '')
    const newBorder  = t['--hb-card-border'] ?? 'rgba(255, 255, 255, 0.18)'
    setOpacity(isNaN(rawOpacity) ? DEFAULT_OPACITY : rawOpacity)
    setBlurPx(isNaN(rawBlurPx)   ? DEFAULT_BLUR_PX : rawBlurPx)
    setRadius(isNaN(rawRadius)   ? DEFAULT_RADIUS  : rawRadius)
    setAccent(t['--hb-accent']      ?? DEFAULT_ACCENT)
    setBgColor(t['--hb-card-bg-rgb'] ? rgbStringToHex(t['--hb-card-bg-rgb']) : DEFAULT_BG_COLOR)
    const newPrimary = t['--hb-text-primary'] ?? DEFAULT_TEXT_COLOR
    setTextColor(newPrimary)
    setTextSecColor(themeTextHex(t['--hb-text-secondary'], newPrimary))
    setTextDimColor(themeTextHex(t['--hb-text-dim'],       newPrimary))
    setTextSecOpacity(parseRgbaOpacity(t['--hb-text-secondary'] ?? '') ?? DEFAULT_TEXT_SEC_OPACITY)
    setTextDimOpacity(parseRgbaOpacity(t['--hb-text-dim']       ?? '') ?? DEFAULT_TEXT_DIM_OPACITY)
    setBorderColor(rgbaToHex(newBorder))
    setBorderOpacity(parseRgbaOpacity(newBorder) ?? DEFAULT_BORDER_OPACITY)
    setBorderWidth(DEFAULT_BORDER_WIDTH)
    setHasCustom(false)
    applyTheme(theme)
    clearUserOverrides()
  }

  function selectCustomThemeEntry(ct: CustomTheme) {
    loadCustomThemeIntoState(ct)
    applyCustomTheme(ct)
  }

  function resetCustomizations() {
    selectBuiltInTheme(basedOnId)
  }

  // Applies text-related overrides, always including the independent colors.
  function applyTextOvs(patch: { tc?: string; tsop?: number; tdop?: number; tsc?: string; tdc?: string }) {
    const tc  = patch.tc  ?? textColor
    const tsc = patch.tsc ?? textSecColor
    const tdc = patch.tdc ?? textDimColor
    setHasCustom(true)
    applyUserOverrides({
      textColor:            tc,
      textSecondaryOpacity: patch.tsop ?? textSecOpacity,
      textDimOpacity:       patch.tdop ?? textDimOpacity,
      textSecondaryColor:   tsc.toLowerCase() !== tc.toLowerCase() ? tsc : undefined,
      textDimColor:         tdc.toLowerCase() !== tc.toLowerCase() ? tdc : undefined,
    })
  }

  // ── Live override helper ─────────────────────────────────────────────────

  function ov(patch: Parameters<typeof applyUserOverrides>[0]) {
    setHasCustom(true)
    applyUserOverrides(patch)
  }

  // ── Delete custom theme ──────────────────────────────────────────────────

  async function deleteCustomTheme(id: string) {
    const updated = customThemes.filter(ct => ct.id !== id)
    const current = await fetch('/api/settings').then(r => r.json()).catch(() => ({})) as Record<string, string>
    const newActiveId = (themeId === id) ? basedOnId : themeId

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...current, custom_themes: JSON.stringify(updated), theme_id: newActiveId }),
    })
    setCustomThemes(updated)
    if (themeId === id) selectBuiltInTheme(basedOnId)
  }

  // ── Save flow ────────────────────────────────────────────────────────────

  function openSaveDialog() {
    setSaveName(activeThemeName)
    setSaveError('')
    setSaveDialog(true)
  }

  async function commitSave(themes: CustomTheme[], newActiveId: string) {
    const current = await fetch('/api/settings').then(r => r.json()).catch(() => ({})) as Record<string, string>
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...current,
        theme_id:        newActiveId,
        background_image: backgroundImage,
        custom_themes:   JSON.stringify(themes),
        // clear per-session overrides — they're now baked into the custom theme
        user_card_opacity: '', user_card_blur_px: '', user_card_radius: '',
        user_accent: '', user_accent_rgb: '', user_card_bg: '',
        user_text_color: '', user_text_secondary_opacity: '', user_text_dim_opacity: '',
        user_text_secondary_color: '', user_text_dim_color: '',
        user_border_color: '', user_border_opacity: '', user_border_width: '',
      }),
    })
    setCustomThemes(themes)
    setThemeId(newActiveId)
    setHasCustom(false)
    setSaveDialog(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function buildCustomTheme(id: string, name: string): CustomTheme {
    return {
      id,
      name,
      basedOn: basedOnId,
      opacity, blurPx, radius, accent, bgColor, textColor,
      textSecOpacity, textDimOpacity,
      textSecColor: textSecColor.toLowerCase() !== textColor.toLowerCase() ? textSecColor : undefined,
      textDimColor: textDimColor.toLowerCase() !== textColor.toLowerCase() ? textDimColor : undefined,
      borderColor, borderOpacity, borderWidth,
    }
  }

  async function handleSaveReplace() {
    const name = saveName.trim() || activeThemeName
    // For built-ins use a stable override ID; for existing customs, keep their ID
    const id   = activeCustom ? activeCustom.id : `override_${basedOnId}`
    const ct   = buildCustomTheme(id, name)
    const updated = customThemes.find(x => x.id === id)
      ? customThemes.map(x => x.id === id ? ct : x)
      : [...customThemes, ct]
    await commitSave(updated, id)
  }

  async function handleSaveNew() {
    const name = saveName.trim()
    if (!name) { setSaveError('Enter a name'); return }

    const allNames = [
      ...BUILT_IN_THEMES.map(t => t.name.toLowerCase()),
      ...customThemes.map(t => t.name.toLowerCase()),
    ]
    if (allNames.includes(name.toLowerCase())) {
      setSaveError('A theme with that name already exists')
      return
    }

    const id = `custom_${Date.now()}`
    const ct = buildCustomTheme(id, name)
    await commitSave([...customThemes, ct], id)
  }

  async function handleSaveNoDialog() {
    const current = await fetch('/api/settings').then(r => r.json()).catch(() => ({})) as Record<string, string>
    const secCol = textSecColor.toLowerCase() !== textColor.toLowerCase() ? textSecColor : ''
    const dimCol = textDimColor.toLowerCase() !== textColor.toLowerCase() ? textDimColor : ''
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...current,
        theme_id: themeId,
        background_image: backgroundImage,
        user_text_secondary_color: secCol,
        user_text_dim_color:       dimCol,
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Custom theme preview colors ──────────────────────────────────────────

  function ctPreview(ct: CustomTheme) {
    return {
      cardBg: `rgba(${hexToRgb(ct.bgColor) ?? '255,255,255'}, ${ct.opacity})`,
      border: `rgba(${hexToRgb(ct.borderColor) ?? '255,255,255'}, ${ct.borderOpacity})`,
      accent: ct.accent,
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`design-drawer${open ? ' design-drawer--open' : ''}`}>
      <div className="design-drawer__header">
        <span className="design-drawer__title">Design</span>
        <button className="design-drawer__close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="design-drawer__body">

        {/* ── Theme picker ─────────────────────────────────────────────── */}
        <div className="dd-section-label">Theme</div>
        <div className="dd-theme-grid">
          {visibleBuiltIns.map(theme => (
            <button
              key={theme.id}
              type="button"
              className={`dd-theme-tile${themeId === theme.id ? ' dd-theme-tile--active' : ''}`}
              onClick={() => selectBuiltInTheme(theme.id)}
            >
              <div className="dd-theme-tile__preview"
                style={{ background: theme.preview.cardBg, border: `1px solid ${theme.preview.border}` }}>
                <div className="dd-theme-tile__accent-bar" style={{ background: theme.preview.accent }} />
                <div className="dd-theme-tile__lines">
                  <div className="dd-theme-tile__line dd-theme-tile__line--wide" />
                  <div className="dd-theme-tile__line" />
                </div>
              </div>
              <span className="dd-theme-tile__name">{theme.name}</span>
            </button>
          ))}

          {customThemes.map(ct => {
            const p = ctPreview(ct)
            return (
              <div key={ct.id} className="dd-custom-tile-wrap">
                <button
                  type="button"
                  className={`dd-theme-tile${themeId === ct.id ? ' dd-theme-tile--active' : ''}`}
                  onClick={() => selectCustomThemeEntry(ct)}
                >
                  <div className="dd-theme-tile__preview"
                    style={{ background: p.cardBg, border: `1px solid ${p.border}` }}>
                    <div className="dd-theme-tile__accent-bar" style={{ background: p.accent }} />
                    <div className="dd-theme-tile__lines">
                      <div className="dd-theme-tile__line dd-theme-tile__line--wide" />
                      <div className="dd-theme-tile__line" />
                    </div>
                  </div>
                  <span className="dd-theme-tile__name">{ct.name}</span>
                </button>
                <button
                  type="button"
                  className="dd-delete-btn"
                  onClick={() => deleteCustomTheme(ct.id)}
                  aria-label={`Delete ${ct.name}`}
                >✕</button>
              </div>
            )
          })}
        </div>

        {/* ── Theme Options (collapsible) ───────────────────────────────── */}
        <div className="dd-customizer">
          <button
            type="button"
            className="dd-customizer__header dd-customizer__header--toggle"
            onClick={() => setThemeOptionsOpen(o => !o)}
            aria-expanded={themeOptionsOpen}
          >
            <span className="dd-customizer__label">Theme Options</span>
            <span className="dd-customizer__chevron">{themeOptionsOpen ? '▲' : '▼'}</span>
            {hasCustom && !themeOptionsOpen && (
              <span className="dd-customizer__unsaved-dot" title="Unsaved changes" />
            )}
          </button>
          {themeOptionsOpen && hasCustom && (
            <div className="dd-customizer__reset-row">
              <button type="button" className="dd-reset-btn" onClick={resetCustomizations}>
                Reset
              </button>
            </div>
          )}

          {themeOptionsOpen && (<>
          <label className="dd-label">
            Opacity
            <div className="dd-slider-row">
              <input type="range" min={0.04} max={0.60} step={0.01} value={opacity}
                className="dd-slider"
                onChange={e => { const v = parseFloat(e.target.value); setOpacity(v); ov({ opacity: v }) }} />
              <span className="dd-value">{Math.round(opacity * 100)}%</span>
            </div>
          </label>

          <label className="dd-label">
            Blur
            <div className="dd-slider-row">
              <input type="range" min={0} max={40} step={1} value={blurPx}
                className="dd-slider"
                onChange={e => { const v = parseInt(e.target.value); setBlurPx(v); ov({ blurPx: v }) }} />
              <span className="dd-value">{blurPx}px</span>
            </div>
          </label>

          <label className="dd-label">
            Corner radius
            <div className="dd-slider-row">
              <input type="range" min={4} max={32} step={1} value={radius}
                className="dd-slider"
                onChange={e => { const v = parseInt(e.target.value); setRadius(v); ov({ radius: v }) }} />
              <span className="dd-value">{radius}px</span>
            </div>
          </label>

          <label className="dd-label">
            Accent color
            <div className="dd-color-row">
              <input type="color" value={accent} className="dd-color"
                onChange={e => { setAccent(e.target.value); ov({ accent: e.target.value }) }} />
              <span className="dd-value">{accent}</span>
              <div className="dd-color-preview" style={{ background: `rgba(${hexToRgb(accent) ?? '90,200,250'}, 0.25)`, borderColor: accent }} />
            </div>
          </label>

          <label className="dd-label">
            Card color
            <div className="dd-color-row">
              <input type="color" value={bgColor} className="dd-color"
                onChange={e => { setBgColor(e.target.value); ov({ bgColor: e.target.value }) }} />
              <span className="dd-value">{bgColor}</span>
              <div className="dd-color-preview" style={{ background: bgColor, borderColor: bgColor }} />
            </div>
          </label>

          <div className="dd-section-divider">Text</div>

          <label className="dd-label">
            Text color
            <div className="dd-color-row">
              <input type="color" value={textColor} className="dd-color"
                onChange={e => { setTextColor(e.target.value); applyTextOvs({ tc: e.target.value }) }} />
              <span className="dd-value">{textColor}</span>
              <div className="dd-color-preview" style={{ background: textColor, borderColor: textColor }} />
            </div>
          </label>

          <label className="dd-label">
            Secondary text
            <div className="dd-color-slider-row">
              <input type="color" value={textSecColor} className="dd-color"
                onChange={e => { setTextSecColor(e.target.value); applyTextOvs({ tsc: e.target.value }) }} />
              <input type="range" min={0} max={1} step={0.01} value={textSecOpacity}
                className="dd-slider"
                onChange={e => { const v = parseFloat(e.target.value); setTextSecOpacity(v); applyTextOvs({ tsop: v }) }} />
              <span className="dd-value">{Math.round(textSecOpacity * 100)}%</span>
            </div>
          </label>

          <label className="dd-label">
            Dim text
            <div className="dd-color-slider-row">
              <input type="color" value={textDimColor} className="dd-color"
                onChange={e => { setTextDimColor(e.target.value); applyTextOvs({ tdc: e.target.value }) }} />
              <input type="range" min={0} max={1} step={0.01} value={textDimOpacity}
                className="dd-slider"
                onChange={e => { const v = parseFloat(e.target.value); setTextDimOpacity(v); applyTextOvs({ tdop: v }) }} />
              <span className="dd-value">{Math.round(textDimOpacity * 100)}%</span>
            </div>
          </label>

          <div className="dd-section-divider">Border</div>

          <label className="dd-label">
            Border color
            <div className="dd-color-row">
              <input type="color" value={borderColor} className="dd-color"
                onChange={e => { setBorderColor(e.target.value); ov({ borderColor: e.target.value }) }} />
              <span className="dd-value">{borderColor}</span>
              <div className="dd-color-preview" style={{ background: borderColor, borderColor: borderColor }} />
            </div>
          </label>

          <label className="dd-label">
            Border opacity
            <div className="dd-slider-row">
              <input type="range" min={0} max={1} step={0.01} value={borderOpacity}
                className="dd-slider"
                onChange={e => { const v = parseFloat(e.target.value); setBorderOpacity(v); ov({ borderOpacity: v }) }} />
              <span className="dd-value">{Math.round(borderOpacity * 100)}%</span>
            </div>
          </label>

          <label className="dd-label">
            Border width
            <div className="dd-slider-row">
              <input type="range" min={0} max={4} step={0.5} value={borderWidth}
                className="dd-slider"
                onChange={e => { const v = parseFloat(e.target.value); setBorderWidth(v); ov({ borderWidth: v }) }} />
              <span className="dd-value">{borderWidth}px</span>
            </div>
          </label>
          </>)}
        </div>

        {/* ── Background ───────────────────────────────────────────────── */}
        <div className="dd-section-label" style={{ marginTop: 4 }}>Background</div>
        <BackgroundGallery selected={backgroundImage} onChange={updateBackground} />

      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="design-drawer__footer">
        <button
          className="dd-save-btn"
          onClick={hasCustom ? openSaveDialog : handleSaveNoDialog}
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* ── Save dialog overlay ───────────────────────────────────────────── */}
      {saveDialog && (
        <div className="dd-dialog-overlay">
          <div className="dd-dialog">
            <div className="dd-dialog__title">Save theme</div>

            <label className="dd-label">
              Name
              <input
                type="text"
                className="dd-dialog__input"
                value={saveName}
                onChange={e => { setSaveName(e.target.value); setSaveError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSaveNew()}
                autoFocus
              />
            </label>

            {saveError && <div className="dd-dialog__error">{saveError}</div>}

            <div className="dd-dialog__actions">
              <button className="dd-dialog__btn dd-dialog__btn--primary" onClick={handleSaveReplace}>
                Replace &ldquo;{activeThemeName}&rdquo;
              </button>
              <button className="dd-dialog__btn dd-dialog__btn--secondary" onClick={handleSaveNew}>
                Save as new
              </button>
              <button className="dd-dialog__btn dd-dialog__btn--ghost" onClick={() => setSaveDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
