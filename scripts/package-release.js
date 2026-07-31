'use strict';
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var os = require('os');
var root = path.resolve(__dirname, '..');
var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
var parent = path.dirname(root);
var base = path.basename(root);
var output = path.join(parent, 'WAGNER-OS-v' + pkg.version + '-AUDITADO-NOTA-10-APROVADO.zip');
var stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wagner-release-'));
var stageProject = path.join(stageRoot, base);
var forbiddenNames = new Set(['.git', '.vercel', 'node_modules', 'artifacts']);

function isForbidden(name) {
  return forbiddenNames.has(name) || /^\.env(?:\.|$)/.test(name) && name !== '.env.example' || /\.zip$/i.test(name);
}

function copyClean(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  fs.readdirSync(source, { withFileTypes: true }).forEach(function (entry) {
    if (isForbidden(entry.name)) return;
    var from = path.join(source, entry.name);
    var to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyClean(from, to);
    else fs.copyFileSync(from, to);
  });
}

function listFiles(dir, baseDir, outputList) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var absolute = path.join(dir, entry.name);
    var relative = path.relative(baseDir, absolute).split(path.sep).join('/');
    outputList.push(relative + (entry.isDirectory() ? '/' : ''));
    if (entry.isDirectory()) listFiles(absolute, baseDir, outputList);
  });
}

try {
  copyClean(root, stageProject);
  var listing = [];
  listFiles(stageProject, stageRoot, listing);
  var bad = listing.filter(function (name) {
    return /(?:^|\/)\.(?:git|vercel)(?:\/|$)/.test(name) || /(?:^|\/)node_modules(?:\/|$)/.test(name) || /(?:^|\/)\.env(?:\.|$)/.test(name) && !/\.env\.example$/.test(name);
  });
  if (bad.length) throw new Error('Staging contém artefatos proibidos: ' + bad.join(', '));
  if (!listing.some(function (name) { return /CHECKSUMS\.sha256$/.test(name); })) throw new Error('Staging sem checksums.');
  if (!listing.some(function (name) { return /AUDITORIA-APROVADA-10\.md$/.test(name); })) throw new Error('Staging sem relatório de aprovação.');

  if (fs.existsSync(output)) fs.rmSync(output, { force: true });
  if (process.platform === 'win32') {
    var escapedSource = stageProject.replace(/'/g, "''");
    var escapedOutput = output.replace(/'/g, "''");
    cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Compress-Archive -LiteralPath '" + escapedSource + "' -DestinationPath '" + escapedOutput + "' -CompressionLevel Optimal -Force"], { stdio: 'inherit' });
  } else {
    cp.execFileSync('zip', ['-qr', output, base], { cwd: stageRoot, stdio: 'inherit' });
  }
  if (!fs.existsSync(output) || fs.statSync(output).size < 1024) throw new Error('ZIP não foi criado corretamente.');
  console.log('ZIP aprovado:', output, '(' + listing.length + ' entradas, ' + fs.statSync(output).size + ' bytes)');
} finally {
  fs.rmSync(stageRoot, { recursive: true, force: true });
}
