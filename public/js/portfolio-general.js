(function(){
  'use strict';
  var $=function(s,root){return(root||document).querySelector(s);};
  var $$=function(s,root){return Array.prototype.slice.call((root||document).querySelectorAll(s));};
  var menu=$('#menu-toggle'),nav=$('#site-nav'),progress=$('#scroll-progress'),topButton=$('#back-to-top');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var preloader=$('#site-preloader');
  if(preloader){
    var preloaderStartedAt=Date.now(),preloaderDone=false;
    var preloaderMinDelay=5000,preloaderMaxDelay=5000,preloaderFadeDuration=reduced?0:240;
    function finishPreloader(){
      if(preloaderDone)return;
      preloaderDone=true;
      window.clearTimeout(preloaderTimer);
      preloader.classList.add('is-done');
      preloader.setAttribute('aria-hidden','true');
      window.setTimeout(function(){if(preloader.parentNode)preloader.parentNode.removeChild(preloader);},260);
    }
    var preloaderDuration=Math.min(preloaderMaxDelay,Math.max(preloaderMinDelay,5000));
    var preloaderTimer=window.setTimeout(finishPreloader,Math.max(0,preloaderDuration-preloaderFadeDuration));
  }
  if(menu&&nav){menu.addEventListener('click',function(){var open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});$$('.site-nav a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');});});document.addEventListener('keydown',function(e){if(e.key==='Escape'){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');}});}
  function onScroll(){var max=document.documentElement.scrollHeight-window.innerHeight;var n=max>0?window.scrollY/max*100:0;if(progress)progress.style.width=Math.max(0,Math.min(100,n))+'%';if(topButton)topButton.classList.toggle('is-visible',window.scrollY>480);}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();if(topButton)topButton.addEventListener('click',function(event){event.preventDefault();var target=document.getElementById('topo');var startY=window.scrollY;try{if(target&&typeof target.scrollIntoView==='function'){target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});}else{window.scrollTo({top:0,left:0,behavior:reduced?'auto':'smooth'});}}catch(_){window.scrollTo(0,0);}window.setTimeout(function(){if(startY>0&&Math.abs(window.scrollY-startY)<1){window.scrollTo(0,0);}},reduced?0:180);});
  var year=$('#current-year');if(year)year.textContent=String(new Date().getFullYear());
  var reveal=$$('.reveal');if('IntersectionObserver'in window&&!reduced){var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}});},{threshold:.12,rootMargin:'0px 0px -35px 0px'});reveal.forEach(function(el){observer.observe(el);});}else reveal.forEach(function(el){el.classList.add('is-revealed');});
  var sections=$$('main section[id]');if('IntersectionObserver'in window){var sectionObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){$$('.nav-link').forEach(function(link){link.classList.toggle('is-active',link.getAttribute('href')==='#'+entry.target.id);});}});},{rootMargin:'-35% 0px -55% 0px'});sections.forEach(function(section){sectionObserver.observe(section);});}
  var form=$('#contact-form'),status=$('#form-status'),started=$('#form-started-at'),whatsappLink=$('#contact-whatsapp');
  var contactMaxAge=2*60*60*1000;
  function refreshContactStartIfStale(){if(!started)return;var now=Date.now(),prior=Number(started.value);if(!Number.isFinite(prior)||prior<=0||prior>now||now-prior>contactMaxAge)started.value=String(now);}
  if(form){
    // Todos os campos permanecem editáveis, independentemente da ordem de preenchimento.
    $$('input,textarea,select',form).forEach(function(field){
      if(field.name!=='startedAt'&&field.name!=='company'){field.disabled=false;field.readOnly=false;field.removeAttribute('disabled');field.removeAttribute('readonly');}
    });
    var contactFields=['name','email','phone','subject','message'];
    function updateWhatsAppLink(){
      if(!whatsappLink)return;
      var labels={name:'Nome',email:'E-mail',phone:'WhatsApp / telefone',subject:'Assunto',message:'Mensagem'};
      var lines=['Olá, Wagner! Gostaria de entrar em contato pelo seu portfólio.'];
      contactFields.forEach(function(key){
        var field=form.elements.namedItem(key),value=field?String(field.value||'').trim():'';
        if(value)lines.push(labels[key]+': '+value);
      });
      lines.push('Enviei esta mensagem pelo formulário do seu site.');
      whatsappLink.href='https://wa.me/5511981504061?text='+encodeURIComponent(lines.join('\n\n'));
    }
    contactFields.forEach(function(key){var field=form.elements.namedItem(key);if(field){field.addEventListener('input',updateWhatsAppLink);field.addEventListener('change',updateWhatsAppLink);}});
    if(whatsappLink){whatsappLink.addEventListener('click',function(){updateWhatsAppLink();});}
    updateWhatsAppLink();
  }
  if(started)started.value=String(Date.now());
  if(form&&started){
    form.addEventListener('focusin',function(event){var target=event.target;if(target&&target.matches&&target.matches('input:not([type="hidden"]):not([name="company"]),textarea'))refreshContactStartIfStale();});
    form.addEventListener('input',refreshContactStartIfStale);
    form.addEventListener('change',refreshContactStartIfStale);
    window.addEventListener('pageshow',refreshContactStartIfStale);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshContactStartIfStale();});
  }
  if(form)form.addEventListener('submit',async function(event){event.preventDefault();if(!form.reportValidity())return;var payload={};new FormData(form).forEach(function(value,key){payload[key]=String(value).trim();});if(status){status.className='form-status';status.textContent='Enviando sua mensagem com segurança…';}var submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=true;submit.setAttribute('aria-busy','true');}try{var response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});var result={};try{result=await response.json();}catch(_){result={};}if(!response.ok)throw new Error(result.message||'Não foi possível enviar agora.');if(status){status.className='form-status is-success';status.textContent=result.message||'Mensagem recebida. Obrigado pelo contato!';}form.reset();if(started)started.value=String(Date.now());}catch(error){if(status){status.className='form-status is-error';status.textContent=(error&&error.message)||'O envio não foi concluído. Tente novamente ou fale comigo pelo WhatsApp.';var fallback=document.createElement('a');fallback.className='form-fallback-link';fallback.href='mailto:wagnerpersoli@hotmail.com?subject='+encodeURIComponent(payload.subject||'Contato pelo portfólio')+'&body='+encodeURIComponent('Nome: '+(payload.name||'')+'\nE-mail: '+(payload.email||'')+'\nTelefone: '+(payload.phone||'Não informado')+'\n\n'+(payload.message||''));fallback.textContent='Abrir e-mail com a mensagem preenchida';status.appendChild(document.createTextNode(' '));status.appendChild(fallback);}}finally{if(submit){submit.disabled=false;submit.removeAttribute('aria-busy');}}});
  var toggle=$('#chat-toggle'),panel=$('#chat-panel'),close=$('#chat-close'),chatForm=$('#chat-form'),input=$('#chat-input'),messages=$('#chat-messages'),history=[],busy=false;
  function setChatOpen(open){if(!panel||!toggle)return;panel.classList.toggle('is-open',open);panel.setAttribute('aria-hidden',String(!open));toggle.setAttribute('aria-expanded',String(open));if(open&&input)window.setTimeout(function(){input.focus();},100);}
  if(toggle)toggle.addEventListener('click',function(){setChatOpen(!panel.classList.contains('is-open'));});if(close)close.addEventListener('click',function(){setChatOpen(false);toggle.focus();});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&panel&&panel.classList.contains('is-open'))setChatOpen(false);});
  function addMessage(text,kind){var bubble=document.createElement('div');bubble.className='chat-bubble '+(kind==='user'?'user-bubble':'bot-bubble');bubble.textContent=text;messages.appendChild(bubble);messages.scrollTop=messages.scrollHeight;return bubble;}
  async function ask(text){text=String(text||'').trim();if(!text||busy||!messages)return;setChatOpen(true);addMessage(text,'user');history.push({role:'user',content:text});if(history.length>20)history=history.slice(-20);if(input)input.value='';busy=true;var loading=document.createElement('div');loading.className='chat-loading';loading.textContent='Preparando resposta…';messages.appendChild(loading);messages.scrollTop=messages.scrollHeight;try{if(!window.WagnerChatClient||typeof window.WagnerChatClient.request!=='function')throw new Error('Assistente temporariamente indisponível.');var result=await window.WagnerChatClient.request(history);var answer=String(result.text||'').trim()||'Não consegui formular uma resposta agora. Você pode falar comigo pelo WhatsApp ou LinkedIn.';history.push({role:'assistant',content:answer});addMessage(answer,'bot');}catch(_){addMessage('Não consegui responder neste momento. Você pode entrar em contato pelo WhatsApp: +55 11 98150-4061.','bot');}finally{loading.remove();busy=false;if(input)input.focus();}}
  if(chatForm)chatForm.addEventListener('submit',function(event){event.preventDefault();ask(input&&input.value);});$$('.chat-suggestions [data-prompt]').forEach(function(button){button.addEventListener('click',function(){ask(button.getAttribute('data-prompt'));});});
})();
/* =====================================================================
   v3.4.0 — carrossel de projetos em loop, efeito de digitação,
   contador, ripple e spotlight. Camada aditiva e independente.
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- Carrossel de projetos (loop infinito) ---------- */
  function initProjectsCarousel() {
    var grid = $('.projects-grid');
    if (!grid || grid.getAttribute('data-carousel')) return;
    var originals = $$('.project-card', grid);
    var n = originals.length;
    if (n < 2) return;
    grid.setAttribute('data-carousel', '1');

    // Estrutura: região > viewport > trilha (a grade original) + controles.
    var wrap = el('div', 'projects-carousel', { role: 'region', 'aria-roledescription': 'carrossel', 'aria-label': 'Projetos em destaque' });
    var viewport = el('div', 'projects-viewport');
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(viewport);
    viewport.appendChild(grid);
    grid.classList.add('projects-track');
    originals.forEach(function (c) { c.classList.remove('reveal'); c.classList.add('is-revealed'); });

    var prev = el('button', 'pc-btn', { type: 'button', 'aria-label': 'Projeto anterior' });
    prev.textContent = '←';
    var next = el('button', 'pc-btn', { type: 'button', 'aria-label': 'Próximo projeto' });
    next.textContent = '→';
    var pause = el('button', 'pc-btn', { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Pausar rotação automática' });
    var dotsBox = el('div', 'pc-dots');
    var dots = originals.map(function (c, i) {
      var d = el('button', 'pc-dot', { type: 'button', 'aria-label': 'Ir para o projeto ' + (i + 1) });
      dotsBox.appendChild(d);
      return d;
    });
    var controls = el('div', 'projects-controls');
    controls.appendChild(prev); controls.appendChild(dotsBox); controls.appendChild(pause); controls.appendChild(next);
    wrap.appendChild(controls);

    var S = { x: 0, user: false, hover: false, focus: false, dragging: false, visible: false, tween: null, raf: 0, last: 0, center: -1, drag: null, moved: false, nextAutoAt: 0 };
    var M = { vw: 0, cardW: 0, gap: 20, slot: 0, setW: 0, copies: 3, c0: 0 };

    function setPauseUI() {
      pause.textContent = S.user ? '▶' : '❚❚';
      pause.setAttribute('aria-pressed', String(S.user));
      pause.setAttribute('aria-label', S.user ? 'Retomar rotação automática' : 'Pausar rotação automática');
    }
    function wrapX(x) {
      while (x < M.setW) x += M.setW;
      while (x >= M.setW * 2) x -= M.setW;
      return x;
    }
    function centeredX(k) { return k * M.slot + M.c0; }
    function nearestK() { return Math.round((S.x - M.c0) / M.slot); }
    function paint() {
      grid.style.transform = 'translate3d(' + (-S.x).toFixed(2) + 'px,0,0)';
      var k = nearestK();
      if (k !== S.center) {
        var kids = grid.children;
        if (kids[S.center]) kids[S.center].classList.remove('is-center');
        if (kids[k]) kids[k].classList.add('is-center');
        S.center = k;
        var cur = mod(k, n);
        dots.forEach(function (d, i) { d.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
      }
    }
    function canPlay() { return !S.user && !S.hover && !S.focus && !S.dragging && S.visible && !document.hidden; }
    function need() { return !!S.tween || S.dragging || canPlay(); }
    function frame(t) {
      var dt = Math.min(0.05, (t - S.last) / 1000);
      S.last = t;
      if (S.tween) {
        var tw = S.tween;
        if (tw.t0 === null) tw.t0 = t;
        var p = Math.min(1, (t - tw.t0) / tw.dur);
        S.x = wrapX(tw.from + (tw.to - tw.from) * ease(p));
        if (p >= 1) S.tween = null;
      } else if (canPlay()) {
        if (!S.nextAutoAt) S.nextAutoAt = t + 5000;
        if (t >= S.nextAutoAt) {
          var currentK = nearestK();
          S.tween = { from: S.x, to: centeredX(currentK + 1), t0: t, dur: reduced ? 0 : 700 };
          S.nextAutoAt = t + 5000;
          if (reduced) { S.x = wrapX(S.tween.to); S.tween = null; }
        }
      } else {
        S.nextAutoAt = 0;
      }
      paint();
      S.raf = need() ? requestAnimationFrame(frame) : 0;
    }
    function kick() {
      if (S.raf) return;
      S.last = performance.now();
      S.raf = requestAnimationFrame(frame);
    }
    function glideTo(targetX, dur) {
      if (reduced) { S.tween = null; S.x = wrapX(targetX); paint(); return; }
      S.tween = { from: S.x, to: targetX, t0: null, dur: dur || 650 };
      kick();
    }
    function step(d) { glideTo(centeredX(nearestK() + d), 650); }
    function goToIndex(i) {
      var k = nearestK();
      var delta = mod(i - k, n);
      if (delta > n / 2) delta -= n;
      glideTo(centeredX(k + delta), 700);
    }

    function build() {
      $$('[data-clone]', grid).forEach(function (c) { c.parentNode.removeChild(c); });
      S.center = -1;
      M.vw = viewport.clientWidth;
      M.gap = parseFloat(getComputedStyle(grid).columnGap) || 20;
      M.cardW = originals[0].offsetWidth;
      M.slot = M.cardW + M.gap;
      M.setW = M.slot * n;
      M.copies = Math.max(3, Math.ceil(M.vw / M.setW) + 2);
      M.c0 = (M.cardW - M.vw) / 2;
      // Os originais ficam no conjunto do meio (índices n..2n-1); clones antes e depois.
      for (var c = 0; c < M.copies; c++) {
        if (c === 1) continue;
        originals.forEach(function (o) {
          var cl = o.cloneNode(true);
          cl.setAttribute('data-clone', '');
          cl.setAttribute('aria-hidden', 'true');
          cl.classList.remove('is-center');
          $$('.is-zoom', cl).forEach(function (z) { z.classList.remove('is-zoom'); });
          $$('a,button', cl).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
          if (c === 0) grid.insertBefore(cl, originals[0]); else grid.appendChild(cl);
        });
      }
    }
    function layout(keepIndex) {
      var idx = keepIndex ? mod(nearestK(), n) : 0;
      build();
      S.tween = null;
      S.x = wrapX(centeredX(n + idx));
      paint();
    }

    // Eventos de pausa (mouse, foco, visibilidade da seção e da aba).
    wrap.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { S.hover = true; S.nextAutoAt = 0; } });
    wrap.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { S.hover = false; kick(); } });
    wrap.addEventListener('focusin', function (e) {
      S.focus = true;
      S.nextAutoAt = 0;
      var card = e.target.closest ? e.target.closest('.project-card') : null;
      var i = card ? originals.indexOf(card) : -1;
      if (i > -1) goToIndex(i);
    });
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) { S.focus = false; kick(); }
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          S.visible = en.isIntersecting;
          if (en.isIntersecting) { wrap.classList.add('is-in'); kick(); }
        });
      }, { threshold: 0.2 }).observe(wrap);
    } else { S.visible = true; wrap.classList.add('is-in'); }

    // Controles.
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    pause.addEventListener('click', function () { S.user = !S.user; setPauseUI(); kick(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { goToIndex(i); }); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    });

    // Arrastar / deslizar (mouse, toque e caneta).
    viewport.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      S.drag = { id: e.pointerId, sx: e.clientX, x0: S.x, lx: e.clientX, lt: performance.now(), v: 0 };
      S.moved = false;
    });
    viewport.addEventListener('pointermove', function (e) {
      var d = S.drag;
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.sx;
      if (!S.moved && Math.abs(dx) > 6) {
        S.moved = true; S.dragging = true; S.tween = null;
        wrap.classList.add('is-dragging');
        try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
        kick();
      }
      if (S.moved) {
        var now = performance.now();
        d.v = (d.lx - e.clientX) / Math.max(1, now - d.lt);
        d.lx = e.clientX; d.lt = now;
        S.x = wrapX(d.x0 - dx);
      }
    });
    function endDrag(e) {
      var d = S.drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      S.drag = null;
      if (S.moved) {
        S.dragging = false;
        wrap.classList.remove('is-dragging');
        var k = Math.round((S.x - M.c0) / M.slot + d.v * 0.9);
        glideTo(centeredX(k), 600);
        window.setTimeout(function () { S.moved = false; }, 60);
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('click', function (e) { if (S.moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Clique ou toque no carrossel pausa a rotação; o botão ▶ retoma.
    viewport.addEventListener('click', function () {
      if (S.moved) return;
      if (!S.user) { S.user = true; setPauseUI(); }
    });

    // Zoom elegante que segue o cursor (mouse). Em telas de toque, o CSS aplica um zoom lento.
    var zEl = null, zr = { tx: 50, ty: 50, cx: 50, cy: 50 }, zraf = 0;
    function zStep() {
      zraf = 0;
      if (!zEl) return;
      zr.cx += (zr.tx - zr.cx) * 0.14;
      zr.cy += (zr.ty - zr.cy) * 0.14;
      zEl.style.setProperty('--ox', zr.cx.toFixed(2) + '%');
      zEl.style.setProperty('--oy', zr.cy.toFixed(2) + '%');
      if (Math.abs(zr.tx - zr.cx) > 0.08 || Math.abs(zr.ty - zr.cy) > 0.08) zraf = requestAnimationFrame(zStep);
    }
    function zoomOff() { if (zEl) { zEl.classList.remove('is-zoom'); zEl = null; } }
    viewport.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || S.dragging || reduced) return;
      var z = e.target.closest ? e.target.closest('.project-zoom') : null;
      if (z !== zEl) {
        zoomOff();
        zEl = z;
        if (z) {
          var r0 = z.getBoundingClientRect();
          zr.cx = zr.tx = (e.clientX - r0.left) / r0.width * 100;
          zr.cy = zr.ty = (e.clientY - r0.top) / r0.height * 100;
          z.style.setProperty('--ox', zr.cx.toFixed(2) + '%');
          z.style.setProperty('--oy', zr.cy.toFixed(2) + '%');
          z.classList.add('is-zoom');
        }
      }
      if (z) {
        var r = z.getBoundingClientRect();
        zr.tx = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
        zr.ty = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
        if (!zraf) zraf = requestAnimationFrame(zStep);
      }
    });
    viewport.addEventListener('pointerleave', zoomOff);
    viewport.addEventListener('pointerdown', zoomOff);

    // Recalcula ao redimensionar, preservando o projeto central.
    var rt = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(rt);
      rt = window.setTimeout(function () { if (viewport.clientWidth !== M.vw) layout(true); }, 140);
    });

    setPauseUI();
    layout(false);
    kick();
    window.WagnerCarousel = { state: S, metrics: M, step: step, goToIndex: goToIndex };
  }

  /* ---------- Efeito de digitação no hero ---------- */
  function initTyping() {
    var kicker = $('.hero-kicker');
    if (!kicker || $('.hero-type')) return;
    var words = ['infraestrutura de TI', 'desenvolvimento Full-Stack', 'automação de fluxos', 'IA aplicada a soluções'];
    var p = el('p', 'hero-type', { 'aria-hidden': 'true' });
    var lead = el('span', 'tp'); lead.textContent = '> especialista em ';
    var txt = el('span', 'tt'); var caret = el('i', 'caret');
    p.appendChild(lead); p.appendChild(txt); p.appendChild(caret);
    kicker.parentNode.insertBefore(p, kicker.nextSibling);
    if (reduced) { txt.textContent = words[0]; caret.style.animation = 'none'; return; }
    var w = 0, c = 0, del = false;
    (function tick() {
      var word = words[w];
      c += del ? -1 : 1;
      txt.textContent = word.slice(0, c);
      var t = del ? 32 : 70;
      if (!del && c === word.length) { del = true; t = 1700; }
      else if (del && c === 0) { del = false; w = (w + 1) % words.length; t = 380; }
      window.setTimeout(tick, t);
    })();
  }

  /* ---------- Contador animado (ex.: "12+ anos") ---------- */
  function initCounter() {
    var strong = $('.hero-proof strong');
    if (!strong || reduced) return;
    var m = strong.textContent.match(/^(\d+)(\+?)(.*)$/);
    if (!m) return;
    var target = parseInt(m[1], 10), suffix = m[2] + m[3];
    var start = null;
    strong.textContent = '0' + suffix;
    function run(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1400);
      strong.textContent = Math.round(target * ease(p)) + suffix;
      if (p < 1) requestAnimationFrame(run);
    }
    window.setTimeout(function () { requestAnimationFrame(run); }, 500);
  }

  /* ---------- Ripple em botões ---------- */
  function initRipple() {
    if (reduced) return;
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest ? e.target.closest('.button,.nav-cta,.pc-btn,.chat-toggle,.form-submit') : null;
      if (!b) return;
      var r = b.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var s = el('span', 'ripple');
      s.style.width = s.style.height = size + 'px';
      s.style.left = (e.clientX - r.left - size / 2) + 'px';
      s.style.top = (e.clientY - r.top - size / 2) + 'px';
      b.appendChild(s);
      window.setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 700);
    }, { passive: true });
  }

  /* ---------- Spotlight que segue o cursor nos cards ---------- */
  function initSpotlight() {
    if (reduced || !finePointer) return;
    var raf = 0, ev = null;
    document.addEventListener('pointermove', function (e) {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var t = ev.target.closest ? ev.target.closest('.value-card,.project-card,.skill-panel,.contact-links>a') : null;
        if (!t) return;
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        t.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      });
    }, { passive: true });
  }

  [initTyping, initCounter, initRipple, initSpotlight, initProjectsCarousel].forEach(function (fn) {
    try { fn(); } catch (err) { if (window.console) console.warn('[v3.4.0]', fn.name, err); }
  });
}());
