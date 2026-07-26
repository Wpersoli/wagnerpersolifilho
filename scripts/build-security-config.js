'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var root = path.resolve(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
var match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (!match) throw new Error('JSON-LD inline não encontrado para calcular CSP.');
var hash = crypto.createHash('sha256').update(match[1]).digest('base64');
var csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'sha256-" + hash + "'",
  "script-src-attr 'none'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-elem 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "connect-src 'self'",
  "frame-src https: http://localhost:* http://127.0.0.1:*",
  "worker-src 'none'",
  "manifest-src 'self'",
  'upgrade-insecure-requests'
].join('; ');
var securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' }
];
var config = {
  version: 2,
  functions: {
    'api/chat.js': { maxDuration: 30, includeFiles: 'data/**' },
    'api/contact.js': { maxDuration: 15 }
  },
  headers: [
    { source: '/(.*)', headers: securityHeaders },
    { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
    { source: '/(.*\\.html)', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
    { source: '/(.*\\.(?:css|js|json|txt|pdf|webp|png|jpg|jpeg|svg|woff2|mp4|webm))', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] }
  ],
  rewrites: [
    { source: '/api/chat', destination: '/api/chat.js' },
    { source: '/api/contact', destination: '/api/contact.js' },
    { source: '/(.*)', destination: '/public/$1' }
  ]
};
fs.writeFileSync(path.join(root, 'vercel.json'), JSON.stringify(config, null, 2) + '\n');
console.log('Security config built. JSON-LD CSP hash:', hash);
