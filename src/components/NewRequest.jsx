import { useState } from 'react'
import { routeDepartment, departments } from '../data/officers'
import { indianStates } from '../data/states'
import { draftApplication } from '../lib/draftAgent'
import { fileRequest } from '../lib/authClient'

const emptyApplicant = {
  mobile: '',
  gender: '',
  pinCode: '',
  state: '',
  areaStatus: '',
  educationalStatus: '',
  isBPL: 'No',
  bplCardNo: '',
  bplYearOfIssue: '',
  bplIssuingAuthority: '',
}

export default function NewRequest({ applicantName, applicantAddress, token, onFiled }) {
  const [step, setStep] = useState('details') // details -> input -> drafting -> review -> filing
  const [dept, setDept] = useState(departments[0])
  const [applicant, setApplicant] = useState({ ...emptyApplicant })
  const [plainRequest, setPlainRequest] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  function setField(field, value) {
    setApplicant(a => ({ ...a, [field]: value }))
  }

  function submitDetails(e) {
    e.preventDefault()
    setStep('input')
  }

  async function handleDraft(e) {
    e.preventDefault()
    if (!plainRequest.trim()) return
    setStep('drafting')
    setError('')
    const routedDept = dept || routeDepartment(plainRequest)
    const text = await draftApplication({ plainRequest, dept: routedDept, applicantName })
    setDraft(text)
    setStep('review')
  }

  async function file() {
    setStep('filing')
    setError('')
    try {
      const data = await fileRequest(plainRequest, draft, dept, applicant, token)
      onFiled(data.request)
      setPlainRequest('')
      setDraft('')
      setApplicant({ ...emptyApplicant })
      setStep('details')
    } catch (err) {
      setError(err.message)
      setStep('review')
    }
  }

  if (step === 'details') {
    return (
      <div className="sheet">
        <div className="eyebrow">Step one - applicant &amp; public authority details</div>
        <h2>Before you file</h2>
        <p className="muted">Same fields the official RTI Online form asks for. Name, email and address come from your account.</p>

        <form onSubmit={submitDetails}>
          <label>Select public authority / department</label>
          <select value={dept} onChange={e => setDept(e.target.value)}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <hr className="divider" />
          <div className="eyebrow">Personal details</div>

          <label>Name</label>
          <input value={applicantName} disabled />
          <label>Address</label>
          <textarea value={applicantAddress} disabled style={{ minHeight: 50 }} />

          <div className="row">
            <div>
              <label>Mobile number (for SMS alerts)</label>
              <input value={applicant.mobile} onChange={e => setField('mobile', e.target.value)} placeholder="+91" />
            </div>
            <div>
              <label>Pin code</label>
              <input value={applicant.pinCode} onChange={e => setField('pinCode', e.target.value)} maxLength={6} />
            </div>
          </div>

          <label>Gender</label>
          <select value={applicant.gender} onChange={e => setField('gender', e.target.value)} required>
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Third Gender</option>
          </select>

          <label>State</label>
          <select value={applicant.state} onChange={e => setField('state', e.target.value)} required>
            <option value="">Select</option>
            {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="row">
            <div>
              <label>Status</label>
              <select value={applicant.areaStatus} onChange={e => setField('areaStatus', e.target.value)} required>
                <option value="">Select</option>
                <option>Rural</option>
                <option>Urban</option>
              </select>
            </div>
            <div>
              <label>Educational status</label>
              <select value={applicant.educationalStatus} onChange={e => setField('educationalStatus', e.target.value)} required>
                <option value="">Select</option>
                <option>Literate</option>
                <option>Illiterate</option>
              </select>
            </div>
          </div>

          <label>Citizenship</label>
          <input value="Indian (only Indian citizens can file RTI requests)" disabled />

          <label>Is the applicant below poverty line?</label>
          <select value={applicant.isBPL} onChange={e => setField('isBPL', e.target.value)}>
            <option>No</option>
            <option>Yes</option>
          </select>

          {applicant.isBPL === 'Yes' && (
            <div className="sheet" style={{ padding: 14, margin: '10px 0' }}>
              <p className="muted" style={{ fontSize: 12 }}>No RTI fee is required for BPL applicants, per RTI Rules 2012.</p>
              <label>BPL card number</label>
              <input value={applicant.bplCardNo} onChange={e => setField('bplCardNo', e.target.value)} />
              <div className="row">
                <div>
                  <label>Year of issue</label>
                  <input value={applicant.bplYearOfIssue} onChange={e => setField('bplYearOfIssue', e.target.value)} />
                </div>
                <div>
                  <label>Issuing authority</label>
                  <input value={applicant.bplIssuingAuthority} onChange={e => setField('bplIssuingAuthority', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" style={{ marginTop: 16 }}>Continue to request text &rarr;</button>
        </form>
      </div>
    )
  }

  return (
    <div className="sheet">
      <div className="eyebrow">Step two - describe it plainly</div>
      <h2>What do you want to know?</h2>
      <p className="muted">Write it the way you'd say it out loud. The agent handles the legal language.</p>

      <form onSubmit={handleDraft}>
        <label>Text for RTI request (up to 3000 characters)</label>
        <textarea
          placeholder="e.g. Why hasn't the pothole on MG Road near the school been fixed despite three complaints?"
          value={plainRequest}
          onChange={e => setPlainRequest(e.target.value)}
          maxLength={3000}
          disabled={step !== 'input'}
        />
        <div className="row" style={{ marginTop: 12 }}>
          {step === 'input' && <button type="submit">Draft formal application &rarr;</button>}
          {step === 'input' && <button type="button" className="secondary" onClick={() => setStep('details')}>Back</button>}
        </div>
      </form>

      {step === 'drafting' && <p className="muted" style={{ marginTop: 14 }}>Drafting and checking for rejection-risk phrasing...</p>}

      {(step === 'review' || step === 'filing') && (
        <>
          <hr className="divider" />
          <div className="eyebrow">Routed to</div>
          <div className="sheet" style={{ margin: '0 0 14px', padding: 14 }}>
            <strong>{dept}</strong>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Officer assignment happens on filing - routed to whoever in this department has the lightest queue right now.</div>
          </div>

          <div className="eyebrow" style={{ marginTop: 16 }}>Review draft</div>
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
