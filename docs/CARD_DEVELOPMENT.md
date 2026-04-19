# HassBoard — Card Development Guide

This guide explains how to build a custom card for HassBoard.
Basic knowledge of React and TypeScript is required.

---

## Quick start — minimal card

```tsx
// MyCard.tsx
export default function MyCard({ config }: { config: any }) {
  return (
    <div className="glass-card">
      <div className="card-label">{config.title ?? 'My card'}</div>
      <div className="card-value-hero">Hello!</div>
    </div>
  )
}
```

Register the card in your entry file (e.g. `index.tsx`):

```tsx
import { registerCard } from '../../../sdk/registry'
import MyCard from './MyCard'

registerCard({
  type: 'my_card',          // unique id — use a prefix to avoid collisions
  label: 'My card',
  icon: '✨',
  group: 'My plugins',
  defaultSize: [2, 2],
  component: MyCard,
})
```

Done — the card appears in the "Add card" dialog under the group "My plugins".

---

## CardDefinition — all fields

```ts
interface CardDefinition {
  // ── Required ───────────────────────────────────────────────────────────────
  type: string                    // Unique id, e.g. 'my_org.weather_radar'
  label: string                   // Display name in the card picker
  icon: string                    // Emoji or unicode icon
  group: string                   // Category in the card picker
  defaultSize: [number, number]   // [columns, rows] default grid size
  component: React.ComponentType  // The card component

  // ── Optional ───────────────────────────────────────────────────────────────
  minSize?: [number, number]       // Minimum allowed grid size
  needsEntity?: boolean           // Show entity picker in configuration step
  defaultDomains?: string[]       // Pre-filters entity browser, e.g. ['sensor']
  integrations?: IntegrationDef[] // External APIs the card needs (see below)
  configUI?: React.ComponentType  // Extra configuration fields in the add dialog
}
```

---

## CardProps — what your card receives

```ts
interface CardProps {
  config: Record<string, any>   // The card's saved configuration
  colSpan: number               // Current width in grid columns
  rowSpan: number               // Current height in grid rows
}
```

---

## Configuration fields — configUI

`configUI` is a React component rendered in step 2 of the "Add card" dialog.
It receives `config` (current values) and `onChange(key, value)`.

```tsx
import type { ConfigUIProps } from '../../../sdk/types'

function MyCardConfigUI({ config, onChange }: ConfigUIProps) {
  return (
    <>
      <label className="modal-label">
        API URL
        <input
          className="modal-input"
          value={config.api_url ?? ''}
          onChange={e => onChange('api_url', e.target.value)}
          placeholder="https://api.example.com"
        />
      </label>

      <label className="modal-label modal-label-check">
        <input
          type="checkbox"
          checked={!!config.show_details}
          onChange={e => onChange('show_details', e.target.checked)}
        />
        Show details
      </label>
    </>
  )
}
```

Available CSS classes for configuration fields:

| Class | Usage |
|-------|-------|
| `modal-label` | `<label>` wrapper |
| `modal-label-check` | `<label>` with checkbox (horizontal layout) |
| `modal-input` | `<input>`, `<select>` or `<textarea>` |
| `modal-textarea` | Extra height for `<textarea>` |
| `modal-size-row` | Row with multiple fields side by side |

---

## External integrations

If your card needs an API token or other configuration beyond the HA connection,
declare it with `integrations`. HassBoard automatically adds the field to Settings.

```ts
registerCard({
  type: 'my_weather_radar',
  // ...
  integrations: [
    {
      id: 'my_weather_api',          // key — must be globally unique
      label: 'WeatherAPI key',
      type: 'secret',                // 'secret' | 'text' | 'url'
      testEndpoint: '/api/my-weather/test',
      helpText: 'Create an account at weatherapi.com and copy your API key.',
      required: true,
    },
  ],
  component: MyWeatherRadarCard,
})
```

---

## Server-side plugin routes

If your card needs to make requests that the browser can't do directly (CORS restrictions,
OAuth token management, secrets), you can ship a `server.ts` alongside your card.

