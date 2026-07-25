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
    setHeader: function (key, value) { this.headers[key] = value; },
    end: function (value) { this.body = value || ''; this.ended = true; }
  };
}

function createRequest(body, extra) {
  extra = extra || {};
  return {
    method: extra.method || 'POST',
    headers: Object.assign({}, extra.headers || {}),
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
    company: ''
  };
}

test('sanitização e validação de e-mail rejeitam entradas inválidas', function () {
  assert.equal(internal.sanitizeField('  abc\u0000def  ', 20), 'abcdef');
  assert.equal(internal.isValidEmail('pessoa@example.com'), true);
  assert.equal(internal.isValidEmail('email-invalido@'), false);
});

test('HTML do e-mail escapa conteúdo potencialmente executável', function () {
  var payload = internal.buildEmailPayload({
    name: '<Wagner>',
    email: 'pessoa@example.com',
    phone: '',
    subject: 'Teste <x>',
    message: 'Olá\n<script>alert(1)</script>'
  });
  assert.equal(payload.html.includes('<script>'), false);
  assert.equal(payload.html.includes('&lt;script&gt;'), true);
});

test('origens oficiais e localhost são aceitas; origem externa é bloqueada', function () {
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'https://wagnerpersolifilho.vercel.app' } })), true);
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'http://localhost:3000' } })), true);
  assert.equal(internal.isAllowedOrigin(createRequest({}, { headers: { origin: 'https://site-malicioso.example' } })), false);
});

test('handler retorna 413 para payload declarado acima do limite', async function () {
  internal.resetState();
  var req = createRequest(validBody(), { headers: { 'content-length': '70000' } });
  var res = createResponse();
  await contact(req, res);
  assert.equal(res.statusCode, 413);
  assert.equal(JSON.parse(res.body).ok, false);
});

test('handler bloqueia origem não autorizada', async function () {
  internal.resetState();
  var req = createRequest(validBody(), { headers: { origin: 'https://site-malicioso.example' } });
  var res = createResponse();
  await contact(req, res);
  assert.equal(res.statusCode, 403);
});

test('handler envia mensagem com provider simulado', async function () {
  internal.resetState();
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
    assert.equal(options.headers['User-Agent'], 'WAGNER.OS/2.7.0');
    return { ok: true, status: 200, json: async function () { return { id: 'email_test_123' }; } };
  };

  try {
    var req = createRequest(validBody(), { headers: { origin: 'http://localhost:3000' } });
    var res = createResponse();
    await contact(req, res);
    var payload = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.id, 'email_test_123');
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldTo === undefined) delete process.env.CONTACT_TO_EMAIL; else process.env.CONTACT_TO_EMAIL = oldTo;
    if (oldFrom === undefined) delete process.env.CONTACT_FROM_EMAIL; else process.env.CONTACT_FROM_EMAIL = oldFrom;
    global.fetch = oldFetch;
  }
});
