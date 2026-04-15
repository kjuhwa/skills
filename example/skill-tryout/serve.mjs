#!/usr/bin/env node
// Tiny zero-dep static server for skill-tryout.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4178);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(HERE, rel);
  if (!file.startsWith(HERE)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`▶ skill tryout → http://localhost:${PORT}/`);
});
