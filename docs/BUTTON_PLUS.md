# Button+ Card — Developer Reference

Built-in card (`type: "button_plus"`). A universal entity card that combines
status display, sparkline history, drag-to-adjust slider, and animated icons
into one adaptive component.

---

## Files

| File | Role |
|---|---|
| `client/src/components/cards/ButtonPlusCard.tsx` | Main component + all pure helpers |
| `client/src/components/cards/ButtonPlusCard.css` | Layout, animations, CSS variables |
| `client/src/lib/mdiIcons.tsx` | MDI icon SVG component + domain→icon/color lookup |
| `client/src/components/cards/index.tsx` | Registration + `ButtonPlusConfigUI` |

---

## Config options

```ts
interface Config {
  entity_id:      string   // Required. Any HA entity.
  title?:         string   // Override friendly_name
  icon?:          string   // e.g. 'mdi:fan'. Auto-detected from domain if omitted.
  show_histogram?: boolean // Default: true. Sparkline background.
  history_hours?:  number  // 1 | 6 | 24 | 168. Default: 6.
  show_slider?:    boolean // Default: true. Hides slider even if domain supports it.
  accent_color?:   string  // CSS color override. Auto from domain if omitted.
}
```

---

## Domain support matrix

| Domain | Tap | Drag slider | Slider attribute | Animations |
|---|---|---|---|---|
| `light` | toggle on/off | brightness (1–100 %) | `brightness_pct` | glow pulse when on |
| `switch` / `input_boolean` | toggle on/off | — | — | — |
| `fan` | toggle on/off | speed (0–100 %) | `percentage` | spin when on |
| `media_player` | power on/off | volume (0–100 %) | `volume_level` (only if `SUPPORT_VOLUME_SET` flag) | pulse when playing |
| `climate` | toggle on/off | target temp (min_temp–max_temp, step 0.5) | `temperature` | — |
| `cover` | open/close | position (0–100 %) | `current_position` | — |
| `lock` | lock/unlock | — | — | — |
| `vacuum` | start/return | — | — | — |
| `remote` | turn on/off | — | — | — |
| `sensor` / `binary_sensor` | nothing (read-only) | — | — | float (weather) |
| `input_number` / `number` | nothing | value (min–max from attrs) | `value` | — |
| `weather` | nothing (read-only) | — | — | float |

**Media player play/pause overlay button** appears only when:
- state is `playing` or `paused`
- AND `supported_features` bitmask includes `SUPPORT_PAUSE (1)` OR `SUPPORT_PLAY (16384)`

**Slider hidden when:**
- `show_slider: false` in config
- Domain has no slider definition (e.g. `switch`, `sensor`)
- `media_player` without `SUPPORT_VOLUME_SET (4)` flag
- `light` where all `supported_color_modes` are `'onoff'` (and no `brightness` attr)
- `fan` without `percentage` attribute AND not in `on` state

---

## Visual layers (render order, back to front)

```
1. glass-card base          — frosted glass, border, border-radius
2. .bp-fill-bg              — gradient fill (abs inset:0), driven by --bp-fill-pct
3. .bp-spark-bg (SVG)       — sparkline wave (abs inset:0), lower 58% of height
4. .bp-content              — icon bubble + name + state label + play/pause button
5. .bp-cursor               — scrubber dot + label (appears during drag)
6. .bp-ripple               — tap ripple animation
```

---

## Key CSS variables (set as inline style on card root)

| Variable | Type | Drives |
|---|---|---|
| `--bp-accent` | CSS color | icon color, glow color, sparkline color, fill color |
| `--bp-intensity` | 0.0–1.0 | card `box-shadow` spread, icon bubble glow, fill opacity |
| `--bp-fill-pct` | 0%–100% | gradient fill cutoff point |

`--bp-intensity` = `fillPct / 100`, where `fillPct` is:
- If `hasSlider`: `(sliderVal - sliderMin) / (sliderMax - sliderMin) * 100`
- Else: `100` when on, `0` when off

