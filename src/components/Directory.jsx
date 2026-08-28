import { useEffect, useState } from 'react'
import { getOfficers } from '../lib/authClient'

export default function Directory() {
  const [officers, setOfficers] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getOfficers()
      .then(data => setOfficers(data.officers))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div className="sheet">
      <div className="eyebrow">What rtionline.gov.in never shows you</div>
      <h2>Officer directory</h2>
      <p className="muted">
        Every Public Information Officer, their department, and live
        workload - pending, resolved today, resolved total. Tap a
        name for their full profile.
      </p>
      <hr className="divider" />

      {error && <div className="error-box">{error}</div>}
      {!officers && !error && <p className="muted">Loading...</p>}

      {officers?.sort((a, b) => a.dept.localeCompare(b.dept) || a.pending - b.pending).map(o => (
        <div key={o.id}>
          <div
            className="officer-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
          >
            <div>
              <div className="officer-name">{o.name}</div>
              <div className="officer-dept">{o.designation} - {o.dept}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{o.id} - avg reply {o.avgReplyDays}d</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 12 }}>{o.pending} pending</div>
              <div className={`load-bar ${o.pending > 6 ? 'high' : o.pending > 3 ? 'mid' : ''}`}>
                <div style={{ width: `${Math.min(o.pending * 12, 100)}%` }} />
              </div>
            </div>
          </div>
          {expanded === o.id && (
            <div className="sheet" style={{ margin: '0 0 12px', padding: 14 }}>
              <div className="row" style={{ textAlign: 'center' }}>
                <MiniStat label="Pending" value={o.pending} />
                <MiniStat label="Resolved today" value={o.resolvedToday} />
                <MiniStat label="Resolved total" value={o.totalResolved} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  )
}
