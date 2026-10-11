# 📚 AI Feature Kit — Complete Project Documentation

> A full-stack AI tools web application: React frontend, Express API, PostgreSQL
> database and third-party AI providers — deployed on **Vercel** with a **Neon**
> database.

| | |
|---|---|
| **Live frontend** | https://fyp-ai-feature-kit-web.vercel.app |
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
| **Text Summarizer** | `/text-summarizer` | Hugging Face `facebook/bart-large-cnn` | Long text → short summary |
| **Text → Speech** | `/text-to-speech` | Web Speech API (browser native) | No API key needed |
| **Voice Changer** | `/voice-changer` | Tone.js | Records/loads audio, applies tone effects |

### Accounts & Platform

- **Signup / Login** with email + password (JWT sessions, 7-day expiry)
- **Forgot / Reset password** — 2-step: request a code (email via SMTP, or
  server console in dev), then redeem it with a new password
- **Profile page** with logout
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
                                  └──────────────────┘  │  • Hugging Face       │
                                                        └──────────────────────┘
```

**Request flow (example — generate an image):**

1. Browser `POST /api/ai/text-to-image` with the JWT in `Authorization: Bearer`
2. Vercel routes `/api/*` → the Express function
3. `requireAuth` verifies the JWT (secret only on the server)
4. Backend validates the prompt (length/shape), then calls Stability AI **with
   the server-side key**, receives the image and returns it as base64 JSON
5. Usage row is inserted into `user_feature_usage`
6. Frontend renders the image; on any 401 it clears the session → login page

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
│   ├── api/index.js              # Vercel serverless entry (wraps server.js)
│   ├── vercel.json               # /api/* rewrites
│   ├── config.js                 # env → typed config + CORS matcher
│   ├── db.js                     # pg Pool + schema bootstrap (idempotent)
│   ├── auth.js                   # JWT sign/verify + requireAuth/requireAdmin
│   ├── passwords.js              # bcrypt hash/verify + legacy upgrade
│   ├── validators.js             # input rules (signup, login, features…)
│   ├── mailer.js                 # reset-email sender (SMTP or console)
│   ├── routes/
│   │   ├── auth.routes.js        # signup, login, me, forgot/reset password
│   │   ├── usage.routes.js       # feature-usage + contact
│   │   └── ai.routes.js          # Stability / remove.bg / Hugging Face proxies
│   ├── tests/
│   │   ├── validators.test.js    # unit: input validation
│   │   ├── auth.test.js          # unit: JWT helpers
│   │   ├── passwords.test.js     # unit: bcrypt + legacy upgrade
│   │   ├── cors.test.js          # unit: origin matcher (wildcards)
│   │   └── api.smoke.mjs         # boots the real server, 18 live checks
│   ├── schema.sql                # manual setup (psql -f schema.sql)
│   ├── Database Queries.sql      # reference queries
│   ├── .env.example              # template — copy to .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx              # React entry
    │   ├── App.jsx               # routes (see §11)
    │   ├── apiClient.js          # single axios instance (JWT, error UX)
    │   ├── auth.js               # session helpers (localStorage)
    │   ├── api.jsx               # typed API call wrappers
    │   ├── Login.jsx / Signup.jsx / ForgotPassword.jsx / Logout.jsx
    │   ├── TexttoImage.jsx / RemoveBg.jsx / TextSummarizer.jsx
    │   ├── TexttoSpeech.jsx / VoiceChanger.jsx
    │   ├── Home.jsx / Features.jsx / About.jsx / Contact.jsx
    │   ├── Profile.jsx / History.jsx
    │   ├── Terms.jsx / TermsOfService.jsx / PrivacyPolicy.jsx
    │   ├── Navbar.jsx / Footer.jsx
    │   └── styles/…              # Tailwind setup
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
# …or paste backend/schema.sql into the Neon SQL editor

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
| `CORS_ORIGINS` | ✅ prod | Comma-separated allow-list; supports host wildcards, e.g. `https://*.your-team.vercel.app` |
| `APP_URL` | reset emails | Frontend origin used in reset links |
| `ADMIN_EMAILS` | optional | Comma-separated emails that may read all usage analytics |
| `RESET_TOKEN_TTL_MINUTES` | optional | Reset-code validity, default `30` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | prod emails | Without SMTP, reset codes go to the server console (dev only) |
| `STABILITY_API_KEY` / `REMOVE_BG_API_KEY` / `HUGGINGFACE_API_KEY` | AI tools | Server-side only — never exposed to the browser |

### `frontend/.env` (optional)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL. Leave empty in dev (Vite proxy). In production set `https://<backend-project>.vercel.app/api`. ⚠️ Any `VITE_*` value is compiled into the public bundle — **never put API keys here**. |

---

## 8. Database Schema

Four tables (created automatically by `backend/db.js`, or via `schema.sql`):

```sql
users                     contact_messages
─────────────────         ─────────────────
id          SERIAL PK     id          SERIAL PK
name        VARCHAR(255)  name        VARCHAR(255)
email       VARCHAR(255)  email       VARCHAR(255)
            UNIQUE                    message       TEXT
password    VARCHAR(255)  created_at  TIMESTAMPTZ
            (bcrypt hash)
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

---

## 9. API Reference

Base URL (production): `https://fyp-ai-feature-kit-api.vercel.app`
All responses are JSON: `{ "success": boolean, "message"?: string, … }`.
Protected routes need `Authorization: Bearer <token>`.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness probe → `{success:true,status:"ok"}` |

### Auth

| Method | Path | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/signup` | — | `{name, email, password}` | `201` + `userId` |
| POST | `/api/login` | — | `{email, password}` | `200` + `token` (JWT, 7 d) |
| GET | `/api/me` | ✅ | — | `200` + `{user:{id,name,email}}` |
| POST | `/api/forgot-password` | — | `{email}` | `200` **always** (no user enumeration); if the account exists, a code is emailed (or printed on the server console in dev) |
| POST | `/api/reset-password` | — | `{token, newPassword}` | `200`; the code is single-use and expires after 30 min |

**Validation rules (server-side):** name ≤ 100 chars · email ≤ 254 chars and
well-formed · password 8–128 chars with at least one letter and one digit.

### Feature usage & contact

| Method | Path | Auth | Body / Behaviour |
|---|---|---|---|
| POST | `/api/feature-usage` | ✅ | `{feature}` — user id comes from the **token**, never the body |
| GET | `/api/feature-usage` | ✅ | Own usage rows; admins (`ADMIN_EMAILS`) get **all** rows joined with user name/email |
| POST | `/api/contact` | — | `{name, email, message}` (message ≤ 5000 chars) |

### AI proxies (keys stay on the server)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/ai/text-to-image` | ✅ | `{prompt}` (≤ 2000 chars) | `{image: "<base64 PNG>"}` (Stability AI) |
| POST | `/api/ai/remove-bg` | ✅ | `{imageBase64}` (≤ ~20 MB) | `{image: "<base64 PNG>"}` (remove.bg) |
| POST | `/api/ai/summarize` | ✅ | `{text}` (≤ 20 000 chars) | `{summary}` (Hugging Face BART) |

### Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed / invalid reset code / bad JSON |
| 401 | Missing or invalid token; wrong email/password |
| 403 | Authenticated but not allowed (reserved for future roles) |
| 404 | Unknown `/api/*` route |
| 409 | Email already registered (unique violation) |
| 413 | Body too large |
| 429 | Rate limited — "Too many attempts…" |
| 500 | Unexpected server error |

**Rate limits:** 300 requests / 15 min per IP for all of `/api` · **60 / 15 min**
for signup, login, forgot- and reset-password · 20 / 15 min for contact ·
20 / min for AI endpoints.

---

## 10. Authentication & Security

### Signup & login flow

```
Signup:  password ──bcrypt(10 rounds)──▶ users.password (hash only)
Login:   password ──verify bcrypt──▶ JWT { id, email } ──▶ Authorization header
Every protected route: requireAuth ──verify JWT (server secret)──▶ next()
```

- The JWT secret exists **only** on the server; the frontend merely stores the
  token and attaches it to requests.
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
```

### Security layers

| Layer | Implementation |
|---|---|
| Password storage | bcrypt, 10 rounds, never reversible |
| Sessions | HMAC JWT, 7-day expiry, server-side secret |
| API keys | Only in backend env; browser only ever sees our `/api/ai/*` proxy |
| Input validation | Central `validators.js` on every route (lengths, types, feature allow-list) |
| SQL injection | Parameterised queries everywhere (`$1, $2…`) |
| Security headers | helmet (CSP off — JSON API; COEP/CORP/Referrer-Policy/HSTS…) |
| CORS | Strict allow-list with wildcard support; unknown origins get **no** CORS headers |
| Rate limiting | Global + per-group limiters keyed by real client IP (`TRUST_PROXY`) |
| Error handling | Central JSON error handler; no stack traces leak to clients |
| Secrets in git | `.env` git-ignored; `.env.example` has empty placeholders only |

---

## 11. Frontend Guide

### Routes (`frontend/src/App.jsx`)

| Route | Page | Auth needed |
|---|---|---|
| `/`, `/home` | Landing page | — |
| `/features` | Feature grid | — |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth pages | — |
| `/text-to-image`, `/background-removal`, `/text-summarizer`, `/text-to-speech`, `/voice-changer` | AI tools | ✅ |
| `/profile` | Profile + logout | ✅ |
| `/history` | Usage history | ✅ |
| `/about`, `/contact`, `/terms`, `/terms-of-service`, `/privacypolicy` | Static pages | — |

### Key modules

- **`apiClient.js`** — the single axios instance:
  - base URL = `VITE_API_URL` (or `/api` via the dev proxy); a missing `/api`
    suffix is appended automatically
  - attaches `Authorization: Bearer` from the stored token
  - on `401` (except login/signup/reset attempts) clears the session and
    redirects to `/login`
  - when the request never reaches the server, replaces the empty error with an
    actionable message (check connection / VPN / proxy)
- **`auth.js`** — `getToken / saveSession / clearSession` (localStorage). This
  flag only drives the UI; the server enforces real auth.
- **`api.jsx`** — small wrappers (`login()`, `signup()`, `generateImage()`,
  `removeBackground()`, `summarize()`, `logFeature()`, …) so components never
  hand-write URLs.

### Dev proxy

`vite.config.js` forwards `/api/*` to `http://localhost:5000` in development,
so the frontend needs **no** backend URL locally and CORS never interferes.

---

## 12. Testing

```bash
npm test          # from the repository root
```

Runs two suites:

1. **Unit tests** (Node's built-in `node --test`, no framework) — 22 tests:
   - `validators.test.js` — signup/login/feature/message rules
   - `auth.test.js` — JWT sign/verify and middleware behaviour
   - `passwords.test.js` — bcrypt hashing + legacy plain-text upgrade
   - `cors.test.js` — origin matcher incl. wildcard sub-domains
2. **API smoke suite** (`api.smoke.mjs`) — boots the real server on port 5099
   and drives 18 live checks: health, auth guards, validation, reset-code
   semantics, CORS preflight (`OPTIONS → 204` + allow-headers), security
   headers, 404s and rate limiting. Database-backed checks accept 500 when no
   local PostgreSQL is running, so the suite is hermetic.

---

## 13. Deployment (Vercel + Neon)

The app runs as **two Vercel projects** built from this one repository.

### 13.1 Neon (database)

1. Create a project at https://neon.tech (free tier is enough).
2. Copy the **pooled** connection string (host contains `-pooler`).
3. Run `backend/schema.sql` in the Neon SQL editor once (or let the API create
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
3. Deploy → the SPA calls the API with bearer tokens.

### 13.4 Current production values

- `CORS_ORIGINS` = `https://fyp-ai-feature-kit-web.vercel.app,https://*-maryamamjad-projects.vercel.app,http://localhost:5173,http://localhost:4173`
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

- **Vercel payload limit ≈ 4.5 MB** per request/response — very large images
  through *Remove Background* can fail on the free tier.
- **Rate-limit state is per serverless instance** (in-memory). Fine for a demo
  and light abuse; a shared store (e.g. Upstash Redis) would make it global.
- **Password-reset emails need SMTP** (Gmail app password or similar). Without
  them, codes only appear in server logs — acceptable for a viva, not for real
  users.
- **No email verification** on signup; `ADMIN_EMAILS` is an env-level
  allow-list rather than a role column in the database.
- Voice Changer/Text-to-Speech depend on **browser APIs** (mic permission,
  Web Speech support), so behaviour differs across browsers.

---

## 16. Future Improvements

- Refresh tokens / logout-all, plus per-session management
- Email verification and password-change (while logged in)
- Upstash Redis for globally consistent rate limiting and cached AI responses
- Move AI jobs to background/queue processing to lift the 4.5 MB payload cap
- Admin dashboard UI (usage graphs per feature/user)
- Database roles instead of `ADMIN_EMAILS` env for analytics access
- OpenAPI/Swagger spec generated from the route definitions
- CI (GitHub Actions) running `npm test` + frontend build on every push

---

## 🧑‍🎓 Author

**Maryam Amjad** — Final Year Project, AI Feature Kit
Repository: [MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App](https://github.com/MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App)

*Documentation generated during the security hardening + PostgreSQL/Vercel
migration of October 2026.*
