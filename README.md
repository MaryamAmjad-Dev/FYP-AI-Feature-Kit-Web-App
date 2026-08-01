<div align="center">

# AI Feature Kit Web App

### AI-Powered Multimedia Platform

Build, create, and transform content with **Text-to-Image**, **Text-to-Speech**, **Background Removal**, **Voice Changer**, and **Text Summarization:** all in one modern web application.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Hugging Face](https://img.shields.io/badge/Hugging%20Face-AI-FFD21E?logo=huggingface&logoColor=black)

</div>


---

# 📖 Overview

AI Feature Kit Web App is an AI-powered multimedia platform developed as a **Final Year Project (FYP)**. The application combines multiple AI-powered utilities into a single modern web application, allowing users to generate images, convert text into speech, remove image backgrounds, summarize text, and perform other AI-assisted tasks.

The project is designed with a modern React frontend, an Express.js backend, MySQL database integration, and external AI APIs to provide a seamless user experience.

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
   MySQL Database      AI APIs
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Stability AI     Hugging Face     Remove.bg
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

- MySQL

## AI APIs

- Hugging Face API
- Stability AI API
- Remove.bg API

---

# 📂 Project Structure

```
FYP-AI-Feature-Kit-Web-App
│
├── backend
│   ├── server.js
│   ├── schema.sql
│   ├── Database Queries.sql
│   └── package.json
│
├── frontend
│   ├── public
│   ├── src
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
npm start
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 🔑 Environment Variables

Create a `.env` file inside the `frontend` folder.

```env
VITE_STABILITY_API_KEY=YOUR_STABILITY_API_KEY
VITE_REMOVE_BG_API_KEY=YOUR_REMOVE_BG_API_KEY
VITE_HUGGINGFACE_API_KEY=YOUR_HUGGINGFACE_API_KEY
```

---

# 📸 Screenshots

## Home Page

> Add screenshot here

---

## Text-to-Image

> Add screenshot here

---

## Background Remover

> Add screenshot here

---

## Text-to-Speech

> Add screenshot here

---

## Voice Changer

> Add screenshot here

---

# 🎯 Objectives

- Develop a modern AI-powered web application.
- Integrate multiple AI services into a single platform.
- Provide an intuitive and responsive user experience.
- Generate high-quality multimedia content.
- Ensure scalability and maintainability.

---

# 🚀 Future Improvements

- AI Chatbot
- AI Image Editing
- AI Video Generator
- Multi-language Support
- Dark/Light Theme
- Cloud Storage
- Download History
- Image Upscaling
- OCR
- Speech Translation

---

# 👨‍💻 Author

**Maryam Amjad**

Final Year Project

Department of Information Technology
