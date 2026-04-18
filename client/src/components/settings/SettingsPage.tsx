import { useEffect, useState } from 'react'
import { registry } from '../../core/CardRegistry'
import type { IntegrationDef, IntegrationField } from '../../core/types'
import './SettingsPage.css'

function integrationKeys(intg: IntegrationDef): IntegrationField[] {
  if (intg.fields) return intg.fields
  return [{ key: intg.id, label: intg.label, type: intg.type ?? 'text' }]
}

export default function SettingsPage() {
  const [integrationValues, setIntegrationValues]     = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys]                     = useState<Set<string>>(new Set())
  const [integrationStatuses, setIntegrationStatuses] = useState<Record<string, { status: 'idle' | 'loading' | 'ok' | 'fail'; msg: string }>>({})
  const [dashboardName, setDashboardName] = useState('Home')
  const [dashboardId, setDashboardId]     = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const integrations = registry.getIntegrations()

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Record<string, string>) => {
      const ivs: Record<string, string> = {}
      const sk = new Set<string>()
      for (const intg of integrations) {
        for (const field of integrationKeys(intg)) {
          if (field.type === 'secret') {
            if (data[field.key] === '***saved***') {
              sk.add(field.key)
              ivs[field.key] = ''
            } else {
              ivs[field.key] = data[field.key] ?? ''
            }
          } else {
            ivs[field.key] = data[field.key] ?? field.defaultValue ?? ''
          }
        }
      }
      setIntegrationValues(ivs)
      setSavedKeys(sk)
    })
    fetch('/api/dashboards').then(r => r.json()).then((data: any[]) => {
      if (data[0]) {
        setDashboardName(data[0].name)
        setDashboardId(data[0].id)
      }
    })
  }, [])

  async function saveSettings() {
    const current = await fetch('/api/settings').then(r => r.json()).catch(() => ({})) as Record<string, string>
    const body: Record<string, string> = { ...current }

    for (const intg of integrations) {
      for (const field of integrationKeys(intg)) {
        if (field.type === 'secret') {
          body[field.key] = integrationValues[field.key] === ''
            ? '***saved***'
            : (integrationValues[field.key] ?? '***saved***')
        } else {
          body[field.key] = integrationValues[field.key] ?? ''
        }
      }
    }

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (dashboardId) {
      await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dashboardName }),
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await saveSettings()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleIntegrationTest(intg: IntegrationDef) {
    if (!intg.testEndpoint) return
    setIntegrationStatuses(prev => ({ ...prev, [intg.id]: { status: 'loading', msg: '' } }))
    await saveSettings()
    try {
      const res  = await fetch(intg.testEndpoint)
      const data = await res.json() as any
      if (data.ok) {
        const label = data.version ? `${intg.label} ${data.version}` : intg.label
        setIntegrationStatuses(prev => ({ ...prev, [intg.id]: { status: 'ok', msg: `${label} — connected` } }))
      } else {
        setIntegrationStatuses(prev => ({ ...prev, [intg.id]: { status: 'fail', msg: data.error ?? 'Connection failed' } }))
      }
    } catch {
      setIntegrationStatuses(prev => ({ ...prev, [intg.id]: { status: 'fail', msg: 'Could not reach the server' } }))
    }
  }

  function setField(key: string, value: string) {
    setIntegrationValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h1 className="settings-title">Settings</h1>
        <form onSubmit={handleSave} className="settings-form">

          {/* ── Integrations ─────────────────────────────────────────────── */}
          {integrations.map(intg => {
            const st     = integrationStatuses[intg.id] ?? { status: 'idle', msg: '' }
            const fields = integrationKeys(intg)
            return (
              <div key={intg.id} className="settings-integration">
                <h2 className="settings-section-title">{intg.label}</h2>

                {fields.map(field => (
                  <label key={field.key} className="settings-label">
                    {field.label}
                    <input
                      className="settings-input"
                      type={field.type === 'secret' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                      value={integrationValues[field.key] ?? ''}
                      onChange={e => setField(field.key, e.target.value)}
                      placeholder={
                        field.type === 'secret'
                          ? (savedKeys.has(field.key) ? 'Leave blank to keep existing value' : (field.placeholder ?? 'Required — enter value'))
                          : (field.placeholder ?? '')
                      }
                      autoComplete={field.type === 'secret' ? 'new-password' : undefined}
                    />
                  </label>
                ))}

                {intg.helpText && <p className="settings-help">{intg.helpText}</p>}

                {intg.testEndpoint && (
                  <button type="button" className={`btn-test ${st.status}`} onClick={() => handleIntegrationTest(intg)}>
                    {st.status === 'loading' ? 'Testing…' : 'Test Connection'}
                  </button>
                )}
                {st.msg && <div className={`test-result ${st.status}`}>{st.msg}</div>}
              </div>
            )
          })}

          {/* ── Dashboard ────────────────────────────────────────────────── */}
          <div className="settings-integration">
            <h2 className="settings-section-title">Dashboard</h2>
            <label className="settings-label">
              Dashboard Name
              <input
                className="settings-input"
                type="text"
                value={dashboardName}
                onChange={e => setDashboardName(e.target.value)}
              />
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn-primary">
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
