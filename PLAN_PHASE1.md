# Fas 1 — Fundament

> **Status: KLAR (2026-04-16)**

> **Förutsättningar:** Läs [`PLAN.md`](PLAN.md) för arkitektur och designprinciper. Läs [`HA_SERVER_REFERENCE.md`](HA_SERVER_REFERENCE.md) för HA-anslutning.

**Mål:** En körbar app med grid-layout, HA-anslutning och de två baskorttyperna sensor + switch.

---

## Struktur att bygga

```
hassboard/
├── server/
│   ├── index.ts          ← Fastify-server, serverar SPA + API
│   ├── routes/
│   │   ├── config.ts     ← GET/PUT dashboard-layout (SQLite)
│   │   ├── ha-proxy.ts   ← Proxar HA REST API
│   │   └── ha-ws.ts      ← WebSocket-bridge till HA
│   └── db.ts             ← SQLite-setup (better-sqlite3)
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Grid/
│   │   │   │   ├── Grid.tsx        ← 12-kol CSS Grid
│   │   │   │   └── GridCell.tsx    ← Positionerar ett kort
│   │   │   ├── cards/
│   │   │   │   ├── SensorCard.tsx
│   │   │   │   └── SwitchCard.tsx
│   │   │   └── settings/
│   │   │       └── SettingsPage.tsx ← HA URL + token
│   │   ├── hooks/
│   │   │   ├── useHA.ts            ← HA REST fetch via proxy
│   │   │   └── useHAWebSocket.ts   ← Realtidsuppdateringar
│   │   └── styles/
│   │       ├── globals.css         ← CSS custom properties
│   │       └── glass.css           ← Glassmorfism-klasser
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Steg 1 — Projektsetup

```bash
mkdir hassboard && cd hassboard
npm init -y
npm install fastify @fastify/static @fastify/cors ws better-sqlite3
npm install -D typescript vite @vitejs/plugin-react @types/node @types/better-sqlite3 @types/ws
npx tsc --init
```

**`vite.config.ts`** — proxy API-anrop till servern under dev:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws':  { target: 'ws://localhost:3001', ws: true }
    }
  }
})
```

---

## Steg 2 — Fastify-server

`server/index.ts` — startar på port 3001 (prod), serverar SPA och registrerar routes:

```ts
import Fastify from 'fastify'
import staticPlugin from '@fastify/static'
import path from 'path'
import { configRoutes } from './routes/config'
import { haProxyRoutes } from './routes/ha-proxy'
import { setupHAWebSocket } from './routes/ha-ws'

const app = Fastify()

app.register(staticPlugin, { root: path.join(__dirname, '../client/dist') })
app.register(configRoutes, { prefix: '/api' })
app.register(haProxyRoutes, { prefix: '/api/ha' })

setupHAWebSocket(app.server)

app.listen({ port: 3001, host: '0.0.0.0' })
```

---

## Steg 3 — SQLite-schema

`server/db.ts`:

```ts
import Database from 'better-sqlite3'

const db = new Database(process.env.DATA_DIR + '/hassboard.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dashboards (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT PRIMARY KEY,
    dashboard_id TEXT NOT NULL,
    type         TEXT NOT NULL,   -- 'sensor' | 'switch' | etc.
    col          INTEGER NOT NULL, -- grid-position: kolumn (1-12)
    row          INTEGER NOT NULL, -- grid-position: rad
    col_span     INTEGER DEFAULT 1,
    row_span     INTEGER DEFAULT 1,
    config       TEXT NOT NULL    -- JSON-blob: entity_id, title, unit etc.
  );
`)

export default db
```

---

## Steg 4 — HA-proxy route

`server/routes/ha-proxy.ts` — proxar anrop till HA, lägger till token:

```ts
import { FastifyPluginAsync } from 'fastify'
import db from '../db'

export const haProxyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/states', async (req, reply) => {
    const { haUrl, haToken } = getHAConfig()
    const res = await fetch(`${haUrl}/api/states`, {
      headers: { Authorization: `Bearer ${haToken}` }
    })
    return res.json()
  })

  app.post('/services/:domain/:service', async (req, reply) => {
    const { domain, service } = req.params as any
    const { haUrl, haToken } = getHAConfig()
    const res = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    return res.json()
  })
}

function getHAConfig() {
  const haUrl   = db.prepare('SELECT value FROM settings WHERE key=?').get('ha_url') as any
  const haToken = db.prepare('SELECT value FROM settings WHERE key=?').get('ha_token') as any
  return { haUrl: haUrl?.value, haToken: haToken?.value }
}
```

---

## Steg 5 — HA WebSocket bridge

`server/routes/ha-ws.ts` — kopplar HassBoard-klienter till HA:s WebSocket:

Flöde:
1. Klient ansluter till `ws://hassboard/ws`
2. Servern öppnar en WS-anslutning mot `ws://192.168.x.x:8123/api/websocket`
3. Autentiserar med token (HA WS auth-handshake)
4. Vidarebefordrar `subscribe_events` och `state_changed`-events till klienten
5. Vid reconnect — automatisk återanslutning efter 5s

