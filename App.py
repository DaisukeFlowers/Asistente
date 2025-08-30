# App.py
import os
import secrets
import urllib.parse
import requests

from flask import Flask, redirect, request, session, jsonify

# -----------------------------------------------------------------------------
# Config básica
# -----------------------------------------------------------------------------
app = Flask(__name__)

# SECRET_KEY para sesiones (state de OAuth); ideal setearla via env en Render
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# Cookies de sesión seguras (estás en HTTPS en Render)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True,
)

# Helper para leer env vars con nombres alternativos
def _getenv(*names, required=False, default=None):
    for n in names:
        v = os.getenv(n)
        if v:
            return v
    if required:
        raise RuntimeError(f"Missing required env var. Tried: {', '.join(names)}")
    return default

# Variables de Google OAuth y n8n (acepta ambos esquemas de nombres)
CLIENT_ID       = _getenv("CLIENT_ID", "GOOGLE_CLIENT_ID", required=True)
CLIENT_SECRET   = _getenv("CLIENT_SECRET", "GOOGLE_CLIENT_SECRET", required=True)
REDIRECT_URI    = _getenv("REDIRECT_URI", "OAUTH_REDIRECT_URI", required=True)
N8N_WEBHOOK_URL = _getenv("N8N_WEBHOOK_URL", required=True)
SCOPE           = _getenv("GOOGLE_SCOPE", default="https://www.googleapis.com/auth/calendar")

# Endpoints de Google
AUTH_ENDPOINT   = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT  = "https://oauth2.googleapis.com/token"
USERINFO        = "https://www.googleapis.com/oauth2/v2/userinfo"

# -----------------------------------------------------------------------------
# Rutas utilitarias
# -----------------------------------------------------------------------------
@app.route("/health", methods=["GET", "HEAD"])
def health():
    # Para el health check de Render
    return ("OK", 200)

@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"ok": True})

# -----------------------------------------------------------------------------
# OAuth Google
# -----------------------------------------------------------------------------
@app.route("/api/auth/google", methods=["GET"])
def auth_google():
    """
    Inicia el flujo OAuth: genera 'state', construye la URL y redirige a Google.
    """
    # CSRF protection con state
    state = secrets.token_urlsafe(24)
    session["oauth_state"] = state

    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,           # Debe coincidir con Google Console
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",               # para refresh_token
        "prompt": "consent",                    # fuerza refresh_token
        "include_granted_scopes": "true",
        "state": state,
    }
    url = f"{AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"
    return redirect(url, code=302)  # :contentReference[oaicite:0]{index=0}

@app.route("/api/auth/google/callback", methods=["GET"])
def auth_google_callback():
    """
    Callback: valida 'state', canjea el 'code' por tokens, obtiene perfil
    y manda {profile, tokens} a n8n. Luego redirige al front.
    """
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

    # Obtener perfil básico (email) con el access_token
    try:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        profile = requests.get(USERINFO, headers=headers, timeout=10).json()
    except Exception as e:
        profile = {"error": f"userinfo_failed: {e}"}

    # Enviar a n8n para que continues tu flujo (guardar tokens y operar calendario)
    payload = {
        "provider": "google",
        "profile": profile,   # {id, email, ...}
        "tokens": tokens,     # incluye refresh_token
    }
    try:
        r = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=15)
        r.raise_for_status()
    except Exception as e:
        # No bloqueamos al usuario si falla n8n; solo log
        print("Error posting to n8n:", e)

    # Redirige de vuelta al front (puedes cambiar query param si quieres)
    # OJO: usa tu dominio actual del front si cambias más adelante
    return redirect("https://frontend-t6hj.onrender.com/?connected=google", code=302)  # :contentReference[oaicite:1]{index=1}

# -----------------------------------------------------------------------------
# Entrypoint local (Render usa gunicorn "App:app")
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # Útil solo si corres localmente (python App.py)
    port = int(os.getenv("PORT", "3000"))
    app.run(host="0.0.0.0", port=port, debug=False)
