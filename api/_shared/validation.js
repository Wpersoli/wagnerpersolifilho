'use strict';

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value) {
  var text = String(value || '');
  if (text.length > 254 || /[\r\n]/.test(text)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isPlausibleSubmit(startedAt, now) {
  var started = Number(startedAt);
  var current = Number(now || Date.now());
  if (!Number.isFinite(started)) return true;
  var elapsed = current - started;
  return elapsed >= 900 && elapsed <= 2 * 60 * 60 * 1000;
}

module.exports = {
  sanitizeText: sanitizeText,
  escapeHtml: escapeHtml,
  isValidEmail: isValidEmail,
  isPlausibleSubmit: isPlausibleSubmit
};
