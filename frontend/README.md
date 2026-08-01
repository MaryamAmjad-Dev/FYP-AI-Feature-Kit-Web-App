# AI Feature Kit

A fullstack web application providing a suite of AI-powered tools, built with React (frontend) and Node.js/Express (backend) with a MySQL database.

## Features

- **User Authentication:** Signup, login, profile management, and password reset.
- **AI Tools:**
  - Text Summarizer (facebook/bart-large-cnn model API)
  - Text to Image (Stability AI API)
  - Text to Speech (Web Speech API (SpeechSynthesis))
  - Voice Changer (Tone.js library)
  - Remove Background (remove.bg API)
- **Feedback/Contact:** Users can send feedback, which is saved in the database and optionally emailed to the admin.
- **Feature Usage Logging:** Every time a user uses an AI feature, it is logged in the database for analytics.
- **Admin Analytics:** Backend endpoint to view all feature usage (no admin UI by default).

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, React Router, Axios
- **Backend:** Node.js, Express, MySQL, CORS, Nodemailer
- **Database:** MySQL

## Project Structure

```
ai-kit/
  backend/         # Node.js/Express API server
    server.js      # Main backend server
    schema.sql     # MySQL schema (users, feedback, feature usage)
    package.json   # Backend dependencies
  frontend/        # React app
    src/           # React components (AI tools, auth, profile, etc.)
    package.json   # Frontend dependencies
```

## Setup Instructions

### 1. Clone the Repository
```sh
git clone <repo-url>
cd ai-kit
```

### 2. Database Setup
- Create a MySQL database (default: `webai`).
- Run the SQL in `backend/schema.sql` to create tables.

### 3. Backend Setup
```sh
cd backend
npm install
node server.js
```
- The backend runs on `http://localhost:5000` by default.

### 4. Frontend Setup
```sh
cd ../frontend
npm install
npm run dev
```
- The frontend runs on `http://localhost:5173` by default (Vite).

## Environment Variables
- For email feedback, set up your email and app password in `server.js` (see nodemailer config).
- For AI APIs, set your API keys in `frontend/src/api.jsx`.

## Usage
- Register and log in as a user.
- Use any AI tool; your usage will be logged in the database.
- Send feedback via the Contact page.
- Admins can view feature usage by querying the `/api/feature-usage` endpoint.

## License
MIT