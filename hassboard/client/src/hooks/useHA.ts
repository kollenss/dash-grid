import { useEffect, useState } from 'react'
import { HAState } from '../types'

export function useHAStates() {
  const [states, setStates] = useState<Record<string, HAState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStates() {
    try {
      const res = await fetch('/api/ha/states')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: HAState[] = await res.json()
      const map: Record<string, HAState> = {}
      for (const s of data) map[s.entity_id] = s
      setStates(map)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStates()
  }, [])

  function updateState(entityId: string, newState: HAState) {
    setStates(prev => ({ ...prev, [entityId]: newState }))
  }

  return { states, loading, error, updateState, refetch: fetchStates }
}

export async function callService(domain: string, service: string, data: Record<string, any>) {
  const res = await fetch(`/api/ha/services/${domain}/${service}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.ok
}
