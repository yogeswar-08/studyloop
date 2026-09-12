import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

installDemoApi();
const demoFetch = window.fetch.bind(window);
const FAST_AI_URL = 'https://studyloop-ai-api.onrender.com';

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let path = rawUrl;
  try {
    path = new URL(rawUrl, window.location.origin).pathname;
  } catch {}

  if (path === '/api/assistant/ask') {
    const target = `${FAST_AI_URL}/api/assistant/ask`;
    try {
      return await fetch(target, init);
    } catch (error) {
      console.error('StudyLoop hosted AI request failed:', error);
      return new Response(JSON.stringify({ error: 'The AI service is temporarily unavailable. Please try again.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  return demoFetch(input, init);
};

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
