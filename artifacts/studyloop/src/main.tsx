import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

// The rest of StudyLoop remains a self-contained demo API. The Assistant is
// different: it runs a small open-source LLM directly in the user's browser
// with WebLLM/WebGPU, so it does not need an API key and does not return one
// of the old hardcoded answers for unrelated questions.
const nativeFetch = window.fetch.bind(window);
installDemoApi();
const demoFetch = window.fetch.bind(window);

let localEnginePromise: Promise<any> | null = null;

async function getLocalEngine() {
  if (!localEnginePromise) {
    localEnginePromise = (async () => {
      // @vite-ignore keeps this as a browser-side ESM import rather than
      // making Vite try to bundle the remote module during the build.
      const webllm = await import(/* @vite-ignore */ 'https://esm.sh/@mlc-ai/web-llm');
      return webllm.CreateMLCEngine('SmolLM2-360M-Instruct-q4f16_1-MLC', {
        initProgressCallback: (report: { text?: string }) => {
          window.dispatchEvent(new CustomEvent('studyloop-ai-progress', {
            detail: report?.text || 'Loading local AI model…',
          }));
        },
      });
    })();
  }
  return localEnginePromise;
}

async function localAssistant(input: RequestInfo | URL, init?: RequestInit) {
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const question = String(body.question || '').trim();
  const mode = String(body.mode || 'chat');
  if (!question) {
    return new Response(JSON.stringify({ error: 'Question is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const engine = await getLocalEngine();
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are StudyLoop AI, a helpful general-purpose academic assistant. Answer the student's ACTUAL question, not a preset example. You can answer questions about mathematics, science, programming, AI/ML, writing, projects, study planning, general knowledge, and everyday topics. Be accurate, direct, and beginner-friendly. If the question asks for steps, give steps. If it asks for a definition, define the exact term. If it asks for code, provide code. Do not claim to know current information you cannot verify. Mode: ${mode}. Return ONLY JSON with exactly three fields: answer (string), takeaways (array of exactly 3 short strings), practiceQuestion (string).`,
        },
        { role: 'user', content: question },
      ],
      temperature: 0.35,
      max_tokens: 512,
    });

    const raw = response?.choices?.[0]?.message?.content?.trim() || '';
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }

    const result = parsed && typeof parsed.answer === 'string'
      ? {
          answer: parsed.answer,
          takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways.map(String).slice(0, 3) : [],
          practiceQuestion: typeof parsed.practiceQuestion === 'string' ? parsed.practiceQuestion : '',
        }
      : {
          answer: raw || 'The local model did not return an answer. Please try the question again.',
          takeaways: ['The answer was generated locally in your browser.', 'Ask a more specific question if you want a deeper explanation.', 'You can ask a follow-up question to continue the topic.'],
          practiceQuestion: '',
        };

    while (result.takeaways.length < 3) result.takeaways.push('Ask a follow-up question for more detail.');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Local AI could not start.',
      hint: 'StudyLoop needs a WebGPU-capable browser. Refresh and try again; the first run downloads the local model once.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let path = rawUrl;
  try { path = new URL(rawUrl, window.location.origin).pathname; } catch { /* keep raw URL */ }

  if (path === '/api/assistant/ask') return localAssistant(input, init);
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
