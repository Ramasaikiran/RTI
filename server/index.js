import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { officers, departments, OFFICER_DEMO_PASSWORD, routeDepartment, assignOfficer, officerStats } from './officers.js'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set - using an insecure default.')

// In-memory stores for demo purposes. Swap for Postgres in production.
const users = new Map()      // email -> { name, address, email, passwordHash, createdAt }
const requests = []          // { id, applicantEmail, applicantName, plainRequest, draft, dept, officerId, filedAt, status, resolvedAt, rejectionReason }
let requestSeq = 1000

function isEmail(v) {
  return typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v)
}
function publicUser(u) {
  const { passwordHash, ...rest } = u
  return rest
}

// Real, documented RTI rejection grounds - used when a request is
// marked rejected, so the reason shown to the citizen is realistic.
const REJECTION_REASONS = [
  'Phrased as a demand for justification ("why/how") rather than a request for existing records, which Section 2(f) does not cover.',
  'Request bundles multiple unrelated questions - applicant asked to refile as separate, specific requests.',
  'Information falls under Section 8(1)(j) - personal information with no larger public interest established.',
  'Records requested do not exist in the form asked for; department is not required to create new data to answer.',
]

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    req.auth = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' })
  }
}
function requireOfficer(req, res, next) {
  if (req.auth?.role !== 'officer') return res.status(403).json({ error: 'Officer login required.' })
  next()
}

// ---------- Citizen registration ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, address, password, confirmPassword } = req.body || {}
  if (!name?.trim()) return res.status(400).json({ error: 'Full name is required.' })
  if (!isEmail(email)) return res.status(400).json({ error: 'Valid email is required.' })
  if (!address?.trim()) return res.status(400).json({ error: 'Postal address is required - RTI applications need it on file.' })
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' })
  if (users.has(email)) return res.status(409).json({ error: 'An account already exists for this email. Try logging in instead.' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = { name: name.trim(), email, address: address.trim(), passwordHash, createdAt: new Date().toISOString() }
  users.set(email, user)

  const token = jwt.sign({ email, role: 'citizen' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user: publicUser(user) })
})

// ---------- Citizen login ----------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!isEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required.' })
  const user = users.get(email)
  if (!user) return res.status(404).json({ error: 'No account found for this email. Register first.' })
  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return res.status(401).json({ error: 'Incorrect password.' })
  const token = jwt.sign({ email, role: 'citizen' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, user: publicUser(user) })
})

// ---------- Officer login ----------
app.post('/api/auth/officer-login', async (req, res) => {
  const { officerId, password } = req.body || {}
  const officer = officers.find(o => o.id.toLowerCase() === String(officerId || '').toLowerCase())
  if (!officer) return res.status(404).json({ error: 'No officer found with that ID.' })
  if (password !== OFFICER_DEMO_PASSWORD) return res.status(401).json({ error: 'Incorrect password.' })
  const token = jwt.sign({ officerId: officer.id, role: 'officer' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ ok: true, token, officer })
})

// ---------- Session ----------
app.get('/api/session', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.role === 'officer') {
      const officer = officers.find(o => o.id === payload.officerId)
      if (!officer) return res.status(401).json({ error: 'Officer account no longer exists.' })
      return res.json({ role: 'officer', officer })
    }
    const user = users.get(payload.email)
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' })
    res.json({ role: 'citizen', user: publicUser(user) })
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' })
  }
})

// ---------- Officer directory (public - the missing transparency) ----------
app.get('/api/officers', (req, res) => {
  const withStats = officers.map(o => ({ ...o, ...officerStats(o.id, requests) }))
  res.json({ officers: withStats })
})

app.get('/api/departments', (req, res) => {
  res.json({ departments })
})

