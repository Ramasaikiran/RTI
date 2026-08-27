import { useState } from 'react'
import { login } from '../lib/authClient'

export default function Login({ onAuthed, switchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      localStorage.setItem('rtiplus_token', data.token)
      onAuthed(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sheet">
      <div className="eyebrow">Returning citizen</div>
      <h2>Sign in</h2>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Reviewer demo account: <code>reviewer@rtiplus.demo</code> / <code>ReviewMe#2026</code>
      </p>

      <form onSubmit={submit}>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <div className="error-box">{error}</div>}
        <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted" style={{ marginTop: 14 }}>
          No account yet?{' '}
          <a href="#" onClick={e => { e.preventDefault(); switchToRegister() }}>Register</a>
        </p>
      </form>
    </div>
  )
}
