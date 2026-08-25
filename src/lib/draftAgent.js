// Draft agent: plain-English request -> formal RTI application text.
//
// Works out of the box with a local template drafter (no API key needed).
// To upgrade to a real LLM: set VITE_DRAFT_API_URL to your own backend
// route that calls the Anthropic/OpenAI API server-side (never call a
// model API with a secret key directly from the browser).

const DRAFT_API_URL = import.meta.env.VITE_DRAFT_API_URL

export async function draftApplication({ plainRequest, dept, applicantName }) {
  if (DRAFT_API_URL) {
    try {
      const res = await fetch(DRAFT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plainRequest, dept, applicantName }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.draft) return data.draft
      }
    } catch {
      // fall through to local drafter
    }
  }
  return localDraft({ plainRequest, dept, applicantName })
}

function localDraft({ plainRequest, dept, applicantName }) {
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  const cleaned = plainRequest.trim().replace(/\s+/g, ' ')
  const point = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).replace(/\.?$/, '.')

  return `To,
The Public Information Officer,
${dept}

Subject: Application under Section 6(1) of the Right to Information Act, 2005

Sir/Madam,

I, ${applicantName || '[Applicant Name]'}, wish to seek the following information under the RTI Act, 2005:

1. ${point}
2. Certified copies of any file notings, correspondence, or records directly relevant to the above.
3. The current status of any action taken on the above matter, if applicable.

I am an Indian citizen and enclose the prescribed application fee. Kindly furnish the requested information within the statutory period of 30 days as prescribed under Section 7(1) of the Act.

Date: ${today}

Yours faithfully,
${applicantName || '[Applicant Name]'}`
}
