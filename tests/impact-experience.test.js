'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');

test('camada visual impactante permanece isolada dos contratos críticos', function () {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'src', 'styles', 'impact-experience.css'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'public', 'js', 'impact-experience.js'), 'utf8');
  assert.match(html, /impact-kinetic-wordmark/);
  assert.match(html, /impact-skill-marquee/);
  assert.match(html, /impact-experience\.js/);
  assert.match(css, /body\.pmode-active/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /pointer: coarse/);
  assert.match(css, /\.impact-particle-layer/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /body\.impact-chat-open \.impact-particle-layer/);
  assert.match(js, /impactParticleLayer/);
  assert.match(js, /globalCompositeOperation = 'lighter'/);
  assert.match(js, /presentationActive\(\)/);
  assert.match(js, /chatPanel\.classList\.contains\('open'\)/);
  assert.doesNotMatch(js, /preventDefault\s*\(/);
  assert.doesNotMatch(js, /openChat\s*=/);
  assert.doesNotMatch(js, /addMsg\s*=/);
  assert.doesNotMatch(js, /scrollTo\s*\(/);
});


test('partículas canvas ficam sobre o conteúdo sem capturar eventos ou cobrir controles críticos', function () {
  var css = fs.readFileSync(path.join(root, 'src', 'styles', 'impact-experience.css'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'public', 'js', 'impact-experience.js'), 'utf8');
  assert.match(css, /\.impact-particle-layer\s*\{[\s\S]*?z-index:\s*40;[\s\S]*?pointer-events:\s*none;/);
  assert.match(css, /body\.pmode-active \.impact-particle-layer/);
  assert.match(css, /body\.impact-chat-open \.impact-particle-layer/);
  assert.match(js, /body\.appendChild\(particleCanvas\)/);
  assert.match(js, /particleCanvas\.setAttribute\('aria-hidden', 'true'\)/);
  assert.doesNotMatch(js, /innerHTML\s*=/);
});

test('Brevo está documentada sem remover compatibilidade Resend', function () {
  var env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  var contact = fs.readFileSync(path.join(root, 'api', 'contact.js'), 'utf8');
  assert.match(env, /CONTACT_EMAIL_PROVIDER=brevo/);
  assert.match(env, /BREVO_API_KEY=/);
  assert.match(contact, /api\.brevo\.com\/v3\/smtp\/email/);
  assert.match(contact, /api\.resend\.com\/emails/);
});

test('refinamento v3.3.0 mantém visual uniforme e prioridade dos controles críticos', function () {
  var css = fs.readFileSync(path.join(root, 'src', 'styles', 'premium-uniform-v330.css'), 'utf8');
  var build = fs.readFileSync(path.join(root, 'scripts', 'build-css.js'), 'utf8');
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.match(build, /premium-uniform-v330\.css/);
  assert.match(css, /body > header/);
  assert.match(css, /hero-logo-cutout/);
  assert.match(css, /body\.impact-chat-open \.impact-particle-layer/);
  assert.match(css, /body\.pmode-active \.impact-particle-layer/);
  assert.match(css, /pointer-events/);
  assert.match(html, /BUILD <b>v3\.3\.0<\/b>/);
});

test('chuva Matrix usa canvas visível e mantém o conteúdo acima da animação', function () {
  var source = fs.readFileSync(path.join(root, 'src', 'styles', 'current-production.css'), 'utf8');
  var theme = fs.readFileSync(path.join(root, 'src', 'styles', 'terminal-neon-reference-v1.css'), 'utf8');
  var matrix = fs.readFileSync(path.join(root, 'src', 'styles', 'matrix-rain-v2.css'), 'utf8');
  var build = fs.readFileSync(path.join(root, 'scripts', 'build-css.js'), 'utf8');
  var generated = fs.readFileSync(path.join(root, 'public', 'css', 'app.css'), 'utf8');
  var main = fs.readFileSync(path.join(root, 'public', 'js', 'main.js'), 'utf8');
  assert.match(source, /\.cv-terminal-content::before,\s*\n\.cv-terminal-content::after\s*\{[\s\S]*?background-image:\s*url\(/);
  assert.match(theme, /\.cv-terminal-content\s*\{[\s\S]*?background-image:/);
  assert.doesNotMatch(theme, /\.cv-terminal-content::before\s*\{[\s\S]{0,260}?z-index:\s*-1/);
  assert.doesNotMatch(theme, /\.cv-terminal-content::before\s*\{[\s\S]{0,260}?display:\s*none/);
  assert.match(build, /matrix-rain-v2\.css/);
  assert.match(matrix, /#bgCanvas\s*\{[\s\S]*?z-index:\s*4;[\s\S]*?mix-blend-mode:\s*screen;/);
  assert.match(generated, /#bgCanvas\s*\{[\s\S]*?z-index:\s*4;[\s\S]*?mix-blend-mode:\s*screen;/);
  assert.match(generated, /\.cv-terminal-content::before,\s*\n\.cv-terminal-content::after\s*\{\s*display:\s*none\s*!important;/);
  assert.match(main, /var columnGap = W < 600 \? 19 : 17;/);
  assert.match(main, /var matrixStrength = matrixVisibility \* 0\.96;/);
  assert.match(main, /1000 \/ 30/);
});

test('asset W prismatico permanece WebP e o HTML conserva os hotspots originais', function () {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var image = fs.readFileSync(path.join(root, 'public', 'img', 'hero-w-energy.webp'));
  assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal((html.match(/class="hero-hotspot /g) || []).length, 6);
  assert.match(html, /id="heroFidelityStage"/);
});
