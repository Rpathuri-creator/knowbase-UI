// Stacked side panels on desktop, a bottom sheet on phones.
// Clicking a link in the main note replaces the stack; clicking a link inside
// a panel keeps the panels to its left and opens a new one beside it.
import { getNotes, isMobile, noteUrl } from './data';
import { renderDiagrams } from './diagrams';

const host = () => document.getElementById('panels')!;
const scrim = () => document.getElementById('sheet-scrim')!;
let stack: string[] = [];

const icons = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
};

function visibleCount() {
  const w = window.innerWidth;
  if (w >= 1700) return 3;
  if (w >= 1380) return 2;
  return 1;
}

async function render() {
  const notes = await getNotes();
  const el = host();
  el.innerHTML = '';
  const keep = visibleCount();

  stack.forEach((slug, i) => {
    const note = notes.find((n) => n.slug === slug);
    if (!note) return;
    const collapsed = i < stack.length - keep;
    const panel = document.createElement('section');
    panel.className = `panel${collapsed ? ' collapsed' : ''}`;
    panel.dataset.index = String(i);
    panel.setAttribute('aria-label', note.title);
    panel.innerHTML = `
      <div class="sheet-grab"></div>
      <div class="panel-head">
        <button class="icon-btn panel-back" data-act="back" aria-label="Back">${icons.back}</button>
        <h2 class="panel-title">${note.title}</h2>
        <div class="panel-actions">
          <a class="icon-btn" href="${noteUrl(slug)}" aria-label="Open as full page">${icons.expand}</a>
          <button class="icon-btn" data-act="close" aria-label="Close">${icons.close}</button>
        </div>
      </div>
      <div class="panel-body">
        ${note.status === 'stub' ? '<span class="stub-badge">Short note · full lesson coming</span>' : ''}
        ${note.summary ? `<p class="panel-summary">${note.summary}</p>` : ''}
        <div class="prose note-body">${note.html}</div>
        <a class="panel-open" href="${noteUrl(slug)}">Open full page →</a>
      </div>`;
    if (collapsed) panel.addEventListener('click', () => { stack = stack.slice(0, i + 1); render(); });
    el.appendChild(panel);
  });

  markOpenLinks();
  scrim().hidden = !(isMobile() && stack.length > 0);
  document.body.style.overflow = isMobile() && stack.length ? 'hidden' : '';
  const top = el.lastElementChild as HTMLElement | null;
  if (top) await renderDiagrams(top);
}

function markOpenLinks() {
  document.querySelectorAll('.wl.open').forEach((a) => a.classList.remove('open'));
  stack.forEach((s) => document.querySelectorAll(`.wl[data-note="${s}"]`).forEach((a) => a.classList.add('open')));
}

export function openNote(slug: string, fromPanel: number | null) {
  const current = document.querySelector<HTMLElement>('[data-current]')?.dataset.current;
  if (fromPanel === null) {
    if (slug === current) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    stack = [slug];
  } else {
    stack = [...stack.slice(0, fromPanel + 1).filter((s) => s !== slug), slug];
  }
  render();
}

export function closeAll() { stack = []; render(); }

function slugFromLink(a: Element): string | null {
  if (a instanceof HTMLElement && a.dataset.note) return a.dataset.note;
  const href = a.getAttribute('href') || a.getAttribute('xlink:href') || '';
  const m = href.match(/\/notes\/([\w-]+)\/?$/);
  return m ? m[1] : null;
}

export function initPanels() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    const act = target.closest<HTMLElement>('[data-act]');
    if (act) {
      const i = Number(act.closest<HTMLElement>('.panel')?.dataset.index ?? 0);
      if (act.dataset.act === 'close') { stack = isMobile() ? [] : stack.slice(0, i); render(); }
      if (act.dataset.act === 'back') { stack = stack.slice(0, -1); render(); }
      return;
    }
    const link = target.closest('a');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
    // Only links inside note content open panels; nav and sidebar links navigate.
    const inPanel = link.closest<HTMLElement>('.panel');
    if (!inPanel && !link.closest('.note-body')) return;
    if (link.closest('.panel-actions') || link.classList.contains('panel-open')) return;
    const slug = slugFromLink(link);
    if (!slug) return;
    e.preventDefault();
    openNote(slug, inPanel ? Number(inPanel.dataset.index) : null);
  });

  scrim().addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { stack = stack.slice(0, -1); render(); } });

  // Swipe down on the sheet header to go back on phones.
  let startY = 0;
  host().addEventListener('touchstart', (e) => {
    startY = (e.target as Element).closest('.panel-head, .sheet-grab') ? e.touches[0].clientY : -1;
  }, { passive: true });
  host().addEventListener('touchend', (e) => {
    if (startY >= 0 && e.changedTouches[0].clientY - startY > 60) { stack = stack.slice(0, -1); render(); }
  });

  let lastWide = !isMobile();
  window.addEventListener('resize', () => {
    const wide = !isMobile();
    if (stack.length && wide !== lastWide) render();
    lastWide = wide;
  });
}
