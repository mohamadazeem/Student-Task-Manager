import { useState } from 'react'

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        const regResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })

        const regData = await regResponse.json().catch(() => ({}))

        if (!regResponse.ok) {
          const msg = regData.error || (regData.details && regData.details[0]?.msg) || 'Registration failed'
          throw new Error(msg)
        }
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const msg = data.error || (data.details && data.details[0]?.msg) || 'Login failed'
        throw new Error(msg)
      }

      const student = data.student || data.user
      if (!data.token || !student) {
        throw new Error('Invalid login response from the server')
      }

      onLogin({ ...data, student })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">STUDENT TASK MANAGER</p>
        <h1>{isRegister ? 'Create an account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegister
            ? 'Sign up to start organizing your academic tasks.'
            : 'Log in to manage your academic tasks.'}
        </p>

        {error && <p className="error" role="alert">{error}</p>}

        {isRegister && (
          <label>
            Full Name
            <input
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Alex Johnson"
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? 'Min 6 characters' : 'Enter your password'}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait…' : isRegister ? 'Register' : 'Log in'}
        </button>

        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            className="outline"
            style={{ padding: '4px 10px', fontSize: '13px', display: 'inline', width: 'auto' }}
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
          >
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </form>
    </main>
  )
}

