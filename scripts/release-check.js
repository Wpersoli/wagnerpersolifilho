'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var root = path.resolve(__dirname, '..');
var failures = [];
var forbidden = ['.env', '.env.local', '.vercel', '.git', 'node_modules'];
forbidden.forEach(function (name) {
  if (fs.existsSync(path.join(root, name))) failures.push('artefato proibido: ' + name);
});
fs.readdirSync(root).forEach(function (name) {
  if (/^\.env(?:\.|$)/.test(name) && name !== '.env.example') failures.push('arquivo de ambiente proibido: ' + name);
});

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'tests') return;
    var file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (entry.name === '.env.example' || /CHECKSUMS\.sha256$/i.test(entry.name)) return;
    if (!/\.(?:js|json|html|css|md|txt|yml|yaml)$/i.test(entry.name)) return;
    var text = fs.readFileSync(file, 'utf8');
    var rel = path.relative(root, file);
    if (/(?:VERCEL_OIDC_TOKEN|GEMINI_API_KEY|RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN)\s*=\s*['\"]?(?![<\s]|$)[^\s'\"]+/.test(text)) failures.push('secret potencial: ' + rel);
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push('chave privada: ' + rel);
  });
}
walk(root);

var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
var index = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
if (index.indexOf('BUILD <b>v' + pkg.version + '</b>') === -1) failures.push('versão do HUD não corresponde ao package.json');
if (!/href="css\/app\.css"/.test(index)) failures.push('bundle CSS app.css não carregado');
if (/href="css\/(?:main|cyber|hero-|wagner-|performance-safe)[^"]*\.css"/.test(index)) failures.push('CSS legado carregado diretamente no index');
if (/\son[a-z]+\s*=/i.test(index)) failures.push('handler inline no index.html');
if (/\sstyle\s*=/i.test(index)) failures.push('style inline no index.html');

var config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
var serialized = JSON.stringify(config);
if (!/script-src 'self' 'sha256-/.test(serialized)) failures.push('CSP sem hash do JSON-LD');
if (/script-src[^;]*unsafe-inline/.test(serialized)) failures.push('CSP permite script unsafe-inline');
if (!/style-src-attr 'unsafe-inline'/.test(serialized)) failures.push('CSP precisa permitir estilos dinâmicos usados pelos efeitos');
if (/immutable/.test(serialized)) failures.push('cache immutable proibido para assets com nomes estáveis');
if (!/stale-while-revalidate/.test(serialized)) failures.push('cache sem revalidação em segundo plano');

var match = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (!match) failures.push('JSON-LD ausente');
else {
  var hash = crypto.createHash('sha256').update(match[1]).digest('base64');
  if (serialized.indexOf('sha256-' + hash) === -1) failures.push('hash CSP do JSON-LD desatualizado');
}

if (failures.length) {
  console.error('Release bloqueada:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Release check aprovado: árvore limpa, CSP sincronizada e nenhum secret detectado.');
