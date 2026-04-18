import type { CardDefinition, IntegrationDef } from './types'

/** Inbyggd HA-integration — injiceras automatiskt om något kort har needsEntity: true */
const HA_INTEGRATION: IntegrationDef = {
  id: 'homeassistant',
  label: 'Home Assistant',
  fields: [
    { key: 'ha_url',   label: 'Server URL',  type: 'url',    placeholder: 'http://192.168.68.55:8123', defaultValue: 'http://192.168.68.55:8123' },
    { key: 'ha_token', label: 'API Token',   type: 'secret', placeholder: 'Leave blank to keep existing token' },
  ],
  testEndpoint: '/api/ha/test',
}

class CardRegistry {
  private cards = new Map<string, CardDefinition>()

  /** Registrera ett kort. Anropas en gång per korttyp, typiskt i cards/index.tsx. */
  register(def: CardDefinition): void {
    if (this.cards.has(def.type)) {
      console.warn(`[CardRegistry] Typ "${def.type}" är redan registrerad — skriver över.`)
    }
    this.cards.set(def.type, def)
  }

  /** Hämta en kortdefinition via typ-sträng. */
  get(type: string): CardDefinition | undefined {
    return this.cards.get(type)
  }

  /** Alla registrerade kort i registreringsordning. */
  getAll(): CardDefinition[] {
    return Array.from(this.cards.values())
  }

  /** Unika grupper i den ordning de registrerades. */
  getGroups(): string[] {
    const groups: string[] = []
    for (const card of this.cards.values()) {
      if (!groups.includes(card.group)) groups.push(card.group)
    }
    return groups
  }

  /** Alla unika IntegrationDef:ar deklarerade av registrerade kort.
   *  HA-integrationen injiceras automatiskt först om något kort har needsEntity: true. */
  getIntegrations(): IntegrationDef[] {
    const seen = new Set<string>()
    const result: IntegrationDef[] = []

    const needsHA = Array.from(this.cards.values()).some(c => c.needsEntity)
    if (needsHA) {
      result.push(HA_INTEGRATION)
      seen.add(HA_INTEGRATION.id)
    }

    for (const card of this.cards.values()) {
      for (const integration of card.integrations ?? []) {
        if (!seen.has(integration.id)) {
          seen.add(integration.id)
          result.push(integration)
        }
      }
    }
    return result
  }
}

export const registry = new CardRegistry()
