(function() {
'use strict';

/* ─────────────────────────────────────────────
   SECURITY HELPERS
   ─────────────────────────────────────────────
   - All user-generated content rendered as textContent (not innerHTML)
   - All external URLs validated before navigation
   - No eval(), no Function(), no document.write()
   ───────────────────────────────────────────── */
var MAX_RENDERED_TEXT_LENGTH = 10000;
function sanitizeText(str, maxLength) {
  // Pure text — no HTML entities needed since textContent or an escaped markdown subset is used.
  var limit = Number.isFinite(maxLength) ? maxLength : MAX_RENDERED_TEXT_LENGTH;
  return String(str).slice(0, limit);
}

/* ─────────────────────────────────────────────
   BOOT SEQUENCE
   ───────────────────────────────────────────── */
window.addEventListener('load', function() {
  setTimeout(function() {
    var boot = document.getElementById('boot');
    if (boot) {
      boot.classList.add('hide');
      boot.addEventListener('animationend', function() {
        boot.style.display = 'none';
        boot.setAttribute('aria-hidden', 'true');
      }, { once: true });
    }
  }, 2300);
}, { once: true });

/* ─────────────────────────────────────────────
   CLOCK
   ───────────────────────────────────────────── */
var clockEl = document.getElementById('clock');
function tickClock() {
  if (!clockEl) return;
  var d = new Date();
  clockEl.textContent = d.toLocaleTimeString('pt-BR', { hour12: false });
}
setInterval(tickClock, 1000);
tickClock();

/* ─────────────────────────────────────────────
   HUD — uptime, fake latency, requests
   ───────────────────────────────────────────── */
var bootTime = Date.now();
var hudUptime = document.getElementById('hudUptime');
var hudReq    = document.getElementById('hudReq');
var hudLat    = document.getElementById('hudLatency');

function pad(n) { return String(n).padStart(2, '0'); }

function tickHud() {
  var s = Math.floor((Date.now() - bootTime) / 1000);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (hudUptime) hudUptime.textContent = pad(h) + ':' + pad(m) + ':' + pad(sec);
  if (hudReq)    hudReq.textContent    = (1280 + s * 7).toLocaleString('pt-BR');
  // Simulated latency variation
  if (hudLat)    hudLat.textContent    = (10 + Math.floor(Math.sin(s * 0.3) * 3 + 3)) + 'ms';
}
setInterval(tickHud, 1000);
tickHud();

/* Presentation Mode — see PMODE ENGINE below */

/* ─────────────────────────────────────────────
   MOBILE NAV — burger
   ───────────────────────────────────────────── */
var burgerBtn    = document.getElementById('burgerBtn');
var mobileNav    = document.getElementById('mobileNav');
var mobileClose  = document.getElementById('mobileNavClose');
var mobileLinks  = mobileNav ? mobileNav.querySelectorAll('a.mobile-nav-link') : [];
var navOverflowBeforeOpen = '';

function openMobileNav() {
  if (!mobileNav || !burgerBtn) return;
  navOverflowBeforeOpen = document.body.style.overflow;
  mobileNav.classList.add('open');
  mobileNav.setAttribute('aria-hidden', 'false');
  burgerBtn.setAttribute('aria-expanded', 'true');
  burgerBtn.setAttribute('aria-label', 'Fechar menu');
  burgerBtn.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(function() { if (mobileClose) mobileClose.focus(); }, 50);
}
function closeMobileNav(options) {
  if (!mobileNav || !burgerBtn) return;
  mobileNav.classList.remove('open');
  mobileNav.setAttribute('aria-hidden', 'true');
  burgerBtn.setAttribute('aria-expanded', 'false');
  burgerBtn.setAttribute('aria-label', 'Abrir menu');
  burgerBtn.classList.remove('active');
  document.body.style.overflow = navOverflowBeforeOpen;
  if (!options || options.restoreFocus !== false) burgerBtn.focus();
}

if (burgerBtn) burgerBtn.addEventListener('click', function() {
  if (mobileNav && mobileNav.classList.contains('open')) closeMobileNav();
  else openMobileNav();
});
if (mobileClose) mobileClose.addEventListener('click', function() { closeMobileNav(); });
mobileLinks.forEach(function(link) {
  link.addEventListener('click', function() { closeMobileNav({ restoreFocus: false }); });
});
// Close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (mobileNav && mobileNav.classList.contains('open')) closeMobileNav();
    if (chatPanel && chatPanel.classList.contains('open')) closeChat();
  }
});

/* ─────────────────────────────────────────────
   ANIMATED COUNTERS
   ───────────────────────────────────────────── */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(function(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var cur = 0;
    var step = Math.max(1, Math.floor(target / 40));
    var iv = setInterval(function() {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(iv); }
      el.textContent = cur + suffix;
    }, 30);
  });
}
// Trigger after boot completes
setTimeout(animateCounters, 3900);

/* ─────────────────────────────────────────────
   SCROLL REVEAL — IntersectionObserver
   ───────────────────────────────────────────── */
var revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(function(el) { io.observe(el); });
} else {
  // Fallback for old browsers
  revealEls.forEach(function(el) { el.classList.add('in'); });
}

/* ─────────────────────────────────────────────
   TERMINAL — SESSION LOGS TYPING
   ───────────────────────────────────────────── */
var logLines = [
  { p: 'system', t: 'boot --module=career' },
  { t: '> Sessão iniciada. Carregando histórico profissional...' },
  { t: '> 2021 — primeiros deploys em produção. Fullstack, sem rede de segurança.' },
  { t: '> 2022 — automação de processos com Node.js + AWS. Escala real, clientes reais.' },
  { t: '> 2023 — mergulho em IA aplicada: modelos preditivos, pipelines de dados.' },
  { t: '> 2024 — integração de LLMs em produtos internos. Automação vira inteligência.' },
  { t: '> 2025 — Premium Dashboards e Device Simulator Engine entram em desenvolvimento.' },
  { t: '> 2026 — este console. wagner.pers.f v4.2 — status: em constante deploy.' },
  { p: 'system', t: 'log --status' },
  { t: '> 20+ sistemas publicados · 100K+ linhas versionadas · uptime 24/7.' },
];

function typeTerminal() {
  var body = document.getElementById('termBody');
  if (!body) return;
  var i = 0;
  function nextLine() {
    if (i >= logLines.length) return;
    var line = logLines[i];
    var div = document.createElement('div');
    div.className = 'l';
    div.style.animation = 'bootIn .3s forwards';
    body.appendChild(div);
    var txt = sanitizeText(line.t);
    var j = 0;
    var speed = line.p ? 25 : 8;
    function typeChar() {
      if (j <= txt.length) {
        if (line.p) {
          div.textContent = 'wagner@lab $ ' + txt.slice(0, j);
          // Color the prompt part — safe since we're setting textContent then replacing
          div.innerHTML = '<span class="p">wagner@lab</span> $ ' + txt.slice(0, j).replace(/</g,'&lt;').replace(/>/g,'&gt;');
        } else {
          div.textContent = txt.slice(0, j);
        }
        j++;
        setTimeout(typeChar, speed);
      } else {
        i++;
        setTimeout(nextLine, 180);
      }
    }
    typeChar();
  }
  nextLine();
}

