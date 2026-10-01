import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeModeProvider } from '@/contexts/ThemeModeContext';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';
import App from '@/App';
import AppVersionGuard from '@/components/AppVersionGuard';
import '@/app/globals.css';

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

function AppProviders() {
  return (
    <BrowserRouter>
      <ThemeModeProvider>
        <ReactQueryProvider>
          <AuthProvider>
            <AppVersionGuard />
            <App />
          </AuthProvider>
        </ReactQueryProvider>
      </ThemeModeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppProviders />
      </GoogleOAuthProvider>
    ) : (
      <AppProviders />
    )}
  </React.StrictMode>,
);
