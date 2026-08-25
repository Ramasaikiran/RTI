import { useState } from 'react'
import { requestOtp, verifyOtp } from '../lib/authClient'

export default function Auth({ onAuthed }) {
  const [stage, setStage] = useState('email') // email -> otp
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  async function sendCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestOtp(email)
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
      const data = await verifyOtp(email, otp)
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
      <div className="eyebrow">Citizen login — real OTP, no third-party auth</div>
      <h2>{stage === 'email' ? 'Verify your email' : 'Enter the code'}</h2>

      {stage === 'email' && (
        <form onSubmit={sendCode}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          {error && <div className="error-box">{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: 14 }}>
            {loading ? 'Sending…' : 'Send verification code'}
          </button>
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
            <button type="button" className="secondary" onClick={() => { setStage('email'); setOtp('') }}>
              Use a different email
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
