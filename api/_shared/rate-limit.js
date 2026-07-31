'use strict';

var crypto = require('crypto');
var buckets = new Map();
var operations = 0;
var MAX_LOCAL_BUCKETS = 1500;

function hash(value) {
  var salt = String(process.env.RATE_LIMIT_HASH_SALT || process.env.UPSTASH_REDIS_REST_TOKEN || 'wagner-local');
  return crypto.createHmac('sha256', salt).update(String(value || 'unknown')).digest('hex').slice(0, 32);
}

function cleanup(now) {
  operations += 1;
  if (operations % 100 !== 0 && buckets.size <= MAX_LOCAL_BUCKETS) return;
  buckets.forEach(function (value, key) {
    if (!value || now >= value.resetAt) buckets.delete(key);
  });
  if (buckets.size > MAX_LOCAL_BUCKETS) {
    Array.from(buckets.keys()).slice(0, buckets.size - MAX_LOCAL_BUCKETS).forEach(function (key) { buckets.delete(key); });
  }
}

function localCheck(key, limit, windowSeconds) {
  var now = Date.now();
  cleanup(now);
  var bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    limited: bucket.count > limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    windowSeconds: windowSeconds,
    backend: 'memory'
  };
}

async function upstashCheck(key, limit, windowSeconds) {
  var url = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  var token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (!url || !token) return null;

  var response = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds, 'NX'],
      ['TTL', key]
    ])
  });
  if (!response.ok) throw new Error('rate-limit backend status ' + response.status);
  var values = await response.json();
  var count = Number(values && values[0] && values[0].result || 0);
  var ttl = Number(values && values[2] && values[2].result || windowSeconds);
  if (!Number.isFinite(ttl) || ttl < 1) ttl = windowSeconds;
  return {
    limited: count > limit,
    remaining: Math.max(0, limit - count),
    retryAfter: ttl,
    windowSeconds: windowSeconds,
    backend: 'upstash'
  };
}

async function check(scope, identity, limit, windowSeconds) {
  var key = 'wagner:' + scope + ':' + hash(identity);
  try {
    var remote = await upstashCheck(key, limit, windowSeconds);
    if (remote) return remote;
  } catch (error) {
    console.warn(JSON.stringify({ level: 'warn', event: 'rate_limit_fallback', scope: scope, message: String(error.message || error) }));
  }
  return localCheck(key, limit, windowSeconds);
}

function reset() { buckets.clear(); operations = 0; }

module.exports = { check: check, reset: reset, _internal: { localCheck: localCheck, hash: hash } };
