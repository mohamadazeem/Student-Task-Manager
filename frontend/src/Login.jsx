import { useState } from 'react'

function getErrorMessage(data, fallback) {
  if (Array.isArray(data?.details) && data.details.length > 0) {
    return data.details.map(d => d.msg).join(', ')
  }
  if (data?.error && data.error !== 'Validation failed') {
    return data.error
  }
  if (data?.message) {
    return data.message
  }
  return fallback
}

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const trimmedEmail = email.trim()
    const trimmedName = name.trim()

    try {
      if (isRegister) {
        // Step 1: Register
        const regResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
        })

        const regData = await regResponse.json().catch(() => ({}))

        if (!regResponse.ok) {
          throw new Error(getErrorMessage(regData, 'Registration failed'))
        }

        setSuccess('Registration successful! Logging you in…')
      }

      // Step 2: Login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorText = getErrorMessage(data, 'Login failed')
        if (!isRegister && response.status === 401) {
          throw new Error('Invalid email or password. If you have not created an account yet, click "Register" above.')
        }
        throw new Error(errorText)
      }

      const student = data.student || data.user
      if (!data.token || !student) {
        throw new Error('Invalid login response from the server')
      }

      onLogin({ ...data, student })
    } catch (err) {
      setError(err.message || 'Network error. Please make sure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <p className="eyebrow">STUDENT TASK MANAGER</p>
        </div>

        <h1>{isRegister ? 'Create an account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegister
            ? 'Sign up to start organizing and managing your academic tasks.'
            : 'Sign in to access your student task dashboard.'}
        </p>

        {/* Tab switchers */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(false)
              setError('')
              setSuccess('')
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => {
              setIsRegister(true)
              setError('')
              setSuccess('')
            }}
          >
            Register
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {success && <p className="success-banner" role="status">{success}</p>}

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
          Email Address
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
            placeholder={isRegister ? 'At least 6 characters' : 'Enter your password'}
          />
        </label>

        <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
          {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account yet? "}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
              setSuccess('')
            }}
          >
            {isRegister ? 'Sign in here' : 'Register here'}
          </button>
        </p>
      </form>
    </main>
  )
}
