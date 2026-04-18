# HassBoard — Plugin Framework

> Gör det möjligt för tredjepartsutvecklare att bygga kort som följer core-design,
> använder core-konfiguration (HA, tokens) och registreras utan att röra kärnkoden.

---

## Designprinciper

1. **Noll konfiguration i kortet** — ett kort ska aldrig behöva veta om HA-URL eller tokens.  
   Det deklarerar vad det behöver; core löser upp det.
2. **En registrering** — ett kort registrerar sig en gång med `CardRegistry.register(def)`.  
   Det räcker för att dyka upp i UI, inställningar och grid.
3. **Arv av design** — kort använder CSS custom properties från core.  
   Ändrar användaren accent-färg → alla kort uppdateras.
4. **Deklarativa integrationer** — om ett kort behöver ett API-token deklarerar det det.  
   Core lägger till fältet i Inställningar automatiskt.

---

## Arkitektur — Komponentöversikt

```
core/
  CardRegistry.ts        – Singleton. register(), get(), getAll()
  types.ts               – CardDefinition, CardProps, ConfigUIProps,
                           IntegrationDef, CoreContext-interface
  CoreContext.tsx         – React context provider (HA states, callService,
                           integration values, theme)
  useCore.ts             – Hook: useCore() → CoreContext

client/src/
  components/
    cards/
      SensorCard.tsx      – registrerar sig i index.ts
      SwitchCard.tsx
      … (alla 18 befintliga kort)
      index.ts            – importerar & registrerar alla built-in kort

    Grid/
      GridCell.tsx        – läser från registry istället för switch
    AddCardModal.tsx      – läser från registry istället för CARD_TYPES[]
    settings/
      SettingsPage.tsx    – renderar integrationsblock dynamiskt från registry
```

---

## Centrala interface

```ts
// ── Vad ett kort deklarerar ───────────────────────────────────────────────

export interface CardDefinition<TConfig = Record<string, any>> {
  type: string                              // unikt id, t.ex. 'bus_departures'
  label: string                             // 'Avgångstavla'
  icon: string                              // '🚌'
  group: string                             // 'Transport'
  defaultSize: [colSpan: number, rowSpan: number]
  /** Minsta tillåtna storlek — enforeas i resize-drag och storleksväljaren */
  minSize?: [colSpan: number, rowSpan: number]

  needsEntity?: boolean
  defaultDomains?: string[]

  /** Externa API:er utöver HA som kortet behöver */
  integrations?: IntegrationDef[]

  /** Själva kortkomponenten */
  component: React.ComponentType<CardProps<TConfig>>

  /** Extra konfig-fält som visas i AddCardModal (steg 2) */
  configUI?: React.ComponentType<ConfigUIProps<TConfig>>
}

// ── Vad ett kort tar emot som props ──────────────────────────────────────

export interface CardProps<TConfig = Record<string, any>> {
  config: TConfig
  state?: HAState                           // primär entity (om needsEntity)
  states: Record<string, HAState>           // alla HA-states
  integrations: Record<string, string>      // lösta tokens/värden
  /** Kortets aktuella bredd i gridkolumner — använd för responsiv layout */
  colSpan: number
  /** Kortets aktuella höjd i gridrader — använd för responsiv layout */
  rowSpan: number
}

// ── Konfig-UI för AddCardModal ────────────────────────────────────────────

export interface ConfigUIProps<TConfig = Record<string, any>> {
  config: TConfig
  onChange: (key: string, value: any) => void
}

// ── Extern integration/API ────────────────────────────────────────────────

export interface IntegrationDef {
  id: string                    // 'vasttrafik' — nyckel i settings-tabellen
  label: string                 // 'Västtrafik API-token'
  type: 'secret' | 'text' | 'url'
  testEndpoint?: string         // '/api/vasttrafik/test'
  helpText?: string             // 'Skapa konto på developer.vasttrafik.se'
  required?: boolean
}
```

---

## Designsystem — CSS Custom Properties

Core definierar alla design tokens. Kort importerar **aldrig** hårdkodade färger.

```css
/* Glassmorfism */
--hb-glass-bg
--hb-glass-blur
--hb-glass-border
--hb-radius-card

/* Text */
--hb-text-primary      /* vit */
--hb-text-secondary    /* halvtransparent */
--hb-text-dim          /* dimmer label-text */

/* Accent (användarkonfigurerbar) */
--hb-accent            /* default: cyan #5ac8fa */
--hb-accent-dim        /* 20% opacity */

/* Status */
--hb-color-on
--hb-color-off
--hb-color-warning
--hb-color-error
```

Kort behöver bara `className="hb-card"` och kärnlayoutklass (t.ex. `hb-card__label`, `hb-card__value`).

---

## Roadmap

