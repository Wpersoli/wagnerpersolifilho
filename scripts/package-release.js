'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var root = path.resolve(__dirname, '..');
var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
var parent = path.dirname(root);
var base = path.basename(root);
var output = path.join(parent, 'WAGNER-OS-v' + pkg.version + '-AUDITADO-NOTA-10-APROVADO.zip');
var forbidden = ['.env', '.env.local', '.git', '.vercel', 'node_modules'];
forbidden.forEach(function (name) {
  if (fs.existsSync(path.join(root, name))) throw new Error('Release bloqueada: ' + name + ' presente.');
});
fs.readdirSync(root).forEach(function (name) {
  if (/^\.env(?:\.|$)/.test(name) && name !== '.env.example') throw new Error('Release bloqueada: ' + name + ' presente.');
});
if (fs.existsSync(output)) fs.rmSync(output);
var excludes = ['.git/*', '.vercel/*', 'node_modules/*', '*.zip', 'artifacts/*'];
var args = ['-qr', output, base];
excludes.forEach(function (item) { args.push('-x', base + '/' + item); });
cp.execFileSync('zip', args, { cwd: parent, stdio: 'inherit' });
var listing = cp.execFileSync('unzip', ['-Z1', output], { encoding: 'utf8' }).trim().split(/\r?\n/);
var bad = listing.filter(function (name) {
  return /(?:^|\/)\.(?:git|vercel)(?:\/|$)/.test(name) || /(?:^|\/)node_modules(?:\/|$)/.test(name) || /(?:^|\/)\.env(?:\.|$)/.test(name) && !/\.env\.example$/.test(name);
});
if (bad.length) { fs.rmSync(output); throw new Error('ZIP contém artefatos proibidos: ' + bad.join(', ')); }
if (!listing.some(function (name) { return /CHECKSUMS\.sha256$/.test(name); })) throw new Error('ZIP sem checksums.');
if (!listing.some(function (name) { return /AUDITORIA-APROVADA-10\.md$/.test(name); })) throw new Error('ZIP sem relatório de aprovação.');
console.log('ZIP aprovado:', output, '(' + listing.length + ' entradas, ' + fs.statSync(output).size + ' bytes)');
