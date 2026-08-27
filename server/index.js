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

// ---------- AI draft agent (OpenAI-powered) ----------
app.post('/api/draft', async (req, res) => {
  const { plainRequest, dept, applicantName } = req.body || {}
  if (!plainRequest?.trim()) return res.status(400).json({ error: 'plainRequest is required.' })

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not set on the server.' })
  }

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const systemPrompt = `You draft formal Indian Right to Information (RTI) applications under Section 6(1) of the RTI Act, 2005. Output only the final application text — no preamble, no markdown, no explanation. Follow this structure: addressee line to the Public Information Officer of the given department, subject line citing Section 6(1), a polite salutation, 2-4 numbered information points derived from the citizen's plain-English request, a line requesting the 30-day statutory reply under Section 7(1), the date, and a closing "Yours faithfully" with the applicant's name.`
  const userPrompt = `Department: ${dept}\nApplicant name: ${applicantName || '[Applicant Name]'}\nToday's date: ${today}\nCitizen's request in plain English: "${plainRequest.trim()}"`

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    })
    if (!r.ok) {
      const errBody = await r.text()
      console.error('OpenAI error:', errBody)
      return res.status(502).json({ error: 'OpenAI request failed.' })
    }
    const data = await r.json()
    const draft = data.choices?.[0]?.message?.content?.trim()
    if (!draft) return res.status(502).json({ error: 'OpenAI returned no draft.' })
    res.json({ draft })
  } catch (err) {
    console.error('Draft agent failed:', err)
    res.status(502).json({ error: 'Draft agent request failed.' })
  }
})

// ---------- Demo account for reviewers ----------
// Seeded on boot so hackathon judges can log in immediately without registering.
async function seedDemoAccount() {
  const email = 'reviewer@rtiplus.demo'
  if (users.has(email)) return
  const passwordHash = await bcrypt.hash('ReviewMe#2026', 10)
  users.set(email, {
    name: 'Demo Reviewer',
    email,
    address: '221 MG Road, Bengaluru, Karnataka 560001',
    passwordHash,
    createdAt: new Date().toISOString(),
  })
  console.log(`[seed] Demo account ready — ${email} / ReviewMe#2026`)
}
seedDemoAccount()

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`RTI+ auth server on :${port}`))