### ~~Sprint 1 — Card Registry & Migration~~ ✅ KLAR (2026-04-16)
**Mål:** Ersätt alla switch-satser med registry-lookups. Ingen synlig förändring för användaren.

**Levererade filer:**
- `client/src/core/CardRegistry.ts` — singleton med `register()`, `get()`, `getAll()`, `getGroups()`, `getIntegrations()`
- `client/src/core/types.ts` — `CardDefinition`, `CardProps`, `ConfigUIProps`, `IntegrationDef`
- `client/src/components/cards/index.tsx` — alla 18 kort registrerade med configUI inline
- `client/src/components/Grid/GridCell.tsx` — switch borttagen, använder registry
- `client/src/components/AddCardModal.tsx` — `CARD_TYPES[]`, `CardMeta`, `ExtraConfig` borttagna
- `client/src/types.ts` — `CardType`-union borttagen, `type: string`
- `client/src/main.tsx` — `import './components/cards'` triggar registreringen

**Definition of Done:**
- [x] `CardRegistry.register()` och `CardRegistry.get()` implementerade
- [x] `CardDefinition` interface definierat med alla fält
- [x] Alla 18 kort registrerade via `cards/index.tsx`
- [x] `GridCell` renderar via registry (ingen switch)
- [x] `AddCardModal` hämtar kortlista från registry (ingen `CARD_TYPES[]`)
- [x] `CardType` union i `types.ts` borttagen — ersatt av fria strings
- [x] Okänd korttyp → "Okänd korttyp: X"-fallback visas korrekt
- [x] `tsc --noEmit` 0 fel, `vite build` grön

---

### ~~Sprint 2 — Integrationssystem & Dynamiska Inställningar~~ ✅ KLAR (2026-04-16)
**Mål:** Kort deklarerar vilka externa API:er de behöver. Settings-sidan genereras automatiskt.

**Levererat (utöver ursprungsplanen):**
- `core/types.ts` — `IntegrationField` interface tillagt; `IntegrationDef.type` är nu optional, `fields?: IntegrationField[]` tillagt för multi-fälts-integrationer
- `core/CardRegistry.ts` — `HA_INTEGRATION` definierad; `getIntegrations()` auto-injicerar HA-integrationen om något kort har `needsEntity: true`
- `SettingsPage.tsx` — komplett omskrivning; noll hårdkodade integrationer; renderar från `registry.getIntegrations()` inkl. multi-fälts-stöd
- `server/routes/config.ts` — generisk maskning: `ha_url` klartext, allt annat masked; migrations-logik `vt_token → vasttrafik`
- `server/routes/vasttrafik-proxy.ts` — läser `vasttrafik` först, faller tillbaka på `vt_token`
- `App.tsx` / `Grid.tsx` / `GridCell.tsx` — `integrations: Record<string, string>` hämtas och passas till alla kort

**HA är nu en integration precis som Västtrafik:**
- Inga HA-kort registrerade → ingen HA-sektion i Settings
- HA-fält: `ha_url` (url/klartext) + `ha_token` (secret)

**Definition of Done:**
- [x] Settings-sidan visar Västtrafik-sektionen utan hårdkodad kod i SettingsPage
- [x] Ny integration kan läggas till enbart via `CardDefinition.integrations` — ingen ändring i SettingsPage
- [x] "Testa"-knapp renderas automatiskt om `testEndpoint` är satt
- [x] `helpText` visas som hjälptext under fältet
- [x] `CardProps.integrations` innehåller lösta värden när kortet renderas
- [x] Befintliga Västtrafik-inställningar (sparade som `vt_token`) fungerar utan datamigration

---

### ~~Sprint 3 — CoreContext & useCore Hook~~ ✅ KLAR (2026-04-16)
**Mål:** Kort kan anropa HA-tjänster och läsa states via hook, utan prop drilling.

**Levererade filer:**
- `core/CoreContext.tsx` — `CoreContextValue` interface, `CoreProvider`, `useCore()` hook
- `core/useCore.ts` — re-exporterar `useCore` och `CoreContextValue` (ren import-väg för kort)
- `core/types.ts` — `CardProps` rensat: `states` och `integrations` borttagna
- `App.tsx` — wrappas med `<CoreProvider value={{ states, callService, integrations }}>`
- `Grid.tsx` — `states`/`integrations` borttagna från Props
- `GridCell.tsx` — hämtar `states`/`integrations` via `useCore()` istället för props
- 7 kort migrerade (SwitchCard, LightCard, ClimateCard, CoverCard, MediaPlayerCard, AlarmCard, SceneCard): `callService` import → `const { callService } = useCore()`