// ---------- File a new RTI request ----------
app.post('/api/requests', requireAuth, (req, res) => {
  if (req.auth.role !== 'citizen') return res.status(403).json({ error: 'Citizen login required.' })
  const { plainRequest, draft, deptOverride, applicant } = req.body || {}
  if (!plainRequest?.trim() || !draft?.trim()) return res.status(400).json({ error: 'plainRequest and draft are required.' })

  const user = users.get(req.auth.email)
  const dept = deptOverride || routeDepartment(plainRequest)
  const applicantState = applicant?.state || ''
  const { officer, assignmentNote } = assignOfficer(dept, applicantState, requests)

  const record = {
    id: `RTI-${requestSeq++}`,
    applicantEmail: user.email,
    applicantName: user.name,
    plainRequest: plainRequest.trim(),
    draft: draft.trim(),
    dept,
    officerId: officer.id,
    officerName: officer.name,
    officerState: officer.state,
    assignmentNote,
    filedAt: new Date().toISOString(),
    status: 'pending',
    resolvedAt: null,
    rejectionReason: null,
    reply: null,
    // Applicant/request detail fields mirroring the official RTI Online form
    applicantDetails: {
      mobile: applicant?.mobile?.trim() || '',
      gender: applicant?.gender || '',
      address: applicant?.address?.trim() || user.address,
      pinCode: applicant?.pinCode?.trim() || '',
      state: applicant?.state || '',
      areaStatus: applicant?.areaStatus || '',
      educationalStatus: applicant?.educationalStatus || '',
      citizenship: 'Indian',
      isBPL: applicant?.isBPL || 'No',
      bplCardNo: applicant?.isBPL === 'Yes' ? (applicant?.bplCardNo?.trim() || '') : '',
      bplYearOfIssue: applicant?.isBPL === 'Yes' ? (applicant?.bplYearOfIssue?.trim() || '') : '',
      bplIssuingAuthority: applicant?.isBPL === 'Yes' ? (applicant?.bplIssuingAuthority?.trim() || '') : '',
    },
  }
  requests.push(record)
  res.json({ request: record })
})

// ---------- Citizen: my submissions + accept/reject summary ----------
app.get('/api/requests/mine', requireAuth, (req, res) => {
  if (req.auth.role !== 'citizen') return res.status(403).json({ error: 'Citizen login required.' })
  const mine = requests.filter(r => r.applicantEmail === req.auth.email).sort((a, b) => new Date(b.filedAt) - new Date(a.filedAt))
  const summary = {
    total: mine.length,
    accepted: mine.filter(r => r.status === 'accepted').length,
    rejected: mine.filter(r => r.status === 'rejected').length,
    pending: mine.filter(r => r.status === 'pending').length,
  }
  res.json({ requests: mine, summary })
})

// ---------- Citizen: escalate an overdue request to First Appeal ----------
app.post('/api/requests/:id/escalate', requireAuth, (req, res) => {
  const record = requests.find(r => r.id === req.params.id && r.applicantEmail === req.auth.email)
  if (!record) return res.status(404).json({ error: 'Request not found.' })
  record.escalated = true
  res.json({ request: record })
})

// ---------- Officer: dashboard (their own queue) ----------
app.get('/api/officer/requests', requireAuth, requireOfficer, (req, res) => {
  const mine = requests.filter(r => r.officerId === req.auth.officerId).sort((a, b) => new Date(b.filedAt) - new Date(a.filedAt))
  res.json({ requests: mine, stats: officerStats(req.auth.officerId, requests) })
})

// ---------- Officer: resolve a request (accept/reject) ----------
app.post('/api/officer/requests/:id/resolve', requireAuth, requireOfficer, (req, res) => {
  const { decision, reason, reply } = req.body || {}
  if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be accepted or rejected.' })
  if (decision === 'accepted' && !reply?.trim()) return res.status(400).json({ error: 'A reply is required to accept a request.' })
  const record = requests.find(r => r.id === req.params.id && r.officerId === req.auth.officerId)
  if (!record) return res.status(404).json({ error: 'Request not found in your queue.' })
  if (record.status !== 'pending') return res.status(409).json({ error: 'Already resolved.' })

  record.status = decision
  record.resolvedAt = new Date().toISOString()
  record.rejectionReason = decision === 'rejected' ? (reason?.trim() || REJECTION_REASONS[0]) : null
  record.reply = decision === 'accepted' ? reply.trim() : null
  res.json({ request: record })
})

app.get('/api/officer/rejection-reasons', requireAuth, requireOfficer, (req, res) => {
  res.json({ reasons: REJECTION_REASONS })
})

// ---------- Shared OpenRouter caller ----------
async function callModel(systemPrompt, userPrompt, { json = false } = {}) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set on the server.')
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.APP_URL || 'https://rti-plus.app',
      'X-Title': 'RTI',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.3,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!r.ok) {
    console.error('OpenRouter error:', await r.text())
    throw new Error('AI request failed.')
  }
  const data = await r.json()
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Model returned no content.')
  return content
}

