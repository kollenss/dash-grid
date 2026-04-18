# HassBoard

A self-hosted, Apple-inspired dashboard for Home Assistant. Built with React, TypeScript and Fastify.

---

## Prerequisites

- **Node.js** v18 or later
- **Home Assistant** with a valid Long-Lived Access Token
- (Optional) Västtrafik Developer account for the departures card

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-repo/hassboard.git
cd hassboard/hassboard

# 2. Install dependencies
npm install
```

---

## Configuration

Start the app and open **Settings** in the interface.

| Setting | Description |
|---------|-------------|
| Home Assistant URL | e.g. `http://192.168.1.10:8123` |
| API Token | Long-Lived Access Token from HA → Profile → Security |
| Västtrafik API Token | Created at [developer.vasttrafik.se](https://developer.vasttrafik.se) |

Tokens are stored in a local SQLite database (`data/hassboard.db`) and are never exposed in plaintext to the client.

### Creating a HA Long-Lived Access Token

1. Log in to Home Assistant
2. Click your profile picture (bottom of the sidebar)
3. Scroll down to **Security → Long-Lived Access Tokens**
4. Click **Create token**, give it a name, and copy the value

---

## Running — development mode

```bash
npm run dev
```

This starts both the backend (port **3001**) and the Vite dev server (port **5173**) in parallel.

Open: [http://localhost:5173](http://localhost:5173)

### Alternative — two separate terminals

```bash
# Terminal 1 — backend
npx tsx watch server/index.ts

# Terminal 2 — frontend
npx vite
```

---

## Running — production

```bash
# 1. Build the frontend
npx vite build

# 2. Start the server (also serves the built frontend)
npx tsx server/index.ts
```

Open: [http://localhost:3001](http://localhost:3001)

The server listens on `0.0.0.0:3001`, making it reachable from other devices
on the network at `http://<your-ip>:3001`.

> **Tip:** Change the port via the `PORT` environment variable:
> ```bash
> PORT=8080 npx tsx server/index.ts
> ```

---

## Remote access — Cloudflare Tunnel

If you expose HassBoard via a Cloudflare Tunnel or similar reverse proxy,
add your domain to `vite.config.ts` under `server.allowedHosts` (dev mode only):

```ts
server: {
  allowedHosts: ['.hemma.cloud'],  // matches all subdomains
}
```

In production mode (`npx vite build` + `npx tsx server/index.ts`) no such
configuration is needed — the Vite dev server is not involved.

---

## Project structure

```
hassboard/
├── server/
│   ├── index.ts              ← Fastify server (port 3001)
│   ├── db.ts                 ← SQLite (settings, dashboards, cards)
│   └── routes/
│       ├── config.ts         ← CRUD: cards, settings, dashboards
│       ├── ha-proxy.ts       ← Proxies Home Assistant REST API
│       ├── ha-ws.ts          ← WebSocket bridge to HA (auto-reconnect)
│       └── vasttrafik-proxy.ts
├── client/src/
│   ├── core/
│   │   ├── CardRegistry.ts   ← Plugin registry (singleton)
│   │   └── types.ts          ← CardDefinition, CardProps, IntegrationDef
│   ├── components/
│   │   ├── cards/
│   │   │   ├── index.tsx     ← Registers all built-in card types
│   │   │   └── *.tsx         ← Card components
│   │   ├── Grid/             ← 12-column CSS Grid
│   │   ├── AddCardModal.tsx  ← "Add card" dialog
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useHA.ts          ← Fetch states, call services
│   │   └── useHAWebSocket.ts ← Real-time updates via WebSocket
│   └── styles/
│       ├── globals.css       ← CSS variables, backgrounds
│       └── glass.css         ← .glass-card and card layout classes
└── data/
    └── hassboard.db          ← SQLite database (created automatically)
```

---

## Adding a plugin card

HassBoard has a modular card system where each card registers itself via `CardRegistry`.

### 1. Create the card component

```tsx
// client/src/plugins/MyCard.tsx
import '../../styles/glass.css'

export default function MyCard({ config, state }: { config: any; state?: any }) {
  return (
    <div className="glass-card">
      <div className="card-label">{config.title ?? 'My card'}</div>
      <div className="card-value-hero">{state?.state ?? '—'}</div>
    </div>
  )
}
```

### 2. Register the card

```tsx
// client/src/plugins/index.tsx
import { registry } from '../core/CardRegistry'
import MyCard from './MyCard'

registry.register({
  type: 'my_plugin.my_card',   // use a unique prefix
  label: 'My card',
  icon: '✨',
  group: 'My plugins',
  defaultSize: [2, 2],
  needsEntity: true,
  defaultDomains: ['sensor'],
  component: MyCard,
})
```

### 3. Load the plugin file

Add one line to `client/src/main.tsx`:

```ts
import './components/cards'      // built-in cards
import './plugins'               // your plugins
```

The card immediately appears in the "Add card" dialog without any other changes needed.

---

### Configuration UI

To add custom settings fields to the "Add card" dialog, include `configUI`:

```tsx
registry.register({
  // ...
  configUI: ({ config, onChange }) => (
    <label className="modal-label">
      Heading
      <input
        className="modal-input"
        value={config.custom_title ?? ''}
        onChange={e => onChange('custom_title', e.target.value)}
      />
    </label>
  ),
})
```

---

### Integration requirements (external APIs)

If your card needs an API token beyond the HA connection, declare it in the registration.
HassBoard automatically adds the input field to the Settings page.

```tsx
registry.register({
  // ...
  integrations: [
    {
      id: 'my_api',                      // unique key
      label: 'My API key',
      type: 'secret',
      testEndpoint: '/api/my-service/test',
      helpText: 'Create an account at example.com to get your key.',
      required: true,
    },
  ],
})
```

The value is then available in the card via `props.integrations['my_api']`.

---

See [CARD_DEVELOPMENT.md](CARD_DEVELOPMENT.md) for the full API reference and more examples.