var termSection = document.getElementById('logs');
var termStarted = false;
if (termSection && 'IntersectionObserver' in window) {
  var termObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting && !termStarted) {
        termStarted = true;
        typeTerminal();
        termObserver.disconnect();
      }
    });
  }, { threshold: 0.25 });
  termObserver.observe(termSection);
}

/* ─────────────────────────────────────────────
   CONTACT PROMPT TYPING LOOP
   ───────────────────────────────────────────── */
var contactMsgs = [
  'abrir_canal --contato',
  'echo "vamos construir algo brutal"',
  'connect --email --whatsapp --linkedin',
  'deploy --project=next_breakthrough',
];
var cmIdx = 0;
function typeContact() {
  var el = document.getElementById('typedContact');
  if (!el) return;
  var msg = contactMsgs[cmIdx % contactMsgs.length];
  var j = 0;
  function type() {
    if (j <= msg.length) {
      el.textContent = msg.slice(0, j);
      j++;
      setTimeout(type, 45);
    } else {
      setTimeout(erase, 1800);
    }
  }
  function erase() {
    if (j >= 0) {
      el.textContent = msg.slice(0, j);
      j--;
      setTimeout(erase, 22);
    } else {
      cmIdx++;
      setTimeout(typeContact, 400);
    }
  }
  type();
}
setTimeout(typeContact, 4200);

/* ─────────────────────────────────────────────
   FLOATING BUTTONS — scroll-triggered
   ───────────────────────────────────────────── */
var fabTop   = document.getElementById('fabTop');
var fabWhats = document.getElementById('fabWhats');

function toggleFabs() {
  var threshold = window.innerHeight * 0.55;
  var visible = window.scrollY > threshold;
  if (fabTop)   { fabTop.classList.toggle('show', visible);   }
  if (fabWhats) { fabWhats.classList.toggle('show', visible); }
}

window.addEventListener('scroll', toggleFabs, { passive: true });
window.addEventListener('resize', toggleFabs, { passive: true });
toggleFabs();

if (fabTop) {
  fabTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ─────────────────────────────────────────────
   AI CHAT WIDGET — Gemini API powered
   Security: all user output via textContent, no innerHTML injection
   ───────────────────────────────────────────── */
var chatPanel  = document.getElementById('chatPanel');
var fabChat    = document.getElementById('fabChat');
var chatClose  = document.getElementById('chatClose');
var chatBody   = document.getElementById('chatBody');
var chatInput  = document.getElementById('chatInput');
var chatSend   = document.getElementById('chatSend');
var chatSuggest= document.getElementById('chatSuggest');
var chatOpened = false;
var chatHistory = [];
var chatBusy   = false;
var CHAT_HISTORY_LIMIT = 24;

function trimChatHistory() {
  if (chatHistory.length > CHAT_HISTORY_LIMIT) {
    chatHistory = chatHistory.slice(-CHAT_HISTORY_LIMIT);
  }
}

function openChat() {
  chatPanel.classList.add('open');
  chatPanel.removeAttribute('aria-hidden');
  fabChat.setAttribute('aria-expanded', 'true');
  var ping = fabChat.querySelector('.ping');
  if (ping) ping.style.display = 'none';
  if (!chatOpened) {
    chatOpened = true;
    setTimeout(function() {
      addMsg('Olá! Sou o assistente do WAGNER.OS, powered by Gemini AI. Posso responder sobre a trajetória, projetos e stack do Wagner, além de ajudar com perguntas gerais. Como posso ajudar?', 'bot');
    }, 350);
  }
  setTimeout(function() { if (chatInput) chatInput.focus(); }, 350);
}

function closeChat() {
  chatPanel.classList.remove('open');
  chatPanel.setAttribute('aria-hidden', 'true');
  fabChat.setAttribute('aria-expanded', 'false');
  if (fabChat) fabChat.focus();
}

if (fabChat) fabChat.addEventListener('click', function() {
  chatPanel.classList.contains('open') ? closeChat() : openChat();
});
if (chatClose) chatClose.addEventListener('click', closeChat);

function escapeChatHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBotInline(raw) {
  return escapeChatHtml(raw)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
}

function renderBotText(raw) {
  // Safe markdown subset: paragraphs, hyphen bullets, bold and inline code.
  // Single asterisks are intentionally not parsed, preventing malformed italics.
  var lines = String(raw || '').split(/\r?\n/);
  var html = [];
  var inList = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  lines.forEach(function(line) {
    var bullet = line.match(/^\s*[-•]\s+(.+)$/);
    if (bullet) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push('<li>' + renderBotInline(bullet[1]) + '</li>');
      return;
    }

    closeList();
    if (!line.trim()) {
      html.push('<span class="msg-gap" aria-hidden="true"></span>');
      return;
    }
    html.push('<p>' + renderBotInline(line.trim()) + '</p>');
  });

  closeList();
  return html.join('');
}

function addMsg(text, who, options) {
  var div = document.createElement('div');
  div.className = 'msg ' + who;
  if (options && options.presentation) div.setAttribute('data-presentation-chat', 'true');
  var safe = sanitizeText(text);
  if (who === 'bot') {
    div.innerHTML = renderBotText(safe);
  } else {
    div.textContent = safe;
  }
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
  return div;
}

