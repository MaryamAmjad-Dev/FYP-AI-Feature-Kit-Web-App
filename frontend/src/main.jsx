import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import apiClient from './apiClient.js'
import { clearSession, isLoggedIn } from './auth.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The JWT now lives in an httpOnly cookie, so the localStorage flag can go
// stale once the cookie expires or the password changes. Ask the server once
// at boot; only a real 401 clears the flag (never a network hiccup), and
// skipAuthRedirect keeps this check from bouncing the visitor to /login.
if (isLoggedIn()) {
  apiClient
    .get('/me', { skipAuthRedirect: true })
    .then(() => window.dispatchEvent(new Event('auth:changed')))
    .catch((error) => {
      if (error?.response?.status === 401) {
        clearSession()
        window.dispatchEvent(new Event('auth:changed'))
      }
    })
}
