<div align="center">

# AI Feature Kit Web App

### AI-Powered Multimedia Platform

Build, create, and transform content with **Text-to-Image**, **Text-to-Speech**, **Background Removal**, **Voice Changer**, and **Text Summarization:** all in one modern web application.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4479A1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

</div>

> 📚 **Complete documentation** — schema, full API reference, security model,
> deployment guide and troubleshooting: **[DOCUMENTATION.md](DOCUMENTATION.md)**

---

# 📖 Overview

AI Feature Kit Web App is an AI-powered multimedia platform developed as a **Final Year Project (FYP)**. The application combines multiple AI-powered utilities into a single modern web application, allowing users to generate images, convert text into speech, remove image backgrounds, summarize text, and perform other AI-assisted tasks.

The project is designed with a modern React frontend, an Express.js backend, PostgreSQL database integration, and external AI APIs to provide a seamless user experience.

---

# ✨ Features

- 🎨 Text-to-Image Generation
- 🎙️ Text-to-Speech
- 🖼️ Background Remover
- 🎤 Voice Changer
- 📝 Text Summarizer
- 👤 User Authentication
- 📜 Feature Usage History
- 👤 User Profile Management
- 🔒 Secure Login & Signup
- 🔑 Login / Sign up with **Google** and **GitHub** (OAuth 2.0)
- 📱 Responsive User Interface

---

# 🏗️ System Architecture

```
                User
                  │
                  ▼
          React + Vite Frontend
                  │
                  ▼
         Express.js REST API
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
   PostgreSQL Database  AI APIs
                         │
         ┌────────────────┴──────────────────┐
         ▼                               ▼
    Stability AI                      Remove.bg
```

---

# 🛠️ Tech Stack

## Frontend

- React.js
- Vite
- Tailwind CSS
- Framer Motion
- Axios

## Backend

- Node.js
- Express.js

## Database

- PostgreSQL

## AI APIs

- Stability AI API
- Remove.bg API

---

# 📂 Project Structure

```
FYP-AI-Feature-Kit-Web-App
│
├── backend
│   ├── server.js            # Express app (helmet, CORS, rate limits)
│   ├── config.js            # loads backend/.env
│   ├── db.js                # PostgreSQL connection pool + schema bootstrap
│   ├── auth.js              # JWT signing/verification + auth middleware
│   ├── validators.js        # server-side input validation
│   ├── mailer.js            # password-reset emails (nodemailer)
│   ├── routes/
│   │   ├── auth.routes.js   # signup, login, me, forgot/reset password
│   │   ├── usage.routes.js  # feature usage + contact
│   │   └── ai.routes.js     # Stability / remove.bg proxy
│   ├── tests/               # node:test suites
│   ├── schema.sql
│   ├── .env.example
│   └── package.json
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── apiClient.js     # single Axios instance (base URL + auth header)
│   │   ├── auth.js          # session helpers
│   │   ├── api.jsx          # AI feature calls (proxied via backend)
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── package.json
├── package-lock.json
└── .gitignore
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/MaryamAmjad-Dev/FYP-AI-Feature-Kit-Web-App.git
```

Move into the project

```bash
cd FYP-AI-Feature-Kit-Web-App
```

---

## Backend

```bash
cd backend
npm install
copy .env.example .env   # then fill in your values (Windows)
npm start
```

> **PostgreSQL**: the connection settings live in `backend/.env` (`DATABASE_URL`,
> or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, ...).
> Tables are created automatically on first start (or run `schema.sql` with psql).

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

In development the Vite dev server proxies `/api` to `http://localhost:5000`,
so no backend URL (and no API key) has to be configured in the frontend.

---

# 🔑 Environment Variables

## `backend/.env` (server only — never committed)

```env
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# PostgreSQL — either a single connection string ...
DATABASE_URL=postgresql://postgres:password@localhost:5432/webai
# ... or the individual settings below (used when DATABASE_URL is empty)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=webai
# Set true for hosted databases that require TLS (Neon, Supabase, RDS, ...)
PG_SSL=false

JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
ADMIN_EMAILS=

# Password-reset emails (optional in dev: the code is printed on the server console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="AI Feature Kit <no-reply@example.com>"

# Third-party AI keys — server side ONLY
STABILITY_API_KEY=YOUR_STABILITY_API_KEY
REMOVE_BG_API_KEY=YOUR_REMOVE_BG_API_KEY
```

## `frontend/.env` (optional)

```env
# Only needed when the backend is not served from the same origin
VITE_API_URL=/api
```

> ⚠️ **Never put API keys in the frontend.** Anything prefixed with `VITE_` is
> compiled into the public JavaScript bundle and is visible to every visitor.
> All AI calls are proxied through the backend, which holds the real keys.

---

# 🚀 Deployment (Vercel + Neon)

The app runs as **two Vercel projects** (API + static frontend) that both come
from this repository, with a **Neon** PostgreSQL database.

## 1. Create the database (Neon)

