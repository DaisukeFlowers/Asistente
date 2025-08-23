import { useState, useEffect } from 'react';
import './App.css';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    fetch(`${API_URL}/api/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.authenticated);
        if (data.authenticated && data.email) setEmail(data.email);
      });
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch(`${API_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage('Signup successful! Please log in.');
    } else {
      setMessage(data.error || 'Signup failed.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setIsAuthenticated(true);
      setMessage('Login successful!');
    } else {
      setMessage(data.error || 'Login failed.');
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setMessage('');
    await fetch(`${API_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setIsAuthenticated(false);
    setLoading(false);
    setMessage('Logged out.');
  };

  const handleConnectGoogle = () => {
    window.location.href = `${API_URL}/login`;
  };

  return (
    <div className="container">
      <h1>Onboard Your Google Calendar</h1>
      {message && <div className="message">{message}</div>}
      {!isAuthenticated ? (
        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>Login</button>
          <button type="button" onClick={handleSignup} disabled={loading} style={{marginLeft: 8}}>Sign Up</button>
        </form>
      ) : (
        <>
          <div className="success">You are logged in as <b>{email}</b>.</div>
          <button onClick={handleLogout} disabled={loading}>Logout</button>
          <hr />
          <button className="google-btn" onClick={handleConnectGoogle} disabled={loading}>
            Connect Google Calendar
          </button>
        </>
      )}
    </div>
  );
}

export default App;
