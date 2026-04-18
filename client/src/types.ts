export interface CardConfig {
  id: string
  dashboard_id: string
  type: string
  col: number
  row: number
  col_span: number
  row_span: number
  config: Record<string, any>
}

export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, any>
  last_changed: string
  last_updated: string
}

export interface Dashboard {
  id: string
  name: string
  sort_order: number
}
