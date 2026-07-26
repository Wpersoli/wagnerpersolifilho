'use strict';
var cp = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var root = path.resolve(__dirname, '..');
var debugPort = Number(process.env.E2E_DEBUG_PORT || 9223);
var chrome;
var errors = [];

function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

function findChrome() {
  var direct = [
    process.env.CHROME_BIN,
    process.platform === 'win32' && process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'win32' && process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'win32' && process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'win32' && process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.platform === 'win32' && process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);
  for (var i = 0; i < direct.length; i += 1) {
    if (fs.existsSync(direct[i])) return direct[i];
  }
  var commands = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe', 'chromium.exe']
    : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  for (var j = 0; j < commands.length; j += 1) {
    var found = process.platform === 'win32'
      ? cp.spawnSync('where.exe', [commands[j]], { encoding: 'utf8' })
      : cp.spawnSync('sh', ['-lc', 'command -v ' + commands[j]], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim().split(/\r?\n/)[0];
  }
  throw new Error('Chrome, Chromium ou Edge não encontrado. Defina CHROME_BIN.');
}

async function waitFor(url, timeoutMs) {
  var deadline = Date.now() + timeoutMs;
  var last;
  while (Date.now() < deadline) {
    try {
      var response = await fetch(url);
      if (response.ok) return response;
      last = new Error('status ' + response.status);
    } catch (error) { last = error; }
    await sleep(100);
  }
  throw new Error('Timeout aguardando ' + url + ': ' + String(last && last.message || last));
}

function CDP(url) {
  var self = this;
  this.nextId = 1;
  this.pending = new Map();
  this.listeners = new Map();
  this.ready = new Promise(function (resolve, reject) {
    self.socket = new WebSocket(url);
    self.socket.addEventListener('open', resolve, { once: true });
    self.socket.addEventListener('error', reject, { once: true });
    self.socket.addEventListener('message', function (event) {
      var message = JSON.parse(String(event.data));
      if (message.id && self.pending.has(message.id)) {
        var pending = self.pending.get(message.id);
        self.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method && self.listeners.has(message.method)) {
        self.listeners.get(message.method).slice().forEach(function (listener) { listener(message.params || {}); });
      }
    });
  });
}
CDP.prototype.send = async function (method, params) {
  await this.ready;
  var id = this.nextId++;
  var self = this;
  var promise = new Promise(function (resolve, reject) { self.pending.set(id, { resolve: resolve, reject: reject }); });
  this.socket.send(JSON.stringify({ id: id, method: method, params: params || {} }));
  return promise;
};
CDP.prototype.on = function (name, listener) {
  if (!this.listeners.has(name)) this.listeners.set(name, []);
  this.listeners.get(name).push(listener);
};
CDP.prototype.once = function (name, timeoutMs) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('Timeout no evento ' + name)); }, timeoutMs || 10000);
    function listener(params) {
      clearTimeout(timer);
      var list = self.listeners.get(name) || [];
      self.listeners.set(name, list.filter(function (item) { return item !== listener; }));
      resolve(params);
    }
    self.on(name, listener);
  });
};
CDP.prototype.evaluate = async function (expression) {
  var result = await this.send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Erro ao avaliar JavaScript');
  return result.result ? result.result.value : undefined;
};
CDP.prototype.close = function () { if (this.socket) this.socket.close(); };

async function navigate(cdp, url) {
  var loaded = cdp.once('Page.loadEventFired', 15000);
  await cdp.send('Page.navigate', { url: url });
  await loaded;
}

function buildTestHtml() {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'public', 'css', 'app.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
  html = html.replace(/<link[^>]+(?:fonts\.googleapis|preconnect|rel="preload")[^>]*>/gi, '');
  html = html.replace(/<link rel="stylesheet" href="css\/app\.css">/i, '<style id="e2e-app-css">' + css + '</style>');
  html = html.replace(/<script src="[^"]+" defer><\/script>/g, '');
  return html;
}

function loadRuntimeScripts(cdp) {
  var files = ['performance-safe.js', 'main.js', 'hero-effects.js', 'hero-fidelity.js', 'hero-motion.js'];
  return files.reduce(function (promise, name) {
    return promise.then(function () {
      var code = fs.readFileSync(path.join(root, 'public', 'js', name), 'utf8');
      var expression = '(function(){var s=document.createElement("script");s.textContent=' + JSON.stringify(code) + ';document.body.appendChild(s);return true;}())';
      return cdp.evaluate(expression);
    });
  }, Promise.resolve());
}

async function setDocument(cdp, html) {
  var tree = await cdp.send('Page.getFrameTree');
  var frameId = tree.frameTree.frame.id;
  await cdp.send('Page.setDocumentContent', { frameId: frameId, html: html });
  await sleep(100);
  await loadRuntimeScripts(cdp);
  await sleep(150);
}

