# Fas 3 — Polish, Kiosk & Animationer

> **Förutsättningar:** Fas 1 + 2 klara (båda klara 2026-04-16). Alla korttyper fungerar.

**Mål:** Produktionskvalitet på känsla och rörelse. Kiosk-mode redo för surfplatta på vägg.

---

## 1. Drag-and-drop Layout-redigering

### Redigeringsläge
- Flytande **Edit-knapp** (låsikon) i nedre högra hörnet
- Klick → aktiverar redigeringsläge:
  - Befintliga kort får "wobble"-animation (som iOS hemskärm)
  - "×"-knapp visas i varje korts hörn
  - "⠿"-drag-handle visas
  - Tom cells lyser upp som drop-targets

### Drag-and-drop
- Implementera med [`@dnd-kit/core`](https://dndkit.com/) — fungerar på touch och mouse
- Kort snäpper till närmaste grid-cell vid drop
- Kollisionsdetektering förhindrar överlapp
- Storleksändring via resize-handle i kortets nedre högra hörn

### Spara layout
- Debounced auto-save (500ms efter senaste ändring) till `/api/config/layout`
- Visuell "Sparad"-bekräftelse (toast, försvinner efter 2s)

---

## 2. Animationssystem

### In-animation (staggerad, som i `ui-reference/`)
```css
.card-enter {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
.card-enter-active {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.8, 0.4, 1);
}
```
Varje kort får `animation-delay: n * 60ms` vid sidladdning.

### Värde-uppdatering
När ett kort tar emot ett nytt värde via WebSocket:
- Siffran "pingar" — kort `scale(1.04)` → `scale(1)` med spring-kurva
- Bakgrundsfärg blinkar subtilt (opacity-puls på en overlay)

### Kortpress (touch/click på kontrollkort)
```css
/* iOS-känsla */
.card:active { transform: scale(0.97); transition: transform 0.1s; }
```

### Sid-transition
Vid byte av dashboard: kort glider ut åt vänster/höger, nya kort glider in.

---

## 3. Adaptiv Bakgrund

Bakgrunden ändras baserat på tid och valfri sensor:

```ts
type BackgroundConfig = {
  mode: 'time-of-day' | 'entity' | 'static'
  entity?: string       // t.ex. 'sensor.outdoor_lux' eller 'weather.home'
  staticColor?: string
}
```

**Time-of-day gradients:**
```
05:00–07:00  Gryning: #FF6B35 → #FFB347 → #87CEEB
07:00–17:00  Dag:     #1a6ec8 → #2e8eea → #63c0f5   (som ui-reference)
17:00–20:00  Kväll:   #FF6B6B → #4ECDC4 → #1a1a2e
20:00–05:00  Natt:    #0b1426 → #1a2744 → #0d2137
```

Smooth crossfade med dual-layer (identiskt med `ui-reference/` implementationen — `bg-a`/`bg-b`).

---

## 4. Kiosk-mode

### Aktivering
```
URL: http://hassboard/?kiosk=true
```

### Beteende i kiosk-mode
- Ingen Edit-knapp, ingen Settings-länk
- Ingen browser-chrome (appellen sköts via Chrome `--kiosk` flag)
- Touch-events aktiverar inte text-selection
- `user-select: none` globalt
- Förhindrar accidentell zoom: `touch-action: manipulation`

### Kiosk-setup för surfplatta (Android Chrome)
```bash
# Starta Chrome i kiosk
/usr/bin/google-chrome --kiosk --noerrdialogs --disable-infobars \
  --disable-session-crashed-bubble \
  http://192.168.68.55:3000?kiosk=true
```

Dokumenteras i README.

---

## 5. Screensaver / Standby-läge

Aktiveras efter konfigurerad inaktivitetstid (standard: 5 min i kiosk-mode, av annars).

### Screensaver-vy
- Svart bakgrund fadear in (opacity 0 → 1 över 2s)
- Centrerad stor klocka: `HH:MM` i `font-size: 96px, font-weight: 200`
- Datum under: `"Tisdag 15 april"`
- Valfri sensor-data i liten text nedanför (t.ex. innetemperatur)
- Klockan rör sig sakta runt skärmen (bouncing DVD-stil, men subtilt — 20px/5s)

### Väckning
- Varje touch/klick på skärmen stänger screensavern
- Inga accidentella actions — första touch stänger bara screensavern

```ts
let idleTimer: ReturnType<typeof setTimeout>

function resetIdleTimer() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(activateScreensaver, IDLE_TIMEOUT_MS)
}

document.addEventListener('touchstart', resetIdleTimer)
document.addEventListener('mousemove', resetIdleTimer)
document.addEventListener('keydown', resetIdleTimer)
```

---

## 6. Anslutnings-indikator

Diskret prick i dashboardens övre högra hörn:
- 🟢 Grön puls: WebSocket ansluten, data flödar
- 🟡 Gul: Ansluten men ingen data senaste 60s
- 🔴 Röd puls: WebSocket frånkopplad, försöker återansluta
- Hover/tap visar tooltip med detaljer

---

## 7. Error-hantering & Offline-mode

- Kort visar senast kända värde vid WS-disconnect
- Lätt "inaktuellt"-overlay (opacity-reducerat + liten klock-ikon) om värde är > 5 min gammalt
- Toast-notis vid reconnect: "Återansluten"
- Aldrig en tom/kraschad vy — alltid graceful degradation

---

## 8. Responsivitet

```css
/* Grid-kolumner per breakpoint */
@media (min-width: 1200px) { --grid-cols: 12; }
@media (min-width: 768px)  { --grid-cols: 8; }
@media (max-width: 767px)  { --grid-cols: 4; }
```

Kortstorlekarna skalas proportionellt. På mobil (4 kol) tar ett `2×1`-kort hela bredden.

Safe area insets för iPhone/iPad notch:
```css
padding-bottom: env(safe-area-inset-bottom, 0);
```

---

## 9. Tema — Mörkt / Ljust

Mörkt är default (Apple Weather-stil med mörk bakgrund).

Ljust tema:
```css
[data-theme='light'] {
  --glass-bg: rgba(0,0,0,0.08);
  --glass-border: rgba(0,0,0,0.12);
  color: #1c1c1e;
}
```

Tema-val sparas i SQLite under `settings.theme`.

---

## Definition of Done — Fas 3

- [ ] Drag-and-drop fungerar på mouse + touch
- [ ] Kortstorlek kan ändras via resize-handle
- [ ] Layout sparas automatiskt
- [ ] In-animation med stagger vid sidladdning
- [ ] Värde-ping-animation vid WebSocket-uppdatering
- [ ] Adaptiv bakgrund ändras vid tid-på-dygnet
- [ ] Kiosk-mode (`?kiosk=true`) döljer all UI-chrome
- [ ] Screensaver aktiveras efter 5 min inaktivitet i kiosk-mode
- [ ] Anslutnings-indikator visar WS-status
- [ ] Responsivt layout (mobil, tablet, desktop)
- [ ] Ljust tema fungerar
