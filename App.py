# app.py
from flask import Flask, redirect, request, session, jsonify
from flask_cors import CORS
import requests
import os
from functools import wraps

app = Flask(__name__)
#CORS(app, supports_credentials=True, origins=[
    #"http://localhost:5173"
#])  # This enables CORS for all routes

# -------------------------------------------------- Configuracion Local/Dev ------------------------------------------- #
#app.secret_key = '4ed3c88157a9b98d2c9b39976bcd94783191d4ff280055919cbaed94965f9a54'
#app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
#app.config['SESSION_COOKIE_SECURE'] = False
# Configuration - replace these with your actual Google API credentials
#CLIENT_ID = '527754901009-al8b0eh401q66h99njl7sinfbqhi3b24.apps.googleusercontent.com'
#CLIENT_SECRET = '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'
#REDIRECT_URI = 'http://localhost:5001/oauth2callback'
# Full access for creating and updating events
#SCOPE = 'https://www.googleapis.com/auth/calendar'
#N8N_WEBHOOK_URL = 'https://stable-distinctly-honeybee.ngrok-free.app/webhook-test/Google_Credentials'  # n8n webhook
# ------------------------------------------------------- Configuracion Local/Dev -------------------------------------- #

# ------------------------------------------------------------ Configuracion Render --------------------------------- #
# Secret key (cambia esto en Render)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-change-me')
# Cookies de sesión (producción en https → Secure=True)
# Si el frontend está en dominio diferente (p. ej. app.carnerucos.mx) y este backend en api.carnerucos.mx,
# usa SameSite=None y Secure=True para que el navegador mande cookies cross-site.
app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')  # 'None' si frontend y backend están en distintos subdominios
app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
# CORS
CORS(app,
     supports_credentials=True,
     origins=[o.strip() for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')]
)
# Google OAuth (lee de ENV)
CLIENT_ID = os.getenv('CLIENT_ID', '')
CLIENT_SECRET = os.getenv('CLIENT_SECRET', '')
REDIRECT_URI = os.getenv('REDIRECT_URI', 'http://localhost:5001/oauth2callback')
SCOPE = os.getenv('GOOGLE_SCOPE', 'https://www.googleapis.com/auth/calendar')
# n8n webhook
N8N_WEBHOOK_URL = os.getenv('N8N_WEBHOOK_URL', '')

@app.get("/health")
def health():
    return {"ok": True}, 200
# ---------------------------------------------------- Configuracion Render --------------------------------------------- #

# In-memory user store (for demo only)
users = {}
    
# Helper: login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    if email in users:
        return jsonify({'error': 'User already exists'}), 400
    users[email] = {'password': password}
    return jsonify({'message': 'User created'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = users.get(email)
    if not user or user['password'] != password:
        return jsonify({'error': 'Invalid credentials'}), 401
    session['user'] = email
    return jsonify({'message': 'Logged in'})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'message': 'Logged out'})

@app.route('/api/status')
def status():
    user = session.get('user')
    if user:
        return jsonify({'authenticated': True, 'email': user})
    return jsonify({'authenticated': False})

@app.route('/login')
@login_required
def google_login():
    # Construct Google’s OAuth 2.0 authorization URL
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        "?response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={SCOPE}"
        "&access_type=offline"  # to request refresh tokens too
        "&prompt=consent"       # to always prompt the user for permission
    )
    return redirect(auth_url)

@app.route('/oauth2callback')
@login_required
def oauth2callback():
    error = request.args.get('error')
    if error:
        return f"Error encountered: {error}", 400

    code = request.args.get('code')
    if not code:
        return "No authorization code provided.", 400

    # Exchange the authorization code for tokens
    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    }
    token_response = requests.post(token_url, data=data)
    if token_response.status_code != 200:
        return f"Failed to obtain tokens: {token_response.text}", 400

    token_data = token_response.json()
    session['token_data'] = token_data  # Save tokens in session (or a database for production)

    # Forward tokens to n8n webhook
    webhook_response = requests.post(N8N_WEBHOOK_URL, json={
        'user': session['user'],
        'token_data': token_data
    })
    if webhook_response.status_code != 200:
        return f"n8n webhook error: {webhook_response.text}", 400

    return jsonify({
        "message": "Google Calendar access granted and sent to n8n!",
        "token_data": token_data
    })

if __name__ == '__main__':
    # For local development only; configure production settings appropriately.
    app.run(debug=True, port=5001)
    app.run(debug=True, port=port)
