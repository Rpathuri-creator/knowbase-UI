// Flashcard review with FSRS (the scheduler modern Anki uses).
// Progress is stored per browser; syncing across devices is a later feature.
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import { getNotes, storage } from './data';

const KEY = 'garden-fsrs';
const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

type Saved = Record<string, FsrsCard>;

function load(): Saved {
  const raw = storage.get<Record<string, any>>(KEY, {});
  for (const c of Object.values(raw)) {
    c.due = new Date(c.due);
    if (c.last_review) c.last_review = new Date(c.last_review);
  }
  return raw as Saved;
}

export async function dueCount(): Promise<number> {
  const notes = await getNotes();
  const saved = load();
  const now = new Date();
  return notes.flatMap((n) => n.cards).filter((c) => !saved[c.id] || saved[c.id].due <= now).length;
}

function interval(d: Date, now: Date) {
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return days < 31 ? `${days}d` : `${Math.round(days / 30)}mo`;
}

export async function initReview() {
  const box = document.getElementById('flash');
  if (!box) return;
  const meta = document.getElementById('review-meta')!;
  const bar = document.getElementById('review-progress')!;
  const topic = document.getElementById('flash-topic')!;
  const q = document.getElementById('flash-q')!;
  const a = document.getElementById('flash-a')!;
  const actions = document.getElementById('flash-actions')!;

  const notes = await getNotes();
  const saved = load();
  const now = new Date();
  const queue = notes
    .flatMap((n) => n.cards.map((c) => ({ ...c, title: n.title })))
    .filter((c) => !saved[c.id] || saved[c.id].due <= now)
    .sort(() => Math.random() - 0.5);
  const total = queue.length;

  function show() {
    const card = queue[0];
    bar.style.width = `${total ? ((total - queue.length) / total) * 100 : 100}%`;
    if (!card) {
      box!.hidden = true;
      meta.textContent = total ? `Done. ${total} card${total === 1 ? '' : 's'} reviewed today.` : 'Nothing due. Come back tomorrow.';
      return;
    }
    box!.hidden = false;
    meta.textContent = `${queue.length} card${queue.length === 1 ? '' : 's'} left today`;
    topic.textContent = card.title;
    q.textContent = card.q;
    a.textContent = card.a;
    a.hidden = true;
    actions.className = 'flash-actions single';
    actions.innerHTML = '<button class="btn primary" id="reveal">Show answer</button>';
    document.getElementById('reveal')!.onclick = reveal;
  }

  function reveal() {
    const card = queue[0];
    a.hidden = false;
    const current = saved[card.id] ?? createEmptyCard(new Date());
    const when = new Date();
    const options = scheduler.repeat(current, when);
    const grades: Array<[Grade, string, string]> = [
      [Rating.Again, 'Again', 'again'], [Rating.Hard, 'Hard', 'hard'],
      [Rating.Good, 'Good', 'good'], [Rating.Easy, 'Easy', 'easy'],
    ];
    actions.className = 'flash-actions';
    actions.innerHTML = grades
      .map(([g, label, cls]) => `<button class="grade ${cls}" data-g="${g}">${label}<small>${interval(options[g].card.due, when)}</small></button>`)
      .join('');
    actions.querySelectorAll<HTMLButtonElement>('.grade').forEach((b) => {
      b.onclick = () => {
        const g = Number(b.dataset.g) as Grade;
        saved[card.id] = options[g].card;
        storage.set(KEY, saved);
        queue.shift();
        if (g === Rating.Again) queue.push(card);
        show();
      };
    });
  }

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === ' ' && a.hidden) { e.preventDefault(); reveal(); }
    if (!a.hidden && ['1', '2', '3', '4'].includes(e.key)) actions.querySelectorAll<HTMLButtonElement>('.grade')[Number(e.key) - 1]?.click();
  });

  show();
}
