# RTI+ — a working prototype

Built for the "Build What Moves India" brief: IRCTC's redesign already
shipped, so this targets RTI Online instead, where the real gaps still
sit unaddressed.

## What's real vs. mock

| Part | Status |
|---|---|
| Login | **Real** — email + password, bcrypt-hashed, JWT sessions. No third-party auth provider. |
| Officer directory | Mock data, `src/data/officers.js` |
| Assignment engine | Real logic, mock data — routes to least-loaded officer |
| Draft agent | Local template drafter by default; swap in a real LLM via `VITE_DRAFT_API_URL` |
| 30-day deadline tracking | Real client-side date math |
| First Appeal auto-draft | Real logic, triggers once deadline passes |

## Run it

**1. Backend (auth server)**
```bash
cd server
npm install
cp .env.example .env   # set a real JWT_SECRET
npm start               # runs on :8787
```

**2. Frontend**
```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8787 (default is fine)
npm run dev
```

## How login works

1. Register: name, email, postal address, password + confirm →
   backend hashes the password with bcrypt, stores the profile,
   issues a signed JWT (7-day session)
2. Login: email + password → backend compares the bcrypt hash,
   issues a JWT on match
3. Frontend stores the JWT and sends it on `/api/session` to restore
   login on refresh

## The three features this adds over rtionline.gov.in

1. **Officer directory** — the real portal never shows who's handling
   your request or how busy they are. This does.
2. **Load-aware assignment** — new requests route to whichever officer
   in that department has the lowest pending count, not a black box.
3. **Plain-English drafting** — type what you actually want to know;
   the agent produces a Section 6(1)-compliant formal application.

## Next steps for a real deployment

- Move officer/request data into a real database (Postgres/SQLite)
- Move OTP store from in-memory Map to Redis (survives server restart,
  works across multiple instances)
- Wire `VITE_DRAFT_API_URL` to a server route that calls the
  Anthropic API with your own key (never expose model API keys in
  the browser)
- Verify a real sending domain in Resend for production email