function showTyping() {
  var typing = document.createElement('div');
  typing.className = 'msg bot typing';
  typing.id = 'chatTyping';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatBody.appendChild(typing);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTyping() {
  var t = document.getElementById('chatTyping');
  if (t) t.remove();
}

async function sendUserMsg(text) {
  text = text.trim();
  if (!text || text.length > 500 || chatBusy) return;
  addMsg(text, 'user');
  if (chatInput) chatInput.value = '';
  chatBusy = true;
  if (chatSend) chatSend.disabled = true;

  chatHistory.push({ role: 'user', content: text });
  trimChatHistory();
  showTyping();

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);

    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    var data = {};
    try { data = await response.json(); } catch(e) { data = {}; }

    if (!response.ok) {
      var serverErr = data.error || response.statusText || 'Erro desconhecido';
      throw new Error('HTTP ' + response.status + ': ' + serverErr);
    }

    // Handle both formats: Gemini-style content array and direct text
    var reply = '';
    if (data.content && Array.isArray(data.content)) {
      reply = data.content.map(function(b) { return b.text || ''; }).join('').trim();
    } else if (data.text) {
      reply = data.text.trim();
    } else if (data.error) {
      throw new Error(String(data.error));
    }

    if (!reply) reply = 'Não consegui uma resposta agora. Tente novamente ou fale direto com o Wagner no WhatsApp!';

    chatHistory.push({ role: 'assistant', content: reply });
    trimChatHistory();
    hideTyping();
    addMsg(reply, 'bot');

    // Hide suggestions after first real answer
    if (chatSuggest) chatSuggest.style.display = 'none';

  } catch(err) {
    hideTyping();
    var errMsg;
    if (err.name === 'AbortError') {
      errMsg = 'A resposta está demorando mais que o esperado. Tente novamente em instantes.\n\nPosso ajudar com: **experiência profissional**, **projetos**, **stack** ou **contato**.';
    } else if (err.message && err.message.indexOf('Failed to fetch') !== -1) {
      errMsg = 'Não consegui conectar ao servidor agora. Verifique sua conexão e tente novamente.\n\nEnquanto isso, fale direto com o Wagner: **WhatsApp +55 11 98150-4061** 📱';
    } else {
      errMsg = 'Não encontrei uma resposta específica para isso no momento.\n\nPosso ajudar com informações sobre:\n- **Experiência profissional** (12+ anos em TI)\n- **Projetos** (Device Simulator, AI Engine)\n- **Stack técnico** (React, Node, Python, IA)\n- **Contato** (WhatsApp, Email, LinkedIn)';
    }
    // Remove the failed user message from history so user can retry
    chatHistory.pop();
    addMsg(errMsg, 'bot');
  }

  chatBusy = false;
  if (chatSend) chatSend.disabled = false;
  if (chatInput) chatInput.focus();
}

if (chatSend)  chatSend.addEventListener('click', function() { sendUserMsg(chatInput ? chatInput.value : ''); });
if (chatInput) chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMsg(chatInput.value); } });
if (chatSuggest) {
  chatSuggest.addEventListener('click', function(e) {
    var btn = e.target.closest('.sugg-chip');
    if (!btn) return;
    if (!chatPanel.classList.contains('open')) openChat();
    var q = sanitizeText(btn.getAttribute('data-q') || '');
    setTimeout(function() { sendUserMsg(q); }, 200);
  });
}

/* ─────────────────────────────────────────────
   DEVICE SCREEN AI ART — matrix-style code rain
   ───────────────────────────────────────────── */
var deviceArtEl = document.getElementById('deviceAiArt');
if (deviceArtEl) {
  var chars = ['0','1','<','>','/','_','{','}','AI','ML','::','→','λ','∑','⟨','⟩'];
  var artLines = [];
  for (var ai = 0; ai < 8; ai++) {
    var line = '';
    for (var aj = 0; aj < 24; aj++) {
      line += (Math.random() > 0.7 ? chars[Math.floor(Math.random()*chars.length)] : '·') + ' ';
    }
    artLines.push(line);
  }
  // Safe: textContent only
  deviceArtEl.textContent = artLines.join('\n');
  // Animate: refresh random chars
  setInterval(function() {
    var lines = [];
    for (var bi = 0; bi < 8; bi++) {
      var line2 = '';
      for (var bj = 0; bj < 24; bj++) {
        line2 += (Math.random() > 0.72 ? chars[Math.floor(Math.random()*chars.length)] : '·') + ' ';
      }
      lines.push(line2);
    }
    deviceArtEl.textContent = lines.join('\n');
  }, 2000);
}

/* ─────────────────────────────────────────────
   BACKGROUND PARTICLES CANVAS
   ───────────────────────────────────────────── */
var canvas = document.getElementById('bgCanvas');
if (canvas && canvas.getContext) {
  var ctx = canvas.getContext('2d');
  var W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    // Adjust devicePixelRatio for Retina
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  // Throttled resize
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { resize(); }, 150);
  }, { passive: true });
  resize();

  // Particle count scales with screen area (capped for performance)
  var PCOUNT = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 16000));
  var pColors = ['255,26,74', '204,0,51', '180,20,40'];

  for (var pi = 0; pi < PCOUNT; pi++) {
    particles.push({
      x:  Math.random() * W, y:  Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 1.6 + 0.6,
      c:  pColors[pi % 7 === 0 ? 1 : (pi % 5 === 0 ? 2 : 0)]
    });
  }

  // Mouse/touch tracking
  var mouse = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('touchmove', function(e) {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });
  window.addEventListener('touchend', function() {
    mouse.x = -9999; mouse.y = -9999;
  }, { passive: true });

  // Visibility API — pause when tab is hidden (battery/perf)
  var animating = true;
  document.addEventListener('visibilitychange', function() {
    animating = !document.hidden;
    if (animating) draw();
  });

  function draw() {
    if (!animating) return;
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      // Mouse repulsion
      var dx = p.x - mouse.x, dy = p.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140 && dist > 0) {
        var f = (140 - dist) / 140;
        p.x += (dx / dist) * f * 0.7;
        p.y += (dy / dist) * f * 0.7;
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',0.65)';
      ctx.fill();

      // Draw connections
      for (var j = i + 1; j < particles.length; j++) {
        var q = particles[j];
        var ddx = p.x - q.x, ddy = p.y - q.y;
        var d2 = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d2 < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(120,0,0,' + (0.16 * (1 - d2 / 120)) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─────────────────────────────────────────────
   ACTIVE NAV LINK — highlight on scroll
   ───────────────────────────────────────────── */
var sections = ['top','featured','projects','stack','logs','contact'];
var navLinks  = document.querySelectorAll('nav.mainnav a');

function updateActiveNav() {
  var scrollY = window.scrollY + 100;
  var activeId = sections[0];
  sections.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.offsetTop <= scrollY) activeId = id;
  });
  navLinks.forEach(function(link) {
    var href = link.getAttribute('href').replace('#','');
    link.style.color = href === activeId ? 'var(--accent-teal-bright)' : '';
    link.style.background = href === activeId ? 'rgba(255,20,20,0.08)' : '';
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

/* ─────────────────────────────────────────────
   CARD HOVER TILT — subtle 3D effect on desktop
   ───────────────────────────────────────────── */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.proj-card').forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width  - 0.5;
      var y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = 'translateY(-8px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
    });
    card.addEventListener('mouseleave', function() {
      card.style.transform = '';
    });
  });
}


/* ═══════════════════════════════════════════════════════════════
   PRESENTATION MODE ENGINE v2 — CINEMATIC AUTO TOUR
   ═══════════════════════════════════════════════════════════════ */