---

## Gradient fill design

```css
linear-gradient(
  to right,
  transparent 0%,
  color-mix(in srgb, accent 28%, transparent) var(--bp-fill-pct),
  transparent var(--bp-fill-pct)
)
```

The fill always fades in from the left edge (never opaque at x=0) and cuts
sharply to transparent at the fill point. This means a light at 50% brightness
fills the left half of the card with an accent-tinted gradient, stronger at 50%
and near-invisible at 0%.

---

## Sparkline pipeline

```
/api/ha/history/{entityId}?hours=N
  → raw HistoryPoint[] {t: ms, v: number}
  → downsample to 80 points (perf)
  → toSvgPoints()         maps t/v → x/y, wave sits in lower 58% of card height
  → resampleEvenly(300)   normalises point density (removes clustering artifacts)
  → gaussianSmooth(σ=4)   "Crisp" smoothing, same as HistoryGraphCard
  → SVG path (L segments)
```

The 300 smoothed points are also cached in `smoothedPtsRef` for O(1) cursor
Y-lookup during drag: `idx = round(xFrac * 299)`.

---

## Drag / pointer interaction

```
onPointerDown  → capture pointer, record startX
onPointerMove  → if |dx| > 6px: mark as drag
                  if hasSlider: applySlider(xFrac * range + min)
                  if showHistogram: setCursor({x, y=sparkY, label=histVal})
onPointerUp    → clear cursor
                  if drag + hasSlider: force-flush final value to HA
                  if tap + controllable domain: toggle entity
onPointerCancel → same as pointerUp
```

**Slider throttle:** `callService` is suppressed if `now - lastSentAt < 150 ms`.
On release, a final flush is always sent if `now - lastSentAt > 50 ms` (prevents
double-send if throttle fired just before release).

**Tap vs drag threshold:** `Math.abs(dx) > 6px` before drag mode activates.
Below that, pointer-up is treated as a tap.

---

## Scrubber cursor

The cursor dot appears on any card with `show_histogram: true`, regardless of
whether the entity has a slider. It shows the **historical sensor value** at the
dragged time position, interpolated from raw history points (not from the
smoothed SVG path, to preserve accuracy).

Label format: `value.toFixed(1) + '\u202f' + unit` (narrow no-break space before unit).

Label flips below the dot when `cursor.y < sparkSize.h * 0.3` to avoid
clipping at the top of the card.

---

## Icon system (`client/src/lib/mdiIcons.tsx`)

- `MdiIcon` — renders a single `<svg>` with path from `@mdi/js`
- `getDomainIcon(domain, state?)` — returns `'mdi:xxx'` string based on domain + current state
- `getDomainColor(domain)` — returns hex accent color
- `DOMAIN_COLORS` — exported record, can be imported anywhere

~80 icons included. To add more:
1. Import from `@mdi/js` (check existence with `node -e "const m=require('@mdi/js'); console.log('mdiXxx' in m)"`)
2. Add to the `PATHS` map
3. Add to `getDomainIcon` switch if it should be a domain default

---

## State label formatting

`makeStateLabel()` per domain:

| Domain | Format |
|---|---|
| `light` | `"On · 75%"` / `"Off"` |
| `fan` | `"On · 33%"` / `"Off"` |
| `media_player` | `"Song title · 45%"` or `"Playing"` |
| `climate` | `"21° → 22°"` (current → target) |
| `cover` | `"45%"` (position) |
| `sensor` / `number` | `"3.5 m/s"` (1 decimal + unit) |
| default | capitalised state string |

---

## Ambient animation

The sparkline background animates when `show_histogram: true` and the entity's unit matches a known theme:

| Unit | Theme | Visual |
|---|---|---|
| `W`, `kW` | `electricity` | Blue-white glow + flowing dashed stroke + bright spark |
| `m/s`, `mph`, `km/h` | `wind` | Particle streaks following the sparkline path |
| `device_class: battery` or `%` + `batt` in entity id | `battery` | Charging / draining pulse, colour shifts with level |