**CoreContextValue interface (implementerat):**
```ts
interface CoreContextValue {
  states: Record<string, HAState>
  callService(domain: string, service: string, data: Record<string, any>): Promise<boolean>
  integrations: Record<string, string>
}
```

**Definition of Done:**
- [x] `CoreContext` provider implementerad
- [x] `useCore()` hook exporterad
- [x] `SwitchCard`, `LightCard`, `ClimateCard` (och övriga med `callService`) migrerade
- [x] `GridCell` behöver inte längre skicka `states` som prop
- [x] Ny extern kort-fil kan importera `useCore` och få full tillgång
- [x] `tsc --noEmit` 0 fel, `vite build` grön

---

### Sprint 3.5 — Responsivt kortsystem ✅ KLAR (2026-04-16)
**Mål:** Kort anpassar sitt innehåll och layout baserat på sin faktiska storlek i gridet.

**Implementerat:**
- `core/types.ts` — `minSize?: [colSpan, rowSpan]` i `CardDefinition`; `colSpan` och `rowSpan` i `CardProps`
- `Grid/GridCell.tsx` — skickar `colSpan`/`rowSpan` (aktiv resize-span) till kortkomponenten; enforcar `minSize` i resize-draget
- `AddCardModal.tsx` — storleksalternativ under `minSize` visas som disabled med "(too small)"; preview skickar `colSpan`/`rowSpan` till kortkomponenten
- `components/cards/GridCell.css` — `overflow: hidden` på `.hb-grid-cell` som fallback-klippning
- `BusDeparturesCard` — pilotimplementation med tre layoutlägen:
  - `minimal` (1×1): centrerat badge + minuter
  - `compact` (Nx1): en avgång, ingen klocka, tätare padding
  - `narrow` (colSpan<3): döljer riktningstext, tvåkolumns grid
- `ClockCard` — nästa responsiva showcase (mockups pågår, implementation i nästa session)

**Mönster för responsiva kort:**
```tsx
export default function MyCard({ config, colSpan, rowSpan }: Props) {
  const compact = rowSpan === 1
  const full    = colSpan >= 3 && rowSpan >= 3
  return (
    <div className={`glass-card my-card${compact ? ' my-card--compact' : ''}`}>
      {full && <DetailedContent />}
      {!full && <CompactContent />}
    </div>
  )
}
```

**Definition of Done:**
- [x] `colSpan`/`rowSpan` flödar från GridCell → kortkomponent
- [x] `minSize` enforeas i resize-drag och modal-storleksväljare
- [x] `overflow: hidden` på gridcell som universal fallback
- [x] BusDeparturesCard fungerar korrekt i alla storlekar 1×1 till 12×8

---

### Sprint 4 — Designsystem & Utvecklardokumentation ⚙️ PÅGÅENDE
**Mål:** En tredjepartsutvecklare kan bygga och ladda in ett kort med minimal friktion.

---

#### Sprint 4.1 — Design Tokens & Temasystem ✅ KLAR (2026-04-16)

**Levererade filer:**
- `client/src/styles/design-system.css` — alla `--hb-*` CSS custom properties med "primitiv"-mönster:
  - `--hb-card-bg-rgb` + `--hb-card-opacity` → `--hb-card-bg: rgba(var(...), var(...))`
  - `--hb-card-blur-px` + `--hb-card-saturate` → `--hb-card-blur: blur(calc(...)) saturate(...)`
  - Text: `--hb-text-primary/secondary/dim`
  - Accent: `--hb-accent`, `--hb-accent-rgb`, `--hb-accent-dim`
  - Status: `--hb-status-on/off/warning/error`
  - Base-klass `.hb-card` + `.hb-card__label/value/unit/sub`
- `client/src/core/themes.ts` — komplett temasystem:
  - `HBTheme` interface (id, name, author, description, tokens, preview)
  - `HBCssVar` type — alla CSS-variabler som teman får sätta
  - `UserAppearanceOverrides` interface (opacity, blurPx, radius, accent)
  - `BUILT_IN_THEMES`: **Glass Dark, Midnight, Frosted, Minimal, Warm**
  - `applyTheme(theme)` — rensar gamla tema-vars, applicerar nya
  - `applyUserOverrides(overrides)` — lagrar user-val ovanpå aktivt tema
  - `hexToRgb(hex)` — konverterar `#rrggbb` → `"r, g, b"`
  - `getTheme(id)` — lookup med fallback

**Uppdaterade filer:**
- `client/src/styles/globals.css` — importerar `design-system.css`; gamla variabler (`--glass-bg`, `--color-text` etc.) är nu compat-alias som pekar på `--hb-*`
- `client/src/App.tsx` — anropar `applyTheme` + `applyUserOverrides` när settings laddas
- `client/src/components/settings/SettingsPage.tsx` — ny **Appearance**-sektion:
  - Temaväljare med visuella preview-swatches (live preview vid klick)
  - 4 sliders: Card Transparency, Card Blur, Corner Radius, Accent Color
  - "Reset to theme defaults"-knapp
  - Sparar `theme_id`, `user_card_opacity`, `user_card_blur_px`, `user_card_radius`, `user_accent`, `user_accent_rgb`