(function() {
'use strict';

/* ── Tour stops ── */
var TOUR = [
  {
    sel: 'header',
    mobileSel: 'header',
    icon: '🖥️',
    title: 'Header — Cabeçalho',
    desc: 'Além de organizar a identidade visual, o header melhora a experiência do usuário (UX). Exibido em todas as páginas, facilita o acesso rápido às seções principais, gera praticidade otimizando o tempo e torna a navegação mais confortável.'
  },
  {
    sel: '.hero',
    mobileSel: '.hero-title',
    icon: '⚡',
    title: 'Banner Principal',
    desc: 'São a primeira impressão do seu site. Apresentam sua marca, destacam as informações mais importantes, direcionam o visitante para as principais ações e tornam a navegação mais clara, profissional e atrativa.'
  },
  {
    sel: '#featured',
    mobileSel: '#featured .feature-panel',
    icon: '🚀',
    title: 'Projeto em Destaque',
    desc: 'Atração inicial do site, onde o usuário decide demonstrar interesse interagindo com o conteúdo em questão — ou não. É o cartão de visitas técnico do portfólio.'
  },
  {
    sel: '#projects',
    mobileSel: '#projects .proj-grid',
    icon: '⚙️',
    title: 'Sistemas Deployados',
    desc: 'Vitrine de projetos reais em produção. Cada card representa uma solução concreta: AI Automation, Automation Engine e Premium Dashboards — evidências de competência técnica aplicada.'
  },
  {
    sel: '#stack',
    mobileSel: '#stack .stack-groups',
    icon: '🧰',
    title: 'Stack Tecnológico',
    desc: 'O arsenal completo de tecnologias utilizadas: React, Node.js, Python, Docker, LLMs e muito mais. Cada chip representa uma ferramenta dominada e aplicada em projetos reais.'
  },
  {
    sel: '#logs',
    mobileSel: '#logs .terminal-wrap',
    icon: '📋',
    title: 'Session Logs — Trajetória',
    desc: 'Histórico profissional em formato de terminal. Cada linha registra uma etapa real da carreira — de suporte técnico a especialista fullstack e consultor de IA.'
  },
  {
    sel: '#contact',
    mobileSel: '#contact .contact-panel',
    icon: '📡',
    title: 'Open Channel — Contato',
    desc: 'Canal direto e objetivo: WhatsApp, email, LinkedIn e GitHub. Qualquer projeto, parceria ou consulta começa aqui — resposta rápida garantida.'
  },
  {
    sel: '#chatPanel',
    mobileSel: '#chatPanel',
    icon: '🤖',
    title: 'Assistente AI',
    desc: 'Demonstração local do assistente, sem consumo de API durante o tour. Fora da apresentação, o chat real powered by Gemini continua disponível para projetos, stack, experiência e perguntas gerais.',
    isChat: true
  },
  {
    sel: 'footer',
    mobileSel: 'footer',
    icon: '✅',
    title: 'Rodapé — Fim do Tour',
    desc: 'Tour concluído. Todos os módulos apresentados. Este portfólio é o console de operações real do Wagner — construído com performance, segurança e obsessão por qualidade.'
  }
];

var AUTO_INTERVAL = 5000; // ms per step in auto mode

/* ── DOM helpers ── */
function cel(tag, cls) { var d = document.createElement(tag); if (cls) d.className = cls; return d; }

var lightning  = cel('div','pmode-lightning');
var energy     = cel('div','pmode-energy');
var overlay    = cel('div','pmode-overlay');
var spotlight  = cel('div','pmode-spotlight');
var balloon    = cel('div','pmode-balloon');
var controls   = cel('div','pmode-controls');
var progressEl = cel('div','pmode-progress');
var modalBg    = cel('div','pmode-modal-bg');
var toast      = cel('div','pmode-toast');

balloon.setAttribute('role','status');
balloon.setAttribute('aria-live','polite');
balloon.innerHTML =
  '<div class="pmode-balloon-step" id="pmBStep"></div>' +
  '<span class="pmode-balloon-icon" id="pmBIcon" aria-hidden="true"></span>' +
  '<div class="pmode-balloon-title" id="pmBTitle"></div>' +
  '<div class="pmode-balloon-desc" id="pmBDesc"></div>';

controls.setAttribute('role','toolbar');
controls.setAttribute('aria-label','Controles da apresentação');
controls.innerHTML =
  '<button class="pmode-ctrl-btn" id="pmPrev" aria-label="Etapa anterior">← ANTERIOR</button>' +
  '<div class="pmode-ctrl-sep" aria-hidden="true"></div>' +
  '<span class="pmode-ctrl-step" id="pmStep" aria-live="polite">1 / ' + TOUR.length + '</span>' +
  '<div class="pmode-ctrl-sep" aria-hidden="true"></div>' +
  '<button class="pmode-ctrl-btn primary" id="pmNext" aria-label="Próxima etapa">PRÓXIMO →</button>' +
  '<div class="pmode-ctrl-sep" aria-hidden="true"></div>' +
  '<button class="pmode-ctrl-btn auto-btn" id="pmAutoToggle" aria-label="Pausar automático" aria-pressed="true">⏸ AUTO</button>' +
  '<div class="pmode-ctrl-sep" aria-hidden="true"></div>' +
  '<button class="pmode-ctrl-btn danger" id="pmExit" aria-label="Finalizar apresentação">✕ SAIR</button>';

modalBg.setAttribute('role','dialog');
modalBg.setAttribute('aria-modal','true');
modalBg.setAttribute('aria-labelledby','pmModalTitle');
modalBg.innerHTML =
  '<div class="pmode-modal">' +
  '<h3 id="pmModalTitle">Sair do modo apresentação?</h3>' +
  '<p>Tem certeza de que deseja interromper a apresentação? Você poderá iniciá-la novamente a qualquer momento.</p>' +
  '<div class="pmode-modal-btns">' +
  '<button class="pmode-modal-btn cancel" id="pmModalCancel">CANCELAR</button>' +
  '<button class="pmode-modal-btn exit" id="pmModalExit">SAIR DA APRESENTAÇÃO</button>' +
  '</div></div>';

toast.setAttribute('role','status');
toast.innerHTML =
  '<span class="pmode-toast-icon" aria-hidden="true">✅</span>' +
  '<div class="pmode-toast-title">Apresentação concluída.</div>' +
  '<div class="pmode-toast-sub">Todos os módulos apresentados com sucesso.</div>';

[lightning,energy,overlay,spotlight,balloon,controls,progressEl,modalBg,toast]
  .forEach(function(n){ document.body.appendChild(n); });

/* ── State ── */
var active      = false;
var step        = 0;
var autoMode    = true;
var autoTimer   = null;
var chatTimer   = null;
var escCount    = 0;
var escResetTmr = null;

/* ── Helpers ── */
function raf(fn){ requestAnimationFrame(fn); }

function smoothScrollTo(y, cb) {
  var start = window.scrollY, dist = y - start;
  var dur = Math.min(700 + Math.abs(dist)*0.2, 1100), t0 = null;
  function ease(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function tick(ts){
    if(!t0) t0=ts;
    var p = Math.min((ts-t0)/dur,1);
    window.scrollTo(0, start+dist*ease(p));
    if(p<1){ raf(tick); } else { if(cb) cb(); }
  }
  raf(tick);
}

function getEl(sel){
  if (!sel) return null;
  var parts=sel.split(',');
  for(var i=0;i<parts.length;i++){
    var e=document.querySelector(parts[i].trim());
    if(e) return e;
  }
  return null;
}

function isCompactPresentation(){
  return window.matchMedia && window.matchMedia('(max-width: 980px)').matches;
}

function getTourTarget(tourStep){
  if (!tourStep) return null;
  return getEl(isCompactPresentation() && tourStep.mobileSel ? tourStep.mobileSel : tourStep.sel);
}

function positionSpotlight(t){
  if(!t) return;
  var r=t.getBoundingClientRect();
  var compact=isCompactPresentation();
  var pad=compact ? 6 : 10;
  var top=r.top-pad, left=r.left-pad, width=r.width+pad*2, height=r.height+pad*2;

  if(compact){
    var vw=window.innerWidth, vh=window.innerHeight;
    var safeTop=68, safeBottom=118, edge=8;
    left=Math.max(edge,left);
    width=Math.min(width,vw-left-edge);
    top=Math.max(safeTop,top);
    var visibleBottom=Math.min(vh-safeBottom,r.bottom+pad);
    height=Math.max(48,visibleBottom-top);
    height=Math.min(height,Math.max(48,vh-safeTop-safeBottom));
  }

  // Position the neon border div (position:fixed => viewport coordinates).
  spotlight.style.top    = top+'px';
  spotlight.style.left   = left+'px';
  spotlight.style.width  = width+'px';
  spotlight.style.height = height+'px';
  spotlight.classList.add('visible');
  var root = document.documentElement;
  root.style.setProperty('--pm-x', left+'px');
  root.style.setProperty('--pm-y', top+'px');
  root.style.setProperty('--pm-w', width+'px');
  root.style.setProperty('--pm-h', height+'px');
  document.body.classList.add('pmode-active','pmode-visible');
}

function positionBalloon(t){
  if(!t) return;
  var r=t.getBoundingClientRect(), vw=window.innerWidth, vh=window.innerHeight;
  var s=TOUR[step];
  document.getElementById('pmBStep').textContent  = 'ETAPA '+(step+1)+' DE '+TOUR.length;
  document.getElementById('pmBIcon').textContent  = s.icon;
  document.getElementById('pmBTitle').textContent = s.title;
  document.getElementById('pmBDesc').textContent  = s.desc;

  balloon.classList.toggle('pmode-balloon-chat', Boolean(s.isChat));
  var bw=Math.min(340,vw-32), top, left;
  balloon.style.bottom='auto';

  if(isCompactPresentation()){
    bw=Math.max(0,vw-24);
    left=12;
    if(s.isChat){
      top=Math.max(70,Math.min(88,vh*0.1));
      balloon.style.top=top+'px';
      balloon.style.bottom='auto';
    } else {
      balloon.style.top='auto';
      balloon.style.bottom='calc(82px + env(safe-area-inset-bottom, 0px))';
    }
  } else {
    var spaceBelow = vh-r.bottom;
    var spaceAbove = r.top;
    if(s.isChat && r.left > bw+48){
      left=Math.max(16,r.left-bw-20);
      top=Math.max(80,Math.min(r.top,vh-230));
    } else if(spaceBelow>200){ top=r.bottom+18; left=Math.max(16,Math.min(r.left,vw-bw-16)); }
    else if(spaceAbove>200){ top=r.top-195; left=Math.max(16,Math.min(r.left,vw-bw-16)); }
    else { top=Math.max(80,vh/2-90); left=Math.max(16,vw-bw-24); }
    balloon.style.top=top+'px';
  }

  balloon.style.left=left+'px';
  balloon.style.width=bw+'px';
  balloon.classList.remove('visible');
  raf(function(){ raf(function(){ balloon.classList.add('visible'); }); });
}

function updateProgress(){
  progressEl.style.width = ((step+1)/TOUR.length*100)+'%';
  document.getElementById('pmStep').textContent = (step+1)+' / '+TOUR.length;
  var prev=document.getElementById('pmPrev');
  if(prev) prev.disabled = step===0;
}

/* ── Auto timer ── */
function startAutoTimer(){
  clearTimeout(autoTimer);
  if(!autoMode || !active) return;
  var btn=document.getElementById('pmAutoToggle');
  if(btn){ btn.textContent='⏸ AUTO'; btn.setAttribute('aria-pressed','true'); }
  autoTimer = setTimeout(function(){
    if(!active || !autoMode) return;
    if(step < TOUR.length-1) goToStep(step+1);
    else finishPresentation();
  }, AUTO_INTERVAL);
}

function pauseAuto(){
  autoMode = false;
  clearTimeout(autoTimer);
  var btn=document.getElementById('pmAutoToggle');
  if(btn){ btn.textContent='▶ AUTO'; btn.setAttribute('aria-pressed','false'); }
}

function resumeAuto(){
  autoMode = true;
  startAutoTimer();
}

function toggleAuto(){
  if(autoMode) pauseAuto(); else resumeAuto();
}

/* ── Chat simulation: local-only, never calls /api/chat or changes real history ── */
function clearPresentationChat(){
  document.querySelectorAll('[data-presentation-chat="true"]').forEach(function(node){ node.remove(); });
}

function addPresentationTyping(){
  var typing=document.createElement('div');
  typing.className='msg bot typing';
  typing.setAttribute('data-presentation-chat','true');
  typing.innerHTML='<span></span><span></span><span></span>';
  chatBody.appendChild(typing);
  chatBody.scrollTop=chatBody.scrollHeight;
  return typing;
}

function simulateChat(){
  var fab=document.getElementById('fabChat');
  var panel=document.getElementById('chatPanel');
  if(fab && panel && !panel.classList.contains('open')) openChat();
  clearPresentationChat();

  var dialogue=[
    {
      q:'Quais são seus projetos?',
      a:'Atuo em projetos de emulação responsiva, automação, IA aplicada e dashboards. Esta resposta é uma demonstração local do modo apresentação; o chat real continua disponível normalmente fora do tour.'
    },
    {
      q:'Como funciona seu stack?',
      a:'Combino frontend, backend, cloud, automação e inteligência artificial conforme o objetivo do projeto. O detalhamento técnico completo está na seção Stack.'
    }
  ];
  var index=0;

  function playNext(){
    if(!active || index>=dialogue.length) return;
    var item=dialogue[index++];
    addMsg(item.q,'user',{presentation:true});
    var typing=addPresentationTyping();
    chatTimer=setTimeout(function(){
      if(typing && typing.parentNode) typing.remove();
      if(!active) return;
      addMsg(item.a,'bot',{presentation:true});
      chatTimer=setTimeout(playNext,1100);
    },750);
  }

  chatTimer=setTimeout(playNext,500);
}

/* ── Go to step ── */
function goToStep(i, cb){
  if(!active || i<0 || i>=TOUR.length) return;
  clearTimeout(autoTimer);
  step=i;
  var s=TOUR[step], t=getTourTarget(s);
  balloon.classList.remove('visible');
  if(!t){ updateProgress(); startAutoTimer(); if(cb) cb(); return; }
  var rect=t.getBoundingClientRect();
  var ty=rect.top+window.scrollY;
  var visibleHeight=Math.min(rect.height,window.innerHeight*(isCompactPresentation()?0.52:0.72));
  var scrollTo=Math.max(0,ty-(window.innerHeight/2)+(visibleHeight/2));
  smoothScrollTo(scrollTo, function(){
    setTimeout(function(){
      positionSpotlight(t);
      positionBalloon(t);
      updateProgress();
      if(s.isChat) simulateChat();
      startAutoTimer();
      if(cb) cb();
    }, 100);
  });
}

function setPresentationButtonState(isActive){
  var label=isActive?'SAIR DO MODO':'MODO APRESENTAÇÃO';
  [document.getElementById('pmodeBtn'),document.getElementById('pmodeMobileBtn')].forEach(function(btn){
    if(!btn) return;
    btn.setAttribute('data-active',isActive?'true':'false');
    btn.setAttribute('aria-label',isActive?'Sair do modo apresentação':'Ativar modo apresentação');
    var span=btn.querySelector('.pmode-label');
    if(span) span.textContent=label; else btn.textContent=label;
  });
}

/* ── Start ceremony ── */
function startCinematic(){
  if(active) return;
  active=true; autoMode=true; step=0;
  if(mobileNav && mobileNav.classList.contains('open')) closeMobileNav({restoreFocus:false});
  setPresentationButtonState(true);
  document.body.classList.add('pmode-shaking');
  setTimeout(function(){ document.body.classList.remove('pmode-shaking'); },420);
  lightning.classList.add('active');
  setTimeout(function(){ lightning.classList.remove('active'); },720);
  setTimeout(function(){
    energy.classList.add('active');
    setTimeout(function(){ energy.classList.remove('active'); },680);
  },200);
  setTimeout(function(){
    overlay.classList.add('active');
    progressEl.classList.add('visible');
    document.body.classList.add('pmode-active');
    document.body.style.overflow='hidden';
    // Disable native smooth-scroll so it stops fighting our own rAF-driven scroll animation
    document.documentElement.style.scrollBehavior='auto';
    setTimeout(function(){
      controls.classList.add('visible');
      goToStep(0);
    },350);
  },550);
}

/* ── Exit ── */
function exitPresentation(){
  if(!active) return;
  active=false; escCount=0;
  clearTimeout(autoTimer); clearTimeout(chatTimer); clearTimeout(escResetTmr);
  var cp=document.getElementById('chatPanel'),cc=document.getElementById('chatClose');
  if(cp&&cp.classList.contains('open')&&cc) cc.click();
  balloon.classList.remove('visible');
  spotlight.classList.remove('visible');
  controls.classList.remove('visible');
  overlay.classList.remove('active');
  progressEl.classList.remove('visible');
  progressEl.style.width='0%';
  document.body.style.overflow='';
  document.documentElement.style.scrollBehavior='';
  document.body.classList.remove('pmode-active','pmode-visible','presenting');
  var root=document.documentElement;
  root.style.removeProperty('--pm-x');
  root.style.removeProperty('--pm-y');
  root.style.removeProperty('--pm-w');
  root.style.removeProperty('--pm-h');
  clearPresentationChat();
  setPresentationButtonState(false);
}

function finishPresentation(){
  exitPresentation();
  toast.classList.add('visible');
  setTimeout(function(){ toast.classList.remove('visible'); }, 3500);
}

/* ── Controls wiring ── */
document.getElementById('pmNext').addEventListener('click',function(){
  pauseAuto();
  if(step<TOUR.length-1) goToStep(step+1); else finishPresentation();
});
document.getElementById('pmPrev').addEventListener('click',function(){
  pauseAuto();
  if(step>0) goToStep(step-1);
});
document.getElementById('pmAutoToggle').addEventListener('click', toggleAuto);
document.getElementById('pmExit').addEventListener('click',function(){
  modalBg.classList.add('active');
  setTimeout(function(){ document.getElementById('pmModalExit').focus(); },50);
});
document.getElementById('pmModalCancel').addEventListener('click',function(){
  modalBg.classList.remove('active');
  document.getElementById('pmNext').focus();
});
document.getElementById('pmModalExit').addEventListener('click',function(){
  modalBg.classList.remove('active');
  exitPresentation();
});

/* ── Keyboard ── */
document.addEventListener('keydown',function(e){
  if(!active) return;
  if(e.key==='Escape'){
    e.preventDefault();
    if(modalBg.classList.contains('active')){
      // ESC again while modal open = confirm exit
      modalBg.classList.remove('active');
      exitPresentation();
      return;
    }
    escCount++;
    clearTimeout(escResetTmr);
    escResetTmr = setTimeout(function(){ escCount=0; }, 1200);
    if(escCount >= 2){
      escCount=0;
      exitPresentation();
    } else {
      // First ESC = show modal
      modalBg.classList.add('active');
      setTimeout(function(){ document.getElementById('pmModalExit').focus(); },50);
    }
    return;
  }
  // ENTER = advance to next
  if(e.key==='Enter'){
    e.preventDefault();
    pauseAuto();
    if(step<TOUR.length-1) goToStep(step+1); else finishPresentation();
    return;
  }
  // BACKSPACE = toggle pause/resume auto
  if(e.key==='Backspace'){
    e.preventDefault();
    if(autoMode) pauseAuto(); else resumeAuto();
    return;
  }
  // Arrow keys
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){
    e.preventDefault(); pauseAuto();
    if(step<TOUR.length-1) goToStep(step+1); else finishPresentation();
  }
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){
    e.preventDefault(); pauseAuto();
    if(step>0) goToStep(step-1);
  }
});

/* ── Resize reposition ── */
var rTimer;
window.addEventListener('resize',function(){
  clearTimeout(rTimer); if(!active) return;
  rTimer=setTimeout(function(){
    var t=getTourTarget(TOUR[step]);
    if(t){ positionSpotlight(t); positionBalloon(t); }
  },150);
});
// Re-sync clip-path on scroll (fixed vs scrollY offset)
window.addEventListener('scroll',function(){
  if(!active) return;
  var t=getTourTarget(TOUR[step]);
  if(!t) return;
  positionSpotlight(t);
}, {passive:true});

/* ── Wire presentation buttons (desktop + mobile drawer) ── */
function handlePresentationButton(){
  if(active) modalBg.classList.add('active');
  else startCinematic();
}
['pmodeBtn','pmodeMobileBtn'].forEach(function(id){
  var btn=document.getElementById(id);
  if(btn) btn.addEventListener('click',handlePresentationButton);
});
setPresentationButtonState(false);

/* ── Footer year ── */
document.querySelectorAll('.footer-year').forEach(function(el){ el.textContent=new Date().getFullYear(); });

/* ─────────────────────────────────────────────
   COOKIE / LGPD BANNER
   ─────────────────────────────────────────────
   Respeita LGPD: não registra nada sem consentimento.
   Armazena preferência em localStorage apenas.
   ───────────────────────────────────────────── */
(function() {
  var banner = document.getElementById('cookieBanner');
  var acceptBtn = document.getElementById('cookieAccept');
  var declineBtn = document.getElementById('cookieDecline');

  if (!banner) return;

  var COOKIE_KEY = 'wp_cookie_consent';
  var stored = null;

  try { stored = localStorage.getItem(COOKIE_KEY); } catch(e) {}

  if (stored !== null) return; // já decidiu antes

  // Mostra o banner após a tela de boot
  setTimeout(function() {
    banner.classList.add('show');
  }, 3800);

  function hideBanner() {
    banner.classList.remove('show');
    banner.style.pointerEvents = 'none';
    setTimeout(function(){ banner.style.display = 'none'; }, 500);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      try { localStorage.setItem(COOKIE_KEY, 'accepted'); } catch(e) {}
      hideBanner();
      // Apenas registra a data/hora e origem de forma anônima (sem dados pessoais)
      var log = {
        ts: new Date().toISOString(),
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        browser: navigator.userAgent.split(' ').pop().split('/')[0] || 'unknown',
        referrer: document.referrer ? new URL(document.referrer).hostname : 'direct'
      };
      try { localStorage.setItem('wp_visit_log', JSON.stringify(log)); } catch(e) {}
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      try { localStorage.setItem(COOKIE_KEY, 'declined'); } catch(e) {}
      hideBanner();
    });
  }
})();

})();

