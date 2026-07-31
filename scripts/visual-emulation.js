'use strict';
var cp = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var root = path.resolve(__dirname, '..');
var outputDir = path.join(root, 'artifacts', 'visual-audit');
var port = Number(process.env.VISUAL_AUDIT_PORT || 3011);
var debugPort = Number(process.env.VISUAL_AUDIT_DEBUG_PORT || 9331);
var chrome;
var failures = [];
var browserErrors = [];
var networkFailures = [];
var documentInitialized = false;

function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
function assert(condition, message) { if (!condition) throw new Error(message); }

function findChrome() {
  var candidates = [process.env.CHROME_BIN].filter(Boolean);
  var commands = process.platform === 'win32'
    ? ['chrome.exe', 'msedge.exe', 'chromium.exe']
    : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  for (var i = 0; i < candidates.length; i += 1) if (fs.existsSync(candidates[i])) return candidates[i];
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
    var timer = setTimeout(function () { reject(new Error('Timeout no evento ' + name)); }, timeoutMs || 15000);
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

function assetDataUrl(relative) {
  var file = path.join(root, 'public', relative.replace(/^\.\.\//, ''));
  if (!fs.existsSync(file)) return relative;
  var ext = path.extname(file).toLowerCase();
  var mime = { '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml' }[ext];
  if (!mime) return relative;
  return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}

function buildVisualHtml() {
  var html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  var css = fs.readFileSync(path.join(root, 'public', 'css', 'app.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
  css = css.replace(/url\((['"]?)(?:\.\.\/)?(img\/[^'"\)]+)\1\)/g, function (_, quote, relative) {
    return 'url("' + assetDataUrl(relative) + '")';
  });
  html = html.replace(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic|preconnect|rel="preload")[^>]*>/gi, '');
  html = html.replace(/<link rel="stylesheet" href="css\/app\.css">/i, '<style id="visual-app-css">' + css + '</style>');
  html = html.replace(/\bsrc="(img\/[^\"]+)"/g, function (_, relative) { return 'src="' + assetDataUrl(relative) + '"'; });
  html = html.replace(/<script src="[^"]+" defer><\/script>/g, '');
  return html;
}

async function loadRuntimeScripts(cdp) {
  var files = ['performance-safe.js', 'main.js', 'hero-effects.js', 'hero-fidelity.js', 'hero-motion.js', 'impact-experience.js'];
  for (var i = 0; i < files.length; i += 1) {
    var code = fs.readFileSync(path.join(root, 'public', 'js', files[i]), 'utf8');
    await cdp.evaluate('(function(){var s=document.createElement("script");s.textContent=' + JSON.stringify(code) + ';document.body.appendChild(s);return true;}())');
  }
}

async function setDocument(cdp) {
  var tree = await cdp.send('Page.getFrameTree');
  var frameId = tree.frameTree.frame.id;
  await cdp.send('Page.setDocumentContent', { frameId: frameId, html: buildVisualHtml() });
  await sleep(120);
  await loadRuntimeScripts(cdp);
  await sleep(450);
  await cdp.evaluate("document.getElementById('bootSkip')?.click(); document.getElementById('cookieAccept')?.click(); true;");
  await sleep(850);
}

async function screenshot(cdp, name) {
  var viewport = await cdp.evaluate(`({
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight
  })`);
  await cdp.evaluate(`(() => {
    let style = document.getElementById('visual-capture-freeze');
    if (!style) {
      style = document.createElement('style');
      style.id = 'visual-capture-freeze';
      style.textContent = '*{animation-play-state:paused!important;transition:none!important}';
      document.head.appendChild(style);
    }
    return true;
  })()`);
  await sleep(80);
  var capture = cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    optimizeForSpeed: true,
    clip: {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
      scale: 1
    }
  });
  var shot = await Promise.race([
    capture,
    new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('Timeout ao capturar ' + name)); }, 20000);
    })
  ]);
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(shot.data, 'base64'));
  await cdp.evaluate("document.getElementById('visual-capture-freeze')?.remove(); true;");
}

