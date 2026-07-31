'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var root = path.resolve(__dirname, '..');
var publicRoot = path.join(root, 'public');
var failures = [];
var textFiles = [];
var assetFiles = [];

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (/\.(?:html|css|js|json|txt|svg)$/i.test(entry.name)) textFiles.push(file);
    if (/\.(?:webp|png|jpe?g|svg|pdf|mp4|webm)$/i.test(entry.name)) assetFiles.push(file);
  });
}
walk(publicRoot);
var corpus = textFiles.map(function (file) { return fs.readFileSync(file, 'utf8'); }).join('\n');
var hashes = new Map();
assetFiles.forEach(function (file) {
  var rel = path.relative(publicRoot, file).split(path.sep).join('/');
  var name = path.basename(file);
  if (corpus.indexOf(rel) === -1 && corpus.indexOf(name) === -1) failures.push('asset sem referência: ' + rel);
  var digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (hashes.has(digest)) failures.push('asset duplicado: ' + rel + ' = ' + hashes.get(digest));
  else hashes.set(digest, rel);
});

var refs = [];
textFiles.forEach(function (file) {
  var text = fs.readFileSync(file, 'utf8');
  var matches = text.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g);
  for (var match of matches) refs.push({ source: file, value: match[1] });
});
refs.forEach(function (ref) {
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|about:|blob:)/i.test(ref.value)) return;
  var base = path.dirname(ref.source);
  var target = path.resolve(base, ref.value);
  if (!target.startsWith(publicRoot + path.sep) && target !== publicRoot) return;
  if (!fs.existsSync(target)) failures.push('referência ausente: ' + path.relative(root, ref.source) + ' -> ' + ref.value);
});

if (failures.length) {
  console.error('Asset check falhou:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('Asset check aprovado:', assetFiles.length, 'assets únicos e referenciados.');
