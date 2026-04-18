# HassBoard — Masterplan

Modern, Apple-inspirerad dashboard-plattform för Home Assistant. Självhostad, körs i webbläsare på mobil, surfplatta (kiosk-mode) och desktop.

---

## Referensfiler

| Fil | Innehåll |
|---|---|
| [`HA_SERVER_REFERENCE.md`](HA_SERVER_REFERENCE.md) | HA-instansens URL, API-token, SSH, Samba, MQTT — kopiera till varje nytt projekt |
| [`ui-reference/`](ui-reference/) | Apple Weather-klon — visuell referens för glassmorfism, animationer, typografi |
| [`PLAN_PHASE1.md`](PLAN_PHASE1.md) | Fas 1: Fundament — server, SPA-skal, HA-anslutning, baskortet ✅ |
| [`PLAN_PHASE2.md`](PLAN_PHASE2.md) | Fas 2: Kortbibliotek — alla widget-typer, WebSocket realtid ✅ |
| [`PLAN_PHASE3.md`](PLAN_PHASE3.md) | Fas 3: Polish — drag-and-drop, animationer, kiosk-mode, screensaver |
| [`PLAN_PHASE4.md`](PLAN_PHASE4.md) | Fas 4: Extras — Smart Stack, Focus-lägen, command palette |
| [`PLAN_PLUGIN_FRAMEWORK.md`](PLAN_PLUGIN_FRAMEWORK.md) | Plugin Framework Sprint 1–5 (Sprint 1–3 ✅) |
| [`PLAN_UX.md`](PLAN_UX.md) | Nästa UX-iterationer — Redigera kort, Visningsläge |

---

## Arkitektur

```
┌─────────────────────────────────────────┐
│  Browser / Kiosk                        │
│  React SPA (grid, cards, settings)      │
└────────────────┬────────────────────────┘
                 │ HTTP + WebSocket
┌────────────────▼────────────────────────┐
│  HassBoard Server (Node.js + Fastify)   │
│  • Serverar SPA (statiska filer)        │
│  • REST API för dashboard-config        │
│  • Proxar HA REST API (döljer token)    │
│  • Vidarebefordrar HA WebSocket-events  │
│  • SQLite för layouts + inställningar   │
└────────────────┬────────────────────────┘
                 │ HA REST + WebSocket
┌────────────────▼────────────────────────┐
│  Home Assistant  (192.168.x.x:8123)   │
└─────────────────────────────────────────┘
```

**Viktigt:** Servern proxar alla HA-anrop. API-token lagras aldrig i frontend-koden.

---

## Tech Stack

| Lager | Val |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | CSS Modules + CSS custom properties (ingen CSS-in-JS) |
| Backend | Node.js 20 + Fastify |
| Databas | SQLite via `better-sqlite3` |
| Realtid | Native HA WebSocket API (`ws`-paketet) |
| Paketering | Kör som `node server.js` eller Docker |

---

## Designspråk — Apple-standard

Referera alltid till `ui-reference/` för konkreta exempel. Principerna:

**Typografi**
```
Hero-värde:    -apple-system "SF Pro Display", 80–96px, font-weight: 200
Kortetikett:   11px, font-weight: 600, letter-spacing: 0.8px, uppercase
Primärt värde: 34–40px, font-weight: 300
Brödtext:      13–16px, rgba(255,255,255,0.65)
```

**Material / Glassmorfism**
```css
--glass-bg:     rgba(255,255,255,0.14);
--glass-border: rgba(255,255,255,0.18);
--glass-blur:   blur(24px) saturate(1.6);
--radius-card:  20px;
```

**Animation — alltid spring, aldrig ease**
```css
transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
/* Staggerad in-animation: nth-card delay = n * 60ms */
```

**Bakgrund**
Bakgrunden bär färgen — korten är alltid transparenta glasskort ovanpå. Bakgrunden anpassas efter tid på dygnet (mörk natt, blå dag).

---

## Korttyper (komplett lista)

### Datakort (HA-entities)
- `sensor` — värde + enhet + sparkline (valfri)
- `gauge` — cirkulär mätare, konfigurerbart min/max
- `switch` — toggle med status-färg
- `light` — on/off + lysstyrka + färgtemperatur
- `cover` — öppna/stäng jalusi/gardin med procentindikator
- `climate` — termostat (target-temp upp/ner)
- `media_player` — nu spelas, play/pause/skip, volym
- `person` — hemma/borta med sista sedd-tid
- `camera` — MJPEG-ström
- `alarm_control_panel` — status + arma/disarma
- `history_graph` — linjediagram för valfri entity senaste N timmar

### Statiska/smarta kort
- `clock` — stor tid, anpassningsbar format
- `greeting` — "God morgon, Karl" baserat på tid
- `weather` — väder från HA `weather.*`-entity
- `scene` — knapp som aktiverar HA-scen
- `iframe` — inbäddad extern sida
- `markdown` — fri text

---

## Kortets storlekssystem

| Storlek | Grid-celler | Användning |
|---|---|---|
| `1×1` | 1 kol × 1 rad | Switch, enkel sensor |
| `2×1` | 2 kol × 1 rad | Sensor med graf, väder-summary |
| `2×2` | 2 kol × 2 rad | Climate, media player |
| `4×2` | 4 kol × 2 rad | Kamera, stor graf |

---

## Deployment

```bash
# Lokal start (development) — dubbelklicka start.cmd
# Öppnar två CMD-fönster: server (port 3001) + Vite (port 5173)
# Öppna sedan: http://localhost:5173

# Produktion Linux
node dist/server.js --port 3000 --data /opt/hassboard

# Produktion Windows
node dist\server.js --port 3000 --data C:\hassboard

# Docker
docker run -p 3000:3000 -v ./data:/data hassboard/hassboard

# Kiosk-mode URL
http://localhost:3000?kiosk=true
```

Konfigurations-UI nås via `http://localhost:3000/settings`.

---

## Fasöversikt

| Fas / Plan | Fokus | Status |
|---|---|---|
| [Fas 1](PLAN_PHASE1.md) | Server, SPA-skal, HA-anslutning, sensor + switch | **Klar** (2026-04-16) |
| [Fas 2](PLAN_PHASE2.md) | Alla 18 korttyper, WebSocket realtid, entity-browser, BusDeparturesCard | **Klar** (2026-04-16) |
| [Plugin Sprint 1–3](PLAN_PLUGIN_FRAMEWORK.md) | Card Registry, Integrationssystem, CoreContext/useCore | **Klar** (2026-04-16) |
| Plugin end-to-end (live test) | Bugfixar efter första riktiga test av plugin-flödet | **Klar** (2026-04-18) |
| Deployment | Hosting, server-setup, Docker vs Node.js | **Nästa** |
| [Plugin Sprint 4](PLAN_PLUGIN_FRAMEWORK.md) | Designsystem, CardShell, CARD_DEVELOPMENT.md | Ej påbörjad |
| [Fas 3](PLAN_PHASE3.md) | Drag-and-drop, animationer, kiosk, screensaver | Ej påbörjad |
| [Fas 4](PLAN_PHASE4.md) | Smart Stack, Focus-lägen, command palette | Ej påbörjad |
