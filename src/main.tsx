// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // StrictMode temporarily disabled for debugging infinite loops
  // <StrictMode>
    <AuthProvider>
      <OrganizationProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </OrganizationProvider>
    </AuthProvider>
  // </StrictMode>
);
