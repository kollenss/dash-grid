# HassBoard Design System — Plan

> Syfte: Ta kontroll på det visuella språket tidigt, innan applikationen blir för stor.
> Uppdatera detta dokument när fas slutförs eller planer ändras.

---

## Nuläge (2026-04-17)

Det finns redan en solid grund:

| Fil | Vad den gör |
|-----|-------------|
| `hassboard/client/src/styles/design-system.css` | Alla `--hb-*` tokens (kort, typografi, accent, status) |
| `hassboard/client/src/styles/globals.css` | Importerar design-system.css, bakåtkompatibla alias |
| `hassboard/client/src/styles/glass.css` | Glass-specifika helpers |
| `hassboard/client/src/core/themes.ts` | Tema-logik, built-in teman, custom-teman |
| `hassboard/client/src/components/DesignDrawer.tsx` | Live-temaredigering (sliders, färgväljare, spara/ladda teman) |
| `ui-reference/style.css` | Ursprunglig referensstil (inte aktiv i appen, behåll som referens) |

### Befintliga tokens (`--hb-*`)
- **Kort/glass:** `--hb-card-bg-rgb`, `--hb-card-opacity`, `--hb-card-blur-px`, `--hb-card-saturate`, `--hb-card-border`, `--hb-card-border-width`, `--hb-card-radius`, `--hb-card-shadow`
- **Typografi:** `--hb-text-primary`, `--hb-text-secondary`, `--hb-text-dim`
- **Accent:** `--hb-accent`, `--hb-accent-rgb`, `--hb-accent-dim`
- **Status:** `--hb-status-on`, `--hb-status-off`, `--hb-status-warning`, `--hb-status-error`

### Känd teknisk skuld
- Många kortkomponenter använder fortfarande hårdkodade värden (t.ex. `rgba(255,255,255,0.55)`) istället för tokens
- Backward-compat-aliaser i `globals.css` (`--color-text`, `--color-text-dim`, `--color-text-mid`) används av äldre kort-CSS

---

## Fas 1 — Inventering & token-komplettering ✅ KLAR

**Mål:** Alla visuella värden i appen ska ha en motsvarande `--hb-*`-token.

- [x] Granska alla `*.css`-filer under `client/src/components/cards/`
- [x] Lista hårdkodade värden som saknar token
- [x] Komplettera `design-system.css` med saknade tokens
- [x] Definiera typografiskala som tokens
- [x] Definiera spacing-skala som tokens

### Inventeringsresultat

**Tokens tillagda i `design-system.css`:**
- `--hb-text-muted` / `--hb-text-faint` — två extra opacitetsnivåer för text
- `--hb-surface-1/2`, `--hb-surface-btn/hover/active`, `--hb-surface-input` — interaktiva ytor
- `--hb-divider` / `--hb-divider-strong` — avdelare och radgränser
- Typografiskala: `--hb-font-size-2xs` → `--hb-font-size-hero`, vikter thin→bold
- Spacing-skala: `--hb-space-1` (4px) → `--hb-space-10` (32px)
- Radius: `--hb-radius-sm/md/lg/pill`
- Motion: `--hb-ease`, `--hb-ease-spring`, `--hb-duration-fast/normal/slow`

**Kort-CSS-status efter inventering:**

| Fil | Status | Noteringar |
|-----|--------|-----------|
| `ClockCard.css` | ✅ Använder redan tokens | Referensexempel |
| `SwitchCard.css` | ⚠️ Delvis | Använder `--hb-accent` men har hårdkodade opaciteter |
| `LightCard.css` | ❌ Hårdkodat | `rgba(255,255,255,0.5)`, `rgba(255,255,255,0.2)` m.fl. |
| `ClimateCard.css` | ❌ Hårdkodat | Knappar, opaciteter |
| `SensorCard.css` | ❌ Hårdkodat | `rgba(255,255,255,0.4)` för unavailable |
| `CoverCard.css` | ❌ Hårdkodat | Track, knappar, `#ffd60a` för rörlig gardin |
| `MediaPlayerCard.css` | ❌ Hårdkodat | Progress, knappar, opaciteter |
| `PersonCard.css` | ❌ Hårdkodat | Avatar, status-färger (hardkodat `#34c759`) |
| `AlarmCard.css` | ⚠️ Delvis | Använder `--hb-card-radius`, men status-färger hårdkodade |
| `SceneCard.css` | ⚠️ Delvis | Har `--scene-color`, men opaciteter hårdkodade |
| `WeatherCard.css` | ❌ Hårdkodat | Opaciteter, divider |
| `BusDeparturesCard.css` | ❌ Hårdkodat | Många specifika färger (`#4cd964`, `#ffcc44`, `#ff6b6b`) |
| `CameraCard.css` | ❌ Hårdkodat | Labels, knappar |
| `GreetingCard.css` | ❌ Hårdkodat | Trivial, `#fff` direkt |
| `GaugeCard.css` | ❌ Hårdkodat | SVG fill-färger |

**Återkommande mönster att åtgärda i Fas 3:**
1. `rgba(255,255,255,0.X)` — ersätts med `--hb-text-*` eller `--hb-surface-*`
2. `#34c759` direkt → `var(--hb-status-on)`
3. `#ff3b30` direkt → `var(--hb-status-error)`
4. Knapp-mönster (background + border + hover + active) → `--hb-surface-btn-*`
5. Radavdelare `rgba(255,255,255,0.06)` → `var(--hb-divider)`

