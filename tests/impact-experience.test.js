'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');

test('camada visual impactante permanece isolada dos contratos críticos', function () {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'src', 'styles', 'impact-experience.css'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'public', 'js', 'impact-experience.js'), 'utf8');
  assert.match(html, /impact-kinetic-wordmark/);
  assert.match(html, /impact-skill-marquee/);
  assert.match(html, /impact-experience\.js/);
  assert.match(css, /body\.pmode-active/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /pointer: coarse/);
  assert.match(css, /\.impact-particle-layer/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /body\.impact-chat-open \.impact-particle-layer/);
  assert.match(js, /impactParticleLayer/);
  assert.match(js, /globalCompositeOperation = 'lighter'/);
  assert.match(js, /presentationActive\(\)/);
  assert.match(js, /chatPanel\.classList\.contains\('open'\)/);
  assert.doesNotMatch(js, /preventDefault\s*\(/);
  assert.doesNotMatch(js, /openChat\s*=/);
  assert.doesNotMatch(js, /addMsg\s*=/);
  assert.doesNotMatch(js, /scrollTo\s*\(/);
});


test('partículas canvas ficam sobre o conteúdo sem capturar eventos ou cobrir controles críticos', function () {
  var css = fs.readFileSync(path.join(root, 'src', 'styles', 'impact-experience.css'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'public', 'js', 'impact-experience.js'), 'utf8');
  assert.match(css, /\.impact-particle-layer\s*\{[\s\S]*?z-index:\s*40;[\s\S]*?pointer-events:\s*none;/);
  assert.match(css, /body\.pmode-active \.impact-particle-layer/);
  assert.match(css, /body\.impact-chat-open \.impact-particle-layer/);
  assert.match(js, /body\.appendChild\(particleCanvas\)/);
  assert.match(js, /particleCanvas\.setAttribute\('aria-hidden', 'true'\)/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
});

test('Brevo está documentada sem remover compatibilidade Resend', function () {
  var env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  var contact = fs.readFileSync(path.join(root, 'api', 'contact.js'), 'utf8');
  assert.match(env, /CONTACT_EMAIL_PROVIDER=brevo/);
  assert.match(env, /BREVO_API_KEY=/);
  assert.match(contact, /api\.brevo\.com\/v3\/smtp\/email/);
  assert.match(contact, /api\.resend\.com\/emails/);
});