---

## Steg 6 — CSS-fundament

`client/src/styles/globals.css`:
```css
:root {
  --font: -apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  --radius-card: 20px;
  --glass-bg: rgba(255,255,255,0.14);
  --glass-border: rgba(255,255,255,0.18);
  --glass-blur: blur(24px) saturate(1.6);
  --grid-cols: 12;
  --grid-gap: 12px;
  --bg-day:   linear-gradient(180deg, #1a6ec8 0%, #2e8eea 50%, #63c0f5 100%);
  --bg-night: linear-gradient(180deg, #0b1426 0%, #1a2744 55%, #0d2137 100%);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: var(--font);
  color: #fff;
  overflow: hidden;
}

body {
  background: var(--bg-night);
  transition: background 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

`client/src/styles/glass.css`:
```css
.glass-card {
  background: var(--glass-bg);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  padding: 14px 16px;
  overflow: hidden;
}

.card-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  color: rgba(255,255,255,0.55);
  text-transform: uppercase;
  margin-bottom: 10px;
}

.card-value-hero {
  font-size: 48px;
  font-weight: 200;
  color: #fff;
  line-height: 1;
}

.card-value-large {
  font-size: 34px;
  font-weight: 300;
  color: #fff;
}

.card-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  margin-top: auto;
}
```

---

## Steg 7 — Grid-komponent

`client/src/components/Grid/Grid.tsx`:

```tsx
// 12-kolumns CSS Grid, responsivt:
// > 1200px: 12 kolumner
// 768–1200px: 8 kolumner
// < 768px: 4 kolumner

// Varje GridCell positioneras med:
// grid-column: col / span col_span
// grid-row: row / span row_span
```

---

## Steg 8 — SensorCard + SwitchCard

**SensorCard** visar:
- Etikett (entity_id eller custom title)
- Värde + enhet i `card-value-large`-stil
- Tillstånd (t.ex. "Uppdaterad 14:32")

**SwitchCard** visar:
- Etikett
- Toggle (iOS-stil pill-switch)
- Anropar `/api/ha/services/switch/turn_on|off` vid klick
- Optimistisk UI-uppdatering — byter state omedelbart, återställer vid fel

---

## Steg 9 — Settings-sida

Route: `/settings`

Fält:
- **Home Assistant URL** — `http://192.168.x.x:8123` (default)
- **API Token** — password-input, sparas i SQLite, visas aldrig i klartext igen
- **Test-anslutning** — knapp som anropar `/api/states` och visar OK/fel
- **Dashboard-namn** — byt namn på aktuell dashboard

---

## Steg 10 — "Lägg till kort"-flöde (Fas 1-version)

Enkel version (ingen drag-and-drop ännu):
1. Klicka "+" i ett tomt grid-cell
2. Välj korttyp: Sensor / Switch
3. Skriv in entity_id manuellt (entity-browser kommer i Fas 2)
4. Välj storlek
5. Kort sparas i SQLite och renderas

---

## Definition of Done — Fas 1

- [x] `start.cmd` öppnar server (port 3001) + Vite (port 5173) i separata fönster
- [x] Inställningssida sparar HA URL + token
- [x] "Testa anslutning" lyckas mot `192.168.x.x:8123` (visar `HA 2026.4.2 — anslutning OK`)
- [x] Man kan lägga till ett SensorCard med entity_id
- [x] Man kan lägga till ett SwitchCard och toggla det
- [x] Värden uppdateras via WebSocket utan sidladdning
- [x] Layouten sparas i SQLite och återställs vid omstart
- [ ] Fungerar i Chrome, Firefox, Safari mobile

## Kända quirks att ha i åtanke

- **Starta alltid med `start.cmd`** (eller `npx tsx watch server/index.ts` + `npx vite` i separata fönster). Kör aldrig `npx vite client` — då hittar inte Vite sin config och proxyn slutar fungera.
- **`@fastify/static`** registreras bara om `dist/client` finns (production build). I dev är det Vite som serverar frontend.
- **Token-hantering:** token-fältet i Settings visas alltid tomt (maskerat). Lämna tomt = befintligt token behålls. Skriv nytt värde = ersätter.
- **Port 3001** måste vara ledig. Vid konstiga fel: `taskkill /IM node.exe /F` och starta om.