/* ═══════════════════════════════════════════════════════════════
   HERO SKULL — rotação 360° com drag + hover tilt + auto-spin
   ── Modos:
      1. DRAG  (mousedown/touchstart no wrap) → gira livremente 360° X e Y
      2. HOVER (mouse sobre a página, sem drag) → tilt suave ±22° seguindo cursor
      3. AUTO-SPIN (idle: sem hover nem drag) → rotação lenta contínua em Y
   ── Nunca interfere com chat, pmode, scroll ou outros listeners
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var wrap = document.getElementById('heroSkullWrap');
  var tilt = document.getElementById('heroSkullTilt');
  if(!wrap || !tilt) return;

  /* Respeita prefers-reduced-motion: desativa tudo */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion) return;

  /* ── Estado acumulado de rotação (drag livre 360°) ── */
  var rotX = 0, rotY = 0;          // ângulo atual renderizado
  var velX = 0, velY = 0;          // velocidade (inércia ao soltar)

  /* ── Estado do drag ── */
  var dragging   = false;
  var lastPX = 0, lastPY = 0;      // última posição do ponteiro/touch

  /* ── Estado do hover (tilt suave, sem drag) ── */
  var hoverActive = false;
  var hoverTargX  = 0, hoverTargY = 0;
  var HOVER_MAX   = 22;            // graus máximos de tilt por hover
  var HOVER_EASE  = 0.07;

  /* ── Auto-spin (idle) ── */
  var AUTO_SPEED  = 0.18;          // graus/frame em Y quando idle
  var autoSpinOn  = true;          // começa em auto-spin até primeira interação

  /* ── RAF ── */
  var rafId = null;

  /* ────────────────────────────────────────────
     Loop de animação único — aplica tudo aqui
  ──────────────────────────────────────────── */
  function tick(){
    rafId = null;

    if(dragging){
      /* Drag ativo: aplica velocidade acumulada (já aplicada no move) */
      autoSpinOn = false;
    } else if(hoverActive && !autoSpinOn){
      /* Hover sem drag: lerp suave em direção ao target */
      rotX += (hoverTargX - rotX) * HOVER_EASE;
      rotY += (hoverTargY - rotY) * HOVER_EASE;
      velX *= 0.85; velY *= 0.85;
    } else {
      /* Idle / auto-spin: aplica inércia e depois spin lento */
      rotX += velX;
      rotY += velY + (autoSpinOn ? AUTO_SPEED : 0);
      velX *= 0.94;
      velY *= 0.94;
      /* Quando idle e sem inércia, retorna X ao plano horizontal suavemente */
      if(!autoSpinOn) rotX += (0 - rotX) * 0.04;
    }

    tilt.style.transform =
      'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';

    /* Continua o loop enquanto há movimento significativo */
    var stillMoving =
      dragging ||
      hoverActive ||
      autoSpinOn ||
      Math.abs(velX) > 0.01 ||
      Math.abs(velY) > 0.01 ||
      Math.abs(rotX) > 0.05;

    if(stillMoving) rafId = requestAnimationFrame(tick);
  }

  function schedTick(){
    if(!rafId) rafId = requestAnimationFrame(tick);
  }

  /* ────────────────────────────────────────────
     DRAG — mouse
  ──────────────────────────────────────────── */
  wrap.addEventListener('mousedown', function(e){
    /* Ignora cliques em filhos interativos (links, botões) */
    if(e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
    dragging = true;
    lastPX = e.clientX;
    lastPY = e.clientY;
    velX = 0; velY = 0;
    wrap.classList.add('skull-dragging');
    e.preventDefault();
  }, {passive: false});

  window.addEventListener('mousemove', function(e){
    if(dragging){
      var dx = e.clientX - lastPX;
      var dy = e.clientY - lastPY;
      velX = -dy * 0.45;
      velY =  dx * 0.45;
      rotX += velX;
      rotY += velY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      schedTick();
    } else {
      /* Hover tilt quando não está arrastando */
      var r = wrap.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width  * 0.5)) / (window.innerWidth  * 0.5);
      var ny = (e.clientY - (r.top  + r.height * 0.5)) / (window.innerHeight * 0.5);
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      hoverTargY = nx * HOVER_MAX;
      hoverTargX = -ny * HOVER_MAX;
      hoverActive = true;
      schedTick();
    }
  }, {passive: true});

  window.addEventListener('mouseup', function(){
    if(!dragging) return;
    dragging = false;
    wrap.classList.remove('skull-dragging');
    /* Inércia: velX/velY já têm o último delta — continuam no tick */
    schedTick();
  }, {passive: true});

  window.addEventListener('mouseleave', function(){
    if(dragging){
      dragging = false;
      wrap.classList.remove('skull-dragging');
    }
    hoverActive = false;
    hoverTargX = 0; hoverTargY = 0;
    autoSpinOn = true;
    schedTick();
  }, {passive: true});

  /* ────────────────────────────────────────────
     DRAG — touch (mobile/tablet coarse pointer)
  ──────────────────────────────────────────── */
  wrap.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1) return;
    dragging = true;
    lastPX = e.touches[0].clientX;
    lastPY = e.touches[0].clientY;
    velX = 0; velY = 0;
    autoSpinOn = false;
    wrap.classList.add('skull-dragging');
    /* NÃO chama preventDefault aqui para não bloquear o scroll da página */
  }, {passive: true});

  wrap.addEventListener('touchmove', function(e){
    if(!dragging || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - lastPX;
    var dy = e.touches[0].clientY - lastPY;
    velX = -dy * 0.45;
    velY =  dx * 0.45;
    rotX += velX;
    rotY += velY;
    lastPX = e.touches[0].clientX;
    lastPY = e.touches[0].clientY;
    schedTick();
  }, {passive: true});

  wrap.addEventListener('touchend', function(){
    dragging = false;
    wrap.classList.remove('skull-dragging');
    schedTick();
  }, {passive: true});

  /* ────────────────────────────────────────────
     Pause quando aba fica oculta
  ──────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      dragging = false;
      hoverActive = false;
      wrap.classList.remove('skull-dragging');
      if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
    } else {
      autoSpinOn = true;
      schedTick();
    }
  });

  /* Inicia auto-spin */
  schedTick();

})();


