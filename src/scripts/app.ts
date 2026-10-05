import { renderDiagrams } from './diagrams';
import { initPanels } from './panels';
import { initGraph, restyleGraph } from './graph';
import { initReview, dueCount } from './review';
import { initAsk } from './ask';


const icons = {
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function initTheme() {
  const btn = document.getElementById('theme-btn')!;
  const paint = () => { btn.querySelector('svg')!.innerHTML = isDark() ? icons.sun : icons.moon; };
  paint();
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('garden-theme', next); } catch { /* private mode */ }
    paint();
    renderDiagrams();
    restyleGraph();
  });
}

function initSidebar() {
  const btn = document.getElementById('menu-btn');
  if (!btn) return;
  btn.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('sidebar-open')) return;
    const t = e.target as Element;
    if (!t.closest('#sidebar') && !t.closest('#menu-btn')) document.body.classList.remove('sidebar-open');
  });
}

function initChips() {
  const chips = [...document.querySelectorAll<HTMLAnchorElement>('#chips .chip')];
  if (!chips.length) return;
  const heads = chips.map((c) => document.getElementById(c.getAttribute('href')!.slice(1))).filter(Boolean) as HTMLElement[];
  const setActive = (id: string) => chips.forEach((c) => {
    const on = c.getAttribute('href') === `#${id}`;
    c.classList.toggle('active', on);
    if (on) {
      // scroll only the chip row sideways, never the page
      const row = c.parentElement!;
      const left = c.offsetLeft - row.offsetLeft;
      if (left < row.scrollLeft || left + c.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = left - 16;
    }
  });
  const onScroll = () => {
    let current = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < 140) current = h;
    if (current) setActive(current.id);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

async function initHome() {
  const el = document.getElementById('due-count');
  if (el) el.textContent = String(await dueCount());
}

initTheme();
initSidebar();
initChips();
initPanels();
renderDiagrams();
initGraph();
initReview();
initAsk();
initHome();
