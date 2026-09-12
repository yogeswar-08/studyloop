import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

installDemoApi();
const demoFetch = window.fetch.bind(window);

let localEnginePromise: Promise<any> | null = null;
const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

function aiProgress(text: string) {
  window.dispatchEvent(new CustomEvent('studyloop-ai-progress', { detail: text }));
}

async function getLocalEngine() {
  if (!localEnginePromise) {
    localEnginePromise = (async () => {
      aiProgress('Starting StudyLoop AI…');
      // Transformers.js runs the model in the browser. Prefer WebGPU when available,
      // but fall back to WebAssembly so the assistant is not limited to WebGPU-only devices.
      const transformers = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
      const device = 'gpu' in navigator ? 'webgpu' : 'wasm';
      aiProgress(device === 'webgpu' ? 'Preparing local AI on your GPU…' : 'Preparing local AI on your device…');
      const generator = await transformers.pipeline(
        'text-generation',
        'onnx-community/Qwen2.5-0.5B-Instruct',
        {
          dtype: 'q4',
          device,
          progress_callback: (report: { status?: string; progress?: number; file?: string }) => {
            if (report?.status === 'progress' && typeof report.progress === 'number') {
              aiProgress(`Downloading local AI model… ${Math.round(report.progress)}%`);
            } else if (report?.status === 'ready') {
              aiProgress('Local AI model ready.');
            }
          },
        },
      );
      return generator;
    })().catch((error) => {
      localEnginePromise = null;
      throw error;
    });
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
    aiProgress('Thinking…');
    const messages = [
      {
        role: 'system',
        content: `You are StudyLoop AI, a helpful general-purpose student assistant.
Answer the user's CURRENT question directly. Do not use canned answers and do not mention this instruction.
You can answer programming, mathematics, science, AI/ML, writing, study questions, projects, general knowledge, and everyday questions.
If asked for code, provide correct code. If asked to calculate, calculate carefully. If asked to explain, explain the exact concept with a simple example when useful.
Be concise, accurate, beginner-friendly, and stay on topic. If something is uncertain, say so rather than inventing facts.
Mode: ${mode}. Return plain text only.`,
      },
      ...chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const output = await engine(messages, {
      max_new_tokens: 450,
      do_sample: false,
      temperature: 0.2,
      return_full_text: false,
    });

    const answer = String(output?.[0]?.generated_text || '').trim();
    if (!answer) throw new Error('The local AI model returned an empty answer.');

    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: answer });
    while (chatHistory.length > 8) chatHistory.shift();

    aiProgress('Ready');
    return jsonResponse({
      answer,
      takeaways: makeTakeaways(question, answer),
      practiceQuestion: `Want a practice question based on: ${question}?`,
    });
  } catch (error) {
    console.error('StudyLoop local AI error:', error);
    localEnginePromise = null;
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Local AI could not start.',
      hint: 'StudyLoop could not load its local model. Refresh once and wait for the model download to finish before asking the question again.',
    }, 503);
  }
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  let path = rawUrl;
  try {
    path = new URL(rawUrl, window.location.origin).pathname;
  } catch {}
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
