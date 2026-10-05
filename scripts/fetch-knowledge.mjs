// Runs before every build. If the knowledge folder isn't on disk (e.g. on
// Vercel, which only clones this repo), shallow-clone it from KNOWLEDGE_REPO.
// Locally the folder already exists, so this does nothing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveKnowledgePath } from '../knowledge-path.mjs';

const target = resolveKnowledgePath();
const repo = process.env.KNOWLEDGE_REPO || 'https://github.com/Rpathuri-creator/knoldgebase-storage.git';
const branch = process.env.KNOWLEDGE_BRANCH || 'main';

if (fs.existsSync(path.join(target, 'notes'))) {
  console.log(`[knowledge] using ${target}`);
} else {
  console.log(`[knowledge] cloning ${repo} (${branch}) into ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
  execFileSync('git', ['clone', '--depth', '1', '--branch', branch, repo, target], { stdio: 'inherit' });
}
