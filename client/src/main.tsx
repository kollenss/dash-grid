import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './components/cards'   // registrerar alla inbyggda korttyper i CardRegistry
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
