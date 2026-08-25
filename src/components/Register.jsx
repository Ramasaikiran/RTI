import { useState } from 'react'
import { registerRequestOtp, registerVerify } from '../lib/authClient'

export default function Register({ onAuthed, switchToLogin }) {
  const [stage, setStage] = useState('details') // details -> otp
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function submitDetails(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerRequestOtp(name, email, address)
      setStage('otp')
      setNotice(`Code sent to ${email}. It expires in 5 minutes.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await registerVerify(email, otp)
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
      <h2>{stage === 'details' ? 'Register' : 'Verify your email'}</h2>

      {stage === 'details' && (
        <form onSubmit={submitDetails}>
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
          {error && <div className="error-box">{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
            {loading ? 'Sending…' : 'Send verification code'}
          </button>
          <p className="muted" style={{ marginTop: 14 }}>
            Already have an account?{' '}
            <a href="#" onClick={e => { e.preventDefault(); switchToLogin() }}>Sign in</a>
          </p>
        </form>
      )}

      {stage === 'otp' && (
        <form onSubmit={submitOtp}>
          <p className="muted">{notice}</p>
          <label>6-digit code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '4px', fontSize: 18 }}
            required
          />
          {error && <div className="error-box">{error}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify & create account'}</button>
            <button type="button" className="secondary" onClick={() => { setStage('details'); setOtp('') }}>Back</button>
          </div>
        </form>
      )}
    </div>
  )
}
