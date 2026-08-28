import { useMemo } from 'react'

const DAY = 24 * 60 * 60 * 1000

function daysLeft(filedAt) {
  const deadline = new Date(filedAt).getTime() + 30 * DAY
  return Math.ceil((deadline - Date.now()) / DAY)
}

export default function StatusTracker({ requests, summary, onEscalate }) {
  if (requests.length === 0) {
    return (
      <div className="sheet empty-state">
        <div className="redacted-lines">
          <div></div><div></div><div></div><div></div>
        </div>
        <h3>Nothing on file yet</h3>
        <p className="muted">File a request from "New request" - it'll show up here with a live 30-day countdown.</p>
      </div>
    )
  }

  return (
    <>
      <div className="sheet" style={{ padding: 16 }}>
        <div className="eyebrow">Your submission record</div>
        <div className="row" style={{ textAlign: 'center', marginTop: 8 }}>
          <Stat label="Filed" value={summary.total} />
          <Stat label="Accepted" value={summary.accepted} tone="registry-green" />
          <Stat label="Rejected" value={summary.rejected} tone="stamp-red" />
          <Stat label="Pending" value={summary.pending} tone="brass" />
        </div>
      </div>

      {requests.map(r => (
        <RequestCard key={r.id} r={r} onEscalate={onEscalate} />
      ))}
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

function RequestCard({ r, onEscalate }) {
  const left = useMemo(() => daysLeft(r.filedAt), [r.filedAt])
  const overdue = left < 0 && r.status === 'pending'

  let statusClass = 'pending'
  let statusLabel = `${left}d remaining`
  if (r.status === 'accepted') { statusClass = 'filed'; statusLabel = 'Accepted' }
  else if (r.status === 'rejected') { statusClass = 'overdue'; statusLabel = 'Rejected' }
  else if (r.escalated) { statusClass = 'escalated'; statusLabel = 'First appeal filed' }
  else if (overdue) { statusClass = 'overdue'; statusLabel = 'Deadline passed' }

  return (
    <div className="sheet">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow mono">{r.id}</div>
          <h3>{r.plainRequest.length > 70 ? r.plainRequest.slice(0, 70) + '...' : r.plainRequest}</h3>
        </div>
        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
          <span className={`stamp ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="timeline" style={{ marginTop: 14 }}>
        <div className="timeline-item done">
          <div className="timeline-date">{new Date(r.filedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          <div>Filed with {r.dept}, assigned to {r.officerName} ({r.officerState})</div>
        </div>
        {r.assignmentNote && (
          <div className="timeline-item">
            <div className="timeline-date">Note</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{r.assignmentNote}</div>
          </div>
        )}

        {r.status === 'pending' && (
          <div className={`timeline-item ${overdue ? 'warn' : ''}`}>
            <div className="timeline-date">
              {new Date(new Date(r.filedAt).getTime() + 30 * DAY).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
            <div>Statutory 30-day reply deadline {overdue ? '- passed, no response logged' : ''}</div>
          </div>
        )}

        {r.status !== 'pending' && (
          <div className={`timeline-item ${r.status === 'rejected' ? 'warn' : 'done'}`}>
            <div className="timeline-date">{new Date(r.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
            <div>{r.status === 'accepted' ? 'Marked accepted by ' + r.officerName : 'Rejected by ' + r.officerName}</div>
          </div>
        )}

        {r.escalated && (
          <div className="timeline-item warn">
            <div className="timeline-date">Today</div>
            <div>First Appeal auto-drafted and filed</div>
          </div>
        )}
      </div>

      {r.status === 'accepted' && r.reply && (
        <div className="sheet" style={{ padding: 14, marginTop: 4, background: 'var(--registry-green-soft)' }}>
          <strong>Reply from {r.officerName}:</strong>
          <p style={{ margin: '6px 0 0' }}>{r.reply}</p>
        </div>
      )}

      {r.status === 'rejected' && r.rejectionReason && (
        <div className="error-box" style={{ marginTop: 4 }}>
          <strong>Reason given:</strong> {r.rejectionReason}
        </div>
      )}

      {overdue && !r.escalated && (
        <button className="danger" onClick={() => onEscalate(r.id)}>
          Auto-draft &amp; file First Appeal
        </button>
      )}
    </div>
  )
}