---

## Fas 2 — Dokumentationssida i appen ✅ KLAR

**Mål:** En `/design`-route som visar hela designsystemet live, tillgänglig i produktion.

- [x] Lägg till `/design`-route i `App.tsx`
- [x] Skapa `hassboard/client/src/pages/DesignSystemPage.tsx`
- [x] Skapa `hassboard/client/src/pages/DesignSystemPage.css`
- [x] Sektioner: Färger (text/ytor/status), Typografi, Spacing, Radier, Kortyta & Knappar, Motion
- [x] Länk i dashboardens header ("Design")

---

## Fas 3 — Migration av kortkomponenter ✅ KLAR

**Mål:** Noll hårdkodade visuella värden i kortkomponenterna.

- [x] Migrera `SensorCard.css`
- [x] Migrera `LightCard.css`
- [x] Migrera `ClimateCard.css`
- [x] Migrera `SwitchCard.css`
- [x] Migrera `MediaPlayerCard.css`
- [x] Migrera `CoverCard.css`
- [x] Migrera `PersonCard.css`
- [x] Migrera `SceneCard.css`
- [x] Migrera `AlarmCard.css`
- [x] Migrera `WeatherCard.css`
- [x] Migrera `BusDeparturesCard.css`
- [x] Migrera `ClockCard.css` (var redan klar)
- [x] Migrera `GreetingCard.css`
- [x] Migrera `CameraCard.css`
- [x] Migrera `GaugeCard.css`
- [ ] Ta bort backward-compat-aliaser i `globals.css` (`--color-text`, `--color-text-dim`, `--color-text-mid`) när alla kort bekräftats fungera

### Tokens tillagda under migrationen (inte förutsedda)

| Token | Värde | Varför |
|-------|-------|--------|
| `--hb-text-prominent` | rgba(255,255,255,0.80) | 0.75–0.85-intervallet saknades — används i knappar, aktiva etiketter |
| `--hb-surface-track` | rgba(255,255,255,0.20) | Slider/volym-tracks är inte knappar — behövde eget token |
| `--hb-status-caution` | #ffd60a | Gul "rör på sig"-färg (gardin, larm) — semantiskt annorlunda än warning |
| `--hb-status-on-rgb` | 52, 199, 89 | Behövdes för `rgba(var(--hb-status-on-rgb), 0.4)` i alarm-knapp |

### Medvetna undantag (behåller hårdkodade värden)

| Värde | Var | Motivering |
|-------|-----|-----------|
| `rgba(255,255,255,0.9)` | AlarmCard pin-ok knapp | Semi-vit bakgrund på "primär CTA"-knapp, specifik design |
| `#1a2744` | AlarmCard pin-ok text | Mörk temafärg som textfärg på vit knapp — behöver eget token om theming ska fungera |
| `rgba(255,255,255,0.75)` | CoverCard progress fill | Fill-färg, inte text — behöver eget `--hb-fill-*` token vid behov |
| `rgba(255,200,100,0.9)` | CoverCard stop-knapp | Specifik varningsgul för stopp — överväg `--hb-status-caution` vid refactor |
| `#ffcc44`, `#ff6b6b` | BusDeparturesCard | Transportspecifika färger — kandidater för egna `--hb-transport-*` tokens |
| `#4cd964` | BusDeparturesCard `.bus-now` | "Now"-text i grön färg utanför tokensystemet — **öppen bugg**, se nedan |
| `rgba(0,0,0,X)` | CameraCard overlay/shadow | Mörka overlays är strukturella, ej tematiserbara |

---

## Öppna todos

- [ ] **`BusDeparturesCard` — `.bus-now` färg** (`#4cd964`): "Now"-texten när en avgång är omedelbar har en hardkodad grön färg som inte finns i tokensystemet. Alternativ: mappa till `--hb-status-on` (#34c759, semantiskt rätt) eller skapa `--hb-transport-now` om man vill ha en distinkt transport-specifik grön.
- [ ] **Ta bort backward-compat-aliaser** i `globals.css` (`--color-text`, `--color-text-dim`, `--color-text-mid`) när alla kort bekräftats fungera utan dem.
- [ ] **`AlarmCard` pin-ok text** (`#1a2744`): Mörk temafärg som textfärg på vit knapp. Behöver eget token (t.ex. `--hb-page-bg-solid`) om full theming ska fungera.

---

## Fas 4 — Primitiva React-komponenter (valfri, gör vid behov)

**Mål:** Återanvändbara komponenter som alltid använder tokens.

Kandidater identifieras löpande. Bygg bara om mönstret upprepas 3+ ggr:
- `<CardLabel>` — det upprepade etikettmönstret (ikon + text, uppercase, dim-färg)
- `<StatusDot>` — on/off-indikator med korrekt status-färg
- `<ValueDisplay>` — stort värde + enhet + sub-text

---

## Principer

1. **Token-first** — Har du frestelse att skriva `rgba(255,255,255,0.55)`, leta efter en token istället.
2. **Inga komponentbibliotek** — Vi äger estetiken, externa bibliotek motarbetar glassmorphism-stilen.
3. **Dokumentationen lever i appen** — `/design`-sidan är sanningskällan, inte detta dokument.
4. **Migrera progressivt** — Inga big bang-refaktoreringar. Ny feature → använd tokens. Bugfix → migrera den filen.
5. **Engelska i UI** — All user-facing text i applikationen ska vara på engelska.