async function run() {
  var chromeBin = findChrome();
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wagner-e2e-'));
  chrome = cp.spawn(chromeBin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--allow-file-access-from-files', '--disable-background-networking',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile,
    '--window-size=1440,900', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  await waitFor('http://127.0.0.1:' + debugPort + '/json/version', 10000);
  var targetResponse = await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' });
  var target = await targetResponse.json();
  var cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Log.enable')]);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  cdp.on('Runtime.exceptionThrown', function (event) { errors.push('exception: ' + JSON.stringify(event.exceptionDetails)); });
  cdp.on('Log.entryAdded', function (event) {
    var entry = event.entry || {};
    if (entry.level === 'error' && entry.source === 'javascript') errors.push('console: ' + entry.text);
  });

  var testHtml = buildTestHtml();
  await setDocument(cdp, testHtml);
  await cdp.evaluate("document.getElementById('bootSkip')?.click()");
  await sleep(500);

  var desktop = await cdp.evaluate(`(() => {
    const visible = id => { const el=document.getElementById(id); if(!el) return false; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'; };
    return {
      width: innerWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 2,
      header: visible('pmodeBtn') && visible('burgerBtn') === false,
      hero: visible('heroFidelityStage'),
      cv: !!document.querySelector('a[href="curriculo.html"]'),
      whatsapp: document.getElementById('fabWhats')?.href.includes('wa.me/5511981504061'),
      appCss: !!document.getElementById('e2e-app-css')
    };
  })()`);
  assert(desktop.noHorizontalOverflow, 'Desktop possui overflow horizontal.');
  assert(desktop.header, 'Topo desktop ou botão apresentação não está visível.');
  assert(desktop.hero && desktop.cv && desktop.whatsapp && desktop.appCss, 'Contrato visual desktop incompleto.');

  await cdp.evaluate('window.scrollTo(0,0)');
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 720, y: 500, deltaX: 0, deltaY: 720 });
  await sleep(450);
  var scroll = await cdp.evaluate(`({ y: scrollY, overflow: getComputedStyle(document.body).overflowY, diagnostics: window.WagnerScrollDiagnostics?.getState() })`);
  assert(scroll.y > 120, 'A roda do mouse não deslocou a página de forma efetiva.');
  assert(scroll.overflow !== 'hidden', 'Scroll global ficou bloqueado.');
  assert(scroll.diagnostics && scroll.diagnostics.nativeWheel === true, 'Diagnóstico de scroll nativo ausente.');

  await cdp.evaluate(`window.fetch = async function () { return { ok:true, status:200, json:async function(){ return { content:[{type:'text',text:'Projetos do Wagner: Device Simulator Engine, AI Systems & Automation e Premium Dashboards.'}] }; } }; };`);
  await cdp.evaluate("document.getElementById('fabChat').click()");
  await sleep(250);
  var chatOpen = await cdp.evaluate(`(() => { const p=document.getElementById('chatPanel'); return p.classList.contains('open') && p.getAttribute('aria-hidden')==='false' && !p.inert; })()`);
  assert(chatOpen, 'Chat não abriu.');
  await cdp.evaluate(`(() => { const i=document.getElementById('chatInput'); i.value='Quais são os projetos do Wagner?'; i.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('chatSend').click(); })()`);
  await sleep(450);
  var chatReply = await cdp.evaluate(`document.getElementById('chatBody').textContent`);
  assert(/projet|Device Simulator|Wagner/i.test(chatReply), 'Chat não apresentou resposta.');
  await cdp.evaluate("document.getElementById('chatClose').click()");
  await sleep(150);
  assert(await cdp.evaluate("document.getElementById('chatPanel').getAttribute('aria-hidden')==='true'"), 'Chat não fechou.');

  await cdp.evaluate("window.scrollTo(0,0); document.getElementById('pmodeBtn').click()");
  await sleep(1500);
  assert(await cdp.evaluate("document.body.classList.contains('pmode-active') && !!document.getElementById('pmExit')"), 'Modo apresentação não iniciou.');
  await cdp.evaluate("document.getElementById('pmExit').click()");
  await sleep(100);
  await cdp.evaluate("document.getElementById('pmModalExit').click()");
  await sleep(250);
  assert(await cdp.evaluate("!document.body.classList.contains('pmode-active') && getComputedStyle(document.body).overflowY !== 'hidden'"), 'Modo apresentação não encerrou corretamente.');

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await setDocument(cdp, testHtml);
  await cdp.evaluate("document.getElementById('bootSkip')?.click()");
  await sleep(500);
  var mobileBefore = await cdp.evaluate(`(() => { const b=document.getElementById('burgerBtn'); const r=b.getBoundingClientRect(); return { burger:r.width>0&&r.height>0, overflow:document.documentElement.scrollWidth<=innerWidth+2 }; })()`);
  assert(mobileBefore.burger && mobileBefore.overflow, 'Layout mobile inválido ou menu ausente.');
  await cdp.evaluate("document.getElementById('burgerBtn').click()");
  await sleep(180);
  assert(await cdp.evaluate("document.getElementById('mobileNav').classList.contains('open') && document.getElementById('mobileNav').getAttribute('aria-hidden')==='false'"), 'Menu mobile não abriu.');
  await cdp.evaluate("document.getElementById('mobileNavClose').click()");
  await sleep(120);
  assert(await cdp.evaluate("!document.getElementById('mobileNav').classList.contains('open')"), 'Menu mobile não fechou.');

  assert(errors.length === 0, 'Erros JavaScript detectados no navegador:\n' + errors.join('\n'));
  cdp.close();
  console.log('E2E aprovado: desktop, wheel scroll, chat, apresentação, WhatsApp/CV e menu mobile.');
}

run().catch(function (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(function () {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM');
});
