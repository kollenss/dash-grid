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

Register the card in your entry file (e.g. `myPlugin.tsx`):

```tsx
import { registry } from './path/to/hassboard/client/src/core/CardRegistry'
import MyCard from './MyCard'

registry.register({
  type: 'my_card',          // unique id — use a prefix to avoid collisions
  label: 'My card',
  icon: '✨',
  group: 'My plugins',
  defaultSize: [2, 2],
  component: MyCard,
})
```

Then import your entry file in `main.tsx` **after** the built-in cards:

```ts
import './components/cards'      // built-in cards
import './plugins/myPlugin'      // your card
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
  config: Record<string, any>          // The card's saved configuration
  state?: HAState                      // HA state for config.entity_id (if needsEntity)
  states: Record<string, HAState>      // All HA states (for cards using multiple entities)
  integrations: Record<string, string> // Resolved integration values (API tokens etc.)
}
```

### HAState

```ts
interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, any>
  last_changed: string
  last_updated: string
}
```

---

## Calling HA services

Import `callService` directly (until Sprint 3 — CoreContext):

```tsx
import { callService } from '../hooks/useHA'

function handleToggle() {
  callService('switch', 'turn_on', { entity_id: config.entity_id })
}
```

---

## Configuration fields — configUI

`configUI` is a React component rendered in step 2 of the "Add card" dialog.
It receives `config` (current values) and `onChange(key, value)`.

```tsx
import type { ConfigUIProps } from './path/to/core/types'

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
registry.register({
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

The value is then available in the card via `props.integrations['my_weather_api']`.

```tsx
export default function MyWeatherRadarCard({ config, integrations }: CardProps) {
  const apiKey = integrations['my_weather_api']

  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=...`)
  }, [apiKey])
  // ...
}
```

> **Note:** Tokens are stored in HassBoard's SQLite database on the server and are
> never exposed in plaintext to the client. The `/api/settings` endpoint returns
> `***saved***` for existing secret values.

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

Use these variables to follow the theme:

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

### Example — custom element using theme colors

```css
.my-badge {
  background: var(--color-accent);
  color: var(--color-text);
  border-radius: 4px;
  padding: 2px 8px;
}
```

---

## Full example

```tsx
// ClockCard.tsx — a simple card without an entity

import { useState, useEffect } from 'react'
import '../../styles/glass.css'

interface Config {
  title?: string
  format_24h?: boolean
}

export default function ClockCard({ config }: { config: Config }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hours   = config.format_24h !== false
    ? time.getHours().toString().padStart(2, '0')
    : (time.getHours() % 12 || 12).toString()
  const minutes = time.getMinutes().toString().padStart(2, '0')

  return (
    <div className="glass-card">
      <div className="card-label">{config.title ?? 'Clock'}</div>
      <div className="card-value-hero">{hours}:{minutes}</div>
    </div>
  )
}
```

```tsx
// Registration
registry.register({
  type: 'clock',
  label: 'Clock',
  icon: '🕐',
  group: 'Static',
  defaultSize: [2, 2],
  needsEntity: false,
  component: ClockCard,
  configUI: ({ config, onChange }) => (
    <label className="modal-label modal-label-check">
      <input
        type="checkbox"
        checked={config.format_24h !== false}
        onChange={e => onChange('format_24h', e.target.checked)}
      />
      24-hour format
    </label>
  ),
})
```

---

## Pre-publish checklist

- [ ] `type` has a unique prefix, e.g. `my_company.card_name`
- [ ] No hardcoded hex colors — use CSS custom properties
- [ ] `glass-card` is the outermost element
- [ ] Card handles `state === undefined` (entity unavailable)
- [ ] `configUI` validates required fields
- [ ] Integration `id` is unique and descriptive
