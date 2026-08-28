const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed.')
  return data
}

// Citizen auth
export const register = (name, email, address, password, confirmPassword) =>
  call('/api/auth/register', { method: 'POST', body: { name, email, address, password, confirmPassword } })
export const login = (email, password) =>
  call('/api/auth/login', { method: 'POST', body: { email, password } })

// Officer auth
export const officerLogin = (officerId, password) =>
  call('/api/auth/officer-login', { method: 'POST', body: { officerId, password } })

// Session (works for either role)
export const getSession = (token) =>
  call('/api/session', { token }).catch(() => null)

// Officer directory (public)
export const getOfficers = () => call('/api/officers')

// Citizen requests
export const fileRequest = (plainRequest, draft, token) =>
  call('/api/requests', { method: 'POST', body: { plainRequest, draft }, token })
export const getMyRequests = (token) =>
  call('/api/requests/mine', { token })
export const escalateRequest = (id, token) =>
  call(`/api/requests/${id}/escalate`, { method: 'POST', token })

// Officer dashboard
export const getOfficerQueue = (token) =>
  call('/api/officer/requests', { token })
export const resolveRequest = (id, decision, reason, token) =>
  call(`/api/officer/requests/${id}/resolve`, { method: 'POST', body: { decision, reason }, token })
export const getRejectionReasons = (token) =>
  call('/api/officer/rejection-reasons', { token })