Animation speed scales with the live sensor value. Formula for electricity:

```
duration = max(0.5s, 20 / (1 + val / 30))
```

Representative values:

| Watts | Duration |
|---|---|
| 50 W | ~8.6 s |
| 130 W | ~3.8 s |
| 300 W | ~1.8 s |
| 500 W | ~1.1 s |
| ≥ 1200 W | 0.5 s (min) |

Set `ambient_animation: false` in config to disable entirely.

---

## Known limitations

1. **`media_player` volume** — only works with integrations that support
   `SUPPORT_VOLUME_SET`. TVs using Android TV Remote, Samsung, or IR blasters
   typically only have `SUPPORT_VOLUME_STEP` and get no slider.

2. **`fan` without `percentage`** — fans with old-style `speed` attribute
   (e.g. `low / medium / high`) get no slider. Needs a step-based approach.

3. **Sparkline for binary/on-off entities** — `sensor`s that report non-numeric
   states (e.g. `motion`, `clear`) silently produce no sparkline (filtered by
   `isFinite(parseFloat(s.state))`). No fallback visual.

4. **Single entity only** — no multi-entity support in the card itself. For aggregated views (e.g. total household power) create a HA `template` sensor that sums multiple entities and point Button+ at that.

5. **No live history update** — sparkline fetches once on mount. Does not
   refresh as new HA states arrive via WebSocket.

6. **`climate` slider** — adjusts `temperature` setpoint only. Does not handle
   `target_temp_high`/`target_temp_low` for dual-setpoint thermostats.

7. **Cursor Y on flat sparklines** — if all history values are identical, the
   wave has zero height and sits at `yBot` (98% of card). Cursor appears at the
   bottom, which is fine but not beautiful.

---

## Roadmap

### High priority

- [ ] **Live sparkline refresh** — re-fetch history every N minutes (or append
  from WebSocket state changes) so the graph stays current without a page reload.

- [ ] **Fan step-slider fallback** — for fans without `percentage`, detect
  `speed_list` attribute and render a step-based control (low / medium / high)
  instead of a continuous slider.

- [ ] **`media_player` volume step** — when only `SUPPORT_VOLUME_STEP` is
  available, show a simplified +/– volume UI instead of hiding the slider entirely.

- [ ] **`light` color control** — long-press (or second drag axis?) to open a
  color/temperature picker overlay for RGB and color-temp lights.

### Medium priority

- [ ] **Multi-entity histogram** — allow a second `history_entity_id` so e.g.
  a fan card can overlay its speed history with a temperature sensor history.

- [ ] **Tap action config** — `tap_action: 'toggle' | 'more-info' | 'navigate'`
  so advanced users can override the default tap behaviour per card.

- [ ] **`cover` tilt** — covers with tilt support (`tilt_position`) need a
  second control axis.

- [ ] **Dual-setpoint climate** — handle `target_temp_high` / `target_temp_low`
  with a range-slider or two separate drag zones.

- [ ] **Sparkline Y-axis label** — show min/max value labels at left edge of
  the wave (small, dimmed, like HistoryGraphCard).

### Low priority / polish

- [ ] **Icon picker in config UI** — searchable MDI icon browser instead of
  free-text input.

- [ ] **Accent color picker** — color swatch in config UI instead of raw CSS
  string input.

- [ ] **`sensor` tap → more-info** — tapping a read-only sensor could open the
  HA more-info panel (requires a global modal/bridge in the app shell).

- [ ] **Animation config** — let the user override the animation per card
  (`animation: 'spin' | 'glow' | 'pulse' | 'none'`) instead of domain-auto.

- [ ] **Sparkline line style config** — expose `smooth` vs `sharp` vs `peaks`
  choice (already implemented in HistoryGraphCard, just needs to be wired in).
