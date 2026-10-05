// Ask box. PUBLIC_CHAT_MODE decides where questions go:
//   off   -> box shows that chat is unavailable here
//   local -> local retriever (Python + SQLite) which calls Ollama
//   cloud -> /api/ask serverless function (added with the Vercel setup)
const RETRIEVER = import.meta.env.PUBLIC_RETRIEVER_URL || 'http://localhost:8787';

async function reachable(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

export async function initAsk() {
  const box = document.getElementById('ask');
  if (!box) return;
  const form = document.getElementById('ask-form') as HTMLFormElement;
  const input = document.getElementById('ask-input') as HTMLInputElement;
  const status = document.getElementById('ask-status')!;
  const answer = document.getElementById('ask-answer')!;
  const mode = box.dataset.mode || 'off';
  const endpoint = mode === 'local' ? `${RETRIEVER}/ask` : mode === 'cloud' ? '/api/ask' : null;

  const offline = (msg: string) => { box.classList.add('offline'); status.textContent = msg; };

  if (!endpoint) offline('Chat runs on your Mac. Start it with npm run learn.');
  else if (mode === 'local' && !(await reachable(`${RETRIEVER}/health`))) offline('Local tutor is not running. Start it with npm run learn.');

  input.addEventListener('input', () => { if (!box.classList.contains('offline')) status.textContent = ''; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) { status.textContent = 'Type a question first.'; input.focus(); return; }
    if (!endpoint || box.classList.contains('offline')) return;
    status.textContent = 'Thinking…';
    answer.hidden = true;
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, slug: box.dataset.slug }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json();
      answer.textContent = data.answer;
      answer.hidden = false;
      status.textContent = '';
    } catch {
      status.textContent = 'Could not reach the tutor. Try again in a moment.';
    }
  });
}
