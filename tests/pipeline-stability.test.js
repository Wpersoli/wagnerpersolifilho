'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');

var root = path.resolve(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('auditoria visual não depende de Promise assíncrona do chat após o scroll', function () {
  var source = read('scripts/visual-emulation.js');
  assert.match(source, /inspectParticlePriorityCss/);
  assert.match(source, /CSS de prioridade do chat não reduz as partículas/);
  assert.doesNotMatch(source, /new Promise\(resolve => \{[\s\S]*impactParticleLayer[\s\S]*performance\.now\(\)/);
});

test('E2E repete eventos nativos de roda antes de reprovar', function () {
  var source = read('scripts/e2e-browser.js');
  assert.match(source, /dispatchNativeWheelUntilScrolled/);
  assert.match(source, /attempt < 4/);
  assert.match(source, /type: 'mouseWheel'/);
  assert.match(source, /após 4 tentativas nativas/);
});
