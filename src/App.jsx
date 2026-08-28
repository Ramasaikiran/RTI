import { useEffect, useState } from 'react'
import { getSession, getMyRequests, escalateRequest } from './lib/authClient'
import Register from './components/Register'
import Login from './components/Login'
import OfficerLogin from './components/OfficerLogin'
import Disclosure from './components/Disclosure'
import NewRequest from './components/NewRequest'
import Directory from './components/Directory'
import StatusTracker from './components/StatusTracker'
import OfficerDashboard from './components/OfficerDashboard'

export default function App() {
  const [session, setSession] = useState(null) // { role, user } | { role, officer }
  const [checkingSession, setCheckingSession] = useState(true)
  const [tab, setTab] = useState('new')
  const [authView, setAuthView] = useState('login') // login | register | officer-login
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({ total: 0, accepted: 0, rejected: 0, pending: 0 })

  const token = () => localStorage.getItem('rtiplus_token')

  useEffect(() => {
    const t = token()
    if (!t) { setCheckingSession(false); return }
    getSession(t).then(s => {
      if (s) setSession(s)
      else localStorage.removeItem('rtiplus_token')
      setCheckingSession(false)
    })
  }, [])

  useEffect(() => {
    if (session?.role === 'citizen') loadMyRequests()
  }, [session])

  async function loadMyRequests() {
    try {
      const data = await getMyRequests(token())
      setRequests(data.requests)
      setSummary(data.summary)
    } catch { /* ignore - shown elsewhere if it matters */ }
  }

  function signOut() {
    localStorage.removeItem('rtiplus_token')
    setSession(null)
    setRequests([])
    setAuthView('login')
  }

  function onFiled() {
    loadMyRequests()
    setTab('status')
  }

  async function escalate(id) {
    await escalateRequest(id, token())
    loadMyRequests()
  }

  if (checkingSession) return null

  const identityLine = session?.role === 'officer' ? session.officer.name : session?.user?.email

  return (
    <div className="app-shell">
      <div className="masthead">
        <div className="mark">
          RTI
          <small>F.No. RTI/2026/PROTOTYPE</small>
        </div>
        {session && (
          <div className="file-ref">
            {identityLine}<br />
            <a href="#" onClick={e => { e.preventDefault(); signOut() }}>Sign out</a>
          </div>
        )}
      </div>

      {!session ? (
        authView === 'login' ? (
          <Login onAuthed={setSession} switchToRegister={() => setAuthView('register')} switchToOfficerLogin={() => setAuthView('officer-login')} />
        ) : authView === 'register' ? (
          <Register onAuthed={(user) => setSession({ role: 'citizen', user })} switchToLogin={() => setAuthView('login')} />
        ) : (
          <OfficerLogin onAuthed={setSession} switchToCitizenLogin={() => setAuthView('login')} />
        )
      ) : session.role === 'officer' ? (
        <OfficerDashboard token={token()} officer={session.officer} />
      ) : (
        <>
          <div className="folder-tabs">
            <button className={`folder-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>New request</button>
            <button className={`folder-tab ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>My status ({summary.total})</button>
            <button className={`folder-tab ${tab === 'directory' ? 'active' : ''}`} onClick={() => setTab('directory')}>Officer directory</button>
          </div>

          {tab === 'new' && <NewRequest applicantName={session.user.name} applicantAddress={session.user.address} token={token()} onFiled={onFiled} />}
          {tab === 'status' && <StatusTracker requests={requests} summary={summary} onEscalate={escalate} />}
          {tab === 'directory' && <Directory />}
        </>
      )}

      <Disclosure />
    </div>
  )
}
