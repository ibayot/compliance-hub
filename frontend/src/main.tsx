import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/lib/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';
import App from '@/App';
import '@/app/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ReactQueryProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
