'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var contact = require('../api/contact.js');
var internal = contact._internal;

function createResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader: function (key, value) { this.headers[String(key).toLowerCase()] = String(value); },
    end: function (value) { this.body = value || ''; this.ended = true; }
  };
}

function createRequest(body, extra) {
  extra = extra || {};
  return {
    method: extra.method || 'POST',
    headers: Object.assign({ 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, extra.headers || {}),
    socket: { remoteAddress: extra.ip || '127.0.0.1' },
    body: body
  };
}

function validBody() {
  return {
    name: 'Pessoa Teste',
    email: 'pessoa@example.com',
    subject: 'Contato profissional',
    phone: '',
    message: 'Mensagem de validação com conteúdo suficiente.',
    company: '',
    startedAt: Date.now() - 2500
  };
}

test.beforeEach(function () { internal.resetState(); });

test('sanitização e validação de e-mail rejeitam entradas inválidas', function () {
  assert.equal(internal.sanitizeField('  abc\u0000def  ', 20), 'abcdef');
  assert.equal(internal.isValidEmail('pessoa@example.com'), true);
  assert.equal(internal.isValidEmail('email-invalido@'), false);
});

test('HTML do e-mail escapa conteúdo potencialmente executável', function () {
  var payload = internal.buildEmailPayload({
    name: '<Wagner>', email: 'pessoa@example.com', phone: '', subject: 'Teste <x>', message: 'Olá\n<script>alert(1)</script>'
  });
  assert.equal(payload.html.includes('<script>'), false);
  assert.equal(payload.html.includes('&lt;script&gt;'), true);
});

test('origens oficiais e localhost são aceitas; origem externa é bloqueada', function () {
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'https://wagnerpersoli.vercel.app' } })), true);
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'http://localhost:3000' } })), true);
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'https://site-malicioso.example' } })), false);
});

test('handler retorna 413 para payload acima do limite e 415 para tipo incorreto', async function () {
  var large = createResponse();
  await contact(createRequest(validBody(), { headers: { 'content-length': '70000' } }), large);
  assert.equal(large.statusCode, 413);

  var invalidType = createResponse();
  await contact(createRequest(validBody(), { headers: { 'content-type': 'text/plain' } }), invalidType);
  assert.equal(invalidType.statusCode, 415);
});

test('handler bloqueia origem e fetch-site não autorizados', async function () {
  var origin = createResponse();
  await contact(createRequest(validBody(), { headers: { origin: 'https://site-malicioso.example' } }), origin);
  assert.equal(origin.statusCode, 403);

  var site = createResponse();
  await contact(createRequest(validBody(), { headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'cross-site' } }), site);
  assert.equal(site.statusCode, 403);
});

test('honeypot e envio rápido retornam resposta neutra sem chamar provider', async function () {
  var oldFetch = global.fetch;
  var called = false;
  global.fetch = async function () { called = true; throw new Error('não deveria chamar provider'); };
  try {
    var botBody = validBody();
    botBody.company = 'spam corp';
    var botRes = createResponse();
    await contact(createRequest(botBody), botRes);
    assert.equal(botRes.statusCode, 200);
    assert.equal(JSON.parse(botRes.body).ok, true);

    var fastBody = validBody();
    fastBody.startedAt = Date.now();
    var fastRes = createResponse();
    await contact(createRequest(fastBody), fastRes);
    assert.equal(fastRes.statusCode, 200);
    assert.equal(called, false);
  } finally { global.fetch = oldFetch; }
});

test('handler mantém compatibilidade quando startedAt não é enviado', function () {
  var body = validBody();
  delete body.startedAt;
  var normalized = internal.normalizeContact(body);
  assert.equal(Number.isNaN(normalized.startedAt), true);
});

test('handler envia mensagem com provider simulado', async function () {
  var oldKey = process.env.RESEND_API_KEY;
  var oldTo = process.env.CONTACT_TO_EMAIL;
  var oldFrom = process.env.CONTACT_FROM_EMAIL;
  var oldFetch = global.fetch;
  process.env.RESEND_API_KEY = 're_test';
  process.env.CONTACT_TO_EMAIL = 'destino@example.com';
  process.env.CONTACT_FROM_EMAIL = 'WAGNER.OS <sender@example.com>';
  global.fetch = async function (url, options) {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['User-Agent'], 'WAGNER.OS/3.0.0');
    return { ok: true, status: 200, json: async function () { return { id: 'email_test_123' }; } };
  };
  try {
    var res = createResponse();
    await contact(createRequest(validBody(), { headers: { origin: 'http://localhost:3000' } }), res);
    var payload = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.id, 'email_test_123');
    assert.equal(res.headers['cache-control'], 'no-store, max-age=0');
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldTo === undefined) delete process.env.CONTACT_TO_EMAIL; else process.env.CONTACT_TO_EMAIL = oldTo;
    if (oldFrom === undefined) delete process.env.CONTACT_FROM_EMAIL; else process.env.CONTACT_FROM_EMAIL = oldFrom;
    global.fetch = oldFetch;
  }
});
