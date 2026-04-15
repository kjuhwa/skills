#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_CANDIDATES = [
  process.env.CORPUS,
  path.join(HERE, 'skills.json'),
  path.resolve(HERE, '..', '..', 'browser', 'skills.json'),
].filter(Boolean);
const CORPUS = CORPUS_CANDIDATES.find(p => fs.existsSync(p)) || CORPUS_CANDIDATES[1];
const PORT = Number(process.env.PORT || 4179);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/corpus.json') {
    fs.readFile(CORPUS, (err, buf) => {
      if (err) { res.statusCode = 500; return res.end('corpus missing — run: node browser/build-index.mjs (from a skills-hub working copy) or set CORPUS=/path/to/skills.json'); }
      res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(buf);
    }); return;
  }
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(HERE, rel);
  if (!file.startsWith(HERE)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`\u25b6 skill reactor \u2192 http://localhost:${PORT}/`);
  console.log(`  corpus: ${CORPUS}${fs.existsSync(CORPUS) ? '' : '  (missing — run build-index.mjs)'}`);
});
