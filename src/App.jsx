import { useEffect, useState } from 'react'
import { getSession } from './lib/authClient'
import Register from './components/Register'
import Login from './components/Login'
import NewRequest from './components/NewRequest'
import Directory from './components/Directory'
import StatusTracker from './components/StatusTracker'

export default function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [tab, setTab] = useState('new')
  const [requests, setRequests] = useState([])
  const [authView, setAuthView] = useState('login')

  useEffect(() => {
    const token = localStorage.getItem('rtiplus_token')
    if (!token) {
      setCheckingSession(false)
      return
    }
    getSession(token).then(u => {
      if (u) setUser(u)
      else localStorage.removeItem('rtiplus_token')
      setCheckingSession(false)
    })
  }, [])

  function signOut() {
    localStorage.removeItem('rtiplus_token')
    setUser(null)
    setRequests([])
  }

  function fileRequest(req) {
    setRequests(prev => [req, ...prev])
    setTab('status')
  }

  function escalate(id) {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, escalated: true } : r)))
  }

  if (checkingSession) return null

  return (
    <div className="app-shell">
      <div className="masthead">
        <div className="mark">
          RTI+
          <small>F.No. RTI-PLUS/2026/PROTOTYPE</small>
        </div>
        {user && (
          <div className="file-ref">
            {user.email}<br />
            <a href="#" onClick={e => { e.preventDefault(); signOut() }}>Sign out</a>
          </div>
        )}
      </div>

      {!user ? (
        authView === 'login' ? (
          <Login onAuthed={setUser} switchToRegister={() => setAuthView('register')} />
        ) : (
          <Register onAuthed={setUser} switchToLogin={() => setAuthView('login')} />
        )
      ) : (
        <>
          <div className="folder-tabs">
            <button className={`folder-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>New request</button>
            <button className={`folder-tab ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>My status ({requests.length})</button>
            <button className={`folder-tab ${tab === 'directory' ? 'active' : ''}`} onClick={() => setTab('directory')}>Officer directory</button>
          </div>

          {tab === 'new' && <NewRequest applicantName={user.email?.split('@')[0]} onFiled={fileRequest} />}
          {tab === 'status' && <StatusTracker requests={requests} onEscalate={escalate} />}
          {tab === 'directory' && <Directory />}
        </>
      )}
    </div>
  )
}