/* ─────────────────────────────────────────────
   CONTACT FORM — creative in-site email channel
   ───────────────────────────────────────────── */
var contactForm = document.getElementById('contactForm');
var contactSubmit = document.getElementById('contactSubmit');
var contactInlineStatus = document.getElementById('contactInlineStatus');
var contactToast = document.getElementById('contactToast');
var contactToastTitle = contactToast ? contactToast.querySelector('.contact-toast-title') : null;
var contactToastSub = contactToast ? contactToast.querySelector('.contact-toast-sub') : null;
var contactToastIcon = contactToast ? contactToast.querySelector('.contact-toast-icon') : null;
var contactToastTimer = 0;

function setContactStatus(message, kind) {
  if (!contactInlineStatus) return;
  contactInlineStatus.textContent = sanitizeText(message || '', 220);
  contactInlineStatus.classList.remove('ok', 'err');
  if (kind === 'ok') contactInlineStatus.classList.add('ok');
  if (kind === 'err') contactInlineStatus.classList.add('err');
}

function setContactLoading(isLoading) {
  if (!contactSubmit) return;
  contactSubmit.disabled = Boolean(isLoading);
  var label = contactSubmit.querySelector('span');
  if (label) label.textContent = isLoading ? 'ENVIANDO...' : 'ENVIAR MENSAGEM';
}

