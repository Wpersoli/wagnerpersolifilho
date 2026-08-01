'use strict';

var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
var failures = [];
var ignoredDirectories = new Set(['.git', '.vercel', 'node_modules', 'artifacts']);
var textExtensions = new Set(['.js', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.sql']);

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
    if (ignoredDirectories.has(entry.name)) return;
    var absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) return;
    var relative = path.relative(root, absolute).split(path.sep).join('/');
    var text = fs.readFileSync(absolute, 'utf8');
    var codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

    if (/\beval\s*\(/.test(codeOnly)) failures.push(relative + ': eval proibido');
    if (/\bnew\s+Function\s*\(/.test(codeOnly)) failures.push(relative + ': new Function proibido');
    if (/document\.write\s*\(/.test(codeOnly)) failures.push(relative + ': document.write proibido');
    if (/\u0000/.test(text)) failures.push(relative + ': byte NUL proibido');

    if (/\.html$/i.test(relative)) {
      if (/\son[a-z]+\s*=/i.test(text)) failures.push(relative + ': handler inline proibido');
      if (/\sstyle\s*=/i.test(text)) failures.push(relative + ': style inline proibido');
      if (/<script(?![^>]*type="application\/ld\+json")[^>]*>(?!\s*<\/script>)[\s\S]*?<\/script>/i.test(text)) {
        failures.push(relative + ': script inline executável proibido');
      }
    }
  });
}

walk(root);

for (var forbidden of [
  'public/img/hero-fidelity-master.webp.webp',
  'public/img/hero-fidelity-master.webp.jpg',
  'public/js/hero-effects.js.bak',
  'src/styles/premium-uniform-v330.css.bak'
]) {
  if (fs.existsSync(path.join(root, forbidden))) failures.push(forbidden + ': resíduo duplicado proibido');
}

if (failures.length) {
  console.error('Lint bloqueado:\n- ' + Array.from(new Set(failures)).join('\n- '));
  process.exit(1);
}

console.log('Lint aprovado: sem código dinâmico inseguro, handlers inline ou resíduos duplicados.');
