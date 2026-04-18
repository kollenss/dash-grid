/**
 * bake-themes.mjs
 *
 * Reads custom themes from the settings DB and prints TypeScript code
 * ready to paste (or auto-insert) into BUILT_IN_THEMES in core/themes.ts.
 *
 * Usage: node scripts/bake-themes.mjs
 */

import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH   = join(__dirname, '../data/hassboard.db')
const THEMES_TS = join(__dirname, '../client/src/core/themes.ts')

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const m = h.match(/.{2}/g)
  if (!m || m.length < 3) return '255, 255, 255'
  return m.slice(0, 3).map(s => parseInt(s, 16)).join(', ')
}

function customToHBTheme(ct) {
  const bgRgb   = hexToRgb(ct.bgColor)
  const textRgb = hexToRgb(ct.textColor)
  const accRgb  = hexToRgb(ct.accent)

  return {
    id:   ct.id,
    name: ct.name,
    tokens: {
      '--hb-card-bg-rgb':   bgRgb,
      '--hb-card-opacity':  String(ct.opacity),
      '--hb-card-blur-px':  String(ct.blurPx),
      '--hb-card-radius':   `${ct.radius}px`,
      '--hb-card-border':   `rgba(${hexToRgb(ct.borderColor)}, ${ct.borderOpacity})`,
      '--hb-accent':        ct.accent,
      '--hb-accent-rgb':    accRgb,
      '--hb-text-primary':  ct.textColor,
      '--hb-text-secondary':`rgba(${textRgb}, ${ct.textSecOpacity})`,
      '--hb-text-dim':      `rgba(${textRgb}, ${ct.textDimOpacity})`,
    },
    preview: {
      cardBg: `rgba(${bgRgb}, ${ct.opacity})`,
      border: `rgba(${hexToRgb(ct.borderColor)}, ${ct.borderOpacity})`,
      accent: ct.accent,
    },
  }
}

function themeToTS(t, indent = '  ') {
  const i  = indent
  const ii = indent + '  '
  const tokenLines = Object.entries(t.tokens)
    .map(([k, v]) => `${ii}  '${k}': '${v}',`)
    .join('\n')
  return `${i}{
${ii}id: '${t.id}',
${ii}name: '${t.name}',
${ii}tokens: {
${tokenLines}
${ii}},
${ii}preview: {
${ii}  cardBg: '${t.preview.cardBg}',
${ii}  border: '${t.preview.border}',
${ii}  accent: '${t.preview.accent}',
${ii}},
${i}},`
}

// ── Main ───────────────────────────────────────────────────────────────────

const db   = new Database(DB_PATH, { readonly: true })
const row  = db.prepare("SELECT value FROM settings WHERE key = 'custom_themes'").get()
db.close()

if (!row?.value) {
  console.log('Inga custom themes hittades i databasen.')
  process.exit(0)
}

const customThemes = JSON.parse(row.value)
if (!customThemes.length) {
  console.log('custom_themes är tom.')
  process.exit(0)
}

const hbThemes = customThemes.map(customToHBTheme)
const tsBlocks = hbThemes.map(t => themeToTS(t)).join('\n')

console.log('\n// ── Baked custom themes ────────────────────────────────────────────────────\n')
console.log(tsBlocks)
console.log('\n// Klistra in ovanstående i BUILT_IN_THEMES-arrayen i core/themes.ts\n')

// ── Auto-patch themes.ts ───────────────────────────────────────────────────

const src  = readFileSync(THEMES_TS, 'utf-8')
const marker = '// ── BAKED_CUSTOM_THEMES_END ──'

let patched
if (src.includes(marker)) {
  // Replace everything between the start marker and end marker
  patched = src.replace(
    /\/\/ ── BAKED_CUSTOM_THEMES_START ──[\s\S]*?\/\/ ── BAKED_CUSTOM_THEMES_END ──/,
    `// ── BAKED_CUSTOM_THEMES_START ──\n${tsBlocks}\n${marker}`
  )
} else {
  // Insert before the closing bracket of BUILT_IN_THEMES
  patched = src.replace(
    /^(export const BUILT_IN_THEMES[\s\S]*?)\n\]\s*$/m,
    (_, body) =>
      `${body}\n  // ── BAKED_CUSTOM_THEMES_START ──\n${tsBlocks}\n  ${marker}\n]`
  )
}

if (patched === src) {
  console.error('Kunde inte hitta BUILT_IN_THEMES i themes.ts — inga ändringar gjorda.')
  process.exit(1)
}

writeFileSync(THEMES_TS, patched, 'utf-8')
console.log(`✓ ${hbThemes.length} tema(n) inbakade i ${THEMES_TS}`)
console.log('  Kör "npx tsc --noEmit" för att verifiera.\n')
