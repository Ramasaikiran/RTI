import { useState } from 'react'
import { routeDepartment } from '../data/officers'
import { draftApplication } from '../lib/draftAgent'
import { fileRequest } from '../lib/authClient'

export default function NewRequest({ applicantName, token, onFiled }) {
  const [plainRequest, setPlainRequest] = useState('')
  const [step, setStep] = useState('input') // input -> drafting -> review -> filing
  const [draft, setDraft] = useState('')
  const [dept, setDept] = useState('')
  const [error, setError] = useState('')

  async function handleDraft(e) {
    e.preventDefault()
    if (!plainRequest.trim()) return
    setStep('drafting')
    setError('')
    const routedDept = routeDepartment(plainRequest)
    const text = await draftApplication({ plainRequest, dept: routedDept, applicantName })
    setDept(routedDept)
    setDraft(text)
    setStep('review')
  }

  async function file() {
    setStep('filing')
    setError('')
    try {
      const data = await fileRequest(plainRequest, draft, token)
      onFiled(data.request)
      setPlainRequest('')
      setDraft('')
      setStep('input')
    } catch (err) {
      setError(err.message)
      setStep('review')
    }
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
          <button type="submit" style={{ marginTop: 12 }}>Draft formal application &rarr;</button>
        )}
      </form>

      {step === 'drafting' && <p className="muted" style={{ marginTop: 14 }}>Drafting and checking for rejection-risk phrasing...</p>}

      {(step === 'review' || step === 'filing') && (
        <>
          <hr className="divider" />
          <div className="eyebrow">Step two - routed department</div>
          <div className="sheet" style={{ margin: '0 0 14px', padding: 14 }}>
            <div className="muted" style={{ fontSize: 11.5 }}>Department</div>
            <strong>{dept}</strong>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Officer assignment happens on filing - routed to whoever in this department has the lightest queue right now.</div>
          </div>

          <div className="eyebrow" style={{ marginTop: 16 }}>Step three - review draft</div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{ minHeight: 260, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
            disabled={step === 'filing'}
          />
          {error && <div className="error-box">{error}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button onClick={file} disabled={step === 'filing'}>
              {step === 'filing' ? 'Filing...' : 'File this application'}
            </button>
            <button className="secondary" onClick={() => setStep('input')} disabled={step === 'filing'}>Start over</button>
          </div>
        </>
      )}
    </div>
  )
}
