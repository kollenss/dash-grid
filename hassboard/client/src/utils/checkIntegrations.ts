import type { CardDefinition } from '../core/types'

export interface MissingIntegration {
  id: string
  label: string
}

/**
 * Returnerar en lista med integrationer som saknar konfiguration.
 * Kollar både HA (om kortet kräver entity) och deklarerade integrations.
 */
export function getMissingIntegrations(
  def: CardDefinition,
  integrations: Record<string, string>
): MissingIntegration[] {
  const missing: MissingIntegration[] = []

  // Om kortet behöver en HA-entity — kontrollera att HA URL + token är konfigurerade
  if (def.needsEntity) {
    if (!integrations['ha_url'] || !integrations['ha_token']) {
      missing.push({ id: 'ha', label: 'Home Assistant' })
    }
  }

  // Kontrollera eventuella extra-integrationer (t.ex. Västtrafik)
  if (def.integrations) {
    for (const intDef of def.integrations) {
      const keys = intDef.fields ? intDef.fields.map(f => f.key) : [intDef.id]
      if (keys.some(k => !integrations[k])) {
        missing.push({ id: intDef.id, label: intDef.label })
      }
    }
  }

  return missing
}
