import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set — using an insecure default.')

// In-memory store for demo purposes. Swap for Postgres in production.
const users = new Map() // email -> { name, address, email, passwordHash, createdAt }

function isEmail(v) {
  return typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v)
}
function publicUser(u) {
  const { passwordHash, ...rest } = u
  return rest
}

// ---------- Registration ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, address, password, confirmPassword } = req.body || {}

  if (!name?.trim()) return res.status(400).json({ error: 'Full name is required.' })
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email is required.' })
  if (!address?.trim()) return res.status(400).json({ error: 'Postal address is required — RTI applications need it on file.' })
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' })
  if (users.has(email)) return res.status(409).json({ error: 'An account already exists for this email. Try logging in instead.' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = {
    name: name.trim(),
    email,
    address: address.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  users.set(email, user)

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user: publicUser(user) })
})

// ---------- Login ----------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!isEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required.' })

  const user = users.get(email)
  if (!user) return res.status(404).json({ error: 'No account found for this email. Register first.' })

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return res.status(401).json({ error: 'Incorrect password.' })

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user: publicUser(user) })
})

// ---------- Session ----------
app.get('/api/session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = users.get(payload.email)
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' })
    res.json({ user: publicUser(user) })
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`RTI+ auth server on :${port}`))
