import { createContext, useContext } from 'react'
import type React from 'react'
import type { HAState } from '../types'

export interface CoreContextValue {
  states: Record<string, HAState>
  callService(domain: string, service: string, data: Record<string, any>): Promise<boolean>
  integrations: Record<string, string>
  haError: string | null
}

const CoreContext = createContext<CoreContextValue | null>(null)

export function CoreProvider({
  value,
  children,
}: {
  value: CoreContextValue
  children: React.ReactNode
}) {
  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>
}

export function useCore(): CoreContextValue {
  const ctx = useContext(CoreContext)
  if (!ctx) throw new Error('useCore() must be used inside <CoreProvider>')
  return ctx
}
