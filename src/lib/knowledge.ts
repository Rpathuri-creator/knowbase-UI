// Knowledge adapter: the only file that knows how notes are stored on disk.
// Everything else in the app works with the Note object below. To support a
// different storage format later, write a new loader that returns Note[].
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked } from 'marked';

export interface Section { id: string; title: string }
export interface Card { id: string; q: string; a: string }
export interface Note {
  slug: string;
  title: string;
  aliases: string[];
  tags: string[];
  summary: string;
  status: 'lesson' | 'stub';
  day: number | null;
  date: string | null;
  html: string;
  sections: Section[];
  cards: Card[];
  links: string[];
  backlinks: string[];
}

export function knowledgePath(): string {
  const configured = import.meta.env.KNOWLEDGE_PATH || process.env.KNOWLEDGE_PATH;
  return path.resolve(process.cwd(), configured || '../knoldgebase-storage');
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const base = () => (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
export const noteUrl = (slug: string) => `${base()}notes/${slug}/`;

function splitFlashcards(body: string): { body: string; cards: Array<{ q: string; a: string }> } {
  const match = body.match(/^##\s+Flashcards\s*$/im);
  if (!match || match.index === undefined) return { body, cards: [] };
  const start = match.index;
  const rest = body.slice(start + match[0].length);
  const next = rest.search(/^##\s+/m);
  const block = next === -1 ? rest : rest.slice(0, next);
  const cards = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('::'))
    .map((l) => {
      const [q, ...a] = l.split('::');
      return { q: q.trim(), a: a.join('::').trim() };
    });
  const remaining = body.slice(0, start) + (next === -1 ? '' : rest.slice(next));
  return { body: remaining, cards };
}

let cache: Note[] | null = null;

export function loadNotes(): Note[] {
  if (cache && import.meta.env.PROD) return cache;
  const dir = path.join(knowledgePath(), 'notes');
  if (!fs.existsSync(dir)) {
    throw new Error(`Knowledge folder not found at ${dir}. Set KNOWLEDGE_PATH in .env`);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  const raw = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return { slug, data, content };
  });
  const titles = new Map(raw.map((r) => [r.slug, String(r.data.title || r.slug)]));

  const notes: Note[] = raw.map(({ slug, data, content }) => {
    const links = new Set<string>();
    const sections: Section[] = [];
    const { body, cards } = splitFlashcards(content);

    // [[slug]] or [[slug|label]] (also [[slug\|label]] inside tables)
    const withLinks = body.replace(/\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/g, (_m, target, label) => {
      const s = slugify(target);
      const exists = titles.has(s);
      if (exists) links.add(s);
      const text = escapeHtml(label || titles.get(s) || target);
      return exists
        ? `<a class="wl" data-note="${s}" href="${noteUrl(s)}">${text}</a>`
        : `<span class="wl wl-missing" title="Not written yet">${text}</span>`;
    });

    const marked = new Marked();
    marked.use({
      renderer: {
        code({ text, lang }) {
          if (lang === 'mermaid') {
            const src = text.replace(/click\s+(\w+)\s+"note:([\w-]+)"/g, (_m, node, target) => {
              if (titles.has(target)) links.add(target);
              return `click ${node} "${noteUrl(target)}"`;
            });
            return `<figure class="diagram"><pre class="mermaid" data-src="${escapeHtml(src)}">${escapeHtml(src)}</pre></figure>`;
          }
          return `<pre class="code"><code>${escapeHtml(text)}</code></pre>`;
        },
        heading({ tokens, depth }) {
          const html = this.parser.parseInline(tokens);
          const plain = html.replace(/<[^>]+>/g, '');
          const id = slugify(plain);
          if (depth === 2) sections.push({ id, title: plain });
          return `<h${depth} id="${id}">${html}</h${depth}>`;
        },
        table(token) {
          const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('');
          const rows = token.rows
            .map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
            .join('');
          return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
        },
      },
    });
    const html = marked.parse(withLinks, { async: false }) as string;

    return {
      slug,
      title: titles.get(slug)!,
      aliases: (data.aliases as string[]) || [],
      tags: (data.tags as string[]) || [],
      summary: String(data.summary || ''),
      status: data.status === 'stub' ? 'stub' : 'lesson',
      day: typeof data.day === 'number' ? data.day : null,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : null,
      html,
      sections,
      cards: cards.map((c, i) => ({ id: `${slug}#${i}`, ...c })),
      links: [...links].filter((l) => l !== slug),
      backlinks: [],
    };
  });

  const bySlug = new Map(notes.map((n) => [n.slug, n]));
  for (const n of notes) for (const l of n.links) bySlug.get(l)?.backlinks.push(n.slug);

  notes.sort((a, b) => (b.day ?? -1) - (a.day ?? -1) || a.title.localeCompare(b.title));
  cache = notes;
  return notes;
}

export const getNote = (slug: string) => loadNotes().find((n) => n.slug === slug);
