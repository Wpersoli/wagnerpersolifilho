'use strict';

// Canal serverless de contato via Brevo/Resend, com validação, anti-abuso e logs estruturados.
var http = require('./_shared/http');
var rateLimiter = require('./_shared/rate-limit');
var validation = require('./_shared/validation');

var CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
var CONTACT_RATE_LIMIT_MAX = http.positiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 5, 1, 20);
var MAX_BODY_BYTES = http.positiveInt(process.env.CONTACT_MAX_BODY_BYTES, 16384, 4096, 65536);
var PROVIDER_TIMEOUT_MS = http.positiveInt(process.env.CONTACT_PROVIDER_TIMEOUT_MS, 9000, 2000, 20000);

function buildEmailPayload(data) {
  var submittedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  var safeName = validation.escapeHtml(data.name);
  var safeEmail = validation.escapeHtml(data.email);
  var safePhone = validation.escapeHtml(data.phone || 'Não informado');
  var safeSubject = validation.escapeHtml(data.subject);
  var safeMessage = validation.escapeHtml(data.message).replace(/\n/g, '<br>');

  return {
    subject: '[Portfólio] ' + data.subject,
    text:
      'Nova mensagem enviada pelo formulário do portfólio.\n\n' +
      'Nome: ' + data.name + '\n' +
      'E-mail: ' + data.email + '\n' +
      'Telefone: ' + (data.phone || 'Não informado') + '\n' +
      'Assunto: ' + data.subject + '\n' +
      'Enviado em: ' + submittedAt + '\n\n' +
      'Mensagem:\n' + data.message,
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;background:#050b16;color:#eefbff;padding:24px">' +
        '<div style="max-width:720px;margin:0 auto;background:#0a1424;border:1px solid rgba(46,242,255,.18);border-radius:18px;overflow:hidden">' +
          '<div style="padding:18px 22px;background:linear-gradient(135deg,#0d2036,#111a33);border-bottom:1px solid rgba(46,242,255,.14)">' +
            '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8ef7ff;margin-bottom:8px">WAGNER.OS contact channel</div>' +
            '<h1 style="margin:0;font-size:24px;line-height:1.2;color:#ffffff">Nova mensagem do formulário</h1>' +
          '</div>' +
          '<div style="padding:22px">' +
            '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#d6e8f7">' +
              '<tr><td style="padding:0 0 10px"><strong style="color:#8ef7ff">Nome:</strong> ' + safeName + '</td></tr>' +
              '<tr><td style="padding:0 0 10px"><strong style="color:#8ef7ff">E-mail:</strong> ' + safeEmail + '</td></tr>' +
              '<tr><td style="padding:0 0 10px"><strong style="color:#8ef7ff">Telefone:</strong> ' + safePhone + '</td></tr>' +
              '<tr><td style="padding:0 0 10px"><strong style="color:#8ef7ff">Assunto:</strong> ' + safeSubject + '</td></tr>' +
              '<tr><td style="padding:0 0 18px"><strong style="color:#8ef7ff">Enviado em:</strong> ' + validation.escapeHtml(submittedAt) + '</td></tr>' +
            '</table>' +
            '<div style="padding:18px;border:1px solid rgba(46,242,255,.12);border-radius:14px;background:#070e1a;color:#edf8ff;line-height:1.7">' + safeMessage + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
  };
}

function parseSender(value, fallbackName, fallbackEmail) {
  var raw = String(value || '').trim();
  var match = raw.match(/^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (match) return { name: match[1] || fallbackName, email: match[2] };
  if (validation.isValidEmail(raw)) return { name: fallbackName, email: raw };
  return { name: fallbackName, email: fallbackEmail };
}

async function providerFetch(url, options) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    options.signal = controller.signal;
    return await fetch(url, options);
  } finally {
    clearTimeout(timer);
  }
}

async function sendWithBrevo(data) {
  var apiKey = String(process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) return { ok: false, status: 503, code: 'provider_not_configured', provider: 'brevo' };

  var toEmail = String(process.env.CONTACT_TO_EMAIL || 'wagnerpersoli@hotmail.com').trim();
  var sender = parseSender(
    process.env.CONTACT_FROM_EMAIL,
    String(process.env.BREVO_SENDER_NAME || 'WAGNER.OS').trim() || 'WAGNER.OS',
    String(process.env.BREVO_SENDER_EMAIL || 'contato@wagnerpersoli.com.br').trim()
  );
  if (!validation.isValidEmail(toEmail) || !validation.isValidEmail(sender.email)) {
    return { ok: false, status: 503, code: 'provider_invalid_configuration', provider: 'brevo' };
  }

  var payload = buildEmailPayload(data);
  try {
    var response = await providerFetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'WAGNER.OS/3.2.0'
      },
      body: JSON.stringify({
        sender: sender,
        to: [{ email: toEmail, name: 'Wagner Persoli' }],
        replyTo: { email: data.email, name: data.name },
        subject: payload.subject,
        textContent: payload.text,
        htmlContent: payload.html,
        tags: ['portfolio-contact']
      })
    });
    var body = null;
    try { body = await response.json(); } catch (_) { body = null; }
    if (!response.ok) return { ok: false, status: response.status, code: 'provider_error', provider: 'brevo' };
    var id = body && (body.messageId || Array.isArray(body.messageIds) && body.messageIds[0]);
    return { ok: true, status: 200, id: id ? String(id) : '', provider: 'brevo' };
  } catch (error) {
    return { ok: false, status: error && error.name === 'AbortError' ? 504 : 502, code: 'provider_unavailable', provider: 'brevo' };
  }
}

