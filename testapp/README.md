# React Google Calendar Onboarding App

This project is a simple React app (Vite) for onboarding users to connect their Google Calendar. It communicates with a Python backend for authentication and Google OAuth.

## Features

- User signup, login, and logout
- Connect Google Calendar (OAuth2)
- Error and success messages in the UI
- REST API calls to backend for all actions

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

### 3. Backend

Run the Python backend (Flask) in a separate terminal:

```bash
python app.py
```

### 4. Configuration

- Update your backend with your Google API credentials and Zapier webhook URL.
- Update the frontend API URLs if needed (default: `http://localhost:5000`).

---

This project is a starting point. You can extend the UI and logic as needed for your onboarding flow.
