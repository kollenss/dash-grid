# Dash Grid — Claude instructions

## Building a new card — START HERE

**Always ask first:** "Should this be a built-in card or a community plugin?"

| Built-in | Plugin |
|----------|--------|
| Core utility, used by everyone | Optional / niche, installable from gallery |
| Add to `client/src/components/cards/` + register in `index.tsx` | Lives in `C:\Dev\dash-grid-cards\cards\` |
| Ships with the app | Built as IIFE bundle, served from `plugins/` folder |

**Full plugin development guide:** `C:\Dev\dash-grid-cards\CARD_DEV_GUIDE.md`
This guide contains: file structure, vite config template, SDK types, design tokens, container query breakpoints, config UI patterns, local testing steps, and publishing checklist.

**For built-in cards**, the same design rules apply — read `CARD_DEV_GUIDE.md` for the design system section, then implement directly in `client/src/components/cards/`.

## Development workflow

Always edit files directly in this repo (`C:\Dev\hassDasboard`), never in worktrees.
Push to remote when a feature is done.

## Architecture overview

- **Frontend**: React 18 + TypeScript + Vite — `client/src/`
- **Backend**: Fastify + SQLite — `server/`
- **Cards**: registered in `client/src/components/cards/index.tsx` via `registry.register()`
- **Plugins**: IIFE bundles served from `plugins/`, loaded at startup via `import('/plugins/id.js')`

## Key files

| File | Purpose |
|------|---------|
| `client/src/App.tsx` | Startup: loads plugins THEN cards (order matters — avoids "Unknown card type" flash) |
| `client/src/core/CardRegistry.ts` | Central card type registry |
| `client/src/components/cards/index.tsx` | All built-in card registrations + config UIs |
| `client/src/styles/design-system.css` | All CSS tokens (`--hb-*`) |
| `client/src/styles/globals.css` | `--font: -apple-system, 'SF Pro Display', ...` |
| `server/index.ts` | Fastify entry, plugin server registry |

## Design tokens (most used)

```
--hb-text-primary      white, full opacity
--hb-text-secondary    white 65%
--hb-text-dim          white 55%
--hb-accent            #5ac8fa
--font                 -apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif
```

## Grid dimensions (for container queries)

| Size | Width | Height |
|------|-------|--------|
| 1 col | ~106px | — |
| 2 col | ~224px | — |
| 3 col | ~343px | — |
| 1 row | — | ~91px |
| 2 row | — | ~195px |

Container query thresholds: 1-wide `max-width: 115px`, 2-wide `min-width: 200px`, 1-tall `max-height: 100px`, 2-tall `min-height: 110px`.

## Card config UI pattern

Config UIs live in `index.tsx` alongside the `registry.register()` call:

```tsx
function MyConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <label className="modal-label modal-label-check">
      <input type="checkbox" checked={config.my_option !== false}
        onChange={e => onChange('my_option', e.target.checked)} />
      My option label
    </label>
  )
}
```

## Responsive card sizing pattern (container queries)

Cards use `container-type: size` on the outer wrapper and `cqh`/`cqw` units for font sizes, with `@supports (font-size: 1cqh)` for modern browsers and `clamp()` fallbacks for older ones. See `ClockCard.css` for a complete reference implementation.