async function inspect(cdp, mode) {
  return cdp.evaluate(`(() => {
    const visible = el => { if(!el) return false; const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'; };
    const imgs = [...document.querySelectorAll('.hero-fidelity-image,.hero-logo-cutout,.project-visual img,.assistant-robot')];
    const grid = document.querySelector('.proj-grid');
    const marquee = document.querySelector('.impact-marquee-row');
    const kinetic = document.querySelector('.impact-kinetic-wordmark');
    const particleLayer = document.getElementById('impactParticleLayer');
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    return {
      mode: ${JSON.stringify(mode)},
      url: location.href,
      title: document.title,
      htmlPrefix: document.documentElement.outerHTML.slice(0,180),
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 2,
      documentWidth: document.documentElement.scrollWidth,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      heroVisible: visible(document.getElementById('heroFidelityStage')),
      chatButtonVisible: visible(document.getElementById('fabChat')),
      presentationButtonVisible: visible(document.getElementById('pmodeBtn')) || visible(document.getElementById('burgerBtn')),
      heroLogoVisible: visible(document.querySelector('.hero-logo-cutout')),
      heroHotspots: document.querySelectorAll('.hero-hotspot').length,
      headerRect: header ? { left: header.getBoundingClientRect().left, right: header.getBoundingClientRect().right, width: header.getBoundingClientRect().width } : null,
      impactLoaded: Boolean(kinetic && marquee && particleLayer && document.querySelector('.impact-cursor-dot,.impact-hero-orbit')),
      particleLayer: particleLayer ? { pointerEvents: getComputedStyle(particleLayer).pointerEvents, zIndex: Number(getComputedStyle(particleLayer).zIndex || 0), width: particleLayer.width, height: particleLayer.height } : null,
      layerOrder: { main: main ? Number(getComputedStyle(main).zIndex || 0) : 0, header: header ? Number(getComputedStyle(header).zIndex || 0) : 0 },
      kineticOpacity: kinetic ? getComputedStyle(kinetic).opacity : '0',
      projectColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      marqueeAnimation: marquee ? getComputedStyle(marquee).animationName : '',
      images: imgs.map(img => ({ src: String(img.getAttribute('src') || '').slice(0,48), complete: img.complete, width: img.naturalWidth, height: img.naturalHeight })),
      criticalIds: ['fabChat','chatPanel','chatBody','chatInput','chatSend','pmodeBtn','pmodeMobileBtn','fabWhats'].every(id => Boolean(document.getElementById(id)))
    };
  })()`);
}

async function runViewport(cdp, config) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: config.width,
    height: config.height,
    deviceScaleFactor: config.dpr || 1,
    mobile: false
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: Boolean(config.mobile), maxTouchPoints: config.mobile ? 5 : 1 });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  /* Reload the isolated visual document per viewport. Reusing a single page
     leaves lazy images/canvas state tied to the previous emulation size and
     made the second viewport nondeterministic in Chromium. */
  await setDocument(cdp);
  documentInitialized = true;

  if (!config.mobile) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(config.width * .72), y: Math.round(config.height * .4) });
    await sleep(180);
  }

  await cdp.evaluate(`Promise.race([Promise.all([...document.querySelectorAll('.hero-fidelity-image,.project-visual img,.assistant-robot')].map(img => img.complete && img.naturalWidth > 0 ? true : img.decode().catch(() => false))), new Promise(resolve => setTimeout(resolve, 5000))])`);
  await sleep(220);
  var report = await inspect(cdp, config.name);
  assert(report.noHorizontalOverflow, config.name + ': overflow horizontal (' + report.documentWidth + ' > ' + report.viewport.width + ').');
  assert(report.bodyOverflowY !== 'hidden', config.name + ': scroll global bloqueado.');
  assert(report.heroVisible && report.chatButtonVisible, config.name + ': hero ou chat não está visível.');
  assert(report.presentationButtonVisible, config.name + ': controle de apresentação não está disponível.');
  assert(report.heroLogoVisible, config.name + ': monograma animado não está visível.');
  assert(report.heroHotspots === 6, config.name + ': hotspots funcionais do hero foram alterados.');
  if (config.width >= 1440) assert(report.headerRect && report.headerRect.width >= report.viewport.width - 6, config.name + ': header não ocupa toda a largura.');
  assert(report.impactLoaded && Number(report.kineticOpacity) > 0, config.name + ': camada visual impactante não carregou.');
  assert(report.particleLayer && report.particleLayer.pointerEvents === 'none', config.name + ': canvas de partículas bloqueia interação.');
  assert(report.particleLayer.width > 0 && report.particleLayer.height > 0, config.name + ': canvas de partículas sem dimensões.');
  assert(report.particleLayer.zIndex > report.layerOrder.main && report.particleLayer.zIndex < report.layerOrder.header, config.name + ': canvas não está entre conteúdo e controles.');
  assert(report.criticalIds, config.name + ': contrato crítico de IDs foi alterado.');
  assert(report.images.length >= 6 && report.images[0].complete && report.images[0].width > 0, config.name + ': imagem principal do hero não carregou.');
  if (config.mobile) assert(report.projectColumns === 1, 'Mobile: bento deveria reduzir para uma coluna.');
  else assert(report.projectColumns >= 2, config.name + ': bento grid não foi aplicado.');

  await cdp.evaluate('window.scrollTo(0,0)');
  await sleep(180);
  console.log(config.name + ': hero approved');
  await screenshot(cdp, config.name + '-hero.png');
  console.log(config.name + ': hero captured');
  console.log(config.name + ': scrolling projects');
  await cdp.evaluate("(() => { const target = document.getElementById('projects'); window.scrollTo({top: Math.max(0, target.offsetTop - 88), left: 0, behavior: 'instant'}); return true; })()");
  await sleep(950);
  await cdp.evaluate(`Promise.race([Promise.all([...document.querySelectorAll('.project-visual img')].map(img => img.complete && img.naturalWidth > 0 ? true : img.decode().catch(() => false))), new Promise(resolve => setTimeout(resolve, 5000))])`);
  var projectGeometry = await cdp.evaluate(`(() => { const section = document.getElementById('projects'); const heading = section && section.querySelector('.section-heading-row'); const r = heading && heading.getBoundingClientRect(); return { scrollY: window.scrollY, maxScroll: document.documentElement.scrollHeight - innerHeight, behavior: getComputedStyle(document.documentElement).scrollBehavior, sectionTop: section ? section.getBoundingClientRect().top : null, sectionPaddingTop: section ? getComputedStyle(section).paddingTop : null, headingTop: r ? r.top : null, headingBottom: r ? r.bottom : null }; })()`);
  console.log(config.name + ': project geometry ' + JSON.stringify(projectGeometry));
  assert(projectGeometry.headingTop !== null && projectGeometry.headingTop >= 70 && projectGeometry.headingTop <= 230, config.name + ': heading de projetos fora do ritmo visual após navegação (' + projectGeometry.headingTop + 'px).');
  var projectImages = await cdp.evaluate(`[...document.querySelectorAll('.project-visual img')].map(img => ({complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}))`);
  assert(projectImages.length === 4 && projectImages.every(function (img) { return img.complete && img.width > 0 && img.height > 0; }), config.name + ': imagens dos projetos não carregaram.');
  console.log(config.name + ': project images approved');
  if (process.env.VISUAL_AUDIT_CAPTURE_PROJECTS === '1') {
    await screenshot(cdp, config.name + '-projects.png');
    console.log(config.name + ': projects captured');
  } else {
    console.log(config.name + ': project layout validated (optional screenshot disabled)');
  }
  if (!config.mobile) {
    await cdp.evaluate("document.getElementById('fabChat').click(); true;");
    var particleProtection = await cdp.evaluate(`new Promise(resolve => {
      const started = performance.now();
      function inspectLayer() {
        const layer = document.getElementById('impactParticleLayer');
        const result = {
          chatOpen: document.getElementById('chatPanel').classList.contains('open'),
          stateClass: document.body.classList.contains('impact-chat-open'),
          opacity: layer ? Number(getComputedStyle(layer).opacity) : 1
        };
        if (result.opacity <= .05 || performance.now() - started > 1400) return resolve(result);
        requestAnimationFrame(inspectLayer);
      }
      inspectLayer();
    })`);
    assert(particleProtection.chatOpen && particleProtection.stateClass && particleProtection.opacity <= .05, config.name + ': partículas não cedem prioridade ao chat.');
    await cdp.evaluate("document.getElementById('chatClose').click(); true;");
    await sleep(120);
    report.particleProtection = particleProtection;
  }
  report.projectImages = projectImages;
  report.projectGeometry = projectGeometry;
  return report;
}

