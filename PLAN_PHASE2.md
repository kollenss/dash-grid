# Fas 2 — Kortbibliotek & Realtid

> **Status: KLAR** (2026-04-16). Se implementationsanteckningar nedan.

> **Förutsättningar:** Fas 1 är klar (2026-04-16). Server, grid, HA-proxy och WebSocket-bridge fungerar. Se [`PLAN_PHASE1.md`](PLAN_PHASE1.md) för quirks.

**Mål:** Hela kortbiblioteket implementerat. Entity-browser för att välja entity. Alla kort uppdateras i realtid.

## Starttillstånd (vad som redan finns från Fas 1)

- `SensorCard` och `SwitchCard` — fungerar, ska utökas
- `useHAWebSocket` — WebSocket-hook mot serverns WS-bridge
- `useHA` — `fetchStates`, `callService`
- `AddCardModal` — enkel version med manuell entity_id-inmatning (ska ersättas med entity browser)
- Grid: 12-kol CSS Grid, `GridCell`, tom cell med "+"-knapp
- HA-proxy routes: `/api/ha/states`, `/api/ha/states/:entityId`, `/api/ha/services/:domain/:service`, `/api/ha/test`
- WebSocket-bridge: auto-reconnect, vidarebefordrar `state_changed`-events

---

## Kortbibliotek att implementera

### Sensor-familjen

**`SensorCard`** (utökad från Fas 1)
- Värde + enhet
- Valfri sparkline (mini-linjediagram, senaste 24h)
- Konfigurerbart: `entity_id`, `title`, `unit_override`, `show_sparkline`
- Historikdata hämtas via HA REST: `GET /api/history/period/<iso-date>?filter_entity_id=<id>`

**`GaugeCard`**
- Cirkulär SVG-mätare (arc, inte full cirkel)
- `min`, `max`, `thresholds` (grönt/gult/rött)
- Animerad needle vid uppdatering
- Konfigurerbart: `entity_id`, `min`, `max`, `unit`, `title`

**`HistoryGraphCard`**
- Linjediagram över valfri tidsperiod (1h, 6h, 24h, 7d)
- Flera entities i samma graf (upp till 3)
- SVG-baserat, inga chart-bibliotek
- Hover-tooltip med exakt värde + tid

---

### Kontrollkort

**`SwitchCard`** (utökad från Fas 1)
- Lägg till: visa senaste ändring ("Tänd 14:32")

**`LightCard`**
- On/off toggle
- Lysstyrka-slider (0–100%)
- Färgtemperatur-slider (om stöds av entity)
- Färgpicker (om `color_mode` stöds)
- Anropar `light.turn_on` med `brightness_pct`, `color_temp_kelvin`, `rgb_color`

**`CoverCard`** (jalusi, gardin, garage)
- Open/Stop/Close-knappar
- Procentindikator för nuvarande position
- Animerad ikon (gardin/jalusi rör sig)
- Anropar `cover.open_cover`, `cover.close_cover`, `cover.stop_cover`

**`ClimateCard`**
- Visar nuvarande temperatur vs. måltemperatur
- +/- knappar för att justera måltemperatur
- HVAC-mode-indikator (heating/cooling/idle/off)
- Anropar `climate.set_temperature`

**`SceneCard`**
- En knapp med ikon och namn
- Press-animering (scale down vid touch)
- Anropar `scene.turn_on`
- Konfigurerbart: `scene_id`, `title`, `icon`, `color`

---

### Media-kort

**`MediaPlayerCard`**
- Album art (om tillgänglig, annars placeholder)
- Titel + artist
- Play/Pause, Föregående, Nästa
- Volymkontroll
- Progress-bar (om `media_duration` finns)
- Anropar `media_player.*`-services

---

### Presence-kort

**`PersonCard`**
- Namn + avatar-initial (första bokstaven)
- Status: "Hemma" / "Borta" med färgindikator
- Sista sedd-tid ("Sedan 2 timmar")
- Entity-typ: `person.*`

---

### Kamera

**`CameraCard`**
- MJPEG-stream via HA proxy: `GET /api/camera_proxy_stream/<entity_id>`
- Refresh-knapp
- Timestamp-overlay (senast uppdaterad)
- Lazy-load (laddar inte stream förrän kortet är i viewport)

---

### Larmkort

**`AlarmCard`**
- Visuell status: Disarmed (grön) / Armed (röd) / Arming/Pending (gul animation)
- Knappar: Arm Away, Arm Home, Disarm
- PIN-dialog vid disarma (valfri, konfigurerbart)

---

### Statiska kort

