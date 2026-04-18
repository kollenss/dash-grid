# HassBoard — UX-iterationer

> Redigera befintliga kort och ett renodlat visningsläge för kiosk/surfplatta.

---

## Feature 1 — Redigera kort (Edit Mode)

### Designbeslut
- All interaktion med kort sker via modal — inga lösa knappar på korten.
- Klick/tap var som helst på kortet öppnar modal (transparent overlay, ej hover-beroende).
- Borttagning sker enbart via modalen.
- Storleksändring via drag-to-resize i griden **och** via fält i modalen.
- Korttypen är låst vid redigering.
- Live-förhandsgranskning renderar kortkomponenten med `useCore()` state.
- Integrationskontroll visas som banner i modalens topp.

### Kortkomponenternas interaktivitet
Korten renderas alltid normalt. Edit-overlayen i GridCell lägger sig ovanpå och absorberar all interaktion. I visningsläge är overlayen borta och korten är fullt interaktiva. Inga ändringar behövs i enskilda kortkomponenter.

---

### ✅ 1.5 — Drag-to-resize
Grip-handle i nedre högra hörnet. Pointer events med `setPointerCapture`. Scale-kompensation: `delta / scale / (CELL_W + GAP)`. Snäpper till gridceller. Ghost-outline (`.is-resizing`) under drag. Sparar via `PUT /api/cards/:id` på pointerup.

**Berörda filer:** `GridCell.tsx`, `GridCell.css`, `Grid.tsx`, `App.tsx`

---

### ✅ 1.6 — Drag-to-move
Håll och dra kortet till ny position. Threshold-baserat (10px) — kort tap öppnar modal, längre rörelse → drag. Grab-offset beräknas från var i kortet man tryckte. Kortet rör sig live till målcellen. Rött sken vid ogiltiga positioner (överlapp/utanför grid). Snappar tillbaka om drop är ogiltigt.

**Berörda filer:** `GridCell.tsx`, `GridCell.css`, `Grid.tsx`, `App.tsx`

**Arkitektur:**
- Drag-state lever i `Grid` (behöver alla kort för kollisionsdetektering).
- `GridCell` detekterar threshold → anropar `onDragStart/Move/End`.
- `latestDrag` ref i Grid för synkron access i `handleDragEnd` (undviker async state-problem).
- `clientToCell(clientX, clientY)`: konverterar via `gridRef.getBoundingClientRect()` + scale + padding.
- Occupied-set beräknas från drag-målposition under pågående drag.

---

### ✅ 1.1 — Click-to-edit overlay
Transparent `.hb-edit-overlay` (inset: 0, z-index: 10, touch-action: none) på varje kort. Kombinerad med drag-detection: tap (< 10px rörelse) → `onEdit`, drag → flytta. Cursor: `grab` / `grabbing`.

**Berörda filer:** `GridCell.tsx`, `GridCell.css`

---

### ✅ 1.2 — Edit-modal (refaktoriserad AddCardModal)
Union-typ `AddProps | EditProps`. I edit-läge: direkt till steg 2, state lazy-initialiserat från `initialCard`, bakåt-knapp dold. Delete med 3-sekunders bekräftelse (knappen byter text, ingen extra modal). Separata `addModal` / `editModal` states i App.

**Berörda filer:** `AddCardModal.tsx`, `App.tsx`, `Grid.tsx`, `AddCardModal.css`

---

### ✅ 1.3 — Live-förhandsgranskning
Renderar kortkomponenten med live `liveConfig` (byggt från formulärfälten) och `haState` från `useCore()`. Skala beräknas dynamiskt: `min(PREVIEW_MAX_W / cardW, PREVIEW_MAX_H / cardH, 1.0)`. Preview uppdateras utan extra state eller effects — reaktiv härledning.

**Buggfix:** HA-kort kraschade när `entity_id` saknades vid preview. Fix: platshållare ("Select an entity to preview") när `needsEntity && !entityId`. Säkerhetsnät: `PreviewBoundary` (class-based error boundary, nyckelad på `type + entityId`).

**Berörda filer:** `AddCardModal.tsx`, `AddCardModal.css`

---

### ✅ 1.4 — Integrationskontroll i modalen

**Vad:** Banner i modalens topp när kortets krävda integrationer saknar konfiguration. Länk navigerar till `/settings`.

