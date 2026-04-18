import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as React from 'react'
import { registry } from './core/CardRegistry'
import './components/cards'
import App from './App'

// Expose for plugin cards loaded via dynamic import
;(window as any).__dashgrid = { React, registry }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
