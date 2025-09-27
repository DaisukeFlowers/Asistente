# Schedulink Backend (Node/Express) – Environment & Deployment

Backend service providing secure Google OAuth (Authorization Code + PKCE), session management, token refresh, and forwarding to n8n workflows.

## 🚀 Features

- User authentication (signup/login)
- Google Calendar OAuth 2.0 integration
- Automatic token forwarding to n8n webhook
- Full calendar access (read/write permissions)
- CORS-enabled for frontend integration

## 📋 Prerequisites

- Python 3.7+
- Node.js 16+ (for future React frontend)
- Google Cloud Console project with Calendar API enabled
- n8n instance with webhook endpoint

## 🛠️ Quick Start (Development)

Clone & install:
```bash
git clone <repo>
cd Asistente
npm install            # installs backend deps + triggers frontend postinstall
```

Create local env file from example:
```bash
cp .env.example .env.development.local
# edit values (leave prod/staging secrets out of repo)
```

Run backend (dev auto-reload optional via backend package scripts):
```bash
npm run start
```

Run frontend (in parallel):
```bash
cd testapp && npm run dev
```

#### n8n Webhook (Already Configured)

The app is pre-configured with the n8n webhook URL. To change it, update:
```python
N8N_WEBHOOK_URL = 'your-new-webhook-url'
```

## � Environment Strategy

Backend uses a centralized Zod schema (`backend/config/env.js`). Load order:
1. `.env.development.local` (if NODE_ENV=development)
2. Render / process environment for staging & production (no file load in prod)

Staging: set `NODE_ENV=staging`; requires full core variables (mirrors prod but allows relaxed CSP / fingerprints).

Never commit real secrets – only `.env.example` and `.env.staging.example` remain tracked.

## 📡 API Endpoints

### Authentication Endpoints

- `POST /api/signup` - Create new user account
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /api/login` - User login
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `POST /api/logout` - User logout

- `GET /api/status` - Check authentication status

### Google Calendar Integration

- `GET /login` - Initiate Google OAuth flow (requires authentication)
- `GET /oauth2callback` - OAuth callback endpoint (handles Google response)

## 🔄 User Flow

1. **Sign Up/Login**: User creates account or logs in
2. **Connect Calendar**: User clicks "Connect Google Calendar" 
3. **OAuth**: User is redirected to Google consent screen
4. **Authorization**: User grants calendar permissions
5. **Token Exchange**: Backend exchanges code for access/refresh tokens
6. **n8n Integration**: Tokens are automatically sent to n8n webhook
7. **Success**: User sees confirmation message

## 🧪 Testing

### Test User Authentication

```bash
# Sign up
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt

# Check status
curl -X GET http://localhost:5000/api/status -b cookies.txt
```

### Test Google OAuth

1. Login first using the above curl commands
2. Visit `http://localhost:5000/login` in your browser
3. Complete the Google OAuth flow
4. Check your n8n webhook for received tokens

## 🔧 Configuration

### Current Configuration

- **Google Client ID**: Pre-configured
- **Google Client Secret**: Pre-configured  
- **n8n Webhook**: Pre-configured
- **Redirect URI**: `http://localhost:5000/oauth2callback`
- **Scope**: Full Google Calendar access

### Security Notes

- Authorization Code + PKCE; refresh tokens encrypted (AES-256-GCM) with key rotation support.
- Sessions rotate & enforce idle/absolute timeouts.
- CSP strict in production; staging may run relaxed (`CSP_STRICT=false`).
- HTTPS, HSTS enforced in production when TLS validated.

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the frontend URL is in the CORS origins list
2. **OAuth Redirect Mismatch**: Verify the redirect URI in Google Console matches exactly
3. **n8n Webhook Fails**: Check that your n8n instance is accessible and the webhook URL is correct
4. **Session Issues**: Ensure cookies are enabled and working properly

### Debug Mode

The app runs in debug mode by default. For production:

```python
app.run(debug=False, host='0.0.0.0')
```

## 📊 Data Flow

```
User -> React Frontend -> Flask Backend -> Google OAuth -> Google Calendar API
                                      ↓
                               n8n Webhook -> Virtual Assistant
```

## � Migration (Env File Cleanup)

Removed legacy templates: `.env.production.example`, `.env.original.example` (duplicated / outdated). Use `.env.example` (backend) + `testapp/.env.example` (frontend). Create per‑environment local overrides:

Backend:
```
.env.development.local
.env.staging.local (optional for local staging simulation)
# Production via Render dashboard only
```

Frontend (Vite – only public vars):
```
testapp/.env.development.local
testapp/.env.staging.local
```

All custom variables consumed by frontend must be prefixed `VITE_`.

Run `node scripts/print-effective-config.js` to inspect non-secret config.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions, contact the development team.
