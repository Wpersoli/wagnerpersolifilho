'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const html = read('public/index.html');
const css = read('public/css/main.css');
const responsiveCss = read('public/css/hero-responsive-approved.css');
const mainJs = read('public/js/main.js');

test('contrato visual mantém topo, botões, WhatsApp, chat e apresentação', () => {
  for (const id of [
    'pmodeBtn',
    'pmodeMobileBtn',
    'burgerBtn',
    'fabTop',
    'fabWhats',
    'fabChat',
    'chatPanel',
    'chatClose',
    'chatInput',
    'chatSend'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `controle ausente: ${id}`);
  }

  assert.match(html, /https:\/\/wa\.me\/5511981504061/);
  assert.match(html, /class=["'][^"']*hero-clean-btn[^"']*["']/);
  assert.match(html, /js\/main\.js/);
});

test('CSS funcional possui tokens seguros e overlays fixos dentro da viewport', () => {
  assert.match(css, /:root\s*\{[\s\S]*--sat:\s*env\(safe-area-inset-top,\s*0px\)/);
  assert.match(css, /--sab:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  assert.match(css, /\.fab-stack\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.chat-panel\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(responsiveCss, /\.fab-stack\s*\{\s*z-index:\s*20010\s*!important/);
  assert.match(responsiveCss, /\.chat-panel\s*\{\s*z-index:\s*20020\s*!important/);
});

test('JavaScript mantém os eventos do chat, ações flutuantes e modo apresentação', () => {
  assert.match(mainJs, /fabChat\.addEventListener\(['"]click['"]/);
  assert.match(mainJs, /chatPanel\.classList\.add\(['"]open['"]\)/);
  assert.match(mainJs, /fabWhats\.classList\.toggle\(['"]show['"],\s*visible\)/);
  assert.match(mainJs, /\['pmodeBtn','pmodeMobileBtn'\]/);
  assert.match(mainJs, /startCinematic\(\)/);
  assert.match(mainJs, /mobileNav\.classList\.add\(['"]open['"]\)/);
});

test('hero usa arquivo WebP real e dimensões intrínsecas corretas', () => {
  const imagePath = path.join(root, 'public/img/hero-fidelity-master.webp');
  const image = fs.readFileSync(imagePath);
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.match(html, /src=["']img\/hero-fidelity-master\.webp["'][\s\S]*?width=["']1916["'][\s\S]*?height=["']821["']/);
});
