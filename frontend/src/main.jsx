import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import './style.css'

function Root() {
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('taskManagerSession')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  function handleLogin(data) {
    sessionStorage.setItem(
      'taskManagerSession',
      JSON.stringify(data)
    )
    setSession(data)
  }

  function handleLogout() {
    sessionStorage.removeItem('taskManagerSession')
    setSession(null)
  }

  if (session?.token && (session?.student || session?.user)) {
    return (
      <App
        session={session}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <Login onLogin={handleLogin} />
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
