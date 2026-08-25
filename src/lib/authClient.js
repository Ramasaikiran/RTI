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

export const registerRequestOtp = (name, email, address) =>
  post('/api/auth/register/request-otp', { name, email, address })
export const registerVerify = (email, otp) =>
  post('/api/auth/register/verify', { email, otp })

export const loginRequestOtp = (email) =>
  post('/api/auth/login/request-otp', { email })
export const loginVerify = (email, otp) =>
  post('/api/auth/login/verify', { email, otp })

export async function getSession(token) {
  const res = await fetch(`${API_BASE}/api/session`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}
