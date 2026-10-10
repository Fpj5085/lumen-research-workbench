#!/usr/bin/env node
// Reviewer-owned static server that emulates a GitHub Pages *project* site:
// the built site is served under /<repo>/ with NO server-side rewrite and NO
// SPA fallback, so hash-routing correctness and relative asset paths are what
// actually get tested. Usage:
//   node scripts/serve-subpath.mjs [port] [repo] [distDir]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] ?? 4180);
// Default matches the actual GitHub Pages project site path:
//   https://fpj5085.github.io/lumen-research-workbench/
const repo = process.argv[3] ?? 'lumen-research-workbench';
const distDir = resolve(process.argv[4] ?? join(process.cwd(), 'frontend', 'dist'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

if (!existsSync(distDir)) {
  console.error(`[serve-subpath] dist directory not found: ${distDir}`);
  process.exit(2);
}

const prefix = `/${repo}`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (!pathname.startsWith(prefix)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found (outside project sub-path)');
    return;
  }

  let rel = pathname.slice(prefix.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';

  const target = resolve(join(distDir, normalize(rel)));
  if (!target.startsWith(distDir)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    // Deliberately no SPA fallback: mirrors Pages behaviour for project sites.
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }

  res.writeHead(200, {
    'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[serve-subpath] serving ${distDir} at http://127.0.0.1:${port}${prefix}/`);
});