HassBoard loads your server bundle when the card is installed and registers a dispatcher
under `/api/plugins/{your-card-id}/`. Your card can then call these routes from the browser.

### server.ts

```ts
import type { ServerPlugin } from '../../../sdk/serverTypes'

const plugin: ServerPlugin = {
  routes: [
    {
      method: 'GET',
      path: '/data',
      handler: async (req, reply) => {
        const { param } = req.query as { param?: string }
        // fetch from external API, handle auth, etc.
        const res = await fetch(`https://api.example.com/data?q=${param}`)
        return res.json()
      },
    },
  ],
}

export default plugin
```

Your card then calls: `fetch('/api/plugins/my-card/data?param=...')`

### Building the server bundle

Add a second Vite config `vite.config.server.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/server.ts',
      formats: ['es'],
      fileName: () => 'server',
    },
    outDir: 'dist',
    emptyOutDir: false,
    target: 'node18',
    rollupOptions: {
      external: ['fs', 'path', 'url', 'http', 'https', 'crypto', 'stream'],
    },
  },
})
```

Update your build script:

```json
"build": "vite build && vite build --config vite.config.server.ts"
```

### manifest.json entry

Add `serverBundleUrl` alongside `bundleUrl`:

```json
{
  "id": "my-card",
  "bundleUrl": "https://...dist/card.js",
  "serverBundleUrl": "https://...dist/server.js"
}
```

HassBoard downloads and activates `server.js` automatically when the card is installed.
The server plugin stays active across restarts.

### Security notes

- Only allow `https://` URLs when proxying external requests (prevents SSRF)
- Never expose secrets from the server plugin back to the client in plaintext
- Plugin server code runs with the same privileges as the HassBoard server process

---

## Design system

All cards automatically inherit HassBoard's glassmorphism design via CSS classes.
**Never** use hardcoded colors — use CSS custom properties instead.

### Basic card shell

```tsx
<div className="glass-card">
  <div className="card-label">Card title</div>
  {/* content */}
</div>
```

### Available CSS classes

| Class | Description |
|-------|-------------|
| `glass-card` | Glassmorphism background, border, blur. Always the outermost element. |
| `card-label` | Small heading at the top (uppercase, dimmed) |
| `card-value-hero` | Large value, 48px, thin font weight |
| `card-value-large` | Medium value, 34px |
| `card-unit` | Unit next to a value, e.g. "°C" |
| `card-sub` | Small text at the bottom of the card |

### CSS Custom Properties

```css
/* Glassmorphism */
var(--glass-bg)
var(--glass-blur)
var(--glass-border)
var(--radius-card)

/* Text */
var(--color-text)        /* white */
var(--color-text-mid)    /* semi-transparent */
var(--color-text-dim)    /* dimmer, used for labels */

/* Accent */
var(--color-accent)      /* cyan #5ac8fa */
```

---

## Full example — client only

```tsx
// ClockCard.tsx
import { useState, useEffect } from 'react'

export default function ClockCard({ config }: { config: { title?: string; format_24h?: boolean } }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const h = config.format_24h !== false
    ? time.getHours().toString().padStart(2, '0')
    : (time.getHours() % 12 || 12).toString()
  const m = time.getMinutes().toString().padStart(2, '0')

  return (
    <div className="glass-card">
      <div className="card-label">{config.title ?? 'Clock'}</div>
      <div className="card-value-hero">{h}:{m}</div>
    </div>
  )
}
```

---

## Pre-publish checklist

- [ ] `type` has a unique prefix, e.g. `my_org.card_name`
- [ ] No hardcoded hex colors — use CSS custom properties
- [ ] `glass-card` is the outermost element
- [ ] Card handles missing/empty config gracefully
- [ ] `configUI` guides the user through required fields
- [ ] If using a server plugin: only `https://` URLs allowed in proxy handlers
- [ ] Both `card.js` and `server.js` (if applicable) committed to dist/
- [ ] `manifest.json` updated with correct `bundleUrl` (and `serverBundleUrl` if applicable)
