import os, secrets, urllib.parse, requests
from flask import Flask, redirect, request, session, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET = os.environ["CLIENT_SECRET"]
REDIRECT_URI = os.environ["REDIRECT_URI"]  # https://frontend-t6hj.onrender.com/api/auth/google/callback
N8N_WEBHOOK_URL = os.environ["N8N_WEBHOOK_URL"]

AUTH_ENDPOINT  = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
USERINFO       = "https://www.googleapis.com/oauth2/v2/userinfo"
SCOPE = "https://www.googleapis.com/auth/calendar"

@app.route("/api/auth/google")
def auth_google():
    # CSRF protection con state
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",    # refresh_token
        "prompt": "consent",         # fuerza refresh_token en cada consentimiento
        "include_granted_scopes": "true",
        "state": state,
    }
    url = f"{AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"
    return redirect(url, code=302)

@app.route("/api/auth/google/callback")
def auth_google_callback():
    # Validar estado
    state = request.args.get("state")
    if not state or state != session.get("oauth_state"):
        return "Invalid state", 400

    code = request.args.get("code")
    if not code:
        return "Missing code", 400

    # Intercambiar code por tokens
    data = {
        "code": code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    token_res = requests.post(TOKEN_ENDPOINT, data=data, timeout=15)
    if token_res.status_code != 200:
        return f"Token exchange failed: {token_res.text}", 400

    tokens = token_res.json()  # {access_token, expires_in, refresh_token, scope, token_type}

    # (opcional) obtener email/usuario
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    profile = requests.get(USERINFO, headers=headers, timeout=10).json()

    # Enviar a n8n (tu parte para detonar acciones de calendario)
    payload = {
        "provider": "google",
        "profile": profile,         # {id, email, ...}
        "tokens": tokens,           # incluye refresh_token
    }
    try:
        n8n = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=15)
        # si quieres validar respuesta:
        n8n.raise_for_status()
    except Exception as e:
        # registra/loguea el fallo para reintento
        print("Error posting to n8n:", e)

    # Redirige a una página simple de éxito en tu front
    # (puede ser /onboarded o solo home con query param)
    return redirect("https://frontend-t6hj.onrender.com/?connected=google", code=302)

@app.route("/api/status")
def status():
    return jsonify({"ok": True})
