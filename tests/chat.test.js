'use strict';

process.env.GEMINI_API_KEY = 'test-key';
process.env.CHAT_RETRY_BASE_MS = '10';
process.env.CHAT_MODEL_SWITCH_DELAY_MS = '0';
process.env.GEMINI_PRIMARY_COOLDOWN_MS = '60000';
process.env.CHAT_RATE_LIMIT_MAX = '30';

var test = require('node:test');
var assert = require('node:assert/strict');
var handler = require('../api/chat.js');
var internal = handler._internal;

function mockResponse() {
  var headers = {};
  return {
    statusCode: 200,
    body: null,
    headers: headers,
    setHeader: function (name, value) { headers[String(name).toLowerCase()] = String(value); },
    status: function (code) { this.statusCode = code; return this; },
    json: function (payload) { this.body = payload; return this; },
    end: function () { return this; }
  };
}

function mockRequest(question, ip, extraHeaders) {
  return {
    method: 'POST',
    headers: Object.assign({
      origin: 'https://wagnerpersoli.vercel.app',
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-for': ip || '203.0.113.10'
    }, extraHeaders || {}),
    socket: {},
    body: { messages: [{ role: 'user', content: question }] }
  };
}

function apiResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    text: async function () { return JSON.stringify(payload); }
  };
}

test.beforeEach(function () { internal.resetState(); });

test('base oficial usa uma única fonte JSON canônica e sem contradição antiga', function () {
  assert.match(internal.knowledge.combined, /Wagner Persoli Filho/);
  assert.match(internal.knowledge.combined, /DADOS ESTRUTURADOS \(FONTE CANÔNICA\)/);
  assert.doesNotMatch(internal.knowledge.combined, /CURRÍCULO E CONTEXTO/);
  assert.doesNotMatch(internal.knowledge.combined, /namorada/i);
});

test('seleção de conhecimento minimiza dados pessoais conforme a pergunta', function () {
  var general = internal.selectKnowledge('Explique REST e GraphQL');
  assert.doesNotMatch(general, /98150|estado civil|compensation|Vila Galvão/i);

  var projects = internal.selectKnowledge('Quais são os projetos do Wagner?');
  assert.match(projects, /Device Simulator Engine/);
  assert.doesNotMatch(projects, /98150|civil_status|compensation|commute/i);

  var contact = internal.selectKnowledge('Qual é o WhatsApp do Wagner?');
  assert.match(contact, /5511981504061/);
  assert.doesNotMatch(contact, /civil_status|compensation|commute/i);

  var salary = internal.selectKnowledge('Qual é a pretensão salarial?');
  assert.match(salary, /R\$ 20 a R\$ 30/);
  assert.doesNotMatch(salary, /Tucuruvi|commute/i);
});

test('prompt inclui contexto temporal, modos e proteção contra invenção', function () {
  var prompt = internal.buildSystemPrompt(new Date('2026-07-17T12:00:00.000Z'), 'Qual é a experiência do Wagner?');
  assert.match(prompt, /Ano atual em São Paulo: 2026/);
  assert.match(prompt, /Limite de conhecimento nativo do modelo: janeiro de 2025/);
  assert.match(prompt, /PERFIL WAGNER/);
  assert.match(prompt, /PERGUNTAS GERAIS/);
  assert.match(prompt, /Não invente, complete ou deduza fatos/);
});

test('configuração de geração é factual para perfil e mais flexível para criação', function () {
  assert.equal(internal.getGenerationConfig('Qual é a experiência do Wagner?').temperature, 0.2);
  assert.equal(internal.getGenerationConfig('Explique REST e GraphQL').temperature, 0.4);
  assert.equal(internal.getGenerationConfig('Crie um slogan futurista').temperature, 0.7);
});

test('hora de São Paulo é respondida localmente sem chamar a API', async function () {
  var originalFetch = global.fetch;
  global.fetch = async function () { throw new Error('fetch não deveria ser chamado'); };
  try {
    var res = mockResponse();
    await handler(mockRequest('Que horas são agora em SP?', '203.0.113.11'), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-wagner-chat-source'], 'runtime');
    assert.match(res.body.content[0].text, /São Paulo/);
  } finally { global.fetch = originalFetch; }
});

test('fallback não inventa motivo de saída e é transparente em pergunta geral', function () {
  assert.match(internal.getFallbackResponse('Qual o motivo de sair do último emprego?'), /não está documentado/i);
  assert.match(internal.getFallbackResponse('Explique computação quântica'), /temporariamente indisponível/i);
});

test('falha transitória no principal usa secundário e ativa circuit breaker', async function () {
  var originalFetch = global.fetch;
  var calls = [];
  global.fetch = async function (url) {
    calls.push(String(url));
    if (String(url).includes('gemini-3.5-flash')) return apiResponse(503, { error: { message: 'high demand' } });
    return apiResponse(200, { candidates: [{ content: { parts: [{ text: 'Resposta pelo modelo secundário.' }] } }] });
  };
  try {
    var firstRes = mockResponse();
    await handler(mockRequest('Por que contratar o Wagner?', '203.0.113.12'), firstRes);
    assert.equal(firstRes.statusCode, 200);
    assert.equal(firstRes.headers['x-wagner-chat-source'], 'gemini');
    assert.equal(firstRes.headers['x-wagner-chat-model'], 'gemini-3.1-flash-lite');
    assert.equal(calls.filter(function (url) { return url.includes('gemini-3.5-flash'); }).length, 2);
    assert.equal(calls.filter(function (url) { return url.includes('gemini-3.1-flash-lite'); }).length, 1);

    calls.length = 0;
    var secondRes = mockResponse();
    await handler(mockRequest('Qual é a formação?', '203.0.113.13'), secondRes);
    assert.match(calls[0], /gemini-3\.1-flash-lite/);
    assert.equal(secondRes.headers['x-wagner-chat-model'], 'gemini-3.1-flash-lite');
  } finally { global.fetch = originalFetch; }
});

test('sanitização limita histórico e remove controles invisíveis', function () {
  var raw = [];
  for (var i = 0; i < 30; i++) raw.push({ role: 'user', content: 'mensagem\u0000 ' + i });
  var clean = internal.sanitizeMessages(raw);
  assert.equal(clean.length, 24);
  assert.doesNotMatch(clean[0].content, /\u0000/);
});

test('chat bloqueia fetch cross-site e content-type incorreto', async function () {
  var crossSite = mockResponse();
  await handler(mockRequest('oi', '203.0.113.21', { 'sec-fetch-site': 'cross-site' }), crossSite);
  assert.equal(crossSite.statusCode, 403);

  var invalidType = mockResponse();
  await handler(mockRequest('oi', '203.0.113.22', { 'content-type': 'text/plain' }), invalidType);
  assert.equal(invalidType.statusCode, 415);
});
