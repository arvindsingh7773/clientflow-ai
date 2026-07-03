import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Unregister PWA Service Worker to prevent serving stale cached assets
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('Unregistered service worker successfully to bypass cache');
      });
    }
  });
}

// Clear browser cache storage
if ('caches' in window) {
  caches.keys().then(keys => {
    keys.forEach(key => {
      caches.delete(key).then(() => {
        console.log('Cleared cache storage:', key);
      });
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#171717',
            color: '#fff',
            border: '1px solid #262626',
            borderRadius: '16px'
          }
        }}
      />
    </AuthProvider>
  </StrictMode>,
);
