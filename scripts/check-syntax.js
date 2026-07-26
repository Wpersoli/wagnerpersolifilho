'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var root = path.resolve(__dirname, '..');
var roots = ['api', 'public/js', 'public/emulador', 'scripts', 'tests'];
var files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.js$/i.test(entry.name)) files.push(file);
  });
}
roots.forEach(function (name) { walk(path.join(root, name)); });
files.sort().forEach(function (file) {
  cp.execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
});
JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'data', 'knowledge.json'), 'utf8'));
console.log('Syntax check aprovado:', files.length, 'arquivos JavaScript e 3 JSONs.');