1. Sign up at <https://neon.tech> and create a project (pick the region closest
   to your users).
2. Copy the **pooled** connection string — the host name contains `-pooler`:
   ```
   postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
3. In the Neon **SQL editor**, run the contents of `backend/db/schema.sql` once
   (or let the API create the tables on its first request — then skip
   `SKIP_SCHEMA_INIT` below).

## 2. Backend — Vercel project #1

1. <https://vercel.com> → **Add New → Project** → import this repository.
2. **Settings → General → Root Directory**: `backend`.
3. Deploy (Vercel finds the serverless function in `backend/api/index.js`).
4. **Settings → Environment Variables** — add, then **redeploy**:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `JWT_SECRET` | long random string (`openssl rand -hex 48`) |
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `1` |
   | `DB_POOL_MAX` | `1` |
   | `SKIP_SCHEMA_INIT` | `true` (only if you ran schema.sql in step 1.3) |
   | `CORS_ORIGINS` | frontend URL from step 3 (e.g. `https://app.vercel.app`) |
   | `APP_URL` | frontend URL (used in password-reset emails) |
   | `STABILITY_API_KEY` / `REMOVE_BG_API_KEY` | optional AI features |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional — enables "Login with Google" (empty pair = button disabled) |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional — enables "Login with GitHub" (empty pair = button disabled) |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | password-reset emails (without SMTP the code is only printed in the function logs — fine for a demo, not for real users) |

5. The API is live at `https://<backend-project>.vercel.app/api/health`.

## 3. Frontend — Vercel project #2

1. Import the **same repository** again as a new project.
2. **Settings → General → Root Directory**: `frontend` (Vite is auto-detected).
3. **Environment Variables**: `VITE_API_URL` =
   `https://<backend-project>.vercel.app/api`
4. Deploy. Custom domain optional (Settings → Domains).

## ⚠️ Platform notes

- **Payload limit**: Vercel functions accept ~4.5 MB per request/response, so
  very large images through *Remove Background* may fail on the free tier.
- **Rate limiting** defaults to an in-memory store per function instance — fine
  for a demo/viva. Set `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN` to move the counters into Upstash Redis so they
  are shared across every cold start.
- **Cold starts**: the first request after idle takes ~1–2 s (serverless).

---

# 🧪 Tests

```bash
npm test          # from the repository root
```

This runs:

- **Unit tests** (`backend/tests/*.test.js`) — **28 checks**: validators
  (including the 3 MB image cap and profile URL rules), password hashing
  (including the legacy plain-text upgrade), JWT/session-revocation handling
  and CORS wildcard gating.
- **API smoke test** (`backend/tests/api.smoke.mjs`) — **23 live checks**:
  boots the real server on a test port and asserts the security behaviour —
  authentication on protected routes, cookie attributes, session revocation
  after a password reset, no unauthenticated password reset, input validation,
  CORS allow-list + credentials, security headers, body-size limits, admin
  gating and rate limiting.

```bash
# from backend/ — full suite against a real database
DB_HOST=… DB_USER=… DB_NAME=… SMOKE_REQUIRE_DB=true npm run test:all
```

CI (`.github/workflows/ci.yml`) runs exactly that on every push and pull
request: backend unit + smoke tests against a Postgres 16 service container,
frontend lint + production build, and `npm audit` on both packages.

---


# 📸 Screenshots

| Home Page | Features |
|-----------|----------|
| ![](screenshots/home.png) | ![](screenshots/features.png) |

| Login | Sign Up |
|-------|---------|
| ![](screenshots/login.png) | ![](screenshots/signup.png) |


---

# 🎯 Objectives

- Develop a modern AI-powered web application.
- Integrate multiple AI services into a single platform.
- Provide an intuitive and responsive user experience.
- Generate high-quality multimedia content.
- Ensure scalability and maintainability.

---

# 🚀 Future Improvements

- 🤖 AI Chatbot
- 🧠 AI Agents (Task Automation & Multi-Agent Workflows)
- 🎨 AI Image Editing
- 🎥 AI Video Generator
- 🌍 Multi-language Support
- 🌗 Dark/Light Theme
- ☁️ Cloud Storage Integration
- 📜 Download & Generation History
- 🖼️ AI Image Upscaling
- 🔍 OCR (Optical Character Recognition)
- 🌐 Speech Translation
- 🎙️ Real-Time Voice Cloning
- 💬 Conversational Voice Assistant
- 📄 AI Document Summarization
- 📊 AI Analytics Dashboard
- 📱 Progressive Web App (PWA) Support

---

# 👨‍💻 Author

**Maryam Amjad**

Final Year Project

Department of Information Technology

- GitHub: [github.com/MaryamAmjad-Dev](https://github.com/MaryamAmjad-Dev)
- LinkedIn: [linkedin.com/in/maryam-amjad-6a7a8m](https://www.linkedin.com/in/maryam-amjad-6a7a8m/)
