# Fas 4 — Smart Features & UX-extras

> **Förutsättningar:** Fas 1–3 klara. Appen är produktionsklar och stabil.

**Mål:** Apple-nivå intelligent beteende. Power-user-funktioner.

---

## 1. Smart Stack — Automatisk kortrotation

Ett kort kan konfigureras som en "Smart Stack" — roterar automatiskt mellan flera vyer baserat på regler.

### Exempel
```json
{
  "type": "smart_stack",
  "rotation_interval": 10,
  "views": [
    { "show_when": "time >= 06:00 AND time < 09:00", "card": "EnergyCard" },
    { "show_when": "time >= 09:00 AND time < 17:00", "card": "WeatherCard" },
    { "show_when": "always", "card": "ClockCard" }
  ]
}
```

### Regler som stöds
- `time >= HH:MM AND time < HH:MM`
- `entity_state('sensor.x') > value`
- `entity_state('person.karl') == 'home'`
- `always` (fallback)

### UI
- Liten dot-indikator (som iOS-app-switcher) under kortet visar hur många vyer som finns
- Swipe vänster/höger för att manuellt bläddra
- Automatisk rotation återupptas 30s efter manuell bläddring

---

## 2. Focus-lägen / Dashboard-profiler

Olika dashboards aktiveras automatiskt baserat på tid, person, eller HA-tillstånd.

### Konfiguration
```json
{
  "focus_rules": [
    { "activate": "morning",  "when": "time >= 06:00 AND time < 09:00" },
    { "activate": "work",     "when": "person.karl == 'not_home'" },
    { "activate": "evening",  "when": "time >= 20:00" },
    { "activate": "default",  "when": "always" }
  ]
}
```

Där `morning`, `work`, `evening` etc. är namn på sparade dashboards.

### HA-automation-integration
HassBoard exponerar en webhook: `POST /api/activate-dashboard/:name`  
→ En HA-automation kan aktivera ett specifikt dashboard baserat på triggers.

---

## 3. Command Palette (⌘K)

Öppnas med `Ctrl+K` / `Cmd+K` eller sök-ikon i toppen.

**Vad man kan göra:**
- Sök och navigera till dashboard: "Gå till Kök"
- Aktivera scen: "Aktivera Filmkväll"
- Slå av/på: "Tänd vardagsrumslampan"
- Öppna inställningar: "Inställningar"
- Söka entity och se aktuellt värde direkt i paletten

**Implementation:**
- Fuzzy-sökning med [`fuse.js`](https://fusejs.io/) mot alla entities + dashboards + scenes
- Tangentbordsnavigation (↑↓ för val, Enter för action, Esc för stäng)
- Glasmorfism-panel centrerat på skärmen (likt Spotlight)

---

## 4. Haptic Feedback (Touch-enheter)

Subtil vibration via `navigator.vibrate()`:

```ts
const haptic = {
  light:   () => navigator.vibrate?.(10),   // toggle switch
  medium:  () => navigator.vibrate?.(25),   // confirm action
  success: () => navigator.vibrate?.([10, 50, 10]), // scene aktiverad
  error:   () => navigator.vibrate?.([25, 50, 25])  // fel
}
```

---

## 5. Dashboard-delning & Export

**Export:**  
`GET /api/export` → JSON-fil med komplett dashboard-konfiguration (utan token/credentials).

**Import:**  
`POST /api/import` → Laddar upp JSON, ersätter eller lägger till dashboards.

**Användningsfall:**
- Dela sin dashboard-layout med andra HassBoard-användare
- Backup inför uppdatering

---

## 6. Notifikationer / Alerts

Möjlighet att konfigurera ett kort (eller global overlay) som visar HA-notifikationer.

**Persistenta alerts:**
- `input_boolean` eller `binary_sensor` med `device_class: problem`
- Visas som en diskret banner högst upp: "Rörelsedetektor i källaren aktiv"
- Konfigurerbart: vilka entity_ids som ska generera alerts

**Toast-notiser:**
- HA kan trigga via webhook: `POST /api/notify` `{ "message": "...", "level": "info|warning|error" }`
- Visas som en toast (likt `ui-reference/` error-toast men mer prominent)

---

## 7. Multi-server Support

Möjlighet att konfigurera flera HA-instanser och blanda entities från olika servrar.

```json
{
  "servers": [
    { "id": "home", "url": "http://192.168.x.x:8123", "token": "..." },
    { "id": "cabin", "url": "https://stuga.ha.cloud", "token": "..." }
  ]
}
```

Varje kort specificerar `server_id`. Servern håller separata WebSocket-anslutningar.

---

## 8. PWA — Progressive Web App

Lägg till `manifest.json` och service worker för:
- "Lägg till på hemskärmen" (iOS + Android)
- App-ikon
- Offline-splash-skärm (visar senast cachade data)
- Fullscreen-läge på mobil (utan URL-bar)

```json
{
  "name": "HassBoard",
  "display": "standalone",
  "background_color": "#0b1426",
  "theme_color": "#0b1426",
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512" }]
}
```

---

## Definition of Done — Fas 4

- [ ] Smart Stack roterar kort baserat på tidsregler
- [ ] Manuell swipe på Smart Stack fungerar
- [ ] Focus-lägen aktiverar dashboard baserat på tid
- [ ] HA-webhook kan trigga dashboard-byte
- [ ] Command palette öppnas med ⌘K
- [ ] Fuzzy-sökning i command palette fungerar mot entities + scener
- [ ] Haptic feedback på toggle och knappar (iOS/Android)
- [ ] Export/import av dashboard-konfiguration
- [ ] Alert-banner för konfigurerade entities
- [ ] PWA manifest + ikon (kan läggas till hemskärmen)
