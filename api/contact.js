// api/contact.js — Vercel Serverless Function
// Canal seguro de contato por e-mail usando Resend REST API.

var CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
var CONTACT_RATE_LIMIT_MAX = positiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 5, 1, 20);
var contactRateLimitMap = new Map();

function positiveInt(value, fallback, min, max) {
  var parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  var forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return String(req.socket && req.socket.remoteAddress || 'unknown');
}

function isRateLimited(ip) {
  var now = Date.now();
  var bucket = contactRateLimitMap.get(ip);
  if (!bucket || now > bucket.resetAt) {
    contactRateLimitMap.set(ip, { count: 1, resetAt: now + CONTACT_RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > CONTACT_RATE_LIMIT_MAX;
}

function cleanupRateLimitMap() {
  var now = Date.now();
  contactRateLimitMap.forEach(function(bucket, key) {
    if (!bucket || now > bucket.resetAt) contactRateLimitMap.delete(key);
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeField(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch (_) { return null; }
  }
  var chunks = [];
  for await (var chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  var raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function buildEmailPayload(data) {
  var submittedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  var safeName = escapeHtml(data.name);
  var safeEmail = escapeHtml(data.email);
  var safePhone = escapeHtml(data.phone || 'Não informado');
  var safeSubject = escapeHtml(data.subject);
  var safeMessage = escapeHtml(data.message).replace(/\n/g, '<br>');

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
              '<tr><td style="padding:0 0 18px"><strong style="color:#8ef7ff">Enviado em:</strong> ' + escapeHtml(submittedAt) + '</td></tr>' +
            '</table>' +
            '<div style="padding:18px;border:1px solid rgba(46,242,255,.12);border-radius:14px;background:#070e1a;color:#edf8ff;line-height:1.7">' + safeMessage + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
  };
}

async function sendWithResend(data) {
  var apiKey = String(process.env.RESEND_API_KEY || '').trim();
  var toEmail = String(process.env.CONTACT_TO_EMAIL || 'wagnerpersoli@hotmail.com').trim();
  var fromEmail = String(process.env.CONTACT_FROM_EMAIL || 'WAGNER.OS <onboarding@resend.dev>').trim();

  if (!apiKey) {
    return { ok: false, status: 503, message: 'RESEND_API_KEY não configurada no ambiente da Vercel.' };
  }

  var payload = buildEmailPayload(data);
  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
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
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    var detail = body && body.message ? body.message : 'Falha ao enviar via Resend.';
    return { ok: false, status: response.status, message: detail };
  }

  return { ok: true, status: 200, id: body && body.id ? body.id : '' };
}

async function handler(req, res) {
  cleanupRateLimitMap();

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, { ok: false, message: 'Método não permitido.' });
  }

  var ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return sendJson(res, 429, { ok: false, message: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' });
  }

  var body = await parseRequestBody(req);
  if (!body || typeof body !== 'object') {
    return sendJson(res, 400, { ok: false, message: 'Payload inválido.' });
  }

  var data = {
    name: sanitizeField(body.name, 80),
    email: sanitizeField(body.email, 120),
    subject: sanitizeField(body.subject, 120),
    phone: sanitizeField(body.phone, 40),
    message: sanitizeField(body.message, 2000),
    company: sanitizeField(body.company, 120)
  };

  if (data.company) {
    return sendJson(res, 200, { ok: true, message: 'Mensagem recebida.' });
  }

  if (!data.name || data.name.length < 2) {
    return sendJson(res, 400, { ok: false, message: 'Informe um nome válido.' });
  }
  if (!isValidEmail(data.email)) {
    return sendJson(res, 400, { ok: false, message: 'Informe um e-mail válido.' });
  }
  if (!data.subject || data.subject.length < 3) {
    return sendJson(res, 400, { ok: false, message: 'Informe um assunto com pelo menos 3 caracteres.' });
  }
  if (!data.message || data.message.length < 12) {
    return sendJson(res, 400, { ok: false, message: 'A mensagem deve ter pelo menos 12 caracteres.' });
  }

  try {
    var result = await sendWithResend(data);
    if (!result.ok) {
      console.error('[contact] Falha no envio:', result.status, result.message);
      return sendJson(res, result.status || 500, {
        ok: false,
        message: 'O formulário está pronto, mas o canal de e-mail precisa de ajuste no ambiente. Configure RESEND_API_KEY, CONTACT_TO_EMAIL e, se necessário, CONTACT_FROM_EMAIL na Vercel.'
      });
    }

    return sendJson(res, 200, {
      ok: true,
      message: 'Mensagem enviada com sucesso. Wagner receberá seu contato por e-mail.',
      id: result.id || ''
    });
  } catch (err) {
    console.error('[contact] Exceção não tratada:', err && err.message ? err.message : err);
    return sendJson(res, 500, {
      ok: false,
      message: 'Não foi possível enviar agora. Tente novamente em instantes.'
    });
  }
}

module.exports = handler;
module.exports._internal = {
  buildEmailPayload: buildEmailPayload,
  sanitizeField: sanitizeField,
  isValidEmail: isValidEmail,
  resetState: function() {
    contactRateLimitMap.clear();
  }
};