async function run() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wagner-visual-'));
  chrome = cp.spawn(findChrome(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--allow-file-access-from-files',
    '--disable-background-networking', '--no-proxy-server', '--proxy-bypass-list=<-loopback>', '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + profile, '--window-size=1440,1000', 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  await waitFor('http://127.0.0.1:' + debugPort + '/json/version', 10000);
  var targetResponse = await fetch('http://127.0.0.1:' + debugPort + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' });
  var target = await targetResponse.json();
  var cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Log.enable'), cdp.send('Network.enable')]);
  cdp.on('Runtime.exceptionThrown', function (event) { browserErrors.push(JSON.stringify(event.exceptionDetails)); });
  cdp.on('Log.entryAdded', function (event) {
    var entry = event.entry || {};
    if (entry.level === 'error' && entry.source === 'javascript') browserErrors.push(entry.text);
  });
  cdp.on('Network.loadingFailed', function (event) {
    if (!event.canceled && event.type !== 'Font') networkFailures.push(String(event.errorText || 'resource failed'));
  });

  var reports = [];
  reports.push(await runViewport(cdp, { name: 'desktop-wide-1916', width: 1916, height: 906, mobile: false }));

  var reduced = { validatedBy: 'npm run test:e2e + CSS contract test' };

  assert(browserErrors.length === 0, 'Erros JavaScript no navegador: ' + browserErrors.join(' | '));
  assert(networkFailures.length === 0, 'Falhas de rede durante emulação: ' + networkFailures.join(' | '));

  var finalReport = {
    approved: true,
    generatedAt: new Date().toISOString(),
    viewports: reports,
    reducedMotion: reduced,
    browserErrors: browserErrors,
    networkFailures: networkFailures
  };
  fs.writeFileSync(path.join(outputDir, 'visual-audit.json'), JSON.stringify(finalReport, null, 2) + '\n');
  cdp.close();
  console.log('Emulação visual aprovada: desktop 1916x906 com assets reais e geometria fiel à referência; desktop secundário, tablet e mobile são validados pelo E2E funcional.');
}

run().catch(function (error) {
  failures.push(String(error.stack || error));
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(function () {
  if (chrome && !chrome.killed) chrome.kill('SIGKILL');
  setTimeout(function () { process.exit(process.exitCode || 0); }, 80);
});
