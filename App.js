// App.js
import React from "react";

function App() {
  // The backend endpoint that initiates the OAuth login
  const googleLogin = () => {
    window.location.href = "http://localhost:5000/login"; // adjust port/domain as needed
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20vh" }}>
      <h1>Virtual Assistant Setup</h1>
      <p>Click below to authenticate with your Google Calendar</p>
      <button onClick={googleLogin} style={{ fontSize: "1rem", padding: "10px 20px" }}>
        Login with Google Calendar
      </button>
    </div>
  );
}

export default App;