import { useEffect, useState } from 'react'
import { getOfficerQueue, resolveRequest, getRejectionReasons } from '../lib/authClient'

export default function OfficerDashboard({ token, officer }) {
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ pending: 0, resolvedToday: 0, totalResolved: 0 })
  const [reasons, setReasons] = useState([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const [queueData, reasonData] = await Promise.all([
        getOfficerQueue(token),
        getRejectionReasons(token),
      ])
      setRequests(queueData.requests)
      setStats(queueData.stats)
      setReasons(reasonData.reasons)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, [])

  async function resolve(id, decision, extra) {
    setError('')
    try {
      await resolveRequest(id, decision, extra.reason, extra.reply, token)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <>
      <div className="sheet">
        <div className="eyebrow">{officer.id} - {officer.dept}</div>
        <h2>{officer.name}</h2>
        <div className="row" style={{ textAlign: 'center', marginTop: 10 }}>
          <Stat label="Pending" value={stats.pending} tone="brass" />
          <Stat label="Resolved today" value={stats.resolvedToday} tone="registry-green" />
          <Stat label="Resolved total" value={stats.totalResolved} />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Queue ({pending.length})</div>
      {pending.length === 0 && <p className="muted">Nothing pending. Queue is clear.</p>}
      {pending.map(r => (
        <QueueCard key={r.id} r={r} reasons={reasons} onResolve={resolve} />
      ))}

      {resolved.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: '18px 0 8px' }}>Resolved ({resolved.length})</div>
          {resolved.map(r => (
            <div className="sheet" key={r.id} style={{ padding: 14 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="eyebrow mono">{r.id}</div>
                  <div style={{ fontSize: 13.5 }}>{r.plainRequest}</div>
                </div>
                <span className={`stamp ${r.status === 'accepted' ? 'filed' : 'overdue'}`}>{r.status}</span>
              </div>
              {r.status === 'accepted' && r.reply && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}><strong>Reply sent:</strong> {r.reply}</p>
              )}
            </div>
          ))}
        </>
      )}
    </>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: tone ? `var(--${tone})` : 'var(--ink)' }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  )
}

function QueueCard({ r, reasons, onResolve }) {
  const [mode, setMode] = useState(null) // null | 'accepting' | 'rejecting'
  const [reason, setReason] = useState(reasons[0] || '')
  const [reply, setReply] = useState('')
  const [applicantOpen, setApplicantOpen] = useState(false)
  const a = r.applicantDetails || {}

  return (
    <div className="sheet">
      <div className="eyebrow mono">{r.id} - filed {new Date(r.filedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
      <h3>{r.plainRequest}</h3>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 12, background: '#fff', border: '1px solid var(--rule)', padding: 10, borderRadius: 2 }}>{r.draft}</pre>

      <div
        className="eyebrow"
        style={{ cursor: 'pointer', marginTop: 10 }}
        onClick={() => setApplicantOpen(o => !o)}
      >
        {applicantOpen ? '\u2212' : '+'} Applicant details
      </div>
      {applicantOpen && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>
          {r.applicantName} - {a.address}{a.pinCode ? `, ${a.pinCode}` : ''}{a.state ? `, ${a.state}` : ''}<br />
          {a.gender && <>Gender: {a.gender}. </>}
          {a.areaStatus && <>{a.areaStatus}. </>}
          {a.educationalStatus && <>{a.educationalStatus}. </>}
          {a.mobile && <>Mobile: {a.mobile}. </>}
          {a.isBPL === 'Yes' && <>BPL: card {a.bplCardNo}, issued {a.bplYearOfIssue} by {a.bplIssuingAuthority}.</>}
        </div>
      )}

      {mode === null && (
        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={() => setMode('accepting')}>Accept</button>
          <button className="danger" onClick={() => setMode('rejecting')}>Reject</button>
        </div>
      )}

      {mode === 'accepting' && (
        <>
          <label>Reply to the applicant (required to accept)</label>
          <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="The information requested is as follows..." style={{ minHeight: 80 }} />
          <div className="row" style={{ marginTop: 12 }}>
            <button onClick={() => reply.trim() && onResolve(r.id, 'accepted', { reply })} disabled={!reply.trim()}>Send reply &amp; accept</button>
            <button className="secondary" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </>
      )}

      {mode === 'rejecting' && (
        <>
          <label>Rejection reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)}>
            {reasons.map(r2 => <option key={r2} value={r2}>{r2}</option>)}
          </select>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="danger" onClick={() => onResolve(r.id, 'rejected', { reason })}>Confirm rejection</button>
            <button className="secondary" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
