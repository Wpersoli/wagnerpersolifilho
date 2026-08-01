'use strict';

// Canal serverless de contato: validação estrita, persistência RLS no Supabase,
// notificação Brevo/Resend, rate limit e degradação controlada sem crash de UI.
var http = require('./_shared/http');
var rateLimiter = require('./_shared/rate-limit');
var validation = require('./_shared/validation');

var CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
var CONTACT_RATE_LIMIT_MAX = http.positiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 5, 1, 20);
var MAX_BODY_BYTES = http.positiveInt(process.env.CONTACT_MAX_BODY_BYTES, 16384, 4096, 65536);
var PROVIDER_TIMEOUT_MS = http.positiveInt(process.env.CONTACT_PROVIDER_TIMEOUT_MS, 9000, 2000, 20000);

function booleanEnv(name, fallback) {
  var raw = String(process.env[name] === undefined ? '' : process.env[name]).trim().toLowerCase();
  if (!raw) return Boolean(fallback);
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function buildEmailPayload(data) {
  var submittedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  var safeName = validation.escapeHtml(data.name);
  var safeEmail = validation.escapeHtml(data.email);
  var safePhone = validation.escapeHtml(data.phone || 'Não informado');
  var safeSubject = validation.escapeHtml(data.subject);
  var safeMessage = validation.escapeHtml(data.message).replace(/\n/g, '<br>');

  return {
    subject: '[Portfólio] ' + validation.sanitizeSingleLine(data.subject, 120),
    text:
      'Nova mensagem enviada pelo formulário do portfólio.\n\n' +
      'Nome: ' + data.name + '\n' +
      'E-mail: ' + data.email + '\n' +
      'Telefone: ' + (data.phone || 'Não informado') + '\n' +
      'Assunto: ' + data.subject + '\n' +
      'Enviado em: ' + submittedAt + '\n\n' +
      data.message,
    html:
      '<div style="margin:0;background:#030914;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#edf8ff">' +
        '<div style="max-width:720px;margin:0 auto;border:1px solid rgba(46,242,255,.20);border-radius:18px;overflow:hidden;background:#07111f">' +
          '<div style="padding:20px 24px;background:linear-gradient(135deg,#0b2741,#12143a);border-bottom:1px solid rgba(46,242,255,.16)">' +
            '<div style="font-size:12px;letter-spacing:.18em;color:#75e9ff">WAGNER.OS / CONTACT CHANNEL</div>' +
            '<h1 style="margin:10px 0 0;font-size:23px;color:#fff">Nova mensagem do portfólio</h1>' +
          '</div>' +
          '<div style="padding:24px">' +
            '<table role="presentation" style="width:100%;border-collapse:collapse;color:#dcefff">' +
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
  var raw = validation.sanitizeSingleLine(value, 254);
  var match = raw.match(/^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (match) return { name: validation.sanitizeSingleLine(match[1] || fallbackName, 70), email: match[2].toLowerCase() };
  if (validation.isValidEmail(raw)) return { name: fallbackName, email: raw.toLowerCase() };
  return { name: fallbackName, email: fallbackEmail };
}

async function providerFetch(url, options) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonSafe(response) {
  try { return await response.json(); } catch (_) { return null; }
}

async function saveContactToSupabase(data, requestId) {
  var supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  var publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  var required = booleanEnv('CONTACT_REQUIRE_SUPABASE', false);

  if (!supabaseUrl || !publishableKey) {
    return required
      ? { ok: false, skipped: false, status: 503, code: 'supabase_not_configured' }
      : { ok: true, skipped: true, status: 204, code: 'supabase_skipped' };
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    return { ok: false, skipped: false, status: 503, code: 'supabase_invalid_url' };
  }

  try {
    var response = await providerFetch(supabaseUrl + '/rest/v1/mensagens_contato', {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: 'Bearer ' + publishableKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        'X-Client-Info': 'WAGNER.OS/3.3.0'
      },
      body: JSON.stringify({
        nome: data.name,
        email: data.email,
        telefone: data.phone || null,
        assunto: data.subject,
        mensagem: data.message,
        origem: 'portfolio',
        request_id: requestId
      })
    });

    if (response.ok || response.status === 409) {
      return { ok: true, skipped: false, duplicate: response.status === 409, status: response.status };
    }
    return { ok: false, skipped: false, status: response.status, code: 'supabase_insert_failed' };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      status: error && error.name === 'AbortError' ? 504 : 502,
      code: error && error.name === 'AbortError' ? 'supabase_timeout' : 'supabase_unavailable'
    };
  }
}

async function sendWithBrevo(data) {
  var apiKey = String(process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) return { ok: false, status: 503, code: 'provider_not_configured', provider: 'brevo' };

  var toEmail = validation.sanitizeSingleLine(process.env.CONTACT_TO_EMAIL || 'wagnerpersoli@hotmail.com', 254).toLowerCase();
  var sender = parseSender(
    process.env.CONTACT_FROM_EMAIL,
    validation.sanitizeSingleLine(process.env.BREVO_SENDER_NAME || 'WAGNER.OS', 70) || 'WAGNER.OS',
    validation.sanitizeSingleLine(process.env.BREVO_SENDER_EMAIL || 'contato@wagnerpersoli.com.br', 254).toLowerCase()
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
        'User-Agent': 'WAGNER.OS/3.3.0'
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
    var body = await readJsonSafe(response);
    if (!response.ok) return { ok: false, status: response.status, code: 'provider_error', provider: 'brevo' };
    var id = body && (body.messageId || Array.isArray(body.messageIds) && body.messageIds[0]);
    return { ok: true, status: response.status, id: id ? String(id) : '', provider: 'brevo' };
  } catch (error) {
    return { ok: false, status: error && error.name === 'AbortError' ? 504 : 502, code: 'provider_unavailable', provider: 'brevo' };
  }
}

async function sendWithResend(data) {
  var apiKey = String(process.env.RESEND_API_KEY || '').trim();
  var toEmail = validation.sanitizeSingleLine(process.env.CONTACT_TO_EMAIL || 'wagnerpersoli@hotmail.com', 254).toLowerCase();
  var fromEmail = validation.sanitizeSingleLine(process.env.CONTACT_FROM_EMAIL || 'WAGNER.OS <onboarding@resend.dev>', 254);
  if (!apiKey) return { ok: false, status: 503, code: 'provider_not_configured', provider: 'resend' };

  var payload = buildEmailPayload(data);
  try {
    var response = await providerFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'WAGNER.OS/3.3.0'
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
    var body = await readJsonSafe(response);
    if (!response.ok) return { ok: false, status: response.status, code: 'provider_error', provider: 'resend' };
    return { ok: true, status: response.status, id: body && body.id ? String(body.id) : '', provider: 'resend' };
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
    name: validation.sanitizeSingleLine(body.name, 80),
    email: validation.sanitizeSingleLine(body.email, 254).toLowerCase(),
    subject: validation.sanitizeSingleLine(body.subject, 120),
    phone: validation.sanitizeSingleLine(body.phone, 40),
    message: validation.sanitizeText(body.message, 2000),
    company: validation.sanitizeSingleLine(body.company, 120),
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
  if (!validation.hasOnlyContactFields(parsed.value)) {
    return http.sendJson(res, 400, { ok: false, message: 'Estrutura de dados inválida.' });
  }
  var data = normalizeContact(parsed.value);

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

  var storageResult = await saveContactToSupabase(data, reqId);
  var emailResult = await sendContactEmail(data);

  if (storageResult.ok && emailResult.ok) {
    http.log('info', 'contact_completed', {
      requestId: reqId,
      stored: !storageResult.skipped,
      provider: emailResult.provider || '',
      providerId: emailResult.id || ''
    });
    return http.sendJson(res, 200, {
      ok: true,
      stored: !storageResult.skipped,
      notified: true,
      message: 'Mensagem enviada com sucesso. Wagner receberá seu contato por e-mail.',
      id: emailResult.id || ''
    });
  }

  if (storageResult.ok && !storageResult.skipped && !emailResult.ok) {
    http.log('warn', 'contact_saved_email_degraded', { requestId: reqId, emailCode: emailResult.code });
    return http.sendJson(res, 202, {
      ok: true,
      stored: true,
      notified: false,
      message: 'Sua mensagem foi registrada com segurança. A notificação por e-mail está temporariamente indisponível.'
    });
  }

  if (!storageResult.ok && emailResult.ok) {
    http.log('warn', 'contact_email_sent_storage_degraded', { requestId: reqId, storageCode: storageResult.code });
    return http.sendJson(res, 202, {
      ok: true,
      stored: false,
      notified: true,
      message: 'Sua mensagem foi enviada por e-mail. O registro no banco está temporariamente indisponível.'
    });
  }

  http.log('error', 'contact_channels_unavailable', {
    requestId: reqId,
    storageCode: storageResult.code || '',
    emailCode: emailResult.code || ''
  });
  return http.sendJson(res, 503, {
    ok: false,
    message: 'Os canais de contato estão temporariamente indisponíveis. Use WhatsApp ou LinkedIn e tente novamente em instantes.'
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
  saveContactToSupabase: saveContactToSupabase,
  sendWithBrevo: sendWithBrevo,
  sendWithResend: sendWithResend,
  sendContactEmail: sendContactEmail,
  parseSender: parseSender,
  resetState: function () { rateLimiter.reset(); }
};
