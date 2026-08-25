import { useState } from 'react'
import { register } from '../lib/authClient'

export default function Register({ onAuthed, switchToLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await register(name, email, address, password, confirmPassword)
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
      <div className="eyebrow">New citizen account</div>
      <h2>Register</h2>

      <form onSubmit={submit}>
        <label>Full name</label>
        <input value={name} onChange={e => setName(e.target.value)} required />

        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

        <label>Postal address</label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Required — RTI applications must carry a mailing address"
          style={{ minHeight: 64 }}
          required
        />

        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />

        <label>Confirm password</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required />

        {error && <div className="error-box">{error}</div>}
        <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="muted" style={{ marginTop: 14 }}>
          Already have an account?{' '}
          <a href="#" onClick={e => { e.preventDefault(); switchToLogin() }}>Sign in</a>
        </p>
      </form>
    </div>
  )
}
