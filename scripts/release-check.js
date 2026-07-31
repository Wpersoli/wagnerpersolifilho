'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var cp = require('child_process');
var root = path.resolve(__dirname, '..');
var failures = [];

function normalize(relativePath) {
  return String(relativePath || '').split(path.sep).join('/').replace(/^\.\//, '');
}

function forbiddenReason(relativePath) {
  var normalized = normalize(relativePath);
  var parts = normalized.split('/').filter(Boolean);
  for (var part of parts) {
    if (part === '.git' || part === '.vercel' || part === 'node_modules') return 'artefato proibido: ' + normalized;
    if (/^\.env(?:\.|$)/.test(part) && part !== '.env.example') return 'arquivo de ambiente proibido: ' + normalized;
  }
  return '';
}

function walkReleaseTree(dir, base, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var absolute = path.join(dir, entry.name);
    var relative = normalize(path.relative(base, absolute));
    var forbidden = forbiddenReason(relative);
    if (forbidden) {
      failures.push(forbidden);
      return;
    }
    if (entry.isDirectory()) return walkReleaseTree(absolute, base, files);
    files.push(relative);
  });
}

function collectAuditedFiles() {
  var gitDir = path.join(root, '.git');
  if (fs.existsSync(gitDir)) {
    try {
      var output = cp.execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      return output.split('\0').filter(Boolean).map(normalize);
    } catch (error) {
      failures.push('não foi possível consultar arquivos rastreados pelo Git: ' + String(error.message || error));
      return [];
    }
  }
  var files = [];
  walkReleaseTree(root, root, files);
  return files;
}

var auditedFiles = collectAuditedFiles();
for (var relative of auditedFiles) {
  var forbidden = forbiddenReason(relative);
  if (forbidden) {
    failures.push(forbidden);
    continue;
  }
  var absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  if (relative === '.env.example' || /CHECKSUMS\.sha256$/i.test(relative) || relative === 'tests' || relative.startsWith('tests/')) continue;
  if (!/\.(?:js|json|html|css|md|txt|yml|yaml)$/i.test(relative)) continue;
  var text = fs.readFileSync(absolute, 'utf8');
  if (/(?:VERCEL_OIDC_TOKEN|GEMINI_API_KEY|BREVO_API_KEY|RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN)\s*=\s*['\"]?(?![<\s]|$)[^\s'\"]+/.test(text)) failures.push('secret potencial: ' + relative);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push('chave privada: ' + relative);
}

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
  console.error('Release bloqueada:\n- ' + Array.from(new Set(failures)).join('\n- '));
  process.exit(1);
}
console.log('Release check aprovado: arquivos versionados/artefato limpos, CSP sincronizada e nenhum secret detectado.');