**Utility** (`client/src/utils/checkIntegrations.ts`):
```ts
export function getMissingIntegrations(
  def: CardDefinition,
  integrations: Record<string, string>
): { id: string; label: string }[] {
  if (!def.integrations) return []
  return def.integrations.filter(intDef => {
    const keys = intDef.fields ? intDef.fields.map(f => f.key) : [intDef.id]
    return keys.some(k => !integrations[k])
  }).map(intDef => ({ id: intDef.id, label: intDef.label }))
}
```

**Banner i AddCardModal:**
```tsx
const { integrations } = useCore()
const missing = selected ? getMissingIntegrations(selected, integrations) : []

{missing.length > 0 && (
  <div className="modal-integration-warning">
    ⚠️ Requires configuration: {missing.map(i => i.label).join(', ')}
    <Link to="/settings" onClick={props.onClose}>Go to Settings →</Link>
  </div>
)}
```

Visas ovanför previewen (eller ovanför formulärfälten om ingen preview finns).

**Berörda filer:**
| Fil | Förändring |
|---|---|
| `client/src/utils/checkIntegrations.ts` | Ny utility-fil |
| `AddCardModal.tsx` | Importera utility + `useCore().integrations`, rendera banner |
| `AddCardModal.css` | `.modal-integration-warning` — gul/orange varningsstil |

**Definition of Done:**
- [x] Banner syns när HA URL/token saknas och kortet kräver HA
- [x] Banner syns när Västtrafik-token saknas och kortet är BusDepartures
- [x] Länk stänger modal och navigerar till /settings
- [x] Inget visas när allt är konfigurerat
- [x] `tsc --noEmit` 0 fel

---

## Feature 2 — Visningsläge (View Mode)

### Mål
Renodlat läge utan redigeringskontroller: inga +-celler, inga resize-handles, inga edit-overlays. Kiosk/surfplatta-vänligt. I visningsläge är korten fullt interaktiva (LightCard toggle, sliders etc. fungerar).

### Designbeslut
- Toggle-knapp i headern: **Edit** / **Done** (inga emojis, ej hover-beroende).
- Standardläge vid start: **visningsläge** (rent).
- State sparas i `localStorage` (`hb_edit_mode`).
- URL-parameter `?edit=true` låser upp edit-läge direkt (för setup).

### Implementation

**`App.tsx`:**
```tsx
const [editMode, setEditMode] = useState<boolean>(() => {
  if (new URLSearchParams(location.search).get('edit') === 'true') return true
  return localStorage.getItem('hb_edit_mode') === 'true'
})
function toggleEditMode() {
  setEditMode(prev => {
    localStorage.setItem('hb_edit_mode', String(!prev))
    return !prev
  })
}
// I header — bredvid Settings-länken:
<button className="header-link" onClick={toggleEditMode}>
  {editMode ? 'Done' : 'Edit'}
</button>
```

**`Grid.tsx`** — ny prop `editMode: boolean`:
- +-celler renderas bara om `editMode`
- Skickas ned till GridCell

**`GridCell.tsx`** — ny prop `editMode: boolean`:
- `.hb-edit-overlay` renderas bara om `editMode`
- `.hb-resize-handle` renderas bara om `editMode`
- I visningsläge: korten är klickbara/interaktiva som vanligt

**Berörda filer:**
| Fil | Förändring |
|---|---|
| `App.tsx` | `editMode` state, toggle i header, skicka prop till Grid |
| `Grid.tsx` | `editMode` prop, villkorlig rendering av +-celler |
| `GridCell.tsx` | `editMode` prop, villkorlig rendering av overlay + resize-handle |

**Definition of Done:**
- [ ] Visningsläge är default vid start
- [ ] Edit / Done-knapp i header togglar läget
- [ ] I edit-läge: overlay, resize-handle, +-celler syns
- [ ] I visningsläge: inga redigeringskontroller, korten är interaktiva
- [ ] `localStorage` minns valt läge
- [ ] `?edit=true` i URL aktiverar edit-läge
- [ ] `tsc --noEmit` 0 fel

---

## Återstår att implementera

Feature 2 är nedprioriterad — användaren föredrar att edit-läge INTE sparas mellan sidladdningar (aktivt val varje gång). localStorage + URL-param behövs ej.
