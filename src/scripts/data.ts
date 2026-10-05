import type { Note } from '../lib/knowledge';

export const base = () => document.body.dataset.base || '/';
export const noteUrl = (slug: string) => `${base()}notes/${slug}/`;

let notesPromise: Promise<Note[]> | null = null;
export function getNotes(): Promise<Note[]> {
  notesPromise ??= fetch(`${base()}notes.json`).then((r) => r.json());
  return notesPromise;
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

export const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
