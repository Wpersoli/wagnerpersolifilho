'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var root = path.resolve(__dirname, '..');
var output = path.join(root, 'CHECKSUMS.sha256');
var ignored = new Set(['.git', '.vercel', 'node_modules', 'artifacts']);
var files = [];

function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (ignored.has(entry.name)) return;
    var file = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    if (file === output || /\.zip$/i.test(entry.name)) return;
    files.push(file);
  });
}
walk(root);
files.sort(function (a, b) { return a.localeCompare(b); });
var lines = files.map(function (file) {
  var digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return digest + '  ' + path.relative(root, file).split(path.sep).join('/');
});
fs.writeFileSync(output, lines.join('\n') + '\n');
console.log('Checksums gerados:', lines.length, 'arquivos.');
