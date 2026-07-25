'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const curriculum = fs.readFileSync(path.join(root, 'public/curriculo.html'), 'utf8');
const pdfPath = path.join(root, 'public/docs/curriculo-wagner-persoli-filho.pdf');

test('currículo possui página online e PDF válido para download', () => {
  assert.match(index, /href=["']curriculo\.html["']/);
  assert.match(index, /href=["']docs\/curriculo-wagner-persoli-filho\.pdf["'][^>]*download/);
  assert.match(curriculum, /href=["']docs\/curriculo-wagner-persoli-filho\.pdf["'][^>]*download/);
  assert.match(curriculum, /href=["']index\.html["']/);
  assert.ok(fs.existsSync(pdfPath), 'PDF do currículo ausente');
  const pdf = fs.readFileSync(pdfPath);
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.length > 100_000, 'PDF parece incompleto');
});
