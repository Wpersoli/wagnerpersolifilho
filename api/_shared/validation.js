'use strict';

function normalizeText(value) {
  return String(value === undefined || value === null ? '' : value).normalize('NFC');
}

function sanitizeText(value, maxLength) {
  return normalizeText(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function sanitizeSingleLine(value, maxLength) {
  return sanitizeText(value, maxLength)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return normalizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value) {
  var text = sanitizeSingleLine(value, 254).toLowerCase();
  if (text.length < 3 || text.length > 254 || /[\r\n]/.test(text)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isPlausibleSubmit(startedAt, now) {
  var started = Number(startedAt);
  var current = Number(now || Date.now());
  if (!Number.isFinite(started)) return true;
  var elapsed = current - started;
  return elapsed >= 900 && elapsed <= 2 * 60 * 60 * 1000;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasOnlyContactFields(value) {
  if (!isPlainObject(value)) return false;
  var allowed = new Set(['name', 'email', 'subject', 'phone', 'message', 'company', 'startedAt']);
  return Object.keys(value).every(function (key) { return allowed.has(key); });
}

module.exports = {
  sanitizeText: sanitizeText,
  sanitizeSingleLine: sanitizeSingleLine,
  escapeHtml: escapeHtml,
  isValidEmail: isValidEmail,
  isPlausibleSubmit: isPlausibleSubmit,
  isPlainObject: isPlainObject,
  hasOnlyContactFields: hasOnlyContactFields
};
