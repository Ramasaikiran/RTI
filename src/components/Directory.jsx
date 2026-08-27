import { officers, loadTier } from '../data/officers'

export default function Directory() {
  const sorted = [...officers].sort((a, b) => a.dept.localeCompare(b.dept) || a.load - b.load)
  return (
    <div className="sheet">
      <div className="eyebrow">What rtionline.gov.in never shows you</div>
      <h2>Officer directory</h2>
      <p className="muted">
        Every Public Information Officer, their department, and current
        pending load - so assignment isn't a black box.
      </p>
      <hr className="divider" />
      {sorted.map(o => (
        <div className="officer-row" key={o.id}>
          <div>
            <div className="officer-name">{o.name}</div>
            <div className="officer-dept">{o.designation} · {o.dept}</div>
            <div className="muted mono" style={{ fontSize: 11 }}>{o.id} · avg reply {o.avgReplyDays}d</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 12 }}>{o.load}%</div>
            <div className={`load-bar ${loadTier(o.load)}`}>
              <div style={{ width: `${o.load}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
