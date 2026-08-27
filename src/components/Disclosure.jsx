import { useState } from 'react'

export default function Disclosure() {
  const [open, setOpen] = useState(false)
  return (
    <div className="sheet" style={{ padding: 14, marginBottom: 18 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="eyebrow" style={{ margin: 0 }}>What's real vs. mocked in this build</div>
        <span className="mono" style={{ fontSize: 11 }}>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <p><strong>Real:</strong> account login (bcrypt-hashed passwords, JWT sessions), AI drafting via OpenAI, 30-day deadline math, assignment logic.</p>
          <p><strong>Mocked:</strong> officer directory and their pending-load numbers, department routing keywords, application filing (nothing is sent to a real government office).</p>
          <p className="muted">Built for the "Build What Moves India" brief - targets RTI Online, since IRCTC's own redesign already shipped in July 2026.</p>
        </div>
      )}
    </div>
  )
}
