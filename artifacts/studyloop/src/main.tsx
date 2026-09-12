import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { installDemoApi } from './demo-api';

import './index.css';

installDemoApi();

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
  document.addEventListener('DOMContentLoaded', installPhoneFocusMode, { once: true });
} else {
  installPhoneFocusMode();
}
