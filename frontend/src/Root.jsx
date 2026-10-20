import { useState } from 'react'
import App from './App.jsx'
import Login from './Login.jsx'

export default function Root() {
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
