'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const html = read('public/index.html');
const appCss = read('public/css/app.css');
const scrollCss = read('src/styles/scroll-ux.css');
const responsiveCss = read('src/styles/hero-responsive-approved.css');
const mainJs = read('public/js/main.js');
const performanceJs = read('public/js/performance-safe.js');
const performanceCss = read('src/styles/performance-safe.css');

test('contrato visual mantém topo, botões, WhatsApp, chat e apresentação', () => {
  for (const id of ['pmodeBtn','pmodeMobileBtn','burgerBtn','fabTop','fabWhats','fabChat','chatPanel','chatClose','chatInput','chatSend']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `controle ausente: ${id}`);
  }
  assert.match(html, /https:\/\/wa\.me\/5511981504061/);
  assert.match(html, /class=["'][^"']*hero-clean-btn[^"']*["']/);
  assert.match(html, /js\/main\.js/);
  assert.match(html, /id=["']bootSkip["']/);
});

test('CSS consolidado mantém tokens e overlays dentro da viewport', () => {
  assert.match(appCss, /--sat:\s*env\(safe-area-inset-top,\s*0px\)/);
  assert.match(appCss, /--sab:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  assert.match(appCss, /\.fab-stack\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(appCss, /\.chat-panel\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(appCss, /\.mobile-nav\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(responsiveCss, /\.fab-stack\s*\{\s*z-index:\s*20010\s*!important/);
  assert.match(responsiveCss, /\.chat-panel\s*\{\s*z-index:\s*20020\s*!important/);
  assert.equal((html.match(/href=["']css\/app\.css["']/g) || []).length, 1);
});

test('JavaScript mantém chat, ações flutuantes, menu e apresentação', () => {
  assert.match(mainJs, /fabChat\.addEventListener\(['"]click['"]/);
  assert.match(html, /js\/feature-loader\.js/);
  assert.match(mainJs, /chatPanel\.classList\.add\(['"]open['"]\)/);
  assert.match(mainJs, /fabWhats\.classList\.toggle\(['"]show['"],\s*visible\)/);
  assert.match(mainJs, /\['pmodeBtn','pmodeMobileBtn'\]/);
  assert.match(mainJs, /startCinematic\(\)/);
  assert.match(mainJs, /mobileNav\.classList\.add\(['"]open['"]\)/);
  assert.match(mainJs, /\.inert\s*=/);
});

test('hero usa WebP válido e dimensões intrínsecas corretas', () => {
  const imagePath = path.join(root, 'public/img/hero-fidelity-master.webp');
  const image = fs.readFileSync(imagePath);
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  const vp8Offset = image.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  assert.ok(vp8Offset > 0, 'frame VP8 ausente');
  const intrinsicWidth = image.readUInt16LE(vp8Offset + 3) & 0x3fff;
  const intrinsicHeight = image.readUInt16LE(vp8Offset + 5) & 0x3fff;
  assert.equal(intrinsicWidth, 4086);
  assert.equal(intrinsicHeight, 1913);
  assert.match(html, /src=["']img\/hero-fidelity-master\.webp["'][\s\S]*?width=["']4086["'][\s\S]*?height=["']1913["']/);
  const fallback = fs.readFileSync(path.join(root, 'public/img/hero-fidelity-master-fallback.jpg'));
  assert.equal(fallback.subarray(0, 2).toString('hex'), 'ffd8');
  assert.equal(fs.existsSync(path.join(root, 'public/img/hero-fidelity-master.webp.webp')), false);
});

test('scroll usa comportamento nativo e pausa apenas efeitos caros', () => {
  assert.match(performanceJs, /window\.addEventListener\(['"]scroll['"]/);
  assert.doesNotMatch(performanceJs, /addEventListener\(['"]wheel['"]/);
  assert.match(performanceJs, /nativeWheel:\s*true/);
  assert.match(performanceJs, /wagner:scroll-start/);
  assert.match(performanceJs, /wagner:scroll-end/);
  assert.match(scrollCss, /scroll-behavior:\s*auto/);
  assert.match(scrollCss, /touch-action:\s*pan-y pinch-zoom/);
  assert.doesNotMatch(scrollCss, /body\.is-scrolling\s+\*/);
  assert.match(scrollCss, /body\.is-scrolling[\s\S]*animation-play-state:\s*paused/);
  assert.match(performanceCss, /contain:\s*strict/);
  assert.match(mainJs, /bgScrollPaused/);
  assert.match(mainJs, /requestFabUpdate/);
  assert.match(mainJs, /requestActiveNavUpdate/);
});
