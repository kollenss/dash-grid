import type React from 'react'
import type { HAState } from '../types'

/** Props som alla kortkomponenter tar emot.
 *  states, integrations och callService hämtas via useCore(). */
export interface CardProps {
  config: Record<string, any>
  state?: HAState
  /** Kortets nuvarande bredd i gridkolumner */
  colSpan: number
  /** Kortets nuvarande höjd i gridrader */
  rowSpan: number
}

/** Props för kortets konfig-UI i AddCardModal */
export interface ConfigUIProps {
  config: Record<string, any>
  onChange: (key: string, value: any) => void
}

/** Ett enskilt inmatningsfält i en multi-fält integration */
export interface IntegrationField {
  key: string                      // settings-nyckel, t.ex. 'ha_url'
  label: string                    // 'Server URL'
  type: 'secret' | 'text' | 'url'
  placeholder?: string
  defaultValue?: string
}

/** Extern integration (API utöver HA) som ett kort kan deklarera */
export interface IntegrationDef {
  id: string                       // unik id, t.ex. 'vasttrafik'
  label: string                    // 'Västtrafik API-token'
  /** Enstaka fält — använd antingen type+id eller fields, inte båda */
  type?: 'secret' | 'text' | 'url'
  /** Multi-fält integration (t.ex. HA som behöver URL + token) */
  fields?: IntegrationField[]
  testEndpoint?: string            // '/api/vasttrafik/test'
  helpText?: string
  required?: boolean
}

/** Kortdefinition — allt ett kort behöver deklarera för att laddas in */
export interface CardDefinition {
  // Identitet
  type: string
  label: string
  icon: string
  group: string

  // Standardstorlek i gridet
  defaultSize: [colSpan: number, rowSpan: number]
  /** Minsta tillåtna storlek — enforecas i resize-drag och storleksväljaren i modal */
  minSize?: [colSpan: number, rowSpan: number]

  // HA-entity binding
  needsEntity?: boolean
  defaultDomains?: string[]

  // Externa API:er utöver HA (visas som inställningsfält i Sprint 2)
  integrations?: IntegrationDef[]

  // React-komponenter
  component: React.ComponentType<any>
  configUI?: React.ComponentType<ConfigUIProps>
}
