'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var limiter = require('../api/_shared/rate-limit');

test.beforeEach(function () { limiter.reset(); });

test('rate limit local limita após a cota sem expor identidade bruta', async function () {
  var first = await limiter.check('test', '203.0.113.90', 2, 60);
  var second = await limiter.check('test', '203.0.113.90', 2, 60);
  var third = await limiter.check('test', '203.0.113.90', 2, 60);
  assert.equal(first.limited, false);
  assert.equal(second.remaining, 0);
  assert.equal(third.limited, true);
  assert.equal(third.backend, 'memory');
  assert.match(limiter._internal.hash('203.0.113.90'), /^[a-f0-9]{32}$/);
  assert.doesNotMatch(limiter._internal.hash('203.0.113.90'), /203/);
});