- `client/src/components/settings/SettingsPage.css` — stilar för `.theme-grid`, `.theme-tile`, `.appearance-customizer`, `.appearance-slider`
- `server/routes/config.ts` — `plaintextKeys` set: appearance-nycklar returneras i klartext (ej maskerade som `***saved***`)
- `SwitchCard.css` + `LightCard.css` — `.ios-toggle.on` använder `var(--hb-accent)` istället för hårdkodad `#34c759`

**Hur en utvecklare lägger till ett eget tema:**
```ts
// I client/src/core/themes.ts — lägg till i BUILT_IN_THEMES:
{
  id: 'ocean',
  name: 'Ocean',
  author: 'dittnamn',
  description: 'Deep sea blues',
  tokens: {
    '--hb-card-bg-rgb':  '5, 30, 60',
    '--hb-card-opacity': '0.68',
    '--hb-accent':       '#00d4ff',
    '--hb-accent-rgb':   '0, 212, 255',
  },
  preview: {
    cardBg: 'rgba(5, 30, 60, 0.68)',
    border: 'rgba(0, 212, 255, 0.25)',
    accent: '#00d4ff',
  },
}
```
Dyker upp automatiskt i Settings-temaväljaren.

**Definition of Done:**
- [x] `design-system.css` med alla `--hb-*` tokens
- [x] `themes.ts` med `HBTheme` interface + 5 built-in teman
- [x] `applyTheme()` / `applyUserOverrides()` applicerar CSS-vars på `:root`
- [x] Settings Appearance-sektion med temaväljare + 4 sliders
- [x] Live preview i Settings (ändring syns direkt utan att spara)
- [x] Sparade inställningar appliceras vid sidladdning
- [x] Gamla variabelnamn aliasade — inga befintliga kort behövde ändras
- [x] `ios-toggle` följer `--hb-accent` (temat)
- [x] `tsc --noEmit` 0 fel

---

#### Sprint 4.2 — CardShell & Utvecklardokumentation ⬜ EJ PÅBÖRJAD

**Återstår:**
- `core/CardShell.tsx` — wrapper-komponent: glassmorfism, loading/error states
- `CARD_DEVELOPMENT.md` — guide för kortdevelopers (registrering, props, useCore, design tokens)
- `cards/ExampleCard.tsx` — "Hello World"-kort som visar alla API:er
- `core/index.ts` — public API: exporterar allt en plugin-author behöver
- Migrera befintliga kort att använda `.hb-card` och `--hb-*` tokens direkt (istället för compat-alias)

**CardShell API (planerat):**
```tsx
<CardShell loading={isLoading} error={errorMsg} title={config.title}>
  {/* kortets innehåll */}
</CardShell>
```

**Definition of Done:**
- [ ] `CardShell` implementerad och använd av minst 3 befintliga kort
- [ ] `ExampleCard` funkar end-to-end (register → visas i modal → renderas i grid)
- [ ] `CARD_DEVELOPMENT.md` täcker: registrering, props, useCore, integrations, design tokens
- [ ] `core/index.ts` exporterar alla publika typer och utilities

---

### Sprint 5 — Dynamisk Plugin-laddning (Framtid)
**Mål:** Ladda kort från URL eller npm-paket utan att bygga om core.

**Koncept:**
- Plugin-manifest: `hassboard-plugin.json` med entry point och metadata
- Dynamic `import()` av ES-moduler
- Sandboxing via iframe eller CSP
- Plugin-manager i Settings: "Installerade plugins"

> Kräver genomtänkt säkerhetsmodell. Planeras i separat RFC.

---

## Migreringsordning

```
Sprint 1 ✅  →  Sprint 2 ✅  →  Sprint 3 ✅  →  Sprint 4.1 ✅  →  Sprint 4.2  →  Sprint 5
Registry        Integr.          Context           Tokens/Themes      CardShell/Docs     Plugin-laddning
(intern)        (synlig)         (DX)              (UX synlig)        (DX)               (framtid)
```

Sprint 1–3 är interna refaktoreringar — inga UX-ändringar.  
Sprint 4 ger den synliga, dokumenterade plugin-API:n.

---

## Bakåtkompatibilitet

- Befintliga dashboards i SQLite påverkas inte (type-strängen `"bus_departures"` fungerar fortfarande)
- Befintliga kort migreras in i registry med identiska beteenden
- Inga brytande ändringar i REST API
