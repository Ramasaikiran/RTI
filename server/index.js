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
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const OTP_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5

if (!process.env.RESEND_API_KEY) console.warn('[warn] RESEND_API_KEY not set — OTP emails will fail to send.')
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set — using an insecure default.')

// In-memory stores for demo purposes. Swap for Postgres/Redis in production.
const users = new Map()        // email -> { name, address, createdAt }
const pendingOtp = new Map()   // email -> { hash, expiresAt, attempts, lastSentAt, purpose, profile? }

function hashOtp(otp, email) {
  return crypto.createHash('sha256').update(`${otp}:${email}:${JWT_SECRET}`).digest('hex')
}
function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}
function isEmail(v) {
  return typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v)
}
async function sendOtpEmail(email, otp, heading) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your RTI+ verification code',
    text: `${heading} Your code is ${otp}. It expires in 5 minutes.`,
    html: `<p>${heading}</p><h2 style="letter-spacing:4px">${otp}</h2><p>Expires in 5 minutes.</p>`,
  })
}
function checkCooldown(email) {
  const existing = pendingOtp.get(email)
  if (existing && Date.now() - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000)
    return `Wait ${wait}s before requesting another code.`
  }
  return null
}

// ---------- Registration ----------
app.post('/api/auth/register/request-otp', async (req, res) => {
  const { name, email, address } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Full name is required.' })
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email is required.' })
  if (!address?.trim()) return res.status(400).json({ error: 'Postal address is required — RTI applications need it on file.' })
  if (users.has(email)) return res.status(409).json({ error: 'An account already exists for this email. Try logging in instead.' })

  const cooldown = checkCooldown(email)
  if (cooldown) return res.status(429).json({ error: cooldown })

  const otp = generateOtp()
  pendingOtp.set(email, {
    hash: hashOtp(otp, email),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
    purpose: 'register',
    profile: { name: name.trim(), address: address.trim() },
  })

  try {
    await sendOtpEmail(email, otp, `Confirm your RTI+ account, ${name.trim()}.`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Resend send failed:', err)
    res.status(502).json({ error: 'Could not send email. Check RESEND_API_KEY and FROM_EMAIL.' })
  }
})

app.post('/api/auth/register/verify', (req, res) => {
  const { email, otp } = req.body || {}
  const record = pendingOtp.get(email)
  if (!record || record.purpose !== 'register') return res.status(400).json({ error: 'Request a code first.' })
  if (Date.now() > record.expiresAt) { pendingOtp.delete(email); return res.status(400).json({ error: 'Code expired. Request a new one.' }) }
  if (record.attempts >= MAX_ATTEMPTS) { pendingOtp.delete(email); return res.status(429).json({ error: 'Too many attempts. Request a new code.' }) }

  record.attempts += 1
  if (hashOtp(otp, email) !== record.hash) {
    return res.status(400).json({ error: `Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempts left.` })
  }

  const profile = { ...record.profile, email, createdAt: new Date().toISOString() }
  users.set(email, profile)
  pendingOtp.delete(email)

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user: profile })
})

// ---------- Login ----------
app.post('/api/auth/login/request-otp', async (req, res) => {
  const { email } = req.body || {}
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email is required.' })
  if (!users.has(email)) return res.status(404).json({ error: 'No account found for this email. Register first.' })

  const cooldown = checkCooldown(email)
  if (cooldown) return res.status(429).json({ error: cooldown })

  const otp = generateOtp()
  pendingOtp.set(email, {
    hash: hashOtp(otp, email),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
    purpose: 'login',
  })

  try {
    await sendOtpEmail(email, otp, 'Sign in to RTI+.')
    res.json({ ok: true })
  } catch (err) {
    console.error('Resend send failed:', err)
    res.status(502).json({ error: 'Could not send email. Check RESEND_API_KEY and FROM_EMAIL.' })
  }
})

app.post('/api/auth/login/verify', (req, res) => {
  const { email, otp } = req.body || {}
  const record = pendingOtp.get(email)
  if (!record || record.purpose !== 'login') return res.status(400).json({ error: 'Request a code first.' })
  if (Date.now() > record.expiresAt) { pendingOtp.delete(email); return res.status(400).json({ error: 'Code expired. Request a new one.' }) }
  if (record.attempts >= MAX_ATTEMPTS) { pendingOtp.delete(email); return res.status(429).json({ error: 'Too many attempts. Request a new code.' }) }

  record.attempts += 1
  if (hashOtp(otp, email) !== record.hash) {
    return res.status(400).json({ error: `Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempts left.` })
  }

  pendingOtp.delete(email)
  const user = users.get(email)
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user })
})

// ---------- Session ----------
app.get('/api/session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = users.get(payload.email)
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' })
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`RTI+ auth server on :${port}`))
