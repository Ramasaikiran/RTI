// Officer directory + assignment engine. Lives server-side now so
// pending counts and resolution stats stay consistent across every
// citizen and officer session, not per-browser local state.

export const officers = [
  { id: 'PIO-DL-014', name: 'R. Krishnamurthy', designation: 'Public Information Officer', dept: 'Municipal Corporation - Roads', avgReplyDays: 19 },
  { id: 'PIO-DL-027', name: 'S. Fatima Sheikh', designation: 'Public Information Officer', dept: 'Municipal Corporation - Roads', avgReplyDays: 27 },
  { id: 'PIO-DL-033', name: 'A. Nair', designation: 'Assistant PIO', dept: 'Municipal Corporation - Sanitation', avgReplyDays: 12 },
  { id: 'PIO-DL-041', name: 'V. Prakash Rao', designation: 'Public Information Officer', dept: 'Electricity Board', avgReplyDays: 31 },
  { id: 'PIO-DL-052', name: 'D. Kaur', designation: 'Public Information Officer', dept: 'Electricity Board', avgReplyDays: 18 },
  { id: 'PIO-DL-059', name: 'M. Iyer', designation: 'Assistant PIO', dept: 'Water Board', avgReplyDays: 22 },
  { id: 'PIO-DL-066', name: 'T. Banerjee', designation: 'Public Information Officer', dept: 'Water Board', avgReplyDays: 9 },
  { id: 'PIO-DL-071', name: 'K. Reddy', designation: 'Public Information Officer', dept: 'Revenue Department', avgReplyDays: 24 },
  { id: 'PIO-DL-088', name: 'N. D\'Souza', designation: 'Assistant PIO', dept: 'Revenue Department', avgReplyDays: 14 },
  { id: 'PIO-DL-093', name: 'J. Verma', designation: 'Public Information Officer', dept: 'Police - Local Station', avgReplyDays: 29 },
]

// Demo login: officer ID as username, shared password for every
// officer account (documented on the officer login screen).
export const OFFICER_DEMO_PASSWORD = 'Officer#2026'

export const departments = [...new Set(officers.map(o => o.dept))]

export function routeDepartment(text) {
  const t = text.toLowerCase()
  if (/road|pothole|street|footpath|construction/.test(t)) return 'Municipal Corporation - Roads'
  if (/garbage|sanitation|sewage|drain|waste/.test(t)) return 'Municipal Corporation - Sanitation'
  if (/electric|power|transformer|meter|outage/.test(t)) return 'Electricity Board'
  if (/water|pipeline|tanker|supply/.test(t)) return 'Water Board'
  if (/land|property|tax|revenue|registry/.test(t)) return 'Revenue Department'
  if (/police|fir|complaint|station|theft/.test(t)) return 'Police - Local Station'
  return departments[0]
}

// Least-loaded assignment, computed from the live requests list
// rather than a static number.
export function assignOfficer(dept, allRequests) {
  const pool = officers.filter(o => o.dept === dept)
  const candidates = pool.length > 0 ? pool : officers
  const pendingCountFor = (officerId) =>
    allRequests.filter(r => r.officerId === officerId && r.status === 'pending').length
  return candidates.reduce((least, o) =>
    pendingCountFor(o.id) < pendingCountFor(least.id) ? o : least, candidates[0])
}

export function officerStats(officerId, allRequests) {
  const mine = allRequests.filter(r => r.officerId === officerId)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return {
    pending: mine.filter(r => r.status === 'pending').length,
    totalResolved: mine.filter(r => r.status !== 'pending').length,
    resolvedToday: mine.filter(r => r.status !== 'pending' && r.resolvedAt && new Date(r.resolvedAt) >= startOfToday).length,
  }
}
