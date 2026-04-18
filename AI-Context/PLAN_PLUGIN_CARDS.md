# HassBoard — Plugin Card Architecture

## Mål

Användare ska kunna installera, uppdatera och avinstallera kort via ett galleri i appen — utan att uppgradera eller bygga om HassBoard. Kort utvecklas i ett separat GitHub-repo och distribueras som pre-kompilerade ESM-bundles.

---

## Repo-struktur

### `hassboard` (huvud-repo, detta projekt)
Kärn-appen. Inbyggda kort tas successivt bort ur main bundle och publiceras i cards-repot istället. Appen hanterar nedladdning, lagring och dynamisk laddning av kortmoduler.

### `dash-grid-cards` (nytt repo)
Monorepo med alla kort + distributionsmanifest.

```
dash-grid-cards/
├── manifest.json              ← master-lista med alla tillgängliga kort
├── cards/
│   ├── bus-departures/
│   │   ├── src/
│   │   │   └── index.tsx      ← kortets källkod
│   │   ├── dist/
│   │   │   └── card.js        ← kompilerad ESM-bundle (committas)
│   │   ├── screenshots/
│   │   │   └── preview.png
│   │   ├── card.json          ← kortets metadata
│   │   └── README.md
│   └── weather-card/
│       └── ...
└── scripts/
    └── build-all.mjs          ← bygger alla kort och uppdaterar manifest.json
```

### `manifest.json` — format
```json
{
  "version": 1,
  "updated": "2026-04-18",
  "cards": [
    {
      "id": "bus-departures",
      "name": "Bus Departures",
      "description": "Real-time departures from Västtrafik stops.",
      "author": "karljohan-enlund",
      "version": "1.0.0",
      "tags": ["transport", "sweden"],
      "requires": ["vasttrafik"],
      "bundleUrl": "https://raw.githubusercontent.com/.../dist/card.js",
      "screenshotUrl": "https://raw.githubusercontent.com/.../screenshots/preview.png",
      "readmeUrl": "https://raw.githubusercontent.com/.../README.md"
    }
  ]
}
```

---

## Teknisk arkitektur

### Kortbundle (ESM)

Varje kort byggs med Vite i library mode med React som `external`:

```ts
// vite.config.ts (per kort)
export default defineConfig({
  build: {
    lib: { entry: 'src/index.tsx', formats: ['es'], fileName: 'card' },
    rollupOptions: { external: ['react', 'react-dom'] }
  }
})
```

Kortet registrerar sig självt vid import:

```ts
// src/index.tsx (kortets entry point)
import { registry } from 'hassboard-sdk'
import MyCard from './MyCard'

registry.register({
  type: 'bus-departures',
  label: 'Bus Departures',
  // ... samma struktur som idag i cards/index.tsx
  component: MyCard,
})
```

### `hassboard-sdk` (paket eller vendored fil)

SDK:n exponerar `registry` och TypeScript-typerna som kortutvecklare behöver. Publiceras som npm-paket eller som en vendored `.d.ts`-fil i `dash-grid-cards`.

Innehåll:
- `CardRegistry` singleton
- `CardDef`, `IntegrationDef`, `IntegrationField` typer
- Hjälpfunktioner (t.ex. `useHAState`)

### Import map (index.html)

React görs tillgängligt som global dependency via importmap så att kortbundles kan använda det utan att bunta det:

```html
<script type="importmap">
{
  "imports": {
    "react": "/assets/react.js",
    "react-dom": "/assets/react-dom.js"
  }
}
</script>
```

### Plugin-lagring (server)

```
hassboard/
└── plugins/              ← skapas automatiskt vid first run
    ├── bus-departures.js
    └── weather-card.js
```

Servas statiskt av Fastify: `app.register(fastifyStatic, { root: pluginsDir, prefix: '/plugins/' })`

### Plugin-routes (server)

```
GET  /api/plugins/manifest        ← hämtar manifest.json från GitHub (cachat 1h)
GET  /api/plugins/installed       ← lista installerade kort (från SQLite)
POST /api/plugins/install         ← laddar ner bundle → plugins/, sparar i SQLite
DEL  /api/plugins/:id/uninstall   ← tar bort bundle + SQLite-rad
GET  /api/plugins/readme/:id      ← hämtar README.md från GitHub
```

### SQLite — ny tabell

