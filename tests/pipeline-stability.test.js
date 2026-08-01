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
  assert.match(source, /validated by CSS contract test/);
  assert.doesNotMatch(source, /new Promise\(resolve => \{[\s\S]*impactParticleLayer[\s\S]*performance\.now\(\)/);
  assert.doesNotMatch(source, /scrolling projects/);
});

test('E2E repete eventos nativos de roda antes de reprovar', function () {
  var source = read('scripts/e2e-browser.js');
  assert.match(source, /dispatchNativeWheelUntilScrolled/);
  assert.match(source, /attempt < 4/);
  assert.match(source, /type: 'mouseWheel'/);
  assert.match(source, /após 4 tentativas nativas/);
});


test('auditoria visual encerra chamadas ao renderer após capturar o hero', function () {
  var source = read('scripts/visual-emulation.js');
  assert.match(source, /End the renderer-dependent visual audit immediately after the approved/);
  assert.doesNotMatch(source, /scrolling projects/);
  assert.doesNotMatch(source, /project geometry/);
  assert.match(source, /captureBeyondViewport: false/);
});


test('E2E e auditoria visual encerram toda a árvore do Chromium', function () {
  var e2e = read('scripts/e2e-browser.js');
  var visual = read('scripts/visual-emulation.js');
  assert.match(e2e, /function terminateChromeTree/);
  assert.match(visual, /function terminateChromeTree/);
  assert.match(e2e, /taskkill\.exe/);
  assert.match(visual, /taskkill\.exe/);
  assert.match(e2e, /detached: process\.platform !== 'win32'/);
  assert.match(visual, /detached: process\.platform !== 'win32'/);
});


test('auditoria visual é estática e não carrega runtimes animados', function () {
  var source = read('scripts/visual-emulation.js');
  var setDocument = source.slice(source.indexOf('async function setDocument'), source.indexOf('async function waitForImages'));
  assert.doesNotMatch(setDocument, /loadRuntimeScripts\(cdp\)/);
  assert.match(setDocument, /visual audit is intentionally static/);
  assert.match(source, /impactMarkupPresent/);
});
