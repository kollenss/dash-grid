import { useState } from 'react'
import './DesignSystemPage.css'
import '../components/cards/BusDeparturesCard.css'

// ── Token data ──────────────────────────────────────────────────────────────

const TEXT_TOKENS = [
  { token: '--hb-text-primary',   desc: '100% — headings, values' },
  { token: '--hb-text-prominent', desc: '80% — active labels, button text' },
  { token: '--hb-text-secondary', desc: '65% — body text, descriptions' },
  { token: '--hb-text-dim',       desc: '55% — metadata, hints' },
  { token: '--hb-text-muted',     desc: '40% — unavailable, off-states' },
  { token: '--hb-text-faint',     desc: '35% — timestamps, footnotes' },
]

const SURFACE_TOKENS = [
  { token: '--hb-surface-btn-active', desc: '0.28 — button press' },
  { token: '--hb-surface-btn-hover',  desc: '0.18 — hover, strong borders' },
  { token: '--hb-surface-track',      desc: '0.20 — slider & progress tracks' },
  { token: '--hb-surface-btn',        desc: '0.10 — button resting state' },
  { token: '--hb-surface-2',          desc: '0.12 — progress fills' },
  { token: '--hb-surface-input',      desc: '0.10 — input fields' },
  { token: '--hb-surface-1',          desc: '0.08 — subtle bg, art placeholder' },
  { token: '--hb-divider-strong',     desc: '0.10 — section dividers' },
  { token: '--hb-divider',            desc: '0.06 — row separators' },
]

const STATUS_TOKENS = [
  { token: '--hb-accent',         desc: '#5ac8fa — interactive accent' },
  { token: '--hb-accent-dim',     desc: '20% accent — subtle highlight' },
  { token: '--hb-status-on',      desc: '#34c759 — active / on' },
  { token: '--hb-status-caution', desc: '#ffd60a — in-progress, moving' },
  { token: '--hb-status-warning', desc: '#ff9f0a — warning' },
  { token: '--hb-status-error',   desc: '#ff3b30 — error' },
  { token: '--hb-status-off',     desc: '0.20 white — inactive / off' },
]

const TYPE_SCALE = [
  { token: '--hb-font-size-hero', label: 'hero', size: '48px', weight: 200 },
  { token: '--hb-font-size-4xl',  label: '4xl',  size: '44px', weight: 200 },
  { token: '--hb-font-size-3xl',  label: '3xl',  size: '34px', weight: 300 },
  { token: '--hb-font-size-2xl',  label: '2xl',  size: '28px', weight: 300 },
  { token: '--hb-font-size-xl',   label: 'xl',   size: '22px', weight: 400 },
  { token: '--hb-font-size-lg',   label: 'lg',   size: '20px', weight: 400 },
  { token: '--hb-font-size-base', label: 'base', size: '16px', weight: 400 },
  { token: '--hb-font-size-md',   label: 'md',   size: '14px', weight: 400 },
  { token: '--hb-font-size-sm',   label: 'sm',   size: '13px', weight: 400 },
  { token: '--hb-font-size-xs',   label: 'xs',   size: '11px', weight: 600 },
  { token: '--hb-font-size-2xs',  label: '2xs',  size: '9px',  weight: 600 },
]

const FONT_WEIGHT_TOKENS = [
  { token: '--hb-font-weight-thin',     weight: 200, label: 'Thin' },
  { token: '--hb-font-weight-light',    weight: 300, label: 'Light' },
  { token: '--hb-font-weight-regular',  weight: 400, label: 'Regular' },
  { token: '--hb-font-weight-medium',   weight: 500, label: 'Medium' },
  { token: '--hb-font-weight-semibold', weight: 600, label: 'Semibold' },
  { token: '--hb-font-weight-bold',     weight: 700, label: 'Bold' },
]

const SPACING_SCALE = [
  { token: '--hb-space-10', size: '32px' },
  { token: '--hb-space-9',  size: '24px' },
  { token: '--hb-space-8',  size: '20px' },
  { token: '--hb-space-7',  size: '16px' },
  { token: '--hb-space-6',  size: '14px' },
  { token: '--hb-space-5',  size: '12px' },
  { token: '--hb-space-4',  size: '10px' },
  { token: '--hb-space-3',  size: '8px' },
  { token: '--hb-space-2',  size: '6px' },
  { token: '--hb-space-1',  size: '4px' },
]

const RADIUS_TOKENS = [
  { token: '--hb-card-radius', size: '20px',   label: 'card' },
  { token: '--hb-radius-lg',   size: '14px',   label: 'lg' },
  { token: '--hb-radius-md',   size: '10px',   label: 'md' },
  { token: '--hb-radius-sm',   size: '6px',    label: 'sm' },
  { token: '--hb-radius-pill', size: '9999px', label: 'pill' },
]

