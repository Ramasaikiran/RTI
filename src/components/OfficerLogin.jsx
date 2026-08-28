import { useState } from 'react'
import { officerLogin } from '../lib/authClient'

export default function OfficerLogin({ onAuthed, switchToCitizenLogin }) {
  const [officerId, setOfficerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await officerLogin(officerId, password)
      localStorage.setItem('rtiplus_token', data.token)
      onAuthed({ role: 'officer', officer: data.officer })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sheet">
      <div className="eyebrow">Public Information Officer</div>
      <h2>Officer sign in</h2>
      <p className="muted" style={{ fontSize: 12.5 }}>
        Demo login: any officer ID from the directory (e.g. <code>PIO-DL-014</code>) / <code>Officer#2026</code>
      </p>

      <form onSubmit={submit}>
        <label>Officer ID</label>
        <input value={officerId} onChange={e => setOfficerId(e.target.value)} placeholder="PIO-DL-014" required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="error-box">{error}</div>}
        <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="muted" style={{ marginTop: 14 }}>
          Not an officer?{' '}
          <a href="#" onClick={e => { e.preventDefault(); switchToCitizenLogin() }}>Citizen login</a>
        </p>
      </form>
    </div>
  )
}
