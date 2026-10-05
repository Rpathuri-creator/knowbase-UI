import { defineConfig } from 'astro/config';
import path from 'node:path';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
const knowledge = path.resolve(process.cwd(), env.KNOWLEDGE_PATH || '../knoldgebase-storage');

// Reload the browser when a note changes in the separate knowledge folder.
const watchKnowledge = () => ({
  name: 'watch-knowledge',
  configureServer(server) {
    server.watcher.add(knowledge);
    server.watcher.on('all', (_event, file) => {
      if (file.startsWith(knowledge)) server.ws.send({ type: 'full-reload' });
    });
  },
});

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [watchKnowledge()],
    server: { fs: { allow: ['..'] } },
  },
});
