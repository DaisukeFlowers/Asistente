import React from 'react';

export default function App() {
  const handleGoogleLogin = () => {
    // Mismo origen: el front llama /api/... y Render lo proxea al backend
    window.location.href = '/api/auth/google';
  };

  return (
    <div style={{display:'grid',placeItems:'center',minHeight:'100dvh'}}>
      <button onClick={handleGoogleLogin} style={{padding:'12px 16px', fontSize:16}}>
        Login with Google
      </button>
    </div>
  );
}
