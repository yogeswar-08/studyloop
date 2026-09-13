import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

installDemoApi();

function installHostedAssistant() {
  const localFetch = window.fetch.bind(window);
  const AI_URL = 'https://studyloop-ai-api.onrender.com/api/assistant/ask';

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let pathname = rawUrl;
    try { pathname = new URL(rawUrl, window.location.origin).pathname; } catch {}

    if (pathname === '/api/assistant/ask' && (init?.method || 'GET').toUpperCase() === 'POST') {
      try {
        const response = await fetch(AI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: init?.body,
        });
        if (response.ok) return response;
      } catch (error) {
        console.warn('Hosted StudyLoop AI unavailable; using local assistant fallback.', error);
      }
      return localFetch(input, init);
    }

    return localFetch(input, init);
  };
}

installHostedAssistant();

function installFastLearningAI() {
  const style = document.createElement('style');
  style.textContent = `
    .sl-ai-root { position:fixed; right:18px; bottom:78px; z-index:10000; font-family:inherit; }
    .sl-ai-root button { border:0; cursor:pointer; }
    .sl-ai-fab { display:flex; align-items:center; gap:8px; border-radius:999px; padding:12px 16px; background:#166b61; color:#f9f4ea; box-shadow:0 12px 35px rgba(22,107,97,.28); font-size:12px; font-weight:900; }
    .sl-ai-panel { width:min(390px,calc(100vw - 28px)); max-height:min(650px,calc(100vh - 120px)); overflow:auto; margin-bottom:10px; border:1px solid rgba(32,36,56,.12); border-radius:26px; padding:18px; background:#fbf8f1; color:#202438; box-shadow:0 24px 70px rgba(32,36,56,.24); }
    .sl-ai-panel[hidden] { display:none; }
    .sl-ai-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .sl-ai-title { font-size:17px; font-weight:950; letter-spacing:-.03em; }
    .sl-ai-sub { margin-top:4px; font-size:11px; line-height:1.5; opacity:.58; }
    .sl-ai-close { background:transparent; font-size:22px; opacity:.45; }
    .sl-ai-input { width:100%; margin-top:14px; box-sizing:border-box; resize:vertical; min-height:72px; border:1px solid rgba(32,36,56,.14); border-radius:16px; padding:12px; outline:none; background:white; color:#202438; font:inherit; font-size:13px; }
    .sl-ai-input:focus { border-color:#166b61; box-shadow:0 0 0 3px rgba(22,107,97,.08); }
    .sl-ai-modes { display:grid; grid-template-columns:repeat(2,1fr); gap:7px; margin-top:9px; }
    .sl-ai-modes button { border-radius:12px; padding:9px 8px; background:#e6ece4; color:#166b61; font-size:10px; font-weight:900; }
    .sl-ai-modes button.active { background:#202438; color:#f9f4ea; }
    .sl-ai-go { width:100%; margin-top:9px; border-radius:14px; padding:12px; background:#f9b85b; color:#202438; font-size:12px; font-weight:950; }
    .sl-ai-go:disabled { opacity:.55; cursor:wait; }
    .sl-ai-result { margin-top:13px; border-radius:18px; padding:14px; background:#202438; color:#f9f4ea; font-size:12px; line-height:1.65; white-space:pre-wrap; }
    .sl-ai-result strong { color:#f9b85b; }
    .sl-ai-tip { margin-top:10px; border-radius:14px; padding:10px 12px; background:#f3dfc3; color:#704812; font-size:10px; line-height:1.5; }
    @media (max-width:640px) { .sl-ai-root { right:12px; bottom:72px; } .sl-ai-fab { padding:12px 14px; } }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'sl-ai-root';
  root.innerHTML = `
    <section class="sl-ai-panel" hidden aria-label="StudyLoop Fast Learning AI">
      <div class="sl-ai-head"><div><div class="sl-ai-title">⚡ Fast Learning AI</div><div class="sl-ai-sub">Turn any topic into a short learn → practice → test loop.</div></div><button class="sl-ai-close" aria-label="Close">×</button></div>
      <textarea class="sl-ai-input" placeholder="Try: pointers in C, photosynthesis, calculus integration..."></textarea>
      <div class="sl-ai-modes">
        <button data-mode="learn" class="active">Learn fast</button>
        <button data-mode="quiz">Quiz me</button>
        <button data-mode="roadmap">Make roadmap</button>
        <button data-mode="explain">Explain simply</button>
      </div>
      <button class="sl-ai-go">Start learning loop →</button>
      <div class="sl-ai-result" hidden></div>
      <div class="sl-ai-tip">💡 Best use: study one small topic, answer the practice question without looking, then use Quiz Me to find your weak spot.</div>
    </section>
    <button class="sl-ai-fab">⚡ Fast Learning AI</button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.sl-ai-panel') as HTMLElement;
  const fab = root.querySelector('.sl-ai-fab') as HTMLButtonElement;
  const close = root.querySelector('.sl-ai-close') as HTMLButtonElement;
  const input = root.querySelector('.sl-ai-input') as HTMLTextAreaElement;
  const go = root.querySelector('.sl-ai-go') as HTMLButtonElement;
  const result = root.querySelector('.sl-ai-result') as HTMLElement;
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  let mode = 'learn';

  fab.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); };
  close.onclick = () => { panel.hidden = true; };
  modeButtons.forEach(button => button.onclick = () => {
    mode = button.dataset.mode || 'learn';
    modeButtons.forEach(item => item.classList.toggle('active', item === button));
  });

  go.onclick = async () => {
    const topic = input.value.trim();
    if (!topic) { input.focus(); return; }
    go.disabled = true;
    go.textContent = 'Building your learning loop…';
    result.hidden = false;
    result.textContent = 'Thinking…';
    const prompts: Record<string,string> = {
      learn: `Teach me ${topic} using a FAST learning loop. Give: 1) a 30-second intuition, 2) 3 core ideas, 3) one practical example, 4) one common mistake, 5) a 2-minute practice question, 6) the answer hidden after a divider. Keep it beginner-friendly and useful for an exam.`,
      quiz: `Quiz me on ${topic}. Give exactly 5 questions from easy to challenging. Do not reveal answers immediately. Put an answer key after a divider so I can check myself. End with a score guide.`,
      roadmap: `Create a compact learning roadmap for ${topic}. Give prerequisites, a 20-minute first session, a 30-minute practice session, a revision step, and how to know I am exam-ready. Avoid unnecessary resources.`,
      explain: `Explain ${topic} like I am a beginner. Use simple language, an analogy, a tiny example, then one check-for-understanding question. Correct common misconceptions.`
    };
    try {
      const response = await localFetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompts[mode], mode: `fast-${mode}` }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'AI unavailable');
      result.textContent = data.answer || 'No answer returned. Try again.';
    } catch (error) {
      result.textContent = 'StudyLoop AI is temporarily unavailable. Try again in a moment.';
      console.warn(error);
    } finally {
      go.disabled = false;
      go.textContent = 'Start learning loop →';
    }
  };
}

