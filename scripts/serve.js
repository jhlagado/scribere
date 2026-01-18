#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASE_DIR = path.resolve(ROOT, 'build');
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';
const RELOAD_PATH = '/__reload';
const clients = new Set();
let reloadTimer = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function resolvePath(urlPath) {
  const requestPath = decodeURIComponent(urlPath.split('?')[0]);
  const joined = path.join(BASE_DIR, requestPath);
  const resolved = path.resolve(joined);
  if (!resolved.startsWith(BASE_DIR)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.split('?')[0] === RELOAD_PATH) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');
    clients.add(res);
    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  const filePath = resolvePath(req.url || '/');
  if (!filePath) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    let target = filePath;
    if (stats.isDirectory()) {
      target = path.join(filePath, 'index.html');
    }

    fs.stat(target, (targetErr, targetStats) => {
      if (targetErr || !targetStats.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const ext = path.extname(target).toLowerCase();
      const type = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', type);

      const stream = fs.createReadStream(target);
      const cleanup = () => {
        if (!stream.destroyed) {
          stream.destroy();
        }
      };
      req.on('aborted', cleanup);
      res.on('close', cleanup);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('Server error');
      });
      stream.pipe(res);
    });
  });
});

function broadcastReload() {
  for (const client of clients) {
    client.write('data: reload\n\n');
  }
}

function scheduleReload() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }
  reloadTimer = setTimeout(() => {
    broadcastReload();
  }, 150);
}

if (fs.existsSync(BASE_DIR)) {
  fs.watch(BASE_DIR, { recursive: true }, () => {
    scheduleReload();
  });
}

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`[srv] running at http://${displayHost}:${PORT}`);
});
