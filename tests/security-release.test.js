'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var cp = require('node:child_process');
var root = path.resolve(__dirname, '..');
var chat = require('../api/chat');

function response() {
  return {
    statusCode: 0, headers: {}, body: null,
    setHeader: function (name, value) { this.headers[String(name).toLowerCase()] = String(value); },
    status: function (code) { this.statusCode = code; return this; },
    json: function (payload) { this.body = payload; return this; },
    end: function () { return this; }
  };
}

test('arquivos locais sensíveis não são versionados nem integram artefato limpo', function () {
  var names = ['.env.local', '.vercel', 'node_modules'];
  if (fs.existsSync(path.join(root, '.git'))) {
    var tracked = cp.execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    for (var name of names) {
      assert.equal(tracked.some(function (file) { return file === name || file.startsWith(name + '/'); }), false, name + ' não deve ser rastreado pelo Git');
    }
  } else {
    for (var artifact of ['.env.local', '.vercel', '.git', 'node_modules']) {
      assert.equal(fs.existsSync(path.join(root, artifact)), false, artifact + ' não deve integrar a release');
    }
  }
});


test('gerador de checksums ignora arquivos de ambiente locais', function () {
  var generator = fs.readFileSync(path.join(root, 'scripts', 'generate-checksums.js'), 'utf8');
  assert.match(generator, /isSensitiveEnv/);
  assert.match(generator, /entry\.name/);
  var checksums = fs.readFileSync(path.join(root, 'CHECKSUMS.sha256'), 'utf8');
  var containsSensitiveEnv = checksums.split(/\r?\n/).some(function (line) {
    return /\s\.env(?:\.|$)/.test(line) && !/\s\.env\.example$/.test(line);
  });
  assert.equal(containsSensitiveEnv, false);
});

test('vercel configura CSP estrita, headers e cache revalidável', function () {
  var config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  var serialized = JSON.stringify(config);
  for (var header of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','Permissions-Policy']) {
    assert.match(serialized, new RegExp(header));
  }
  assert.match(serialized, /script-src 'self' 'sha256-/);
  assert.doesNotMatch(serialized, /script-src[^;]*unsafe-inline/);
  assert.match(serialized, /stale-while-revalidate/);
  assert.doesNotMatch(serialized, /immutable/);
  assert.match(serialized, /no-store/);
});

test('chat bloqueia origem externa e limita payload', async function () {
  var blocked = response();
  await chat({ method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, socket: {}, body: { messages: [] } }, blocked);
  assert.equal(blocked.statusCode, 403);

  var large = response();
  await chat({ method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', 'content-length': '200000' }, socket: {}, body: {} }, large);
  assert.equal(large.statusCode, 413);
});

test('release check bloqueia secrets e aprova árvore limpa', function () {
  cp.execFileSync(process.execPath, ['scripts/release-check.js'], { cwd: root, stdio: 'pipe' });
});