function showContactToast(title, subtitle, isError) {
  if (!contactToast) return;
  if (contactToastTitle) contactToastTitle.textContent = sanitizeText(title || '', 120);
  if (contactToastSub) contactToastSub.textContent = sanitizeText(subtitle || '', 220);
  if (contactToastIcon) contactToastIcon.textContent = isError ? '⚠' : '✦';
  contactToast.classList.toggle('error', Boolean(isError));
  contactToast.classList.add('show');
  contactToast.setAttribute('aria-hidden', 'false');
  clearTimeout(contactToastTimer);
  contactToastTimer = setTimeout(function() {
    contactToast.classList.remove('show');
    contactToast.setAttribute('aria-hidden', 'true');
  }, isError ? 5200 : 4200);
}

if (contactForm) {
  contactForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (contactSubmit && contactSubmit.disabled) return;

    var formData = new FormData(contactForm);
    var payload = {
      name: sanitizeText((formData.get('name') || '').trim(), 80),
      email: sanitizeText((formData.get('email') || '').trim(), 120),
      subject: sanitizeText((formData.get('subject') || '').trim(), 120),
      phone: sanitizeText((formData.get('phone') || '').trim(), 40),
      message: sanitizeText((formData.get('message') || '').trim(), 2000),
      company: sanitizeText((formData.get('company') || '').trim(), 120)
    };

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.name || payload.name.length < 2) {
      setContactStatus('Informe seu nome para abrir o canal.', 'err');
      showContactToast('Nome obrigatório.', 'Digite pelo menos 2 caracteres no campo nome.', true);
      return;
    }
    if (!emailRegex.test(payload.email)) {
      setContactStatus('Informe um e-mail válido para retorno.', 'err');
      showContactToast('E-mail inválido.', 'Use um endereço de e-mail válido para receber o retorno.', true);
      return;
    }
    if (!payload.subject || payload.subject.length < 3) {
      setContactStatus('Defina um assunto curto para contextualizar a mensagem.', 'err');
      showContactToast('Assunto obrigatório.', 'Escreva um assunto com pelo menos 3 caracteres.', true);
      return;
    }
    if (!payload.message || payload.message.length < 12) {
      setContactStatus('Descreva a demanda com um pouco mais de detalhe.', 'err');
      showContactToast('Mensagem muito curta.', 'Escreva pelo menos 12 caracteres na mensagem.', true);
      return;
    }

    setContactLoading(true);
    setContactStatus('Transmitindo mensagem para o canal de e-mail...', '');

    try {
      var response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      var data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }

      if (!response.ok || !data || !data.ok) {
        var errorMessage = data && data.message ? data.message : 'O canal de e-mail está indisponível no momento. Tente novamente em instantes.';
        setContactStatus(errorMessage, 'err');
        showContactToast('Falha no envio.', errorMessage, true);
        return;
      }

      contactForm.reset();
      setContactStatus(data.message || 'Mensagem enviada com sucesso. Wagner receberá seu contato por e-mail.', 'ok');
      showContactToast(
        'Mensagem enviada com sucesso.',
        data.message || 'O canal foi aberto. Wagner receberá seu contato por e-mail.',
        false
      );
    } catch (error) {
      setContactStatus('Erro de conexão ao enviar. Tente novamente em instantes.', 'err');
      showContactToast('Erro de conexão.', 'Não foi possível enviar agora. Tente novamente em alguns instantes.', true);
    } finally {
      setContactLoading(false);
    }
  });
}

})(); // end IIFE