async function sendWithResend(data) {
  var apiKey = String(process.env.RESEND_API_KEY || '').trim();
  var toEmail = String(process.env.CONTACT_TO_EMAIL || 'wagnerpersoli@hotmail.com').trim();
  var fromEmail = String(process.env.CONTACT_FROM_EMAIL || 'WAGNER.OS <onboarding@resend.dev>').trim();
  if (!apiKey) return { ok: false, status: 503, code: 'provider_not_configured', provider: 'resend' };

  var payload = buildEmailPayload(data);
  try {
    var response = await providerFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'WAGNER.OS/3.2.0'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: data.email,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      })
    });

    var body = null;
    try { body = await response.json(); } catch (_) { body = null; }
    if (!response.ok) return { ok: false, status: response.status, code: 'provider_error', provider: 'resend' };
    return { ok: true, status: 200, id: body && body.id ? String(body.id) : '', provider: 'resend' };
  } catch (error) {
    return { ok: false, status: error && error.name === 'AbortError' ? 504 : 502, code: 'provider_unavailable', provider: 'resend' };
  }
}

async function sendContactEmail(data) {
  var selected = String(process.env.CONTACT_EMAIL_PROVIDER || 'auto').trim().toLowerCase();
  if (selected === 'brevo') return sendWithBrevo(data);
  if (selected === 'resend') return sendWithResend(data);
  if (String(process.env.BREVO_API_KEY || '').trim()) return sendWithBrevo(data);
  return sendWithResend(data);
}

function normalizeContact(body) {
  return {
    name: validation.sanitizeText(body.name, 80),
    email: validation.sanitizeText(body.email, 120),
    subject: validation.sanitizeText(body.subject, 120),
    phone: validation.sanitizeText(body.phone, 40),
    message: validation.sanitizeText(body.message, 2000),
    company: validation.sanitizeText(body.company, 120),
    startedAt: body.startedAt === undefined || body.startedAt === '' ? NaN : Number(body.startedAt)
  };
}

function validateContact(data) {
  if (!data.name || data.name.length < 2) return 'Informe um nome válido.';
  if (!validation.isValidEmail(data.email)) return 'Informe um e-mail válido.';
  if (!data.subject || data.subject.length < 3) return 'Informe um assunto com pelo menos 3 caracteres.';
  if (!data.message || data.message.length < 12) return 'A mensagem deve ter pelo menos 12 caracteres.';
  return '';
}

async function handler(req, res) {
  var reqId = http.requestId(req);
  res.setHeader('X-Request-Id', reqId);
  http.applyCors(req, res);

  if (!http.isAllowedOrigin(req) || !http.isAllowedFetchSite(req)) {
    http.log('warn', 'contact_request_blocked', { requestId: reqId });
    return http.sendJson(res, 403, { ok: false, message: 'Origem não autorizada.' });
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return http.sendJson(res, 405, { ok: false, message: 'Método não permitido.' });
  }

  var parsed = await http.parseJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) return http.sendJson(res, parsed.status, { ok: false, message: parsed.error });
  var data = normalizeContact(parsed.value || {});

  // Honeypot: resposta neutra para não ensinar o bot a contornar a proteção.
  if (data.company || !validation.isPlausibleSubmit(data.startedAt)) {
    http.log('warn', 'contact_bot_trap', { requestId: reqId });
    return http.sendJson(res, 200, { ok: true, message: 'Mensagem recebida.' });
  }

  var validationError = validateContact(data);
  if (validationError) return http.sendJson(res, 400, { ok: false, message: validationError });

  var rate = await rateLimiter.check('contact', http.getClientIp(req), CONTACT_RATE_LIMIT_MAX, Math.ceil(CONTACT_RATE_LIMIT_WINDOW_MS / 1000));
  http.setRateLimitHeaders(res, CONTACT_RATE_LIMIT_MAX, rate);
  if (rate.limited) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    http.log('warn', 'contact_rate_limited', { requestId: reqId, backend: rate.backend });
    return http.sendJson(res, 429, { ok: false, message: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' });
  }

  var result = await sendContactEmail(data);
  if (!result.ok) {
    http.log('error', 'contact_provider_failed', { requestId: reqId, status: result.status, code: result.code });
    return http.sendJson(res, result.status || 503, {
      ok: false,
      message: 'O canal de e-mail está temporariamente indisponível. Use WhatsApp, LinkedIn ou tente novamente em instantes.'
    });
  }

  http.log('info', 'contact_sent', { requestId: reqId, provider: result.provider || '', providerId: result.id || '' });
  return http.sendJson(res, 200, {
    ok: true,
    message: 'Mensagem enviada com sucesso. Wagner receberá seu contato por e-mail.',
    id: result.id || ''
  });
}

module.exports = handler;
module.exports._internal = {
  buildEmailPayload: buildEmailPayload,
  normalizeContact: normalizeContact,
  validateContact: validateContact,
  sanitizeField: validation.sanitizeText,
  isValidEmail: validation.isValidEmail,
  isAllowedOrigin: http.isAllowedOrigin,
  sendWithBrevo: sendWithBrevo,
  sendWithResend: sendWithResend,
  sendContactEmail: sendContactEmail,
  parseSender: parseSender,
  resetState: function () { rateLimiter.reset(); }
};
