'use strict';

var crypto = require('crypto');

var DEFAULT_ORIGINS = [
  'https://wagnerpersolifilho.vercel.app',
  'https://wagnerpersoli.vercel.app'
];
var LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;

function positiveInt(value, fallback, min, max) {
  var parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeOrigin(value) {
  var text = String(value || '').trim().replace(/\/$/, '');
  if (!text) return '';
  try {
    var parsed = new URL(text.indexOf('://') === -1 ? 'https://' + text : text);
    return parsed.origin;
  } catch (_) {
    return '';
  }
}

function allowedOrigins() {
  var list = DEFAULT_ORIGINS.slice();
  String(process.env.ALLOWED_ORIGINS || '').split(',').forEach(function (item) {
    var origin = normalizeOrigin(item);
    if (origin) list.push(origin);
  });
  ['VERCEL_URL', 'VERCEL_BRANCH_URL'].forEach(function (name) {
    var origin = normalizeOrigin(process.env[name]);
    if (origin) list.push(origin);
  });
  return Array.from(new Set(list));
}

function isAllowedOrigin(req) {
  var origin = req.headers && req.headers.origin;
  if (!origin) return true;
  var normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return LOCAL_ORIGIN.test(normalized) || allowedOrigins().indexOf(normalized) !== -1;
}

function isAllowedFetchSite(req) {
  var site = String(req.headers && req.headers['sec-fetch-site'] || '').toLowerCase();
  if (!site) return true;
  return site === 'same-origin' || site === 'same-site' || site === 'none';
}

function applyCors(req, res) {
  var origin = req.headers && req.headers.origin;
  if (origin && isAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin));
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
  res.setHeader('Access-Control-Max-Age', '600');
}

function requestId(req) {
  var supplied = req.headers && req.headers['x-request-id'];
  if (typeof supplied === 'string' && /^[a-zA-Z0-9._:-]{8,100}$/.test(supplied)) return supplied;
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

function getClientIp(req) {
  var real = req.headers && req.headers['x-real-ip'];
  var forwarded = req.headers && req.headers['x-forwarded-for'];
  var candidate = real || (typeof forwarded === 'string' ? forwarded.split(',')[0] : '') || (req.socket && req.socket.remoteAddress) || 'unknown';
  return String(candidate).trim().slice(0, 80) || 'unknown';
}

function hasJsonContentType(req) {
  var contentType = String(req.headers && req.headers['content-type'] || '').toLowerCase();
  return !contentType || contentType.indexOf('application/json') !== -1;
}

async function parseJsonBody(req, maxBytes) {
  var declared = Number.parseInt(req.headers && req.headers['content-length'], 10);
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413, error: 'Payload muito grande.' };
  if (!hasJsonContentType(req)) return { ok: false, status: 415, error: 'Use Content-Type application/json.' };

  if (req.body && typeof req.body === 'object') {
    var serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, 'utf8') > maxBytes) return { ok: false, status: 413, error: 'Payload muito grande.' };
    return { ok: true, value: req.body };
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > maxBytes) return { ok: false, status: 413, error: 'Payload muito grande.' };
    try { return { ok: true, value: req.body ? JSON.parse(req.body) : {} }; }
    catch (_) { return { ok: false, status: 400, error: 'JSON inválido.' }; }
  }

  var chunks = [];
  var total = 0;
  for await (var chunk of req) {
    var buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) return { ok: false, status: 413, error: 'Payload muito grande.' };
    chunks.push(buffer);
  }
  if (!chunks.length) return { ok: true, value: {} };
  try { return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }; }
  catch (_) { return { ok: false, status: 400, error: 'JSON inválido.' }; }
}

function setRateLimitHeaders(res, limit, result) {
  res.setHeader('RateLimit-Policy', String(limit) + ';w=' + String(result.windowSeconds || 60));
  res.setHeader('RateLimit', 'limit=' + String(limit) + ', remaining=' + String(result.remaining) + ', reset=' + String(result.retryAfter));
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
}

function sendJson(res, status, payload, extraHeaders) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.keys(extraHeaders || {}).forEach(function (name) { res.setHeader(name, extraHeaders[name]); });
  var body = JSON.stringify(payload);
  if (typeof res.status === 'function' && typeof res.json === 'function') return res.status(status).json(payload);
  return res.end(body);
}

function log(level, event, fields) {
  var payload = Object.assign({ level: level, event: event, at: new Date().toISOString() }, fields || {});
  var method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](JSON.stringify(payload));
}

module.exports = {
  positiveInt: positiveInt,
  normalizeOrigin: normalizeOrigin,
  allowedOrigins: allowedOrigins,
  isAllowedOrigin: isAllowedOrigin,
  isAllowedFetchSite: isAllowedFetchSite,
  applyCors: applyCors,
  requestId: requestId,
  getClientIp: getClientIp,
  hasJsonContentType: hasJsonContentType,
  parseJsonBody: parseJsonBody,
  setRateLimitHeaders: setRateLimitHeaders,
  sendJson: sendJson,
  log: log
};
