import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

// Keep the demo API for the rest of the self-contained hackathon prototype,
// but route the Assistant to a real server-side AI service so it can answer
// arbitrary student questions instead of relying on hardcoded examples.
const nativeFetch = window.fetch.bind(window);
installDemoApi();
const demoFetch = window.fetch.bind(window);
const STUDYLOOP_AI_URL = 'https://studyloop-ai-yogeswar.onrender.com';

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let path = rawUrl;
  try { path = new URL(rawUrl, window.location.origin).pathname; } catch { /* keep raw URL */ }

  if (path === '/api/assistant/ask') {
    return nativeFetch(`${STUDYLOOP_AI_URL}/api/assistant/ask`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  }

  return demoFetch(input, init);
};

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