const CARD_TOKENS = [
  { token: '--hb-card-bg',           desc: 'Computed glass fill — written by themes.ts' },
  { token: '--hb-card-blur',         desc: 'Computed backdrop-filter — written by themes.ts' },
  { token: '--hb-card-bg-rgb',       desc: 'RGB split for custom rgba() use' },
  { token: '--hb-card-opacity',      desc: 'Opacity (0.04–0.60), user-adjustable via slider' },
  { token: '--hb-card-blur-px',      desc: 'Blur radius in px (0–40), user-adjustable' },
  { token: '--hb-card-saturate',     desc: 'Saturation boost applied to backdrop blur' },
  { token: '--hb-card-border',       desc: 'Border color + opacity, theme-controlled' },
  { token: '--hb-card-border-width', desc: 'Border width (0–4px), user-adjustable' },
  { token: '--hb-card-radius',       desc: 'Corner radius (4–32px), user-adjustable' },
  { token: '--hb-card-shadow',       desc: 'Drop shadow for depth' },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function Chip({ name }: { name: string }) {
  return <code className="ds-chip">{name}</code>
}

function Anno({ name }: { name: string }) {
  return <code className="ds-anno">{name}</code>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="ds-section-title">{children}</h2>
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="ds-sub-title">{children}</h3>
}

function Desc({ children }: { children: React.ReactNode }) {
  return <span className="ds-desc">{children}</span>
}

// ── Colors ───────────────────────────────────────────────────────────────────

function TextSwatches() {
  return (
    <div className="ds-text-swatches">
      {TEXT_TOKENS.map(({ token, desc }) => (
        <div key={token} className="ds-text-swatch">
          <span className="ds-text-sample" style={{ color: `var(${token})` }}>Aa</span>
          <Chip name={token} />
          <Desc>{desc}</Desc>
        </div>
      ))}
    </div>
  )
}

function SurfaceSwatches() {
  return (
    <div className="ds-surface-list">
      {SURFACE_TOKENS.map(({ token, desc }) => (
        <div key={token} className="ds-surface-row">
          <div className="ds-surface-preview" style={{ background: `var(${token})` }} />
          <Chip name={token} />
          <Desc>{desc}</Desc>
        </div>
      ))}
    </div>
  )
}

function StatusSwatches() {
  return (
    <div className="ds-status-swatches">
      {STATUS_TOKENS.map(({ token, desc }) => (
        <div key={token} className="ds-status-swatch">
          <div className="ds-status-preview" style={{ background: `var(${token})` }} />
          <Chip name={token} />
          <Desc>{desc}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Typography ───────────────────────────────────────────────────────────────

function TypeScale() {
  return (
    <div className="ds-type-list">
      {TYPE_SCALE.map(({ token, label, size, weight }) => (
        <div key={token} className="ds-type-row">
          <span className="ds-type-sample" style={{ fontSize: `var(${token})`, fontWeight: weight }}>
            Source
          </span>
          <div className="ds-type-meta">
            <Chip name={token} />
            <Desc>{label} · {size} · {weight}</Desc>
          </div>
        </div>
      ))}
    </div>
  )
}

function FontWeights() {
  return (
    <div className="ds-weight-list">
      {FONT_WEIGHT_TOKENS.map(({ token, weight, label }) => (
        <div key={token} className="ds-weight-row">
          <span className="ds-weight-sample" style={{ fontWeight: weight }}>
            {label}
          </span>
          <Chip name={token} />
          <Desc>{weight}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Spacing ──────────────────────────────────────────────────────────────────

function SpacingScale() {
  return (
    <div className="ds-spacing-list">
      {SPACING_SCALE.map(({ token, size }) => (
        <div key={token} className="ds-spacing-row">
          <div className="ds-spacing-block" style={{ width: `var(${token})`, height: `var(${token})` }} />
          <Chip name={token} />
          <Desc>{size}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Radius ───────────────────────────────────────────────────────────────────

function RadiusScale() {
  return (
    <div className="ds-radius-list">
      {RADIUS_TOKENS.map(({ token, size, label }) => (
        <div key={token} className="ds-radius-item">
          <div
            className="ds-radius-preview"
            style={{
              borderRadius: label === 'pill' ? '9999px' : `var(${token})`,
              width:  label === 'pill' ? 80 : 64,
              height: label === 'pill' ? 30 : 64,
            }}
          />
          <Chip name={token} />
          <Desc>{label} · {size}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Motion ───────────────────────────────────────────────────────────────────

function MotionSection() {
  return (
    <div className="ds-motion-list">
      {(['fast', 'normal', 'slow'] as const).map(speed => (
        <div key={speed} className="ds-motion-row">
          <Chip name={`--hb-duration-${speed}`} />
          <Desc>{{ fast: '0.15s', normal: '0.25s', slow: '0.4s' }[speed]}</Desc>
          <div className={`ds-motion-dot ds-motion-dot--${speed}`} />
        </div>
      ))}
      <div className="ds-motion-row">
        <Chip name="--hb-ease" />
        <Desc>cubic-bezier(0.4, 0, 0.2, 1) — standard</Desc>
      </div>
      <div className="ds-motion-row">
        <Chip name="--hb-ease-spring" />
        <Desc>cubic-bezier(0.34, 1.56, 0.64, 1) — spring (toggle, scene)</Desc>
      </div>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────

function CardSection() {
  return (
    <>
      <div className="ds-card-grid">
        <div className="hb-card">
          <div className="hb-card__label">Temperature</div>
          <div className="hb-card__value">21.4<span className="hb-card__unit">°C</span></div>
          <div className="hb-card__sub">Living room · updated just now</div>
        </div>
        <div className="hb-card">
          <div className="hb-card__label">Humidity</div>
          <div className="hb-card__value hb-card__value--large">62<span className="hb-card__unit">%</span></div>
          <div className="hb-card__sub">Bedroom · updated 2 min ago</div>
        </div>
      </div>

      <div className="ds-surface-list" style={{ marginTop: 20 }}>
        {CARD_TOKENS.map(({ token, desc }) => (
          <div key={token} className="ds-surface-row">
            <Chip name={token} />
            <Desc>{desc}</Desc>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Buttons ──────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = [
  { label: 'Save',           cls: 'ds-btn ds-btn--primary',        anno: '.btn-primary',         desc: 'Primary action — accent fill' },
  { label: 'Cancel',         cls: 'ds-btn ds-btn--ghost',          anno: '.btn-cancel',          desc: 'Dismiss / secondary' },
  { label: 'Test',           cls: 'ds-btn ds-btn--test',           anno: '.btn-test',            desc: 'Accent outline — integration test' },
  { label: 'Browse',         cls: 'ds-btn ds-btn--browse',         anno: '.modal-browse-btn',    desc: 'Accent outline — entity picker' },
  { label: 'Delete',         cls: 'ds-btn ds-btn--delete',         anno: '.btn-delete',          desc: 'Destructive — outline' },
  { label: 'Confirm delete', cls: 'ds-btn ds-btn--delete-confirm', anno: '.btn-delete--confirm', desc: 'Destructive — filled, after confirmation' },
  { label: 'Reset',          cls: 'ds-btn ds-btn--ghost-xs',       anno: '.dd-reset-btn',        desc: 'Text-only micro action' },
]

function ButtonShowcase() {
  return (
    <div className="ds-variant-grid">
      {BUTTON_VARIANTS.map(({ label, cls, anno, desc }) => (
        <div key={anno} className="ds-variant">
          <button className={cls}>{label}</button>
          <Anno name={anno} />
          <Desc>{desc}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Form controls ─────────────────────────────────────────────────────────────

function FormShowcase() {
  return (
    <div className="ds-form-showcase">
      <div className="ds-form-row">
        <label className="ds-form-label">
          Text input
          <input
            className="ds-input"
            type="text"
            placeholder="e.g. sensor.living_room_temp"
            readOnly
          />
          <Anno name=".modal-input / .settings-input" />
        </label>

        <label className="ds-form-label">
          Select
          <select className="ds-input" defaultValue="">
            <option value="" disabled>Pick an option</option>
            <option>Smooth</option>
            <option>Crisp</option>
            <option>Peaks</option>
          </select>
          <Anno name="select.modal-input" />
        </label>
      </div>

      <label className="ds-form-label" style={{ marginTop: 14 }}>
        Textarea
        <textarea
          className="ds-input ds-textarea"
          rows={3}
          placeholder="Enter markdown content…"
          readOnly
        />
        <Anno name=".modal-input.modal-textarea" />
      </label>

      <label className="ds-form-label ds-form-label--check" style={{ marginTop: 14 }}>
        <input type="checkbox" defaultChecked style={{ accentColor: 'var(--hb-accent)', width: 16, height: 16, cursor: 'pointer' }} />
        Show forecast
        <Anno name=".modal-label-check" />
      </label>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function ToggleShowcase() {
  const [on, setOn] = useState(true)
  return (
    <div className="ds-variant-grid">
      <div className="ds-variant">
        <button
          className={`ds-ios-toggle${on ? ' ds-ios-toggle--on' : ''}`}
          onClick={() => setOn(v => !v)}
          role="switch"
          aria-checked={on}
        >
          <span className="ds-ios-toggle__thumb" />
        </button>
        <Anno name=".ios-toggle (.on)" />
        <Desc>Interactive — click to toggle · spring easing</Desc>
      </div>
      <div className="ds-variant">
        <button className="ds-ios-toggle ds-ios-toggle--disabled" disabled>
          <span className="ds-ios-toggle__thumb" />
        </button>
        <Anno name=".ios-toggle.disabled" />
        <Desc>Disabled / unavailable state</Desc>
      </div>
    </div>
  )
}

// ── Departure time badge ──────────────────────────────────────────────────────

function DepartureTimeBadgeShowcase() {
  return (
    <div className="ds-variant-grid">
      <div className="ds-variant ds-variant--col">
        <span className="bus-mins-badge">
          <strong>8</strong><span className="bus-mins-unit"> min</span>
        </span>
        <Anno name=".bus-mins-badge" />
        <Desc>Default — no threshold set</Desc>
      </div>
      <div className="ds-variant ds-variant--col">
        <span className="bus-mins-badge" style={{ background: 'var(--hb-status-warning)', color: '#1a1a1a' }}>
          <strong>3</strong><span className="bus-mins-unit"> min</span>
        </span>
        <Anno name=".bus-mins-badge (warn)" />
        <Desc>Below warn threshold</Desc>
      </div>
      <div className="ds-variant ds-variant--col">
        <span className="bus-mins-badge" style={{ background: 'var(--hb-status-error)', color: '#fff' }}>
          <span className="bus-mins-now">Now</span>
        </span>
        <Anno name=".bus-mins-badge (now)" />
        <Desc>Departure imminent / departing</Desc>
      </div>
    </div>
  )
}

// ── Status badges ─────────────────────────────────────────────────────────────

const BADGE_VARIANTS = [
  { label: 'On',          cls: 'ds-badge ds-badge--on',      desc: 'Active' },
  { label: 'Off',         cls: 'ds-badge ds-badge--off',     desc: 'Inactive' },
  { label: 'Moving',      cls: 'ds-badge ds-badge--caution', desc: 'In progress' },
  { label: 'Warning',     cls: 'ds-badge ds-badge--warning', desc: 'Alert' },
  { label: 'Error',       cls: 'ds-badge ds-badge--error',   desc: 'Failure' },
  { label: 'Unavailable', cls: 'ds-badge ds-badge--muted',   desc: 'Unknown' },
]

function BadgeShowcase() {
  return (
    <div className="ds-badge-row">
      {BADGE_VARIANTS.map(({ label, cls, desc }) => (
        <div key={cls} className="ds-variant ds-variant--col">
          <span className={cls}>{label}</span>
          <Desc>{desc}</Desc>
        </div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <div className="ds-page">

      <div className="ds-intro">
        <p>Living documentation of Dash Grid's design system. All values are live — switch theme in the dashboard and the swatches update instantly.</p>
      </div>

      <section className="ds-section">
        <SectionTitle>Colors</SectionTitle>
        <div className="ds-subsection">
          <SubTitle>Text</SubTitle>
          <TextSwatches />
        </div>
        <div className="ds-subsection">
          <SubTitle>Surfaces & Dividers</SubTitle>
          <SurfaceSwatches />
        </div>
        <div className="ds-subsection">
          <SubTitle>Status & Accent</SubTitle>
          <StatusSwatches />
        </div>
      </section>

      <section className="ds-section">
        <SectionTitle>Typography</SectionTitle>
        <div className="ds-subsection">
          <SubTitle>Size scale</SubTitle>
          <TypeScale />
        </div>
        <div className="ds-subsection">
          <SubTitle>Font weights</SubTitle>
          <FontWeights />
        </div>
      </section>

      <section className="ds-section">
        <SectionTitle>Spacing</SectionTitle>
        <SpacingScale />
      </section>

      <section className="ds-section">
        <SectionTitle>Radius</SectionTitle>
        <RadiusScale />
      </section>

      <section className="ds-section">
        <SectionTitle>Motion</SectionTitle>
        <MotionSection />
      </section>

      <section className="ds-section">
        <SectionTitle>Card</SectionTitle>
        <CardSection />
      </section>

      <section className="ds-section">
        <SectionTitle>Components</SectionTitle>

        <div className="ds-subsection">
          <SubTitle>Buttons</SubTitle>
          <ButtonShowcase />
        </div>

        <div className="ds-subsection">
          <SubTitle>Form Controls</SubTitle>
          <FormShowcase />
        </div>

        <div className="ds-subsection">
          <SubTitle>Toggle</SubTitle>
          <ToggleShowcase />
        </div>

        <div className="ds-subsection">
          <SubTitle>Status Badges</SubTitle>
          <BadgeShowcase />
        </div>

        <div className="ds-subsection">
          <SubTitle>Departure Time Badge</SubTitle>
          <DepartureTimeBadgeShowcase />
        </div>

      </section>

    </div>
  )
}
