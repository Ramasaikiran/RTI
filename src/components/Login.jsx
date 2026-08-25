import { useState } from 'react'
import { loginRequestOtp, loginVerify } from '../lib/authClient'

export default function Login({ onAuthed, switchToRegister }) {
  const [stage, setStage] = useState('email') // email -> otp
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginRequestOtp(email)
      setStage('otp')
      setNotice(`Code sent to ${email}. It expires in 5 minutes.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function checkCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginVerify(email, otp)
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
      <h2>{stage === 'email' ? 'Sign in' : 'Enter the code'}</h2>

      {stage === 'email' && (
        <form onSubmit={sendCode}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
            {loading ? 'Sending…' : 'Send verification code'}
          </button>
          <p className="muted" style={{ marginTop: 14 }}>
            No account yet?{' '}
            <a href="#" onClick={e => { e.preventDefault(); switchToRegister() }}>Register</a>
          </p>
        </form>
      )}

      {stage === 'otp' && (
        <form onSubmit={checkCode}>
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
            <button type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify & sign in'}</button>
            <button type="button" className="secondary" onClick={() => { setStage('email'); setOtp('') }}>Back</button>
          </div>
        </form>
      )}
    </div>
  )
}
