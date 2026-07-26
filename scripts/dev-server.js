'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var chat = require('../api/chat');
var contact = require('../api/contact');
var root = path.resolve(__dirname, '..', 'public');
var port = Number(process.env.PORT || 3000);
var mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
};

function adaptResponse(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (value) {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
    return res;
  };
  return res;
}

function safePath(urlValue) {
  var raw = String(urlValue || '/').split('?')[0];
  var pathname;
  try { pathname = decodeURIComponent(raw); } catch (_) { return null; }
  if (pathname === '/') pathname = '/index.html';
  if (pathname.indexOf('\0') !== -1 || pathname.split('/').some(function (part) { return part === '..'; })) return null;
  var file = path.resolve(root, '.' + pathname);
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

function setStaticHeaders(res, file) {
  var ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=60');
}

var server = http.createServer(async function (req, res) {
  try {
    var pathname = String(req.url || '').split('?')[0];
    if (pathname === '/api/chat') return await chat(req, adaptResponse(res));
    if (pathname === '/api/contact') return await contact(req, adaptResponse(res));
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      return res.end('Method Not Allowed');
    }

    var file = safePath(req.url);
    if (!file) { res.statusCode = 403; return res.end('Forbidden'); }
    var stat;
    try { stat = fs.statSync(file); }
    catch (_) {
      if (path.extname(file)) { res.statusCode = 404; return res.end('Not Found'); }
      file = path.join(root, 'index.html');
      stat = fs.statSync(file);
    }
    if (stat.isDirectory()) file = path.join(file, 'index.html');
    setStaticHeaders(res, file);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', function () {
      if (!res.headersSent) res.statusCode = 500;
      res.end('Internal error');
    }).pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.end('Internal error');
    console.error(error);
  }
});

server.listen(port, '127.0.0.1', function () {
  console.log('WAGNER.OS local: http://127.0.0.1:' + port);
});

function close() { server.close(function () { process.exit(0); }); }
process.on('SIGTERM', close);
process.on('SIGINT', close);
