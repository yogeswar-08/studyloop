import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

// StudyLoop's public demo runs the Assistant with a local open-source model in the browser.
// No API key is required. Inference happens on-device through WebLLM/WebGPU.
installDemoApi();
const demoFetch = window.fetch.bind(window);

let localEnginePromise: Promise<any> | null = null;
const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

async function getLocalEngine() {
  if (!localEnginePromise) {
    localEnginePromise = (async () => {
      if (!('gpu' in navigator)) {
        throw new Error('WebGPU is not available in this browser. Please use the latest Chrome or Edge.');
      }

      const webllm = await import(/* @vite-ignore */ 'https://esm.sh/@mlc-ai/web-llm');
      return webllm.CreateMLCEngine('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', {
        initProgressCallback: (report: { text?: string }) => {
          window.dispatchEvent(new CustomEvent('studyloop-ai-progress', {
            detail: report?.text || 'Loading StudyLoop AI…',
          }));
        },
      });
    })();
  }
  return localEnginePromise;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeTakeaways(question: string, answer: string) {
  const firstSentences = answer
    .replace(/```[\s\S]*?```/g, '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const fallbacks = [
    `Answer the exact question: ${question.slice(0, 80)}${question.length > 80 ? '…' : ''}`,
    'Ask a follow-up if you want an example or a simpler explanation.',
    'You can switch from explanation to practice by asking for questions.',
  ];

  return [...firstSentences, ...fallbacks].slice(0, 3);
}

async function localAssistant(input: RequestInfo | URL, init?: RequestInit) {
  let body: any = {};
  try {
    body = init?.body ? JSON.parse(String(init.body)) : {};
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  const question = String(body.question || '').trim();
  const mode = String(body.mode || 'chat');
  if (!question) return jsonResponse({ error: 'Question is required.' }, 400);

  try {
    const engine = await getLocalEngine();
    const messages = [
      {
        role: 'system' as const,
        content: `You are StudyLoop AI, a general-purpose student assistant.
Answer ONLY the student's current question. Never use a preset or canned answer.
You can answer mathematics, science, programming, AI/ML, writing, projects, study planning, general knowledge, and everyday questions.
If asked for code, provide the requested code. If asked for a definition, define the exact term. If asked to calculate, calculate it. If asked why or how, directly explain why or how.
Be accurate, concise, beginner-friendly, and stay on topic. If the question is ambiguous, state your assumption.
Mode: ${mode}. Return plain text only.`,
      },
      ...chatHistory.slice(-6),
      { role: 'user' as const, content: question },
    ];

    // Do not send response_format: some WebLLM versions reject the text format option.
    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 700,
    });

    const answer = String(response?.choices?.[0]?.message?.content || '').trim();
    if (!answer) throw new Error('The local model returned an empty answer.');

    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: answer });
    while (chatHistory.length > 8) chatHistory.shift();

    return jsonResponse({
      answer,
      takeaways: makeTakeaways(question, answer),
      practiceQuestion: `Want a practice question based on: ${question}?`,
    });
  } catch (error) {
    console.error('StudyLoop local AI error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Local AI could not start.',
      hint: 'The Assistant uses a local browser model. The first question downloads the model. Use the latest Chrome or Edge and wait for the model to finish loading.',
    }, 503);
  }
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let path = rawUrl;
  try {
    path = new URL(rawUrl, window.location.origin).pathname;
  } catch {
    // Keep the raw URL if it cannot be parsed.
  }

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
