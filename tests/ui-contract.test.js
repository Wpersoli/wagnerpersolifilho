'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var crypto = require('node:crypto');
var root = path.resolve(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
var css = fs.readFileSync(path.join(root, 'public', 'css', 'portfolio-general.css'), 'utf8');
var js = fs.readFileSync(path.join(root, 'public', 'js', 'portfolio-general.js'), 'utf8');
var config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('portfólio geral mantém todas as seções e navegação principal', function () {
  assert.match(html, /data-site-version="portfolio-general"/);
  ['inicio', 'sobre', 'competencias', 'projetos', 'contato'].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /Wagner Persoli Filho/);
  assert.match(html, /Engenharia de software/);
  assert.match(html, /href="#projetos"/);
  assert.match(html, /href="#contato"/);
  assert.match(html, /href="curriculo\.html"/);
  assert.match(html, /href="docs\/curriculo-wagner-persoli-filho\.pdf" download/);
  assert.match(html, /href="\/css\/portfolio-general\.css"/);
  assert.match(html, /src="\/js\/portfolio-general\.js" defer/);
  assert.equal((html.match(/class="project-card/g) || []).length, 2);
  assert.match(html, /project-image-label">PET CARE · WEBSITE/);
  assert.match(html, /project-image-label">AUTOMOTIVO · LANDING PAGE/);
});

test('contato usa API segura e preserva WhatsApp, e-mail e LinkedIn', function () {
  assert.match(html, /id="contact-form"/);
  ['name', 'email', 'phone', 'subject', 'message', 'company', 'startedAt'].forEach(function (name) {
    assert.match(html, new RegExp('name="' + name + '"'));
  });
  assert.match(js, /fetch\('\/api\/contact'/);
  assert.match(js, /credentials:'same-origin'/);
  assert.match(html, /wa\.me\/5511981504061/);
  assert.match(html, /wagnerpersoli@hotmail\.com/);
  assert.match(html, /linkedin\.com\/in\/wagner-persoli-f-3004bb91/);
  assert.match(html, /name="company"[^>]*autocomplete="off"/);
});

test('assistente virtual tem controles acessíveis e integra o cliente de chat existente', function () {
  ['chat-toggle', 'chat-panel', 'chat-close', 'chat-form', 'chat-input', 'chat-messages'].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(js, /window\.WagnerChatClient/);
  assert.match(js, /WagnerChatClient\.request\(history\)/);
  assert.match(js, /data-prompt/);
});

test('design é responsivo, animado e respeita preferência por movimento reduzido', function () {
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /\.contact-form input,\.contact-form textarea,\.chat-form input\{font-size:16px\}/, 'campos de formulário mobile devem evitar zoom automático em iOS');
  assert.match(css, /\.project-image-label\{/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@keyframes profileFloat/);
  assert.match(css, /@keyframes cardFloat/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion/);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /<script(?![^>]+type="application\/ld\+json")[^>]*>[^<]/i);
});

test('CSP permite apenas o JSON-LD validado e imagens públicas dos projetos', function () {
  var match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(match, 'JSON-LD deve existir');
  var hash = crypto.createHash('sha256').update(match[1]).digest('base64');
  var csp = config.headers.find(function (entry) { return entry.source === '/(.*)'; }).headers.find(function (header) { return header.key === 'Content-Security-Policy'; }).value;
  assert.ok(csp.includes("'sha256-" + hash + "'"), 'hash CSP do JSON-LD deve corresponder ao HTML');
  assert.ok(csp.includes('https://raw.githubusercontent.com'), 'CSP deve permitir as imagens dos projetos');
  assert.ok(csp.includes('https://d2ol7oe51mr4n9.cloudfront.net'), 'CSP deve permitir a imagem verificada do projeto SÓGM');
  assert.ok(csp.includes("script-src-attr 'none'"), 'CSP não deve permitir handlers inline');
});