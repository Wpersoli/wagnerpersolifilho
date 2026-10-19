'use strict';
var cp = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');
var root = path.resolve(__dirname, '..');
var port = 0;
var chrome;
var errors = [];
var sleep = function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };
function assert(condition, message) { if (!condition) throw new Error(message); }
async function waitForExpression(cdp, expression, timeout, message) {
  var deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await cdp.evaluate(expression)) return;
    await sleep(50);
  }
  throw new Error(message + ' (timeout ' + timeout + 'ms)');
}
function findChrome() {
  var candidates = [process.env.CHROME_BIN, process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'), process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe')].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) if (fs.existsSync(candidates[i])) return candidates[i];
  if (process.env.CHROME_BIN && /^[A-Za-z0-9._-]+$/.test(process.env.CHROME_BIN) && !fs.existsSync(process.env.CHROME_BIN)) { var configured = cp.spawnSync('sh', ['-lc', 'command -v ' + process.env.CHROME_BIN], { encoding: 'utf8' }); if (configured.status === 0 && configured.stdout.trim()) return configured.stdout.trim().split(/\r?\n/)[0]; }
  var commands = process.platform === 'win32' ? ['chrome.exe', 'msedge.exe', 'chromium.exe'] : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (var j = 0; j < commands.length; j++) {
    var found = process.platform === 'win32' ? cp.spawnSync('where.exe', [commands[j]], { encoding: 'utf8' }) : cp.spawnSync('sh', ['-lc', 'command -v ' + commands[j]], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim().split(/\r?\n/)[0];
  }
  throw new Error('Chrome, Chromium ou Edge não encontrado para o teste responsivo.');
}
async function waitFor(url, timeout) {
  var end = Date.now() + timeout, last;
  while (Date.now() < end) { try { var r = await fetch(url); if (r.ok) return r; last = new Error('HTTP ' + r.status); } catch (e) { last = e; } await sleep(100); }
  throw new Error('Timeout aguardando navegador: ' + String(last && last.message || last));
}
function CDP(url) {
  var self = this; this.id = 0; this.pending = new Map(); this.listeners = new Map();
  this.ready = new Promise(function (resolve, reject) {
    self.ws = new WebSocket(url); self.ws.addEventListener('open', resolve, { once: true }); self.ws.addEventListener('error', reject, { once: true });
    self.ws.addEventListener('message', function (event) { var m = JSON.parse(String(event.data)); if (m.id && self.pending.has(m.id)) { var p = self.pending.get(m.id); self.pending.delete(m.id); if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result || {}); } else if (m.method && self.listeners.has(m.method)) self.listeners.get(m.method).forEach(function (fn) { fn(m.params || {}); }); });
  });
}
CDP.prototype.send = async function (method, params) { await this.ready; var id = ++this.id, self = this; var promise = new Promise(function (resolve, reject) { self.pending.set(id, { resolve: resolve, reject: reject }); }); this.ws.send(JSON.stringify({ id: id, method: method, params: params || {} })); return promise; };
CDP.prototype.on = function (name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(fn); };
CDP.prototype.evaluate = async function (expression) { var r = await this.send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'Erro de JavaScript no navegador'); return r.result ? r.result.value : undefined; };
CDP.prototype.close = function () { if (this.ws) this.ws.close(); };
function buildHtml() {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'public', 'css', 'portfolio-general.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
  html = html.replace(/<link rel="stylesheet" href="\/css\/portfolio-general\.css">/i, '<style id="e2e-portfolio-css">' + css + '</style>');
  html = html.replace(/<script src="\/js\/(?:chat-client|portfolio-general)\.js" defer><\/script>/g, '');
  var placeholder = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22480%22 height=%22270%22 viewBox=%220 0 480 270%22%3E%3Crect width=%22480%22 height=%22270%22 fill=%22%230d1424%22/%3E%3Ccircle cx=%22240%22 cy=%22135%22 r=%2270%22 fill=%22%2356e8f7%22 fill-opacity=%22.18%22/%3E%3C/svg%3E';
  html = html.replace(/src="\/img\/[^"]+"/g, 'src="' + placeholder + '"').replace(/src="https:\/\/raw\.githubusercontent\.com\/[^"]+"/g, 'src="' + placeholder + '"');
  return html;
}
async function setPage(cdp, html, js) {
  var tree = await cdp.send('Page.getFrameTree');
  await cdp.send('Page.setDocumentContent', { frameId: tree.frameTree.frame.id, html: html });
  await sleep(100);
  await cdp.evaluate("window.fetch = async function(url, options){ if(String(url).indexOf('/api/contact')===0) return {ok:true,status:200,json:async function(){return {message:'CONTACT_TEST_OK'};}}; return {ok:false,status:404,json:async function(){return {};}}; }; window.WagnerChatClient={request:async function(){return {text:'CHAT_TEST_OK'};}};");
  await cdp.evaluate('(function(){var s=document.createElement("script");s.textContent=' + JSON.stringify(js) + ';document.body.appendChild(s);return true;}())');
  await sleep(200);
}
async function screenshot(cdp, name) {
  var dir = path.join(root, 'artifacts', 'visual-audit'); fs.mkdirSync(dir, { recursive: true });
  var r = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(path.join(dir, name), Buffer.from(r.data, 'base64'));
}
async function run() {
  var html = buildHtml(), js = fs.readFileSync(path.join(root, 'public', 'js', 'portfolio-general.js'), 'utf8');
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-general-e2e-'));
  var chromeBin = findChrome();
  console.log('Chrome binary:', chromeBin, 'starting isolated debugging session');
  chrome = cp.spawn(chromeBin, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1440,900','about:blank'], { stdio:['ignore','ignore','inherit'], detached:process.platform!=='win32', windowsHide:true });
  var activePortFile = path.join(profile, 'DevToolsActivePort');
  var activeDeadline = Date.now() + 12000;
  while (!fs.existsSync(activePortFile) && Date.now() < activeDeadline) await sleep(100);
  if (!fs.existsSync(activePortFile)) throw new Error('Chrome não criou DevToolsActivePort.');
  port = Number(fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0]);
  await waitFor('http://127.0.0.1:'+port+'/json/version', 12000);
  var target = await (await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();
  var cdp = new CDP(target.webSocketDebuggerUrl); await cdp.ready;
  await Promise.all([cdp.send('Page.enable'),cdp.send('Runtime.enable'),cdp.send('Log.enable')]);
  cdp.on('Runtime.exceptionThrown', function(e){errors.push((e.exceptionDetails&&e.exceptionDetails.text)||'exception JavaScript');});
  cdp.on('Log.entryAdded', function(e){if(e.entry&&e.entry.level==='error'&&e.entry.source==='javascript')errors.push(e.entry.text);});
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await setPage(cdp,html,js);
  var desktop=await cdp.evaluate("({overflow:document.documentElement.scrollWidth<=innerWidth+2,hero:!!document.querySelector('.hero h1'),projects:document.querySelectorAll('.project-card:not([data-clone])').length,form:!!document.getElementById('contact-form'),chat:!!document.getElementById('chat-toggle'),cv:!!document.querySelector('a[href=\"/curriculo.html\"]')})");
  assert(desktop.overflow,'Overflow horizontal no desktop.'); assert(desktop.hero&&desktop.projects===2&&desktop.form&&desktop.chat&&desktop.cv,'Elementos principais do portfólio ausentes.');
  if(process.env.PORTFOLIO_SCREENSHOTS==='1')await screenshot(cdp,'portfolio-desktop.png');
  var widths=[320,360,390,430,760,761,1024,1280,1919,2560];
  for(var i=0;i<widths.length;i++){
    var w=widths[i];await cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:w<761?844:900,deviceScaleFactor:1,mobile:w<=760});await sleep(100);
    var report=await cdp.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+2,hero:!!document.querySelector('.hero h1')})");
    assert(!report.overflow,'Overflow horizontal em '+w+'px ('+report.scroll+'px de conteúdo).');assert(report.hero,'Hero ausente em '+w+'px.');
  }
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
  await cdp.evaluate("document.getElementById('menu-toggle').click()");
  assert(await cdp.evaluate("document.getElementById('site-nav').classList.contains('is-open')&&document.getElementById('menu-toggle').getAttribute('aria-expanded')==='true'"),'Menu mobile não abriu.');
  await cdp.evaluate("document.querySelector('.site-nav a').click()");
  assert(await cdp.evaluate("!document.getElementById('site-nav').classList.contains('is-open')"),'Menu mobile não fechou após navegação.');
  await cdp.evaluate("document.getElementById('chat-toggle').click()");
  await cdp.evaluate("document.getElementById('chat-input').value='Teste de chat';document.getElementById('chat-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  await waitForExpression(cdp, "document.getElementById('chat-messages').textContent.includes('CHAT_TEST_OK')", 3000, 'Chat não retornou a resposta simulada.');
  await cdp.evaluate("document.getElementById('chat-close').click()");
  assert(await cdp.evaluate("document.getElementById('chat-panel').getAttribute('aria-hidden')==='true'"),'Chat não fechou.');
  await cdp.evaluate("var f=document.getElementById('contact-form');f.elements.name.value='Teste';f.elements.email.value='teste@example.com';f.elements.subject.value='Teste automatizado';f.elements.message.value='Mensagem de teste';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  await waitForExpression(cdp, "document.getElementById('form-status').textContent.includes('CONTACT_TEST_OK')", 3000, 'Formulário não exibiu confirmação simulada.');
  if(process.env.PORTFOLIO_SCREENSHOTS==='1'){await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cdp.evaluate('window.scrollTo(0,0)');await sleep(180);await screenshot(cdp,'portfolio-mobile.png');}
  assert(errors.length===0,'Erros JavaScript no navegador: '+errors.join(' | '));
  cdp.close();
  console.log('E2E aprovado: 10 larguras (320–2560px), menu mobile, chat, formulário, links e ausência de overflow.');
}
run().catch(function(e){console.error(e.stack||e);process.exitCode=1;}).finally(function(){if(chrome&&chrome.pid){try{if(process.platform==='win32')cp.spawnSync('taskkill.exe',['/PID',String(chrome.pid),'/T','/F'],{stdio:'ignore'});else process.kill(-chrome.pid,'SIGKILL');}catch(_){try{chrome.kill('SIGKILL');}catch(__){}}}});
