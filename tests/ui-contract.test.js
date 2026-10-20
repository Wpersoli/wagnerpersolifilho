'use strict';
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var crypto = require('node:crypto');
var root = path.resolve(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
var css = fs.readFileSync(path.join(root, 'public', 'css', 'portfolio-general.css'), 'utf8');
var js = fs.readFileSync(path.join(root, 'public', 'js', 'portfolio-general.js'), 'utf8');
var curriculum = fs.readFileSync(path.join(root, 'public', 'curriculo.html'), 'utf8');
var robots = fs.readFileSync(path.join(root, 'public', 'robots.txt'), 'utf8');
var sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
var noJs = fs.readFileSync(path.join(root, 'public', 'css', 'no-js.css'), 'utf8');
var config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

test('portfólio geral mantém todas as seções e navegação principal', function () {
  assert.match(html, /data-site-version="portfolio-general"/);
  ['inicio', 'sobre', 'competencias', 'projetos', 'contato'].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /Wagner Persoli Filho/);
  assert.match(html, /Engenharia de software/);
  assert.match(html, /href="#projetos"/);
  assert.match(html, /href="#contato"/);
  assert.match(html, /href="curriculo\.html"/);
  assert.match(html, /href="docs\/curriculo-wagner-persoli-filho\.pdf" download/);
  assert.match(html, /href="\/css\/portfolio-general\.css(?:\?[^"]*)?"/);
  assert.match(html, /src="\/js\/portfolio-general\.js(?:\?[^"]*)?" defer/);
  assert.equal((html.match(/class="project-card/g) || []).length, 2);
  assert.match(html, /project-image-label">PET CARE · WEBSITE/);
  assert.match(html, /project-image-label">AUTOMOTIVO · LANDING PAGE/);
});

test('contato usa API segura e preserva WhatsApp, e-mail e LinkedIn', function () {
  assert.match(html, /id="contact-form"/);
  ['name', 'email', 'phone', 'subject', 'message', 'company', 'startedAt'].forEach(function (name) {
    assert.match(html, new RegExp('name="' + name + '"'));
  });
  assert.match(js, /fetch\('\/api\/contact'/);
  assert.match(js, /credentials:'same-origin'/);
  assert.match(html, /wa\.me\/5511981504061/);
  assert.match(html, /wagnerpersoli@hotmail\.com/);
  assert.match(html, /linkedin\.com\/in\/wagner-persoli-f-3004bb91/);
  assert.match(html, /name="company"[^>]*autocomplete="off"/);
});

test('assistente virtual tem controles acessíveis e integra o cliente de chat existente', function () {
  ['chat-toggle', 'chat-panel', 'chat-close', 'chat-form', 'chat-input', 'chat-messages'].forEach(function (id) {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(js, /window\.WagnerChatClient/);
  assert.match(js, /WagnerChatClient\.request\(history\)/);
  assert.match(js, /data-prompt/);
});

test('design é responsivo, animado e respeita preferência por movimento reduzido', function () {
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /\.contact-form input,\.contact-form textarea,\.chat-form input\{font-size:16px\}/, 'campos de formulário mobile devem evitar zoom automático em iOS');
  assert.match(css, /\.project-image-label\{/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@keyframes profileFloat/);
  assert.match(css, /@keyframes cardFloat/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /prefers-reduced-motion/);
  assert.doesNotMatch(html, /<style\b/i);
  assert.doesNotMatch(html, /<script(?![^>]+type="application\/ld\+json")[^>]*>[^<]/i);
});

test('CSP permite apenas o JSON-LD validado e imagens públicas dos projetos', function () {
  var match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(match, 'JSON-LD deve existir');
  var hash = crypto.createHash('sha256').update(match[1]).digest('base64');
  var csp = config.headers.find(function (entry) { return entry.source === '/(.*)'; }).headers.find(function (header) { return header.key === 'Content-Security-Policy'; }).value;
  assert.ok(csp.includes("'sha256-" + hash + "'"), 'hash CSP do JSON-LD deve corresponder ao HTML');
  assert.ok(csp.includes('https://raw.githubusercontent.com'), 'CSP deve permitir as imagens dos projetos');
  assert.ok(csp.includes('https://d2ol7oe51mr4n9.cloudfront.net'), 'CSP deve permitir a imagem verificada do projeto SÓGM');
  assert.ok(csp.includes("script-src-attr 'none'"), 'CSP não deve permitir handlers inline');
});

test('widget de chat invisível não deve capturar cliques fora de seus controles', function () {
  assert.match(css, /\.chat-widget\{pointer-events:none\}/);
  assert.match(css, /\.chat-widget>\.chat-toggle\{pointer-events:auto;touch-action:manipulation\}/);
  assert.match(css, /\.chat-widget>\.chat-panel\.is-open\{pointer-events:auto;touch-action:auto\}/);
  assert.match(css, /#contact-form \.form-row\{position:relative;z-index:1\}/);
  assert.match(css, /#contact-form input:not\(\[type="hidden"\]\),#contact-form textarea\{position:relative;z-index:3;display:block;pointer-events:auto/);
});

test('timer do formulário recupera sessões antigas e o WhatsApp mantém navegação nativa', function () {
  assert.match(js, /contactMaxAge=2\*60\*60\*1000/);
  assert.match(js, /refreshContactStartIfStale/);
  assert.match(js, /document\.addEventListener\('visibilitychange',function\(\)\{if\(!document\.hidden\)refreshContactStartIfStale\(\);\}\)/);
  assert.match(js, /whatsappLink\.addEventListener\('click',function\(\)\{updateWhatsAppLink\(\);\}\)/);
  assert.doesNotMatch(js, /window\.open\(href/);
});

test('HTML usa assets versionados v3.4.10 e tem fallback de conteúdo sem JavaScript', function () {
  assert.match(html, /portfolio-general\.css\?v=3\.4\.12/);
  assert.match(html, /portfolio-general\.js\?v=3\.4\.12/);
  assert.match(html, /chat-client\.js\?v=3\.4\.12/);
  assert.match(html, /<noscript><link rel="stylesheet" href="\/css\/no-js\.css"><\/noscript>/);
});


test('inicialização do formulário itera todos os campos sem interromper o JavaScript', function () {
  assert.equal(js.split('\n').some(function (line) { return /^\s+\$('input,textarea,select',form)\.forEach/.test(line); }), false);
  assert.ok(js.includes("$$('input,textarea,select',form).forEach"));
});


test('metadados SEO e arquivos de indexação usam o domínio público de produção', function () {
  assert.match(html, /<link rel="canonical" href="https:\/\/wagnerpersolifilho\.vercel\.app\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/wagnerpersolifilho\.vercel\.app\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/wagnerpersolifilho\.vercel\.app\/og-image\.jpg">/);
  assert.match(html, /"url":"https:\/\/wagnerpersolifilho\.vercel\.app\/"/);
  assert.match(curriculum, /<link rel="canonical" href="https:\/\/wagnerpersolifilho\.vercel\.app\/curriculo\.html">/);
  assert.match(robots, /Sitemap: https:\/\/wagnerpersolifilho\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/wagnerpersolifilho\.vercel\.app\/curriculo\.html/);
  assert.doesNotMatch([html, curriculum, robots, sitemap].join('\n'), /https:\/\/wagnerpersoli\.vercel\.app(?:\/|["<\s])/);
});



test('preloader usa logo oficial, composição compacta e rodapé com duração de cinco segundos', function () {
  assert.ok(html.includes('id="site-preloader-logo"'));
  assert.ok(html.includes('src="/img/logo-wp-oficial.webp"'));
  assert.ok(html.includes('href="/img/logo-wp-oficial.webp" type="image/webp" fetchpriority="high"'));
  assert.ok(html.includes('© 2026 Wagner Persoli Filho. Todos os direitos reservados.'));
  assert.ok(!html.includes('id="site-preloader-video"'), 'preloader deve exibir a marca oficial estática');
  assert.ok(!css.includes('site-preloader-failsafe'), 'nenhum failsafe CSS pode encurtar a duração controlada pelo JavaScript');
  assert.ok(css.includes('@keyframes site-preloader-logo-glow'));
  assert.ok(css.includes('@keyframes site-preloader-copyright-in'));
  assert.ok(css.includes('width:min(30vw,120px)'), 'marca reduzida e centralizada');
  assert.ok(css.includes('WAGNER.OS  /  DIGITAL SYSTEMS'), 'assinatura tipográfica da marca');
  assert.ok(js.includes('preloaderMinDelay=5000,preloaderMaxDelay=5000,preloaderFadeDuration=reduced?0:240'));
  assert.ok(js.includes('Math.min(preloaderMaxDelay,Math.max(preloaderMinDelay,5000))'));
  assert.ok(noJs.includes('.site-preloader{display:none!important}'));
});


test('paleta de referência aplicada apenas às seções abaixo do hero, sem trocar foto, loader ou carrossel', function () {
  var marker = '/* v3.4.12 — paleta inspirada na referência';
  var visualLayer = css.slice(css.indexOf(marker));
  assert.ok(visualLayer.includes('--reference-cyan: #00f3ff'));
  assert.ok(visualLayer.includes('--reference-purple: #9d4edd'));
  assert.ok(visualLayer.includes('--reference-pink: #ff007f'));
  assert.ok(visualLayer.includes('.about-section .value-grid .value-card'));
  assert.ok(visualLayer.includes('.skills-section .skill-tags span:before'));
  assert.ok(visualLayer.includes('.projects-section .projects-carousel .project-card'));
  assert.ok(visualLayer.includes('.contact-section .contact-links>a:nth-child(2)'));
  assert.doesNotMatch(visualLayer, /\.hero\b|\.profile-frame\b|\.site-preloader\b/, 'a nova camada não deve atingir a abertura, o retrato ou a loaderpage');
  assert.ok(html.includes('src="/img/wagner-profile.webp"'), 'mantém a foto de perfil atual');
  assert.ok(html.includes('id="site-preloader"'), 'mantém a loaderpage atual');
  assert.ok(html.includes('id="projetos"') && js.includes('projects-carousel'), 'mantém a seção e a lógica do carrossel de projetos');
});