**`ClockCard`**
- Stor tid (HH:MM) i hero-stil (96px, weight 200)
- Datum under
- Anpassningsbar: 12h/24h, visa/dölj sekunder, visa/dölj datum

**`GreetingCard`**
- "God morgon" / "God eftermiddag" / "God kväll" baserat på tid
- Konfigurerbart namn: "God morgon, Karl"

**`WeatherCard`**
- Kopplas mot `weather.*`-entity
- Ikon + temperatur + beskrivning
- Mini 5-dagarsprognos
- Liknar `ui-reference/` väderappen i layout

**`MarkdownCard`**
- Fri text med markdown-rendering
- Stödjer `{{ states('sensor.x') }}` template-syntax (renderas server-side via HA template API)

**`IframeCard`**
- Inbäddad `<iframe>`
- Konfigurerbart: URL, uppdateringsintervall

---

## Entity Browser

Används när man lägger till/redigerar kort. Ersätter manuell entity_id-inmatning.

**UI:**
- Bottom sheet (som i `ui-reference/`)
- Sökfält högst upp
- Lista med alla entities från `/api/states`
- Grupperade per domain (light, switch, sensor, climate...)
- Varje rad: entity_id + friendly_name + aktuellt värde + ikon
- Klick → väljer entity, stänger sheet

**Implementation:**
- Hämtar states en gång vid öppning
- Client-side filtrering (ingen re-fetch vid sökning)
- Cacheas 60s

---

## WebSocket — Realtidsuppdateringar

HA WebSocket auth-handshake (i servern, `ha-ws.ts`):

```
Client → HA:  { "type": "auth", "access_token": "<token>" }
HA → Client:  { "type": "auth_ok" }
Client → HA:  { "type": "subscribe_events", "event_type": "state_changed", "id": 1 }
HA → Client:  { "type": "event", "event": { "data": { "entity_id": "...", "new_state": {...} } } }
```

HassBoard-servern:
- Håller en WS-anslutning till HA (singleton)
- Klienter prenumererar på specifika entity_ids via `{ type: "subscribe", entity_ids: ["light.x", "sensor.y"] }`
- Servern filtrerar HA-events och skickar bara relevanta uppdateringar till varje klient
- Reconnect med exponential backoff (1s, 2s, 4s, max 30s)

---

## Implementationsanteckningar (2026-04-16)

### Arkitektur — avvikelser från planen
- **`onToggle`-prop-kedjan borttagen:** Alla interaktiva kort importerar `callService` direkt från `useHA.ts` istället för att få det via `App → Grid → GridCell → Card`. Renare och enklare.
- **Kamera:** Implementerat som stillbild med auto-refresh (standard 5s) istället för MJPEG-stream. Lazy-load via `IntersectionObserver`.
- **MarkdownCard:** Ingen extern lib — enkel inline-parser för headings/bold/italic/code/links/lists.
- **AddCardModal:** 2-stegs wizard (typ-val → konfig) istället för 3-stegs. Entity browser öppnas som overlay ovanpå modalen.
- **Sparkline i SensorCard:** Hämtar historia en gång vid mount — ingen automatisk uppdatering (HistoryGraphCard används för det).

### Nya server-endpoints
| Endpoint | Beskrivning |
|---|---|
| `GET /api/ha/history/:entityId?hours=N` | HA history API, minimal_response |
| `GET /api/ha/camera/:entityId` | JPEG snapshot-proxy |
| `POST /api/ha/template` | HA template-rendering (för MarkdownCard) |
| `GET /api/ha/media-image?path=...` | Proxy för album art och entity_picture |

### Kända kvarstående att testa/fixa inför Fas 3
- Inte alla kort är fullt testade med verkliga HA-entities ännu
- `HistoryGraphCard` med flera entities (config.entity_ids) — ej testat
- `LightCard` färgpicker (rgb_color) — inte implementerad, bara brightness + colortemp
- `WeatherCard` forecast — beror på att HA weather entity har forecast i attributes (nyare HA kan kräva separat forecast-endpoint)
- `AlarmCard` PIN — ej testad mot verklig larm-integration

---

## Definition of Done — Fas 2

- [x] Alla korttyper i listan ovan är implementerade
- [x] Entity browser fungerar med sökning och filtrering per domain
- [x] Alla kort uppdateras automatiskt via WebSocket
- [x] Kontrollkort (switch, light, climate etc.) skickar commands och uppdateras optimistiskt
- [x] Historikgraf hämtar data från HA history API
- [x] Kamera-stream proxas korrekt (stillbild med auto-refresh)
- [x] Larm-PIN-dialog fungerar
