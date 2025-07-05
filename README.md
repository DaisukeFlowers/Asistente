# Virtual Assistant - Google Calendar Integration

A web application for onboarding clients to connect their Google Calendar to your virtual assistant via n8n automation.

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

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd webapp
```

### 2. Backend Setup (Flask)

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Google OAuth (Already Configured)

The app is pre-configured with Google OAuth credentials. If you need to change them:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/oauth2callback`
5. Update `App.py` with your credentials

#### n8n Webhook (Already Configured)

The app is pre-configured with the n8n webhook URL. To change it, update:
```python
N8N_WEBHOOK_URL = 'your-new-webhook-url'
```

## 🚦 Running the Application

### Start the Backend

```bash
python App.py
```

The Flask server will start on `http://localhost:5000`

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

- App runs with hardcoded credentials (suitable for private repo)
- Uses secure session configuration
- CORS enabled for `http://localhost:5173` (React development)

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

## 🔮 Next Steps

- [ ] Create React frontend
- [ ] Add database for user persistence  
- [ ] Implement proper password hashing
- [ ] Add email verification
- [ ] Create user dashboard
- [ ] Add calendar event management
- [ ] Deploy to production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions, contact the development team.
