#!/usr/bin/env node
// Static server + /api/run endpoint that re-runs doctor.mjs and streams JSON.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4177);
const ROOT = path.resolve(process.env.DOCTOR_ROOT || path.join(HERE, '..'));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/api/run') {
    const proc = spawn(process.execPath, [path.join(HERE, 'doctor.mjs'), '--json', `--root=${ROOT}`]);
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', (code) => {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      try { JSON.parse(out); res.end(out); }
      catch { res.statusCode = 500; res.end(JSON.stringify({ error: 'doctor failed', code, stderr: err, stdout: out })); }
    });
    return;
  }

  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(HERE, rel);
  if (!file.startsWith(HERE)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(file, (e, buf) => {
    if (e) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`▶ skill-doctor UI → http://localhost:${PORT}/`);
  console.log(`  scanning: ${ROOT}`);
});
