/* Tiny static server for the journal app — no dependencies.
   Usage:  node serve.js          -> http://localhost:4174
           PWA_PORT=9000 node serve.js
   Binds to all interfaces so phones on the same Wi-Fi can browse too.
   Note: installing the app needs a secure context (https:// or
   localhost). On the phone itself, open http://localhost:PORT. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PWA_PORT || 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    if (pathname === '/') pathname = '/index.html';

    const file = path.normalize(path.join(ROOT, pathname));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ✨  Journal app (PWA) is being served');
    console.log('');
    console.log(`     On this computer: http://localhost:${PORT}`);
    console.log('     On your phone (same Wi-Fi): http://<your-computer-ip>:' + PORT);
    console.log('     To install the app, open it on the phone itself over');
    console.log('     localhost or https (see README.md).');
    console.log('');
  });