function installPhoneFocusMode() {
  const style = document.createElement('style');
  style.textContent = `
    .studyloop-phone-focus { position: fixed; right: 18px; bottom: 18px; z-index: 9999; font-family: inherit; }
    .studyloop-phone-focus button { border: 0; cursor: pointer; }
    .sl-focus-fab { display:flex; align-items:center; gap:8px; border-radius:999px; padding:11px 15px; background:#202438; color:#f9f4ea; box-shadow:0 10px 30px rgba(32,36,56,.22); font-size:12px; font-weight:800; }
    .sl-focus-panel { width:min(320px,calc(100vw - 36px)); margin-bottom:10px; border-radius:24px; padding:18px; background:#fbf8f1; color:#202438; border:1px solid rgba(32,36,56,.12); box-shadow:0 18px 50px rgba(32,36,56,.2); }
    .sl-focus-panel[hidden] { display:none; }
    .sl-focus-head { display:flex; justify-content:space-between; align-items:center; }
    .sl-focus-title { font-size:14px; font-weight:900; }
    .sl-focus-sub { margin-top:3px; font-size:10px; opacity:.55; }
    .sl-focus-close { background:transparent; font-size:20px; opacity:.5; }
    .sl-focus-time { margin:18px 0 12px; text-align:center; font-size:52px; line-height:1; font-weight:900; letter-spacing:-.06em; }
    .sl-focus-status { text-align:center; font-size:11px; opacity:.6; margin-bottom:14px; }
    .sl-focus-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .sl-focus-actions button { border-radius:14px; padding:11px; background:#e6ece4; color:#166b61; font-size:11px; font-weight:800; }
    .sl-focus-actions .primary { background:#202438; color:#f9f4ea; }
    .sl-focus-presets { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:10px; }
    .sl-focus-presets button { border-radius:12px; padding:8px; background:#f3dfc3; color:#8d5b18; font-size:10px; font-weight:800; }
    @media (max-width:640px) { .studyloop-phone-focus { right:12px; bottom:12px; } .sl-focus-fab { padding:12px 14px; } }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'studyloop-phone-focus';
  root.innerHTML = `
    <section class="sl-focus-panel" hidden aria-label="Phone Focus Mode">
      <div class="sl-focus-head"><div><div class="sl-focus-title">📱 Phone Focus Mode</div><div class="sl-focus-sub">Stay focused without leaving StudyLoop</div></div><button class="sl-focus-close" aria-label="Close">×</button></div>
      <div class="sl-focus-time">25:00</div>
      <div class="sl-focus-status">Ready · your screen will stay awake</div>
      <div class="sl-focus-actions"><button class="primary sl-start">Start focus</button><button class="sl-reset">Reset</button></div>
      <div class="sl-focus-presets"><button data-min="15">15 min</button><button data-min="25">25 min</button><button data-min="50">50 min</button></div>
    </section>
    <button class="sl-focus-fab">⏱ Focus Mode</button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.sl-focus-panel') as HTMLElement;
  const fab = root.querySelector('.sl-focus-fab') as HTMLButtonElement;
  const time = root.querySelector('.sl-focus-time') as HTMLElement;
  const status = root.querySelector('.sl-focus-status') as HTMLElement;
  const start = root.querySelector('.sl-start') as HTMLButtonElement;
  const reset = root.querySelector('.sl-reset') as HTMLButtonElement;
  const close = root.querySelector('.sl-focus-close') as HTMLButtonElement;
  let seconds = 25 * 60;
  let timer: number | null = null;
  let wakeLock: any = null;

  const render = () => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    time.textContent = `${m}:${s}`;
  };

  const releaseWakeLock = async () => {
    try { if (wakeLock) await wakeLock.release(); } catch {}
    wakeLock = null;
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen');
    } catch {}
  };

  const finish = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
    status.textContent = 'Session complete 🎉 Take a short break.';
    start.textContent = 'Start again';
    try { navigator.vibrate?.([150, 80, 150]); } catch {}
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('StudyLoop', { body: 'Focus session complete. Nice work!' }); } catch {}
    releaseWakeLock();
  };

  const startTimer = async () => {
    if (timer) { window.clearInterval(timer); timer = null; await releaseWakeLock(); start.textContent = 'Resume focus'; status.textContent = 'Paused'; return; }
    await requestWakeLock();
    try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch {}
    status.textContent = 'Focusing · screen awake';
    start.textContent = 'Pause';
    timer = window.setInterval(() => {
      seconds -= 1;
      render();
      if (seconds <= 0) finish();
    }, 1000);
  };

  const resetTimer = async () => {
    if (timer) window.clearInterval(timer);
    timer = null;
    await releaseWakeLock();
    seconds = 25 * 60;
    render();
    start.textContent = 'Start focus';
    status.textContent = 'Ready · your screen will stay awake';
  };

  fab.onclick = () => { panel.hidden = !panel.hidden; };
  close.onclick = () => { panel.hidden = true; };
  start.onclick = () => { void startTimer(); };
  reset.onclick = () => { void resetTimer(); };
  root.querySelectorAll<HTMLButtonElement>('[data-min]').forEach((button) => {
    button.onclick = () => { seconds = Number(button.dataset.min) * 60; render(); status.textContent = `${button.dataset.min}-minute session ready`; };
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && timer) void requestWakeLock(); });
  render();
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { installPhoneFocusMode(); installFastLearningAI(); }, { once: true });
} else {
  installPhoneFocusMode();
  installFastLearningAI();
}
