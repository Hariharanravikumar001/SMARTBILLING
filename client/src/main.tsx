import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrandingProvider } from './context/BrandingContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandingProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrandingProvider>
  </StrictMode>,
);
