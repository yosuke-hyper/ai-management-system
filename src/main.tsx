// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/authcontext';
import App from './app';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // StrictMode temporarily disabled for debugging infinite loops
  // <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  // </StrictMode>
);
