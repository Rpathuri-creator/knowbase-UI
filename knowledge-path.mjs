// Where the notes live. Shared by the build script, Astro config and adapter.
// 1. KNOWLEDGE_PATH if set
// 2. the sibling clone ../knoldgebase-storage (local development)
// 3. .knowledge inside this repo (filled by scripts/fetch-knowledge.mjs, e.g. on Vercel)
import fs from 'node:fs';
import path from 'node:path';

export function resolveKnowledgePath(configured = process.env.KNOWLEDGE_PATH) {
  if (configured) return path.resolve(process.cwd(), configured);
  const sibling = path.resolve(process.cwd(), '../knoldgebase-storage');
  if (fs.existsSync(path.join(sibling, 'notes'))) return sibling;
  return path.resolve(process.cwd(), '.knowledge');
}
