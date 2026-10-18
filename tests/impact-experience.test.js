'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var root = path.resolve(__dirname, '..');

test('camada visual geral mantém hierarquia, cartões e animações sem bloquear controles', function () {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'public', 'css', 'portfolio-general.css'), 'utf8');
  var js = fs.readFileSync(path.join(root, 'public', 'js', 'portfolio-general.js'), 'utf8');
  assert.match(html, /data-site-version="portfolio-general"/);
  assert.match(html, /class="hero section-shell"/);
  assert.match(html, /class="value-grid"/);
  assert.match(html, /class="projects-grid"/);
  assert.match(html, /contact-layout/);
  assert.match(css, /pointer-events:none/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@keyframes profileFloat/);
  assert.match(css, /@keyframes cardFloat/);
  assert.match(js, /IntersectionObserver/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /\sstyle\s*=/i);
});

test('imagens de projetos, destinos e acessibilidade estão definidos', function () {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'public', 'css', 'portfolio-general.css'), 'utf8');
  assert.match(html, /tamoio-petshop\.vercel\.app/);
  assert.match(html, /lpgrandesmecanicosogm\.vercel\.app/);
  assert.match(html, /\/img\/projeto-tamoio-1672\.webp/);
  assert.match(html, /\/img\/projeto-sogm-1672\.webp/);
  assert.ok(fs.existsSync(path.join(root, 'public', 'img', 'projeto-tamoio-1672.webp')));
  assert.ok(fs.existsSync(path.join(root, 'public', 'img', 'projeto-sogm-1672.webp')));
  assert.doesNotMatch(html, /raw\.githubusercontent\.com\/Wpersoli\/lp\.grandesmecanicosogm/);
  assert.match(html, /aria-label="Navegação principal"/);
  assert.match(html, /class="skip-link"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
});

test('Brevo está documentada sem remover compatibilidade Resend', function () {
  var env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  var contact = fs.readFileSync(path.join(root, 'api', 'contact.js'), 'utf8');
  assert.match(env, /CONTACT_EMAIL_PROVIDER=brevo/);
  assert.match(env, /BREVO_API_KEY=/);
  assert.match(contact, /api\.brevo\.com\/v3\/smtp\/email/);
  assert.match(contact, /api\.resend\.com\/emails/);
});

test('assets WebP existentes e fallback do hero permanecem válidos para recuperação', function () {
  var hero = fs.readFileSync(path.join(root, 'public', 'img', 'hero-fidelity-master.webp'));
  var fallback = path.join(root, 'public', 'img', 'hero-fidelity-master-fallback.jpg');
  assert.equal(hero.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(hero.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(fs.existsSync(fallback), 'fallback JPEG do hero original deve continuar preservado');
});