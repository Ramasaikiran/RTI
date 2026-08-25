const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed.')
  return data
}

export const register = (name, email, address, password, confirmPassword) =>
  post('/api/auth/register', { name, email, address, password, confirmPassword })

export const login = (email, password) =>
  post('/api/auth/login', { email, password })

export async function getSession(token) {
  const res = await fetch(`${API_BASE}/api/session`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}