// ---------- AI draft agent (OpenAI model, via OpenRouter) ----------
app.post('/api/draft', async (req, res) => {
  const { plainRequest, dept, applicantName } = req.body || {}
  if (!plainRequest?.trim()) return res.status(400).json({ error: 'plainRequest is required.' })

  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const systemPrompt = `You draft formal Indian Right to Information (RTI) applications under Section 6(1) of the RTI Act, 2005. Output only the final application text - no preamble, no markdown, no explanation. Do not use em dashes anywhere in the output; use commas, periods, or regular hyphens instead. Never phrase points as "why" or "how" questions demanding justification - RTI only covers requests for existing records, so rewrite justification-seeking language into a request for the relevant records, file notings, or correspondence instead. Follow this structure: addressee line to the Public Information Officer of the given department, subject line citing Section 6(1), a polite salutation, 2-4 numbered information points derived from the citizen's plain-English request, a line requesting the 30-day statutory reply under Section 7(1), the date, and a closing "Yours faithfully" with the applicant's name.`
  const userPrompt = `Department: ${dept}\nApplicant name: ${applicantName || '[Applicant Name]'}\nToday's date: ${today}\nCitizen's request in plain English: "${plainRequest.trim()}"`

  try {
    const draft = await callModel(systemPrompt, userPrompt)
    res.json({ draft })
  } catch (err) {
    console.error('Draft agent failed:', err)
    res.status(502).json({ error: err.message })
  }
})

// ---------- AI rejection-risk checker ----------
// Reviews the drafted application for the specific, documented ways
// RTI applications actually get rejected, before the citizen files.
app.post('/api/analyze-risk', async (req, res) => {
  const { draft } = req.body || {}
  if (!draft?.trim()) return res.status(400).json({ error: 'draft is required.' })

  const systemPrompt = `You review formal Indian RTI applications for rejection risk, based on real documented rejection grounds: (1) phrasing that demands justification via "why" or "how" instead of requesting existing records, (2) vague or multiple unrelated questions bundled into one application, (3) information likely covered by a Section 8 exemption (personal information with no public interest, cabinet papers, ongoing investigation details), (4) requests for records that likely do not exist in the form asked. Respond with ONLY a JSON object, no markdown, in this exact shape: {"riskLevel": "low" | "medium" | "high", "issues": ["short issue 1", "short issue 2"], "note": "one short sentence"}. If there are no issues, use riskLevel "low" and an empty issues array.`
  const userPrompt = `Review this drafted RTI application:\n\n${draft.trim()}`

  try {
    const raw = await callModel(systemPrompt, userPrompt, { json: true })
    const parsed = JSON.parse(raw)
    res.json(parsed)
  } catch (err) {
    console.error('Risk check failed:', err)
    res.status(502).json({ error: err.message })
  }
})

// ---------- AI officer reply suggestion ----------
app.post('/api/officer/suggest-reply', requireAuth, requireOfficer, async (req, res) => {
  const { plainRequest, dept } = req.body || {}
  if (!plainRequest?.trim()) return res.status(400).json({ error: 'plainRequest is required.' })

  const systemPrompt = `You are a Public Information Officer drafting a plausible, brief reply to an RTI request, for a hackathon prototype using mock data. Invent realistic-sounding but clearly fictional details (dates, counts, names of internal processes) - never claim this is real government data. Output only the reply text, 2-4 sentences, no preamble, no em dashes.`
  const userPrompt = `Department: ${dept}\nCitizen's request: "${plainRequest.trim()}"\n\nDraft a short reply as if providing the requested information.`

  try {
    const reply = await callModel(systemPrompt, userPrompt)
    res.json({ reply })
  } catch (err) {
    console.error('Reply suggestion failed:', err)
    res.status(502).json({ error: err.message })
  }
})

// ---------- Seed data for reviewers ----------
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
  console.log(`[seed] Citizen demo account - ${email} / ReviewMe#2026`)
  console.log(`[seed] Officer demo login - any officer ID (e.g. PIO-DL-010) / ${OFFICER_DEMO_PASSWORD}`)
}
seedDemoAccount()

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`RTI auth server on :${port}`))
