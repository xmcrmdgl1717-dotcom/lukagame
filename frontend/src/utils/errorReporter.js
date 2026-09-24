// frontend/src/utils/errorReporter.js
// 全局错误捕获 & 上报

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_REPORTS_PER_SESSION = 20;
const SESSION_KEY = 'luka_err_session';

let reportCount = 0;

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}

function getUserInfo() {
  try {
    const raw = localStorage.getItem('luka-user');
    if (!raw) return { userId: null, username: '' };
    const obj = JSON.parse(raw);
    const u = obj?.state?.user || obj?.user;
    return { userId: u?.id || null, username: u?.username || '' };
  } catch {
    return { userId: null, username: '' };
  }
}

function send(payload) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount++;

  const { userId, username } = getUserInfo();
  const body = {
    ...payload,
    userId,
    username,
    url: window.location.href,
    sessionId: getSessionId(),
    ts: Date.now(),
  };

  try {
    // 用 fetch 避免触发 axios 拦截器
    fetch(`${API_URL}/api/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function reportError(err, extra = {}) {
  if (!err) return;
  const message = typeof err === 'string' ? err : (err.message || String(err));
  const stack = typeof err === 'object' ? (err.stack || '') : '';
  send({ message, stack, ...extra });
}

export function installErrorReporter() {
  // JS 运行时错误
  window.addEventListener('error', (e) => {
    // 忽略资源加载错误（img/script 的 error 事件）
    if (e.target && e.target !== window && e.target.tagName) return;
    reportError(e.error || e.message, { source: 'window.error' });
  });

  // Promise 未捕获
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    reportError(reason || 'UnhandledRejection', { source: 'unhandledrejection' });
  });

  // React 会在 ErrorBoundary 中调这里
  // 手动调用：reportError(err, { source: 'react' })
}
