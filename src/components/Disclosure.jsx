export default function Disclosure() {
  return (
    <details className="footer-disclosure">
      <summary>What's real vs. mocked in this build</summary>
      <div className="content">
        <p><strong>Real:</strong> account login (bcrypt-hashed passwords, JWT sessions), AI drafting and rejection-risk checking via an OpenAI model, officer accept/reject workflow, 30-day deadline math, load-based assignment.</p>
        <p><strong>Mocked:</strong> the officer directory itself and their historical reply-time averages, department-routing keywords, and application filing - nothing is sent to a real government office.</p>
        <p>Built for the "Build What Moves India" brief - targets RTI Online, since IRCTC's own redesign already shipped in July 2026.</p>
      </div>
    </details>
  )
}
