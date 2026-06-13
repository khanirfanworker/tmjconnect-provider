import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Remove stale accessToken from localStorage if it was persisted by an older build
try {
  const raw = localStorage.getItem('tmj-auth')
  if (raw) {
    const parsed = JSON.parse(raw)
    if (parsed?.state?.accessToken !== undefined) {
      delete parsed.state.accessToken
      localStorage.setItem('tmj-auth', JSON.stringify(parsed))
    }
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
