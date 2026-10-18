'use strict';
var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
var result = cp.spawnSync(process.execPath, [path.join(__dirname, 'e2e-general.js')], {
  cwd: root,
  env: Object.assign({}, process.env, { PORTFOLIO_SCREENSHOTS: '1' }),
  stdio: 'inherit',
  timeout: 120000
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
var dir = path.join(root, 'artifacts', 'visual-audit');
['portfolio-desktop.png', 'portfolio-mobile.png'].forEach(function (name) {
  var file = path.join(dir, name);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) throw new Error('Screenshot visual ausente ou incompleto: ' + name);
});
console.log('Auditoria visual aprovada: screenshots desktop e mobile gerados em artifacts/visual-audit.');