```sql
CREATE TABLE plugins (
  id          TEXT PRIMARY KEY,
  version     TEXT NOT NULL,
  bundle_url  TEXT NOT NULL,
  installed_at TEXT NOT NULL
);
```

### Dynamisk laddning (frontend)

`App.tsx` laddar installerade kort vid startup:

```ts
const installed = await fetch('/api/plugins/installed').then(r => r.json())
for (const plugin of installed) {
  await import(`/plugins/${plugin.id}.js`)
  // Kortet registrerar sig själv i registry via sin entry point
}
```

---

## Galleri-UI

Ny sida/modal: **Card Gallery** — nås från Settings eller ett eget menyval.

### Layout
- Grid med kort-cards: ikon, namn, beskrivning, taggar, version, Install/Uninstall-knapp
- Klick på ett kort → detalj-vy: screenshot, README (renderad markdown), install-knapp
- Filter: alla / installerade / kategori

### States per kort
- `available` — finns i manifest, ej installerat
- `installed` — installerat, samma version
- `update-available` — installerat men manifest har nyare version
- `installing` — laddas ner just nu (spinner)
- `error` — nedladdning misslyckades

---

## Migrationsplan — inbyggda kort

De 18 inbyggda korten bor idag i `hassboard/client/src/components/cards/`. Plan:

**Core cards (inbyggda, flyttas ej):**
SensorCard, GaugeCard, HistoryGraphCard, SwitchCard, LightCard, ClimateCard, CoverCard, SceneCard, MediaPlayerCard, PersonCard, WeatherCard, CameraCard, AlarmCard, ClockCard, GreetingCard, MarkdownCard, IframeCard

**Plugin cards:**
- `avgangstavlan` — "Avgångstavlan (Västtrafik)" (f.d. BusDeparturesCard) — **pilot**

1. **Fas A** — Bygg plugin-infrastrukturen (server-routes, dynamisk import, galleriet)
2. **Fas B** — Bryt ut `BusDeparturesCard` → `avgangstavlan` i `dash-grid-cards`, döp om till "Avgångstavlan (Västtrafik)"
3. **Fas C** — Ta bort `BusDeparturesCard` ur main bundle

---

## Säkerhet

- Appen laddar godtycklig JS från internet — måste dokumenteras tydligt i README
- Hårdkoda manifest-URL:en till `dash-grid-cards`-repot som enda tillåten källa (v1)
- Framtida v2: signaturer på bundles eller allowlist av GitHub-users

---

## Öppna frågor

- [x] Ska `hassboard-sdk` vara ett npm-paket eller en vendored fil i cards-repot? → **Vendored fil** i `dash-grid-cards/sdk/`
- [x] Ska core cards (Clock, Sensor etc.) vara inbyggda eller också plugin-baserade? → **Inbyggda**, utom `BusDeparturesCard` som blir första plugin-kortet. Döps om till **"Avgångstavlan (Västtrafik)"**.
- [x] Offline-stöd — ska bundles cachas lokalt även om GitHub är nere? → **Nej**, men installerade kort (redan nedladdade till `plugins/`) ska alltid fungera oavsett GitHub-status. Galleri/manifest kräver uppkoppling, men laddning av befintliga kort gör det inte.
- [x] Hur hanteras kortkonfiguration/migration när ett kort uppdateras med nya config-fält? → **Schemaless JSON-blob** — `cards.config` i SQLite är redan en `TEXT`-kolumn med JSON per instans. Inga nya tabeller/kolumner behövs aldrig. Regler: (1) kortet ansvarar för att hantera saknade fält med defaults, (2) borttagna fält ignoreras tyst, (3) brytande ändringar dokumenteras i kortets CHANGELOG men kräver ingen db-migration.
- [x] Ska galleriet visa community-kort från externa repos (v2)? → **V2**, ej i scope nu.

---

## Status

- [x] Fas A: Plugin-infrastruktur (server, dynamisk import, galleri-UI) — **KLAR** (2026-04-18)
- [x] Fas B: BusDeparturesCard → `avgangstavlan` plugin — **KLAR** (2026-04-18)
- [x] Fas C: BusDeparturesCard borttagen ur main bundle — **KLAR** (2026-04-18)
- [x] Publicera `dash-grid` på GitHub — https://github.com/kollenss/dash-grid — **KLAR**
- [x] Skapa `dash-grid-cards` repo — https://github.com/kollenss/dash-grid-cards — **KLAR**
- [ ] Skapa `dash-grid-cards` repo
