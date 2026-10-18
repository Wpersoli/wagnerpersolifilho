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

test('handler envia mensagem pela Brevo quando configurada', async function () {
  var oldProvider = process.env.CONTACT_EMAIL_PROVIDER;
  var oldBrevo = process.env.BREVO_API_KEY;
  var oldSenderEmail = process.env.BREVO_SENDER_EMAIL;
  var oldSenderName = process.env.BREVO_SENDER_NAME;
  var oldTo = process.env.CONTACT_TO_EMAIL;
  var oldFrom = process.env.CONTACT_FROM_EMAIL;
  var oldFetch = global.fetch;
  process.env.CONTACT_EMAIL_PROVIDER = 'brevo';
  process.env.BREVO_API_KEY = 'brevo_test';
  process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
  process.env.BREVO_SENDER_NAME = 'WAGNER.OS';
  process.env.CONTACT_TO_EMAIL = 'destino@example.com';
  delete process.env.CONTACT_FROM_EMAIL;
  global.fetch = async function (url, options) {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['api-key'], 'brevo_test');
    assert.equal(options.headers['User-Agent'], 'WAGNER.OS/3.3.0');
    var body = JSON.parse(options.body);
    assert.equal(body.replyTo.email, 'pessoa@example.com');
    assert.equal(body.sender.email, 'sender@example.com');
    return { ok: true, status: 201, json: async function () { return { messageId: '<brevo_test_123@example.com>' }; } };
  };
  try {
    var res = createResponse();
    await contact(createRequest(validBody(), { headers: { origin: 'http://localhost:3000' } }), res);
    var payload = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.id, '<brevo_test_123@example.com>');
    assert.equal(res.headers['cache-control'], 'no-store, max-age=0');
  } finally {
    if (oldProvider === undefined) delete process.env.CONTACT_EMAIL_PROVIDER; else process.env.CONTACT_EMAIL_PROVIDER = oldProvider;
    if (oldBrevo === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = oldBrevo;
    if (oldSenderEmail === undefined) delete process.env.BREVO_SENDER_EMAIL; else process.env.BREVO_SENDER_EMAIL = oldSenderEmail;
    if (oldSenderName === undefined) delete process.env.BREVO_SENDER_NAME; else process.env.BREVO_SENDER_NAME = oldSenderName;
    if (oldTo === undefined) delete process.env.CONTACT_TO_EMAIL; else process.env.CONTACT_TO_EMAIL = oldTo;
    if (oldFrom === undefined) delete process.env.CONTACT_FROM_EMAIL; else process.env.CONTACT_FROM_EMAIL = oldFrom;
    global.fetch = oldFetch;
  }
});

test('Resend permanece disponível como provider explícito de compatibilidade', async function () {
  var oldProvider = process.env.CONTACT_EMAIL_PROVIDER;
  var oldBrevo = process.env.BREVO_API_KEY;
  var oldKey = process.env.RESEND_API_KEY;
  var oldTo = process.env.CONTACT_TO_EMAIL;
  var oldFrom = process.env.CONTACT_FROM_EMAIL;
  var oldFetch = global.fetch;
  process.env.CONTACT_EMAIL_PROVIDER = 'resend';
  delete process.env.BREVO_API_KEY;
  process.env.RESEND_API_KEY = 're_test';
  process.env.CONTACT_TO_EMAIL = 'destino@example.com';
  process.env.CONTACT_FROM_EMAIL = 'WAGNER.OS <sender@example.com>';
  global.fetch = async function (url, options) {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['User-Agent'], 'WAGNER.OS/3.3.0');
    return { ok: true, status: 200, json: async function () { return { id: 'email_test_123' }; } };
  };
  try {
    var result = await internal.sendContactEmail(validBody());
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'resend');
    assert.equal(result.id, 'email_test_123');
  } finally {
    if (oldProvider === undefined) delete process.env.CONTACT_EMAIL_PROVIDER; else process.env.CONTACT_EMAIL_PROVIDER = oldProvider;
    if (oldBrevo === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = oldBrevo;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldTo === undefined) delete process.env.CONTACT_TO_EMAIL; else process.env.CONTACT_TO_EMAIL = oldTo;
    if (oldFrom === undefined) delete process.env.CONTACT_FROM_EMAIL; else process.env.CONTACT_FROM_EMAIL = oldFrom;
    global.fetch = oldFetch;
  }
});

test('Supabase recebe INSERT mínimo com chave pública e sem retorno de linhas', async function () {
  var oldUrl = process.env.SUPABASE_URL;
  var oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  var oldFetch = global.fetch;
  process.env.SUPABASE_URL = 'https://abc123.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  global.fetch = async function (url, options) {
    assert.equal(url, 'https://abc123.supabase.co/rest/v1/mensagens_contato');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Prefer, 'return=minimal');
    assert.equal(options.headers.apikey, 'sb_publishable_test');
    var body = JSON.parse(options.body);
    assert.equal(body.nome, 'Pessoa Teste');
    assert.equal(body.origem, 'portfolio');
    assert.equal(body.request_id, 'request-id-12345');
    assert.equal(Object.prototype.hasOwnProperty.call(body, 'status'), false);
    return { ok: true, status: 201, json: async function () { return {}; } };
  };
  try {
    var result = await internal.saveContactToSupabase(validBody(), 'request-id-12345');
    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
  } finally {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
    global.fetch = oldFetch;
  }
});

test('falha do Supabase não causa crash quando Brevo envia com sucesso', async function () {
  var snapshot = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY,
    provider: process.env.CONTACT_EMAIL_PROVIDER,
    brevo: process.env.BREVO_API_KEY,
    sender: process.env.BREVO_SENDER_EMAIL,
    to: process.env.CONTACT_TO_EMAIL
  };
  var oldFetch = global.fetch;
  process.env.SUPABASE_URL = 'https://abc123.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.CONTACT_EMAIL_PROVIDER = 'brevo';
  process.env.BREVO_API_KEY = 'brevo_test';
  process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
  process.env.CONTACT_TO_EMAIL = 'destino@example.com';
  global.fetch = async function (url) {
    if (url.indexOf('supabase.co') !== -1) throw new Error('database offline');
    return { ok: true, status: 201, json: async function () { return { messageId: 'brevo-ok' }; } };
  };
  try {
    var res = createResponse();
    await contact(createRequest(validBody(), { headers: { origin: 'http://localhost:3000' } }), res);
    var payload = JSON.parse(res.body);
    assert.equal(res.statusCode, 202);
    assert.equal(payload.ok, true);
    assert.equal(payload.stored, false);
    assert.equal(payload.notified, true);
  } finally {
    for (var pair of [
      ['SUPABASE_URL', snapshot.url],
      ['SUPABASE_PUBLISHABLE_KEY', snapshot.key],
      ['CONTACT_EMAIL_PROVIDER', snapshot.provider],
      ['BREVO_API_KEY', snapshot.brevo],
      ['BREVO_SENDER_EMAIL', snapshot.sender],
      ['CONTACT_TO_EMAIL', snapshot.to]
    ]) {
      if (pair[1] === undefined) delete process.env[pair[0]]; else process.env[pair[0]] = pair[1];
    }
    global.fetch = oldFetch;
  }
});

test('estrutura inesperada de payload é rejeitada antes dos provedores', async function () {
  var res = createResponse();
  var body = validBody();
  body.admin = true;
  await contact(createRequest(body), res);
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).message, /Estrutura/);
});
