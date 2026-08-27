import { useMemo } from 'react'

const DAY = 24 * 60 * 60 * 1000

function daysLeft(filedAt) {
  const deadline = new Date(filedAt.getTime() + 30 * DAY)
  const diff = Math.ceil((deadline - new Date()) / DAY)
  return diff
}

export default function StatusTracker({ requests, onEscalate }) {
  if (requests.length === 0) {
    return (
      <div className="sheet empty-state">
        <h3>No applications filed yet</h3>
        <p className="muted">File one from the "New request" tab - it'll show up here with a live 30-day countdown.</p>
      </div>
    )
  }

  return (
    <>
      {requests.map(r => (
        <RequestCard key={r.id} r={r} onEscalate={onEscalate} />
      ))}
    </>
  )
}

function RequestCard({ r, onEscalate }) {
  const left = useMemo(() => daysLeft(r.filedAt), [r.filedAt])
  const overdue = left < 0
  const status = r.escalated ? 'escalated' : overdue ? 'overdue' : 'pending'
  const statusLabel = r.escalated ? 'First appeal filed' : overdue ? 'Deadline passed' : `${left}d remaining`

  return (
    <div className="sheet">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow mono">{r.id}</div>
          <h3>{r.plainRequest.length > 70 ? r.plainRequest.slice(0, 70) + '…' : r.plainRequest}</h3>
        </div>
        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
          <span className={`stamp ${status}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="timeline" style={{ marginTop: 14 }}>
        <div className="timeline-item done">
          <div className="timeline-date">{r.filedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          <div>Filed with {r.dept}, assigned to {r.officer.name}</div>
        </div>
        <div className={`timeline-item ${overdue ? 'warn' : ''}`}>
          <div className="timeline-date">
            {new Date(r.filedAt.getTime() + 30 * DAY).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
          <div>Statutory 30-day reply deadline {overdue ? '- passed, no response logged' : ''}</div>
        </div>
        {r.escalated && (
          <div className="timeline-item warn">
            <div className="timeline-date">Today</div>
            <div>First Appeal auto-drafted and filed</div>
          </div>
        )}
      </div>

      {overdue && !r.escalated && (
        <button className="danger" onClick={() => onEscalate(r.id)}>
          Auto-draft &amp; file First Appeal
        </button>
      )}
    </div>
  )
}
