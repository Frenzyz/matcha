import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './utils/logger';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Uncaught error:', {
    message,
    source,
    lineno,
    colno,
    error
  });
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = (event) => {
  logger.error('Unhandled promise rejection:', {
    reason: event.reason
  });
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>
);