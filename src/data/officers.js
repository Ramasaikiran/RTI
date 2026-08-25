// Mock officer database — the field the official rtionline.gov.in
// portal never surfaces to citizens. Load (0-100) is simulated
// pending-application count, normalized.
export const officers = [
  { id: 'PIO-DL-014', name: 'R. Krishnamurthy', designation: 'Public Information Officer', dept: 'Municipal Corporation — Roads', load: 22, avgReplyDays: 19 },
  { id: 'PIO-DL-027', name: 'S. Fatima Sheikh', designation: 'Public Information Officer', dept: 'Municipal Corporation — Roads', load: 61, avgReplyDays: 27 },
  { id: 'PIO-DL-033', name: 'A. Nair', designation: 'Assistant PIO', dept: 'Municipal Corporation — Sanitation', load: 14, avgReplyDays: 12 },
  { id: 'PIO-DL-041', name: 'V. Prakash Rao', designation: 'Public Information Officer', dept: 'Electricity Board', load: 78, avgReplyDays: 31 },
  { id: 'PIO-DL-052', name: 'D. Kaur', designation: 'Public Information Officer', dept: 'Electricity Board', load: 33, avgReplyDays: 18 },
  { id: 'PIO-DL-059', name: 'M. Iyer', designation: 'Assistant PIO', dept: 'Water Board', load: 45, avgReplyDays: 22 },
  { id: 'PIO-DL-066', name: 'T. Banerjee', designation: 'Public Information Officer', dept: 'Water Board', load: 12, avgReplyDays: 9 },
  { id: 'PIO-DL-071', name: 'K. Reddy', designation: 'Public Information Officer', dept: 'Revenue Department', load: 55, avgReplyDays: 24 },
  { id: 'PIO-DL-088', name: 'N. D\'Souza', designation: 'Assistant PIO', dept: 'Revenue Department', load: 19, avgReplyDays: 14 },
  { id: 'PIO-DL-093', name: 'J. Verma', designation: 'Public Information Officer', dept: 'Police — Local Station', load: 67, avgReplyDays: 29 },
]

export const departments = [...new Set(officers.map(o => o.dept))]

// Very light keyword router — plain-English topic -> department.
// A real build would use the drafting model for this classification.
export function routeDepartment(text) {
  const t = text.toLowerCase()
  if (/road|pothole|street|footpath|construction/.test(t)) return 'Municipal Corporation — Roads'
  if (/garbage|sanitation|sewage|drain|waste/.test(t)) return 'Municipal Corporation — Sanitation'
  if (/electric|power|transformer|meter|outage/.test(t)) return 'Electricity Board'
  if (/water|pipeline|tanker|supply/.test(t)) return 'Water Board'
  if (/land|property|tax|revenue|registry/.test(t)) return 'Revenue Department'
  if (/police|fir|complaint|station|theft/.test(t)) return 'Police — Local Station'
  return departments[0]
}

// Assignment engine — routes to the least-loaded officer
// in the relevant department, not just round-robin.
export function assignOfficer(dept) {
  const pool = officers.filter(o => o.dept === dept)
  if (pool.length === 0) return officers[0]
  return pool.reduce((least, o) => (o.load < least.load ? o : least), pool[0])
}

export function loadTier(load) {
  if (load < 35) return ''
  if (load < 60) return 'mid'
  return 'high'
}
