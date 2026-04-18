# Dash Grid

A self-hosted, Apple-inspired dashboard for Home Assistant. Built with React, TypeScript and Fastify.

---

## Prerequisites

- **Node.js** v18 or later
- **Home Assistant** with a valid Long-Lived Access Token
- (Optional) Västtrafik Developer account for the bus departures plugin card

---

## Installation

```bash
git clone https://github.com/kollenss/dash-grid.git
cd dash-grid
npm install
```

---

## Configuration

Start the app and open **Settings** in the interface.

| Setting | Description |
|---------|-------------|
| Home Assistant URL | e.g. `http://192.168.1.10:8123` |
| API Token | Long-Lived Access Token from HA → Profile → Security |

Tokens are stored in a local SQLite database (`data/hassboard.db`) and are never exposed in plaintext to the client.

### Creating a HA Long-Lived Access Token

1. Log in to Home Assistant
2. Click your profile picture (bottom of the sidebar)
3. Scroll down to **Security → Long-Lived Access Tokens**
4. Click **Create token**, give it a name, and copy the value

---

## Running — development

```bash
npm run dev
```

Starts the backend (port **3001**) and Vite dev server (port **5173**) in parallel.

Open: [http://localhost:5173](http://localhost:5173)

---

## Running — production

```bash
# Build the frontend
npx vite build

# Start the server (also serves the built frontend)
node dist/server/index.js
```

Open: [http://localhost:3001](http://localhost:3001)

The server listens on `0.0.0.0:3001`, making it reachable from other devices on the network.

> **Tip:** Change the port via the `PORT` environment variable:
> ```bash
> PORT=8080 node dist/server/index.js
> ```

---

## Plugin cards

Dash Grid has an installable card system. Browse and install cards from the **Cards** menu in the header.

Available cards are published in [dash-grid-cards](https://github.com/kollenss/dash-grid-cards).

See [CARD_DEVELOPMENT.md](CARD_DEVELOPMENT.md) for the plugin API reference.

---

## Project structure

```
dash-grid/
├── server/
│   ├── index.ts              ← Fastify server (port 3001)
│   ├── db.ts                 ← SQLite (settings, dashboards, cards, plugins)
│   └── routes/
│       ├── config.ts         ← CRUD: cards, settings, dashboards
│       ├── ha-proxy.ts       ← Proxies Home Assistant REST API
│       ├── ha-ws.ts          ← WebSocket bridge to HA
│       ├── vasttrafik-proxy.ts
│       ├── backgrounds.ts
│       └── plugins.ts        ← Plugin install/uninstall/serve
├── client/src/
│   ├── core/
│   │   ├── CardRegistry.ts   ← Plugin registry (singleton)
│   │   └── types.ts          ← CardDefinition, CardProps, IntegrationDef
│   ├── components/
│   │   ├── cards/            ← Built-in card types
│   │   ├── Grid/             ← 12-column CSS Grid
│   │   ├── AddCardModal.tsx
│   │   ├── PluginGallery/    ← Browse and install plugin cards
│   │   └── settings/
│   └── styles/
├── data/                     ← SQLite database (auto-created, gitignored)
└── plugins/                  ← Installed plugin bundles (gitignored)
```
