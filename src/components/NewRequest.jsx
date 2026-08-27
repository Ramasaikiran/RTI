import { useState } from 'react'
import { routeDepartment, assignOfficer } from '../data/officers'
import { draftApplication } from '../lib/draftAgent'

export default function NewRequest({ applicantName, onFiled }) {
  const [plainRequest, setPlainRequest] = useState('')
  const [step, setStep] = useState('input') // input -> drafting -> review
  const [draft, setDraft] = useState('')
  const [dept, setDept] = useState('')
  const [officer, setOfficer] = useState(null)

  async function handleDraft(e) {
    e.preventDefault()
    if (!plainRequest.trim()) return
    setStep('drafting')
    const routedDept = routeDepartment(plainRequest)
    const assigned = assignOfficer(routedDept)
    const text = await draftApplication({ plainRequest, dept: routedDept, applicantName })
    setDept(routedDept)
    setOfficer(assigned)
    setDraft(text)
    setStep('review')
  }

  function file() {
    onFiled({
      id: `RTI-${Math.floor(1000 + Math.random() * 9000)}`,
      plainRequest,
      draft,
      dept,
      officer,
      filedAt: new Date(),
    })
    setPlainRequest('')
    setDraft('')
    setStep('input')
  }

  return (
    <div className="sheet">
      <div className="eyebrow">Step one - describe it plainly</div>
      <h2>What do you want to know?</h2>
      <p className="muted">Write it the way you'd say it out loud. The agent handles the legal language.</p>

      <form onSubmit={handleDraft}>
        <textarea
          placeholder="e.g. Why hasn't the pothole on MG Road near the school been fixed despite three complaints?"
          value={plainRequest}
          onChange={e => setPlainRequest(e.target.value)}
          disabled={step !== 'input'}
        />
        {step === 'input' && (
          <button type="submit" style={{ marginTop: 12 }}>Draft formal application →</button>
        )}
      </form>

      {step === 'drafting' && <p className="muted" style={{ marginTop: 14 }}>Drafting and routing to a department…</p>}

      {step === 'review' && (
        <>
          <hr className="divider" />
          <div className="eyebrow">Step two - routed &amp; assigned</div>
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="sheet" style={{ margin: 0, padding: 14 }}>
              <div className="muted" style={{ fontSize: 11.5 }}>Department</div>
              <strong>{dept}</strong>
            </div>
            <div className="sheet" style={{ margin: 0, padding: 14 }}>
              <div className="muted" style={{ fontSize: 11.5 }}>Assigned officer</div>
              <strong>{officer.name}</strong>
              <div className="muted mono" style={{ fontSize: 11 }}>{officer.id} · load {officer.load}%</div>
            </div>
          </div>

          <div className="eyebrow" style={{ marginTop: 16 }}>Step three - review draft</div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{ minHeight: 260, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
          />
          <div className="row" style={{ marginTop: 14 }}>
            <button onClick={file}>File this application</button>
            <button className="secondary" onClick={() => setStep('input')}>Start over</button>
          </div>
        </>
      )}
    </div>
  )
}
