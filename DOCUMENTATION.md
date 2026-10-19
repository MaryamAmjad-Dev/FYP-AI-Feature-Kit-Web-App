# 📚 AI Feature Kit — Complete Project Documentation

> A full-stack AI tools web application: React frontend, Express API, PostgreSQL
> database and third-party AI providers — deployed on **Vercel** with a **Neon**
> database.

| | |
|---|---|
| **Live frontend** | https://fyp-ai-feature-kit-web-app.vercel.app |
| **Live API** | https://fyp-ai-feature-kit-api.vercel.app |
| **Repository** | https://github.com/MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App |
| **Database** | Neon PostgreSQL (pooled endpoint, AWS) |
| **Node.js** | v24 (developed on Windows x64) |

---

## 📖 Table of Contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Project Structure](#5-project-structure)
6. [Local Development](#6-local-development)
7. [Environment Variables](#7-environment-variables)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Authentication & Security](#10-authentication--security)
11. [Frontend Guide](#11-frontend-guide)
12. [Testing](#12-testing)
13. [Deployment (Vercel + Neon)](#13-deployment-vercel--neon)
14. [Troubleshooting — Real Issues We Faced](#14-troubleshooting--real-issues-we-faced)
15. [Known Limitations](#15-known-limitations)
16. [Future Improvements](#16-future-improvements)

---

## 1. Overview

AI Feature Kit is a Final Year Project that bundles several AI-powered tools
behind a single login. Users sign up once and can then generate images, remove
image backgrounds, summarize articles, convert text to speech and change their
voice tone — every usage is tracked for analytics.

**Design principles the codebase follows:**

- 🔐 **No secret ever ships to the browser.** AI provider keys live only on the
  server; the frontend calls our API, which proxies the providers.
- 🧂 **Passwords are salted bcrypt hashes**, never plain text (legacy plain-text
  rows are auto-upgraded on first login).
- 🛂 **Every protected route needs a JWT.** The server is the authority — the
  frontend's "logged in" flag is only a UI hint.
- 🧪 **Tested.** 22 unit tests + 18 live API checks run from one command.

---

## 2. Features

### AI Tools (all require login)

| Tool | Route | Provider / Library | Notes |
|---|---|---|---|
| **Text → Image** | `/text-to-image` | Stability AI (`stable-image/generate/core`) | Prompt in → PNG out |
| **Remove Background** | `/background-removal` | remove.bg API | Image (base64) in → transparent PNG out |
| **Text Summarizer** | `/text-summarizer` | Local extractive summarizer (no API) | Long text → short summary |
| **Text → Speech** | `/text-to-speech` | Web Speech API (browser native) | No API key needed |
| **Voice Changer** | `/voice-changer` | Tone.js | Records/loads audio, applies tone effects |

### Accounts & Platform

- **Signup / Login** with email + password (JWT sessions, 7-day expiry)
- **"Continue with Google" / "Continue with GitHub"** — full-page OAuth
  round trip on `/login` and `/signup`; the API creates (or links to) the
  account and sets the same httpOnly session cookie
- **Forgot / Reset password** — 2-step: request a code (email via SMTP, or
  server console in dev), then redeem it with a new password
- **Profile page** with logout (shows the Google/GitHub photo when signed in
  socially)
- **Contact form** → saved to the database (optionally emailed to admin)
- **Usage history** (`/history`) — regular users see their own usage; admin
  emails (configured in env) see everyone's usage joined with user info
- **Terms of Service / Privacy Policy** pages

---

## 3. Tech Stack

### Frontend (`frontend/`)

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | ^19.1 | UI library |
| vite | ^6.3 | Dev server + production build |
| tailwindcss (+@tailwindcss/vite) | ^4.1 | Utility-first styling |
| react-router-dom | ^7.6 | Client-side routing |
| axios | ^1.20 | HTTP client (single configured instance) |
| framer-motion | ^12.15 | Animations |
| react-hot-toast | ^2.5 | Notifications |
| react-icons | ^5.5 | Icons |
| tone | ^15.1 | Web Audio (voice changer) |
| audiobuffer-to-wav | ^1.0 | WAV export |

### Backend (`backend/`)

| Package | Version | Purpose |
|---|---|---|
| express | ^5.1 | HTTP server + routing |
| pg | ^8.23 | PostgreSQL client (connection pool) |
| bcryptjs | ^3.0 | Password hashing (10 rounds) |
| jsonwebtoken | ^9.0 | JWT signing / verification |
| helmet | ^8.3 | Security headers |
| cors | ^2.8 | Cross-origin allow-list |
| express-rate-limit | ^8.7 | Brute-force / abuse protection |
| nodemailer | ^7.0 | Password-reset emails (SMTP) |
| dotenv | ^18.0 | `.env` loading |

### Database & Hosting

- **PostgreSQL** — [Neon](https://neon.tech) serverless (pooled endpoint)
- **Vercel** — two projects from one repo (API + static frontend)

---

## 4. Architecture

```
┌────────────────────────┐        ┌─────────────────────────────────────┐
│  Browser (React SPA)   │        │  Vercel Serverless Function         │
│  fyp-ai-feature-kit-   │  HTTPS │  fyp-ai-feature-kit-api.vercel.app  │
│  web.vercel.app        │───────▶│                                     │
│                        │  JWT   │  Express app (backend/server.js)    │
│  • axios + bearer token│◀───────│  ├─ helmet + CORS allow-list        │
│  • VITE_API_URL=/api   │        │  ├─ rate limiters                   │
└────────────────────────┘        │  ├─ validators (input rules)        │
                                  │  ├─ /api/*  auth, usage, ai routes  │
                                  │  └─ pg Pool ──────────┐             │
                                  └───────────┬───────────┼─────────────┘
                                              │           │
                              pooled TLS      │           │  HTTPS (keys server-side only)
                                              ▼           ▼
                                  ┌──────────────────┐  ┌──────────────────────┐
                                  │  Neon PostgreSQL │  │  AI Providers         │
                                  │  (us-east-2)     │  │  • Stability AI       │
                                  │  4 tables        │  │  • remove.bg          │
                                  └──────────────────┘  └──────────────────────┘
```

**Request flow (example — generate an image):**

1. Browser `POST /api/ai/text-to-image` with the session cookie
   (`afk_session`, httpOnly) — or `Authorization: Bearer <token>` for
   non-browser clients
2. Vercel routes `/api/*` → the Express function
3. `requireAuth` verifies the JWT (secret only on the server) and checks that
   `token_version` still matches the `ver` claim (revokes every session after
   a password reset)
4. Backend validates the prompt (length/shape), then calls Stability AI **with
   the server-side key**, receives the image and returns it as base64 JSON
5. Usage row is inserted into `user_feature_usage`
6. Frontend renders the image; on any 401 it clears the local session → login page

---

## 5. Project Structure

```
FYP-AI-Feature-Kit-Web-App/
├── package.json                  # root: convenience scripts only (npm test, dev…)
├── README.md                     # overview + quick start
├── DOCUMENTATION.md              # ← this file
│
├── backend/
│   ├── server.js                 # Express app (also exported for Vercel)
│   ├── api/
│   │   └── index.js              # Vercel serverless entry (wraps server.js)
│   ├── vercel.json               # /api/* rewrites
│   ├── config/
│   │   └── config.js             # env → typed config + CORS matcher
│   ├── db/
│   │   ├── db.js                 # pg Pool + schema bootstrap (idempotent)
│   │   ├── schema.sql            # manual setup (psql -f schema.sql)
│   │   └── Database Queries.sql  # reference queries
│   ├── middleware/
│   │   ├── auth.js               # JWT sign/verify + requireAuth/requireAdmin
│   │   └── rateLimitStore.js     # shared rate-limit store (Upstash/Redis REST)
│   ├── services/
│   │   └── mailer.js             # reset-email sender (SMTP or console)
│   ├── lib/
│   │   ├── passwords.js          # bcrypt hash/verify + legacy upgrade
│   │   ├── validators.js         # input rules (signup, login, features…)
│   │   └── logger.js             # structured JSON logger
│   ├── routes/
│   │   ├── auth.routes.js        # signup, login, me, forgot/reset password
│   │   ├── usage.routes.js       # feature-usage + contact
│   │   └── ai.routes.js          # Stability / remove.bg proxies
│   ├── tests/
│   │   ├── validators.test.js    # unit: input validation
│   │   ├── auth.test.js          # unit: JWT helpers
│   │   ├── passwords.test.js     # unit: bcrypt + legacy upgrade
│   │   ├── cors.test.js          # unit: origin matcher (wildcards)
│   │   └── api.smoke.mjs         # boots the real server, 18 live checks
│   ├── .env.example              # template — copy to .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx              # React entry
    │   ├── App.jsx               # routes (see §11)
    │   ├── pages/                # route pages
    │   │   ├── Home.jsx / Features.jsx / About.jsx / Contact.jsx
    │   │   ├── Login.jsx / Signup.jsx / ForgotPassword.jsx
    │   │   ├── TexttoImage.jsx / RemoveBg.jsx / TextSummarizer.jsx
    │   │   ├── TexttoSpeech.jsx / VoiceChanger.jsx
    │   │   ├── Profile.jsx / History.jsx
    │   │   └── Terms.jsx / TermsOfService.jsx / PrivacyPolicy.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx / Footer.jsx
    │   ├── lib/
    │   │   ├── apiClient.js      # single axios instance (cookie auth, error UX)
    │   │   ├── auth.js           # session helpers (httpOnly cookie + storage mirror)
    │   │   ├── urls.js           # safeExternalUrl() — https-only link validation
    │   │   └── api.jsx           # typed API call wrappers
    ├── vite.config.js            # dev proxy /api → localhost:5000
    ├── .env.example              # VITE_API_URL template
    └── package.json
```

---

## 6. Local Development

### Prerequisites

- **Node.js ≥ 20** (developed on v24)
- **PostgreSQL ≥ 13** running locally (or a Neon database)
- npm (comes with Node)

### Steps

```bash
# 1. Clone
git clone https://github.com/MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App.git
cd FYP-AI-Feature-Kit-Web-App

# 2. Database — create an empty database (tables are auto-created on start)
psql -U postgres -c "CREATE DATABASE webai;"
# …or paste backend/db/schema.sql into the Neon SQL editor

# 3. Backend
cd backend
cp .env.example .env          # then fill in values (see §7)
npm install
npm start                     # → http://localhost:5000

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # → http://localhost:5173  (proxies /api to :5000)
```

Open http://localhost:5173 — signup works out of the box. Without SMTP
configured, password-reset codes are printed on the **backend console**.

---

## 7. Environment Variables

### `backend/.env` (server only — git-ignored, set in Vercel dashboard)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string — **use Neon's pooled endpoint** (host contains `-pooler`) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | alt. | Used only when `DATABASE_URL` is empty |
| `PG_SSL` | hosted DBs | `true` for TLS (Neon/Supabase/RDS) |
| `DB_POOL_MAX` | serverless | Connections per instance — keep **1–3** on Vercel |
| `SKIP_SCHEMA_INIT` | Vercel | `true` once tables exist (skips DDL on cold start) |
| `JWT_SECRET` | ✅ prod | Long random string (`openssl rand -hex 48`) — **required** when `NODE_ENV=production` |
| `JWT_EXPIRES_IN` | optional | Token lifetime, default `7d` |
| `NODE_ENV` | ✅ prod | `production` on Vercel |
| `TRUST_PROXY` | ✅ Vercel | `1` (one proxy hop) so rate limiting sees real client IPs |
| `CORS_ORIGINS` | ✅ prod | Comma-separated allow-list; supports host wildcards, e.g. `https://*.your-team.vercel.app` (wildcards also need `CORS_ALLOW_WILDCARD=true`) |
| `CORS_ALLOW_WILDCARD` | ⚠️ prod | `true` opt-in gate for `*` host patterns — bare `*` origins are always rejected |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` / `COOKIE_MAX_AGE_DAYS` | optional | Session cookie flags (prod defaults: `secure` on, `SameSite=None`, 7 days) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ⚠️ prod | Upstash Redis REST credentials → shared, globally consistent rate-limit counters; without them the in-memory store is used (per instance) |
| `RATE_LIMIT_*` | optional | `WINDOW_MS` (15 min), `GLOBAL` (300), `CREDENTIALS` (60), `CONTACT` (5), `AI_WINDOW_MS` (60 s), `AI` (20) |
| `LOG_LEVEL` | optional | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `APP_URL` | reset emails | Frontend origin used in reset links |
| `ADMIN_EMAILS` | optional | Comma-separated emails that may read all usage analytics |
| `RESET_TOKEN_TTL_MINUTES` | optional | Reset-code validity, default `30` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | prod emails | Without SMTP, reset codes go to the server console (dev only) |
| `STABILITY_API_KEY` / `REMOVE_BG_API_KEY` | AI tools | Server-side only — never exposed to the browser |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | social login | Google OAuth (Cloud Console → Credentials → Web application). Empty pair = the Google button renders disabled |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | social login | GitHub OAuth (Settings → Developer settings → New OAuth App). Empty pair = the GitHub button renders disabled |
| `OAUTH_CALLBACK_BASE` | usually not | Base URL (incl. `/api`) providers redirect to — defaults to `<APP_URL>/api`, correct for the Vite proxy and for the frontend's `vercel.json` rewrite. Set it only when the API has its own domain |
| `OAUTH_STATE_TTL_MINUTES` | optional | Anti-CSRF `state` cookie lifetime, default `10` |

### `frontend/.env` (optional)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL. Leave empty in dev (Vite proxy). In production set `https://<backend-project>.vercel.app/api`. ⚠️ Any `VITE_*` value is compiled into the public bundle — **never put API keys here**. |

---

## 8. Database Schema

Four tables (created automatically by `backend/db/db.js`, or via `schema.sql`):

```sql
users                     contact_messages
─────────────────         ─────────────────
id          SERIAL PK     id          SERIAL PK
name        VARCHAR(255)  name        VARCHAR(255)
email       VARCHAR(255)  email       VARCHAR(255)
            UNIQUE                    message       TEXT
password    VARCHAR(255)  created_at  TIMESTAMPTZ
            (bcrypt hash)
profile     JSONB         ← role, contact, bio, skills, links, avatar
token_version INTEGER     ← bumped on password change (revokes sessions)
provider    VARCHAR(16)   ← 'local' | 'google' | 'github'
provider_id VARCHAR(255)  ← the id the provider issued (NULL for 'local')
created_at  TIMESTAMPTZ

user_feature_usage        password_reset_tokens
─────────────────────     ──────────────────────
id          SERIAL PK     id          SERIAL PK
user_id     INT → users   user_id     INT → users ON DELETE CASCADE
feature     VARCHAR(50)               token_hash   CHAR(64) UNIQUE
used_at     TIMESTAMPTZ               expires_at   TIMESTAMPTZ
                            used_at    TIMESTAMPTZ (NULL = unused)
                            created_at TIMESTAMPTZ
```

**Notes**

- `users.email` is `UNIQUE` — the database, not application code, is the
  race-safe guard against duplicate accounts (violations map to HTTP 409).
- `password_reset_tokens.token_hash` stores only a **SHA-256 hash** of the
  emailed code; the raw code exists only in the email/console.
- Valid `feature` values: `text-to-image`, `remove-bg`, `voice-changer`,
  `text-to-speech`, `text-summarizer` (validated server-side).
- Social sign-in is tracked by `(provider, provider_id)` with a **partial
  unique index** (`WHERE provider_id IS NOT NULL`), so password accounts stay
  outside it. Accounts created by Google/GitHub get a random 256-bit password
  nobody knows — the row keeps the `NOT NULL password` contract while the
  password login stays unusable for it.

---

## 9. API Reference

Base URL (production): `https://fyp-ai-feature-kit-api.vercel.app`
All responses are JSON: `{ "success": boolean, "message"?: string, … }`.
Protected routes need the **session cookie** (`afk_session`, sent
automatically by the frontend) or `Authorization: Bearer <token>` for scripts.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness probe → `{success:true,status:"ok"}` |

### Auth

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/signup` | — | `{name, email, password}` | `201` + `userId` |
| POST | `/api/login` | — | `{email, password, remember?}` | `200` + `Set-Cookie: afk_session` (httpOnly JWT, 7 d). **No token in the body** — the cookie travels automatically |
| POST | `/api/logout` | cookie | — | `200`, clears the cookie (safe to call when logged out) |
| GET | `/api/me` | ✅ | — | `200` + `{user:{id,name,email,role,phone,location,bio,skills,linkedin,github,avatar}}` |
| PATCH | `/api/profile` | ✅ | `{name?, role?, phone?, location?, bio?, skills?, linkedin?, github?}` | `200` + `{user}` — unknown keys are rejected (400), URLs must be `https://` |
| POST | `/api/forgot-password` | — | `{email}` | `200` **always** (no user enumeration); if the account exists, a code is emailed (or printed on the server console in dev) |
| POST | `/api/reset-password` | — | `{token, newPassword}` | `200`; single-use, expires after 30 min, and **revokes every existing session** (`token_version++`) |

**Validation rules (server-side):** name ≤ 100 chars · email ≤ 254 chars and
well-formed · password 8–128 chars with at least one letter and one digit.

### Social login (Google / GitHub)

Full-page redirect flow (never a popup — the httpOnly cookie has to be set by
the API on the way back):

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| GET | `/api/auth/providers` | — | `{providers:{google,github}, redirectUris:{…}}` — which buttons to offer and which URIs to register |
| GET | `/api/auth/google` | — | Sets an httpOnly `state` cookie → `302` to Google's consent screen (or back to `/auth/callback?code=not-configured` when unconfigured) |
| GET | `/api/auth/google/callback` | — | Validates `state`, exchanges the code server-side, creates/finds the user, sets `afk_session` → `302` to `/auth/callback?status=success` |
| GET | `/api/auth/github` | — | Same, with GitHub (`scope=read:user user:email`) |
| GET | `/api/auth/github/callback` | — | Same, requiring a **verified** email from GitHub |

Failure always lands on `/auth/callback?status=error&provider=…&code=…`, where
`code` is one of: `not-configured`, `state-mismatch`, `provider-denied`,
`provider-unreachable`, `exchange-failed`, `provider-error`,
`incomplete-profile`, `no-verified-email`, `unverified-email`,
`server-error` — each mapped to a sentence in `frontend/src/lib/oauth.js`.

Account resolution order: same `(provider, provider_id)` → same `email` (the
provider proved mailbox ownership, so the provider is linked to the existing
account) → brand new account.

### Feature usage & contact

| Method | Path | Auth | Body / Behaviour |
|---|---|---|---|
| POST | `/api/feature-usage` | ✅ | `{feature}` — user id comes from the **session**, never the body |
| GET | `/api/feature-usage` | ✅ | Own usage rows (paginated: `limit` ≤ 100, `offset`); admins (`ADMIN_EMAILS`) get **all** rows joined with user name/email (`scope: "all"`) |
| GET | `/api/admin/contact-messages` | ✅ admin | Paginated inbox of contact submissions |
| POST | `/api/contact` | — | `{name, email, message}` (message ≤ 5000 chars) — 5 / 15 min per IP **and** email |

### AI proxies (keys stay on the server)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/ai/text-to-image` | ✅ | `{prompt}` (≤ 2000 chars) | `{image: "<base64 PNG>"}` (Stability AI) |
| POST | `/api/ai/remove-bg` | ✅ | `{imageBase64}` (≤ 3 MB — `express.json` is 1 MB globally, 25 MB only on this route; Vercel's ~4.5 MB body cap is the real ceiling) | `{image: "<base64 PNG>"}` (remove.bg) |
| POST | `/api/ai/summarize` | ✅ | `{text}` (≤ 20 000 chars) | `{summary}` (Hugging Face BART) |

### Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed / invalid reset code / bad JSON |
| 401 | Missing or invalid token; wrong email/password |
| 403 | Authenticated but not admin (e.g. `/api/admin/contact-messages`) |
| 404 | Unknown `/api/*` route |
| 409 | Email already registered (unique violation) |
| 413 | Body too large |
| 429 | Rate limited — "Too many attempts…" |
| 500 | Unexpected server error |

**Rate limits** (all overridable via `RATE_LIMIT_*`): 300 requests / 15 min per
IP for all of `/api` · **60 / 15 min** for signup, login, forgot- and
reset-password · **5 / 15 min for contact** (per IP + email) · 20 / min for AI
endpoints. Counters live in Upstash Redis when `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` are set, otherwise in process memory.

---

## 10. Authentication & Security

### Signup & login flow

```
Signup:  password ──bcrypt(10 rounds)──▶ users.password (hash only)
Login:   password ──verify bcrypt──▶ JWT { id, email, ver } ──▶ Set-Cookie
         afk_session (httpOnly, SameSite, Secure in prod) — no token in JSON
Every protected route: requireAuth
         ├─ verify JWT (server secret)
         ├─ check users.token_version === ver  (session revoked on reset)
         └─ next()
Logout:  POST /api/logout ──▶ clears the cookie
```

- The JWT secret exists **only** on the server, and the browser never touches
  the token: it lives in an **httpOnly cookie**, so XSS cannot read it.
  Non-browser clients may still pass the same token as
  `Authorization: Bearer <token>` (handy for curl/Postman).
- **Session revocation:** every login carries the user's `token_version`.
  `POST /api/reset-password` increments it, which immediately invalidates
  every token issued before the reset (a stolen session dies with the old
  password).
- `requireAuth` deliberately **fails open only when the database is
  unreachable** (logs a warning and checks the signature alone) so an
  outage does not take down read-mostly routes; wrong/absent version still
  returns 401.
- Login timing is equalised for unknown emails (a dummy bcrypt compare runs) so
  attackers can't detect which emails exist.
- **Legacy plain-text rows** (from the pre-security version of the app) are
  accepted once, verified with a constant-time compare, and immediately
  replaced with a bcrypt hash.

### Password reset (2-step, single-use)

```
1. POST /forgot-password {email}
   → random 64-hex code generated
   → only SHA-256(code) stored in password_reset_tokens (30-min expiry)
   → code emailed via SMTP (or printed on the server console in dev)
   → response is always 200 (never reveals whether the email exists)

2. POST /reset-password {token, newPassword}
   → hash the presented code, look it up
   → atomic UPDATE … WHERE used_at IS NULL AND expires_at > NOW()
     (two parallel requests can only win once → strictly single-use)
   → new bcrypt password saved, code marked used
   → users.token_version += 1  ⇒ every already-issued session becomes invalid
```

### Security layers

| Layer | Implementation |
|---|---|
| Password storage | bcrypt, 10 rounds, never reversible |
| Sessions | HMAC JWT in an **httpOnly** `afk_session` cookie, 7-day expiry, `ver` claim checked against `users.token_version` (revocable) |
| API keys | Only in backend env; browser only ever sees our `/api/ai/*` proxy |
| Input validation | Central `validators.js` on every route (lengths, types, feature allow-list, profile field allow-list, 3 MB image cap) |
| SQL injection | Parameterised queries everywhere (`$1, $2…`) |
| Security headers | helmet (CSP off — JSON API; COEP/CORP/Referrer-Policy/HSTS…) |
| CORS | Strict allow-list with credential support; unknown origins get **no** CORS headers, bare `*` is rejected |
| Rate limiting | Global + per-group limiters keyed by real client IP (`TRUST_PROXY`), Upstash-backed store when configured, `ipKeyGenerator` keeps hashed-IP behaviour correct |
| Request bodies | 1 MB global JSON cap; 25 MB only on `/api/ai/remove-bg` (smoke-tested 413) |
| Log hygiene | Structured JSON logger (`LOG_LEVEL`); no secrets or tokens are ever logged |
| Error handling | Central JSON error handler; no stack traces leak to clients |
| Secrets in git | `.env` git-ignored; `.env.example` has empty placeholders only |
| Social login | `state` cookie (httpOnly, 10 min, constant-time verified, provider-prefixed) blocks CSRF on the OAuth redirect; codes are exchanged server-to-server so the client secret never reaches the browser; unverified provider emails can neither create nor claim an account |

---

## 11. Frontend Guide

### Routes (`frontend/src/App.jsx`)

| Route | Page | Auth needed |
|---|---|---|
| `/` | Landing page | — |
| `/home` | Redirects to `/` (the old URL still works for shared links) | — |
| `/features` | Feature grid | — |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth pages | — |
| `/auth/callback` | Where Google/GitHub return after signing in: confirms the result, loads the user via `GET /api/me`, stores the session, goes home | — (cookie is already set) |
| `/text-to-image`, `/background-removal`, `/text-summarizer`, `/text-to-speech`, `/voice-changer` | AI tools (each page redirects guests to `/login` itself) | ✅ |
| `/profile` | Profile editor (PATCH `/api/profile`) | ✅ (`ProtectedRoute`) |
| `/history` | Real usage history from `GET /api/feature-usage` | ✅ (`ProtectedRoute`) |
| `/about`, `/contact`, `/terms`, `/terms-of-service`, `/privacypolicy` | Static pages | — |
| `*` | Anything else → redirect to `/` (there is no 404 page) | — |

### Key modules

- **`apiClient.js`** — the single axios instance:
  - base URL = `VITE_API_URL` (or `/api` via the dev proxy); a missing `/api`
    suffix is appended automatically
  - sends the session cookie automatically (`withCredentials: true`); there is
    **no token in JavaScript memory**
  - on `401` (except login/signup/reset attempts) clears the local session and
    redirects to `/login`; calls can opt out with `skipAuthRedirect`
  - when the request never reaches the server, replaces the empty error with an
    actionable message (check connection / VPN / proxy)
- **`auth.js`** — `getUser / setSession / updateUser / clearSession /
  isLoggedIn`. The `isLoggedIn` flag only drives the UI; the server enforces
  real auth. `main.jsx` re-verifies the session on boot via `GET /api/me` and
  re-dispatches `auth:changed` so every tab (and the Navbar) stay in sync.
- **`urls.js`** — `safeExternalUrl()` keeps only `https://` links; Profile
  rejects anything else before rendering LinkedIn/GitHub icons.
- **`oauth.js`** — `startOAuthLogin(provider)` navigates to
  `<api base>/auth/{google,github}` (correct behind the dev proxy and with a
  dedicated API origin), `fetchOAuthProviders()` reads which buttons are live,
  and `oauthErrorMessage()` turns the `?code=` from the redirect into a
  human sentence. `hooks/useOAuthProviders.js` wraps the fetch for
  Login/Signup; `pages/AuthCallback.jsx` finishes the round trip.
- **`api.jsx`** — small wrappers (`login()`, `signup()`, `generateImage()`,
  `removeBackground()`, `summarize()`, `logFeature()`, …) so components never
  hand-write URLs.
- **`App.jsx`** — every page is `React.lazy` + `<Suspense>` (the Voice Changer
  bundle alone is ~250 kB), `/profile` and `/history` sit behind
  `<ProtectedRoute>`.

### Dev proxy

`vite.config.js` forwards `/api/*` to `http://localhost:5000` in development,
so the frontend needs **no** backend URL locally and CORS never interferes.

---

## 12. Testing

```bash
npm test          # from the repository root
```

Runs two suites:

1. **Unit tests** (Node's built-in `node --test`, no framework) — 39 tests:
   - `validators.test.js` — signup/login/feature/message rules, image cap,
     profile field allow-list + URL validation
   - `auth.test.js` — JWT sign/verify, `ver` claim, middleware behaviour, and
     `isDatabaseUnavailable` (a down database must degrade, not answer 500)
   - `oauth.test.js` — OAuth state minting/verification (CSRF), authorize URLs,
     configured-provider reporting, landing URLs, route registration
   - `schema.test.js` — `schema.sql` still parses into runnable statements and
     carries every column the auth/OAuth routes write
   - `passwords.test.js` — bcrypt hashing + legacy plain-text upgrade
   - `cors.test.js` — origin matcher incl. wildcard sub-domains and the
     `CORS_ALLOW_WILDCARD` gate
2. **API smoke suite** (`api.smoke.mjs`) — boots the real server on port 5099
   and drives 23 live checks: health, auth guards, validation, reset-code
   semantics + **session revocation**, CORS preflight (`OPTIONS → 204` +
   allow-credentials), security headers, 404s, **413 body-limit**, **admin
   403**, cookie attributes and rate limiting. Database-backed checks accept
   500 when no local PostgreSQL is running, so the suite stays hermetic; set
   `SMOKE_REQUIRE_DB=true` (as CI does) to fail hard instead.

```bash
# from backend/
npm test           # unit only
npm run test:api   # API smoke only
npm run test:all   # both

# with a real database (required for the full smoke path)
DB_HOST=… DB_PORT=… DB_USER=… DB_NAME=… DB_PASSWORD=… SMOKE_REQUIRE_DB=true npm run test:all
```

3. **Frontend render smoke test** — renders every page through
   `react-dom/server` (`frontend/smoke.render.jsx`), so a render-time crash
   fails the build instead of shipping:

```bash
# from frontend/
npm run test:render   # 15 pages must render, non-zero exit otherwise
```

CI runs this on every push/PR (`.github/workflows/ci.yml`): the backend job
spins up a Postgres 16 service container and runs `npm run test:all` with
`SMOKE_REQUIRE_DB=true` (so a broken migration fails the build instead of
quietly accepting 500s), then `npm audit --omit=dev --audit-level=high`; the
frontend job runs `npm run lint`, `npm run build`, the page render smoke test
and a full `npm audit`.

---

## 13. Deployment (Vercel + Neon)

The app runs as **two Vercel projects** built from this one repository.

### 13.1 Neon (database)

1. Create a project at https://neon.tech (free tier is enough).
2. Copy the **pooled** connection string (host contains `-pooler`).
3. Run `backend/db/schema.sql` in the Neon SQL editor once (or let the API create
   the tables on its first request), then set `SKIP_SCHEMA_INIT=true`.

### 13.2 Backend project

1. Vercel → *Add New → Project* → import the repo → **Root Directory:
   `backend`** → deploy.
2. Set environment variables (see §7): `DATABASE_URL`, `JWT_SECRET`,
   `NODE_ENV=production`, `TRUST_PROXY=1`, `DB_POOL_MAX=1`,
   `SKIP_SCHEMA_INIT=true`, `CORS_ORIGINS`, `APP_URL`, AI keys, SMTP.
3. Verify: `https://<backend>.vercel.app/api/health` → `{"success":true,...}`.

`backend/api/index.js` is the serverless entry; `backend/vercel.json` rewrites
`/api/*` into it. The same Express app still runs locally via `npm start`.

### 13.3 Frontend project

1. Import the repo again → **Root Directory: `frontend`** (Vite auto-detected).
2. Env: `VITE_API_URL=https://<backend-project>.vercel.app/api`.
3. Deploy → the SPA calls the API with the httpOnly session cookie
   (`withCredentials`), so `CORS_ORIGINS` must list this exact frontend origin
   and the backend must set `COOKIE_SECURE=true` + `SameSite=None`.

### 13.4 Current production values

- `CORS_ORIGINS` = `https://fyp-ai-feature-kit-web-app.vercel.app,https://*-maryamamjad-projects.vercel.app,http://localhost:5173,http://localhost:4173`
  (the wildcard covers every Vercel deployment preview of this team).
- The API is region-agnostic; Vercel routes it to the nearest function region
  and Neon serves from `us-east-2`.

---

## 14. Troubleshooting — Real Issues We Faced

These were hit (and fixed) during the live deployment — useful when something
"works locally" but not in production:

### A. Signup failed with a generic "Registration failed"

- **Cause 1 — rate limit:** credential endpoints allow 60 attempts / 15 min per
  IP; repeated testing plus retries on one network tripped the old, stricter
  limit (15). The fix raised it to 60 and the counter is **in-memory per
  serverless instance**, so behaviour can differ between instances.
- **Cause 2 — CORS on deployment URLs:** browsing the site via a Vercel
  *deployment* URL (`project-hash-team.vercel.app`) was blocked because only
  the production alias was allow-listed. `CORS_ORIGINS` now supports wildcards
  (`https://*-team.vercel.app`).
- **Cause 3 — cold-start timeouts:** every cold start ran the schema bootstrap
  against Neon *before* answering, so a slow connection made the browser's
  CORS `OPTIONS` preflight fail after ~8 s. `OPTIONS` now skips the schema init
  entirely (preflights never need the database), the pool fails fast (5 s
  connect timeout), and `SKIP_SCHEMA_INIT=true` skips DDL on Vercel.

**Symptom → check:** browser shows a *generic* error + DevTools → Network
shows `(failed) net::ERR_…` with 0 bytes → it is **network/CORS/limit**, not a
backend crash. A real backend error would show the server's message.

### B. "Too many attempts. Please try again later."

HTTP 429 from the credential limiter. Wait for the 15-minute window, or raise
`limit` in `backend/routes/auth.routes.js`. On Vercel each instance has its own
counter, so refreshing/retrying may land on a different instance.

### C. Reset code never arrives

Without SMTP, codes are printed on the **backend console** — locally in the
terminal; on Vercel in *Deployments → <deployment> → Functions → Logs*. Set
`SMTP_*` variables for real emails.

### D. Local PowerShell + curl quirk (cost us a debugging detour)

`curl.exe -o $null … -X OPTIONS` silently turns the request into **GET**:
PowerShell passes `$null` as an empty argument, `-o` swallows `-X`, and curl
defaults to GET. Use `-o NUL` (or a real file) when testing OPTIONS/CORS.

### E. Database errors on first request

`CREATE TABLE IF NOT EXISTS` runs on cold start (unless `SKIP_SCHEMA_INIT=true`).
If `DATABASE_URL` is wrong or the Neon project is paused, the first request is
slower and returns 500 — check the function logs for `Schema init failed`.

---

## 15. Known Limitations

- **Vercel payload limit ≈ 4.5 MB** per request/response — the image cap is 3
  MB (`LIMITS.imageBase64`) and the remove-bg route allows 25 MB JSON, but
  anything over ~4.5 MB never reaches the function.
- **Rate-limit state without Upstash** is per serverless instance (in-memory).
  Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for counters that
  survive cold starts and cover every instance.
- **Password-reset emails need SMTP** (Gmail app password or similar). Without
  them, codes only appear in server logs — acceptable for a viva, not for real
  users.
- **No email verification** on signup; `ADMIN_EMAILS` is an env-level
  allow-list rather than a role column in the database.
- Voice Changer/Text-to-Speech depend on **browser APIs** (mic permission,
  Web Speech support), so behaviour differs across browsers.
- **No sitemap** — it needs the final production domain (absolute URLs).

---

## 16. Future Improvements

- Email verification and password-change while logged in
- Per-session management (list/revoke active devices)
- Upstash-backed cache for AI responses (the rate-limit store is already wired)
- Move AI jobs to background/queue processing to lift the 4.5 MB payload cap
- Admin dashboard UI (usage graphs per feature/user)
- Database roles instead of `ADMIN_EMAILS` env for analytics access
- OpenAPI/Swagger spec generated from the route definitions
- XML sitemap once the production domain is final

---

## 🧑‍🎓 Author

**Maryam Amjad** — Final Year Project, AI Feature Kit

- GitHub: [github.com/MaryamAmjad-Dev](https://github.com/MaryamAmjad-Dev)
- LinkedIn: [linkedin.com/in/maryam-amjad-6a7a8m](https://www.linkedin.com/in/maryam-amjad-6a7a8m/)
- Repository: [MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App](https://github.com/MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App)

*Documentation generated during the security hardening + PostgreSQL/Vercel
migration of October 2026.*
