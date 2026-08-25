import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'

const app = express()
app.use(cors())
app.use(express.json())

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'RTI+ <onboarding@resend.dev>'
const JWT_SECRET = process.env.JWT_SECRET
const OTP_TTL_MS = 5 * 60 * 1000        // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000    // 30s between sends
const MAX_ATTEMPTS = 5

if (!process.env.RESEND_API_KEY) {
  console.warn('[warn] RESEND_API_KEY not set — OTP emails will fail to send.')
}
if (!JWT_SECRET) {
  console.warn('[warn] JWT_SECRET not set — sessions will not be signed securely.')
}

// In-memory store for demo purposes.
// Swap for Redis/Postgres in production — keys are per-process here.
const otpStore = new Map() // email -> { hash, expiresAt, attempts, lastSentAt }

function hashOtp(otp, email) {
  return crypto.createHash('sha256').update(`${otp}:${email}:${JWT_SECRET || 'dev-secret'}`).digest('hex')
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

app.post('/api/otp/request', async (req, res) => {
  const { email } = req.body || {}
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' })
  }

  const existing = otpStore.get(email)
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000)
    return res.status(429).json({ error: `Wait ${wait}s before requesting another code.` })
  }

  const otp = generateOtp()
  otpStore.set(email, {
    hash: hashOtp(otp, email),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  })

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your RTI+ verification code',
      text: `Your code is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your RTI+ verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>Expires in 5 minutes.</p>`,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Resend send failed:', err)
    res.status(502).json({ error: 'Could not send email. Check RESEND_API_KEY and FROM_EMAIL.' })
  }
})

app.post('/api/otp/verify', (req, res) => {
  const { email, otp } = req.body || {}
  const record = otpStore.get(email)

  if (!record) return res.status(400).json({ error: 'Request a code first.' })
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email)
    return res.status(400).json({ error: 'Code expired. Request a new one.' })
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email)
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' })
  }

  record.attempts += 1
  if (hashOtp(otp, email) !== record.hash) {
    return res.status(400).json({ error: `Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempts left.` })
  }

  otpStore.delete(email)
  const token = jwt.sign({ email }, JWT_SECRET || 'dev-secret', { expiresIn: '7d' })
  res.json({ ok: true, token, user: { email } })
})

app.get('/api/session', (req, res) => {
  const auth = req.headers.authorization || ''
  const token = auth.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET || 'dev-secret')
    res.json({ user: { email: payload.email } })
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`RTI+ OTP server on :${port}`))
