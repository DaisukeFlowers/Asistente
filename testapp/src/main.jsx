import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import React from 'react';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { /* Optionally send to logging endpoint later */ console.error('Root error boundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:40,fontFamily:'sans-serif'}}>
          <h1 style={{fontSize:24,marginBottom:12}}>Something went wrong.</h1>
          <p style={{color:'#475569',marginBottom:16}}>An unexpected error occurred while loading the application UI.</p>
          <pre style={{whiteSpace:'pre-wrap',background:'#f1f5f9',padding:12,borderRadius:6,fontSize:12,overflow:'auto'}}>{String(this.state.error)}</pre>
          <button onClick={() => window.location.reload()} style={{marginTop:12,background:'#2563eb',color:'#fff',border:'none',padding:'8px 14px',borderRadius:6,cursor:'pointer'}}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { LegalAcceptanceProvider } from './auth/LegalAcceptanceContext.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <LegalAcceptanceProvider>
            <RootErrorBoundary>
              <App />
            </RootErrorBoundary>
          </LegalAcceptanceProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
