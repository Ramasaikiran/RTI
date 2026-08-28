// Officer directory + assignment engine. Lives server-side so
// pending counts and resolution stats stay consistent across every
// citizen and officer session, not per-browser local state.

const DEPARTMENTS = [
  'Municipal Corporation - Roads',
  'Municipal Corporation - Sanitation',
  'Electricity Board',
  'Water Board',
  'Revenue Department',
  'Police - Local Station',
]

// State coverage. Real RTI applications go to the public authority
// in the applicant's own state - a state office, not a Delhi one.
// This build has real officers seeded for these states, two per
// department per state so load-based assignment has genuine
// candidates to choose between. Any other state falls back to the
// central (Delhi) office, with that fallback disclosed on the
// record rather than hidden.
const STATE_CODES = {
  'Delhi (NCT)': 'DL',
  'Karnataka': 'KA',
  'Maharashtra': 'MH',
  'Tamil Nadu': 'TN',
  'Telangana': 'TS',
  'Andhra Pradesh': 'AP',
  'Uttar Pradesh': 'UP',
  'West Bengal': 'WB',
  'Gujarat': 'GJ',
}
export const CENTRAL_STATE = 'Delhi (NCT)'
export const COVERED_STATES = Object.keys(STATE_CODES)

// Two names per department per state (12 names total per state).
const NAME_POOLS = {
  'Delhi (NCT)': ['R. Krishnamurthy', 'S. Fatima Sheikh', 'A. Nair', 'V. Prakash Rao', 'D. Kaur', 'M. Iyer', 'T. Banerjee', 'K. Reddy', "N. D'Souza", 'J. Verma', 'P. Malhotra', 'S. Bhatia'],
  'Karnataka': ['H. Gowda', 'R. Shivakumar', 'P. Naik', 'S. Manjunath', 'L. Prabhu', 'B. Hegde', 'K. Nagaraj', 'M. Chandrashekar', 'V. Ramaiah', 'A. Kumaraswamy', 'R. Basavaraj', 'S. Puttaswamy'],
  'Maharashtra': ['S. Deshmukh', 'A. Kulkarni', 'R. Patil', 'M. Joshi', 'V. Sawant', 'P. Gaikwad', 'N. Chavan', 'K. Bhosale', 'A. Pawar', 'R. Jadhav', 'S. Kadam', 'M. Shinde'],
  'Tamil Nadu': ['K. Rajendran', 'S. Meenakshi', 'M. Kannan', 'V. Lakshmi', 'R. Sundaram', 'P. Selvi', 'N. Murugan', 'A. Kalaivani', 'S. Elango', 'R. Devi', 'K. Palanisamy', 'M. Saraswathi'],
  'Telangana': ['C. Srinivas', 'B. Anitha', 'M. Ravinder', 'K. Sujatha', 'G. Naresh', 'P. Vani', 'S. Rajesham', 'D. Padma', 'K. Yadagiri', 'B. Swarna', 'N. Mallesham', 'V. Bhagya'],
  'Andhra Pradesh': ['N. Ramesh', 'V. Padmavathi', 'K. Suryanarayana', 'B. Lakshmi', 'T. Venkatesh', 'D. Kavitha', 'M. Chalapathi', 'S. Vijayalakshmi', 'R. Nageswara', 'K. Aruna', 'P. Rambabu', 'G. Sridevi'],
  'Uttar Pradesh': ['R. Tiwari', 'S. Yadav', 'A. Srivastava', 'M. Singh', 'V. Pandey', 'K. Mishra', 'N. Dubey', 'S. Chaturvedi', 'A. Awasthi', 'R. Shukla', 'P. Tripathi', 'M. Saxena'],
  'West Bengal': ['A. Chatterjee', 'S. Mukherjee', 'P. Bose', 'R. Ghosh', 'M. Sengupta', 'D. Roy', 'N. Banerjee', 'S. Dasgupta', 'A. Chakraborty', 'R. Sarkar', 'P. Bhattacharya', 'K. Dey'],
  'Gujarat': ['H. Patel', 'R. Shah', 'M. Trivedi', 'K. Desai', 'S. Joshi', 'B. Mehta', 'N. Vyas', 'A. Pandya', 'R. Thakkar', 'K. Parikh', 'S. Shroff', 'M. Bhatt'],
}

function buildOfficers() {
  const list = []
  for (const state of COVERED_STATES) {
    const names = NAME_POOLS[state]
    const code = STATE_CODES[state]
    DEPARTMENTS.forEach((dept, i) => {
      for (let slot = 0; slot < 2; slot++) {
        const name = names[(i * 2 + slot) % names.length]
        const idNum = 10 + i * 16 + slot * 8
        list.push({
          id: `PIO-${code}-${String(idNum).padStart(3, '0')}`,
          name,
          designation: slot === 1 ? 'Assistant PIO' : 'Public Information Officer',
          dept,
          state,
          avgReplyDays: 9 + ((i * 7 + slot * 5 + code.charCodeAt(0)) % 24),
        })
      }
    })
  }
  return list
}

export const officers = buildOfficers()

// Demo login: officer ID as username, shared password for every
// officer account (documented on the officer login screen).
export const OFFICER_DEMO_PASSWORD = 'Officer#2026'

export const departments = DEPARTMENTS

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

// State-and-department aware assignment. Prefers the least-loaded
// officer in the applicant's own state (now with real candidates to
// compare, since every department has two officers per state); falls
// back to the central (Delhi) office for states with no seeded
// officer, and says so via assignmentNote so the fallback is visible
// rather than silent.
export function assignOfficer(dept, state, allRequests) {
  const pendingCountFor = (officerId) =>
    allRequests.filter(r => r.officerId === officerId && r.status === 'pending').length
  const leastLoaded = (pool) => pool.reduce((least, o) =>
    pendingCountFor(o.id) < pendingCountFor(least.id) ? o : least, pool[0])

  const inState = officers.filter(o => o.dept === dept && o.state === state)
  if (inState.length > 0) {
    return { officer: leastLoaded(inState), assignmentNote: null }
  }

  const central = officers.filter(o => o.dept === dept && o.state === CENTRAL_STATE)
  const pool = central.length > 0 ? central : officers.filter(o => o.dept === dept)
  const fallbackPool = pool.length > 0 ? pool : officers
  return {
    officer: leastLoaded(fallbackPool),
    assignmentNote: state
      ? `No seeded office for ${state} in this department - routed to the central (${CENTRAL_STATE}) office.`
      : null,
  }
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
