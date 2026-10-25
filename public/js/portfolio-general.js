(function(){
  'use strict';
  var $=function(s,root){return(root||document).querySelector(s);};
  var $$=function(s,root){return Array.prototype.slice.call((root||document).querySelectorAll(s));};
  var menu=$('#menu-toggle'),nav=$('#site-nav'),progress=$('#scroll-progress'),topButton=$('#back-to-top');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var preloader=$('#site-preloader');
  if(preloader){
    var preloaderDone=false;
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
  document.addEventListener('pointerdown',function(e){if(!panel||!toggle||!panel.classList.contains('is-open'))return;var widget=$('#chat-widget');if(widget&&!widget.contains(e.target))setChatOpen(false);});
  function appendRichText(target,text,allowBold){
    var source=String(text||'');
    var pattern=allowBold
      ? /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^)]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?55\s*\(?11\)?\s*9\d{4}[-\s]?\d{4}|\(?11\)?\s*9\d{4}[-\s]?\d{4})/gi
      : /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:)[^)]+)\)|(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?55\s*\(?11\)?\s*9\d{4}[-\s]?\d{4}|\(?11\)?\s*9\d{4}[-\s]?\d{4})/gi;
    var cursor=0;
    for(var match of source.matchAll(pattern)){
      if(match.index>cursor)target.appendChild(document.createTextNode(source.slice(cursor,match.index)));
      if(allowBold&&match[3]!==undefined){
        var strong=document.createElement('strong');
        appendRichText(strong,match[3],false);
        target.appendChild(strong);
        cursor=match.index+match[0].length;
        continue;
      }
      var label='',href='',trailing='';
      if(match[1]!==undefined&&match[2]!==undefined){
        label=match[1];href=match[2];
      }else if(match[allowBold?4:3]!==undefined){
        var raw=match[allowBold?4:3];
        var suffix=raw.match(/[.,!?;:]+$/);
        if(suffix){trailing=suffix[0];raw=raw.slice(0,-trailing.length);}
        label=raw;href=/^www\./i.test(raw)?'https://'+raw:raw;
      }else if(match[allowBold?5:4]!==undefined){
        label=match[allowBold?5:4];href='mailto:'+label;
      }else if(match[allowBold?6:5]!==undefined){
        label=match[allowBold?6:5];
        var digits=label.replace(/\D/g,'');
        if(digits.length===11&&digits.indexOf('11')===0)digits='55'+digits;
        href='tel:+'+digits;
      }
      if(!href||!/^(https?:\/\/|mailto:|tel:)/i.test(href)){
        target.appendChild(document.createTextNode(match[0]));
      }else{
        var link=document.createElement('a');
        link.href=href;
        link.textContent=label;
        link.setAttribute('data-chat-link','');
        if(/^https?:\/\//i.test(href)){link.target='_blank';link.rel='noopener noreferrer';}
        target.appendChild(link);
        if(trailing)target.appendChild(document.createTextNode(trailing));
      }
      cursor=match.index+match[0].length;
    }
    if(cursor<source.length)target.appendChild(document.createTextNode(source.slice(cursor)));
  }
  function addMessage(text,kind){var bubble=document.createElement('div');bubble.className='chat-bubble '+(kind==='user'?'user-bubble':'bot-bubble');if(kind==='bot')appendRichText(bubble,text,true);else bubble.textContent=text;messages.appendChild(bubble);messages.scrollTop=messages.scrollHeight;return bubble;}
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


/* Logo animation: efficient ember glow + randomized lightning, for header and footer. */
(function initBrandLogoEffects() {
  'use strict';
  var logos = Array.prototype.slice.call(document.querySelectorAll('[data-logo-motion]'));
  if (!logos.length) return;

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var smallScreen = window.matchMedia ? window.matchMedia('(max-width: 760px)') : null;
  var reduced = !!(motionQuery && motionQuery.matches);
  var timers = new Map();
  var visible = new WeakMap();
  var alive = true;
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visible.set(entry.target, entry.isIntersecting);
      if (!entry.isIntersecting) {
        clearTimer(entry.target);
        entry.target.classList.remove('is-striking');
      } else if (!document.hidden && !reduced) {
        schedule(entry.target, smallScreen && smallScreen.matches ? 7000 : 4200, smallScreen && smallScreen.matches ? 12000 : 8500);
      }
    });
  }, { rootMargin: '80px 0px', threshold: 0.05 }) : null;

  function clearTimer(logo) {
    var id = timers.get(logo);
    if (id) window.clearTimeout(id);
    timers.delete(logo);
  }

  function schedule(logo, min, max) {
    clearTimer(logo);
    if (!alive || reduced || document.hidden || visible.get(logo) === false) return;
    var delay = min + Math.random() * (max - min);
    timers.set(logo, window.setTimeout(function () {
      timers.delete(logo);
      if (!alive || document.hidden || reduced || visible.get(logo) === false) return;
      logo.classList.remove('is-striking');
      /* Restart on the next frame without forcing a synchronous layout/reflow. */
      window.requestAnimationFrame(function () {
        if (!alive || document.hidden || reduced || visible.get(logo) === false) return;
        logo.classList.add('is-striking');
      });
      schedule(logo, smallScreen && smallScreen.matches ? 8500 : 5200, smallScreen && smallScreen.matches ? 14000 : 9800);
    }, delay));
  }

  function setReducedMotion() {
    reduced = !!(motionQuery && motionQuery.matches);
    logos.forEach(function (logo) {
      clearTimer(logo);
      logo.classList.remove('is-striking');
      if (!reduced && !document.hidden) schedule(logo, 1200, 3000);
    });
  }

  logos.forEach(function (logo) {
    visible.set(logo, !observer);
    if (observer) observer.observe(logo);
    else schedule(logo, 1800, 3600);
  });

  function onVisibilityChange() {
    logos.forEach(function (logo) {
      clearTimer(logo);
      if (document.hidden) logo.classList.remove('is-striking');
      else if (!reduced) schedule(logo, 1400, 3200);
    });
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', setReducedMotion);
    else if (motionQuery.addListener) motionQuery.addListener(setReducedMotion);
  }
  window.addEventListener('pagehide', function () {
    alive = false;
    logos.forEach(clearTimer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (observer) observer.disconnect();
    if (motionQuery) {
      if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', setReducedMotion);
      else if (motionQuery.removeListener) motionQuery.removeListener(setReducedMotion);
    }
  }, { once: true });
}());

/* Brasas atmosféricas em canvas: leve, decorativo e sem capturar interações. */
  (function(){
    var canvas=document.getElementById('ambient-embers');
    if(!canvas)return;
    var ctx=canvas.getContext('2d');
    if(!ctx)return;
    var motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    var dpr=1,w=0,h=0,embers=[],rainDrops=[],raf=0,last=0,alive=true;
    var palette=['255,91,38','255,139,52','255,63,31','255,191,94','255,76,55'];
    function resize(){
      dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
      var count=Math.min(92,Math.max(30,Math.round(w*h/14500)));
      embers=Array.from({length:count},function(){return makeEmber(true);});
      rainDrops=Array.from({length:Math.min(84,Math.max(28,Math.round(w*h/26000)))},function(){return{x:Math.random()*w,y:Math.random()*h,len:8+Math.random()*17,speed:1.1+Math.random()*2.4,alpha:.035+Math.random()*.07};});
    }
    function makeEmber(initial){return{x:Math.random()*w,y:initial?Math.random()*h:h+Math.random()*30,r:.65+Math.random()*2.1,v:.22+Math.random()*.72,drift:(Math.random()-.5)*.38,alpha:.22+Math.random()*.62,phase:Math.random()*6.28,twinkle:.012+Math.random()*.025,color:palette[Math.floor(Math.random()*palette.length)]};}
    function draw(now){
      raf=0;if(!alive||document.hidden)return;
      if(now-last<30){raf=requestAnimationFrame(draw);return;}last=now;
      ctx.clearRect(0,0,w,h);
      /* Chuva fina azulada em plano distante; baixo contraste para não competir com o conteúdo. */
      ctx.save();
      ctx.lineCap='round';
      for(var r=0;r<rainDrops.length;r++){
        var drop=rainDrops[r];
        drop.y+=drop.speed;
        drop.x-=drop.speed*.34;
        if(drop.y>h+24||drop.x<-24){drop.x=Math.random()*(w+40);drop.y=-Math.random()*80;}
        ctx.beginPath();
        ctx.moveTo(drop.x,drop.y);
        ctx.lineTo(drop.x-2.2,drop.y+drop.len);
        ctx.strokeStyle='rgba(91,164,255,'+drop.alpha+')';
        ctx.lineWidth=.65;
        ctx.stroke();
      }
      ctx.restore();
      for(var i=0;i<embers.length;i++){
        var p=embers[i];p.y-=p.v;p.x+=p.drift+Math.sin(now*.00045+p.phase)*.18;p.phase+=p.twinkle;
        if(p.y<-12||p.x<-20||p.x>w+20){embers[i]=makeEmber(false);continue;}
        var a=p.alpha*(.72+.28*Math.sin(p.phase));
        var glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*4.8);
        glow.addColorStop(0,'rgba('+p.color+','+(a*.9)+')');glow.addColorStop(.35,'rgba('+p.color+','+(a*.28)+')');glow.addColorStop(1,'rgba('+p.color+',0)');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,p.r*4.8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba('+p.color+','+Math.min(1,a)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      raf=requestAnimationFrame(draw);
    }
    function start(){if(motion.matches||document.hidden||raf)return;alive=true;last=0;raf=requestAnimationFrame(draw);}
    function stop(){alive=false;if(raf){cancelAnimationFrame(raf);raf=0;}}
    resize();if(!motion.matches)start();
    window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else start();});
    if(motion.addEventListener)motion.addEventListener('change',function(){if(motion.matches)stop();else start();});
    else if(motion.addListener)motion.addListener(function(){if(motion.matches)stop();else start();});
  })();


/* Loader cinematic FX — procedural volumetric smoke, curved embers, irregular lightning. */
(function(){
 var root=document.getElementById('site-preloader'),canvas=document.getElementById('site-preloader-cinema');if(!root||!canvas||!canvas.getContext)return;
 var ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!ctx)return;
 var motion=window.matchMedia('(prefers-reduced-motion: reduce)'),dpr=1,w=0,h=0,raf=0,last=0,active=false,disposed=false,embers=[],smoke=[],rain=[],bolts=[],nextFlash=0,flash=0,flashSide='blue';
 var rand=function(a,b){return a+Math.random()*(b-a);},palette=['255,105,42','255,145,61','255,75,32','255,197,108','255,83,45'];
 function makeEmber(initial){return{x:rand(0,w),y:initial?rand(0,h):h+rand(5,70),r:rand(.45,1.9),vx:rand(-.22,.18),vy:rand(.12,.72),phase:rand(0,6.28),tw:rand(.012,.04),curl:rand(.35,1.5),life:rand(500,1500),age:initial?rand(0,1200):0,color:palette[(Math.random()*palette.length)|0]};}
 function makeSmoke(initial,i){var fire=i%2===0;return{x:fire?rand(-w*.14,w*.22):rand(w*.78,w*1.14),y:rand(h*.18,h*1.08),rx:rand(w*.045,w*.14),ry:rand(h*.055,h*.17),vx:fire?rand(-.12,.32):rand(-.32,.12),vy:rand(-.16,-.035),phase:rand(0,6.28),speed:rand(.00012,.00042),alpha:rand(.018,.065),hue:fire?rand(5,23):rand(215,265),age:initial?rand(0,1000):0,life:rand(2200,5200)};}
 function makeRain(){return{x:rand(0,w),y:rand(-h,h),len:rand(8,26),v:rand(1.4,3.4),a:rand(.018,.065)};}
 function resize(){dpr=Math.min(window.devicePixelRatio||1,1.6);w=window.innerWidth;h=window.innerHeight;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);var area=w*h;embers=Array.from({length:Math.min(110,Math.max(38,Math.round(area/11500)))},function(){return makeEmber(true);});smoke=Array.from({length:w<600?14:23},function(_,i){return makeSmoke(true,i);});rain=Array.from({length:Math.min(64,Math.max(18,Math.round(area/30000)))},makeRain);}
 function glow(x,y,r,color,a){var q=ctx.createRadialGradient(x,y,0,x,y,Math.max(1,r));q.addColorStop(0,'rgba('+color+','+a+')');q.addColorStop(.24,'rgba('+color+','+(a*.55)+')');q.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=q;ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();}
 function drawSmoke(now,dt){ctx.save();ctx.globalCompositeOperation='screen';for(var i=0;i<smoke.length;i++){var s=smoke[i];s.age+=dt;var n1=Math.sin(now*s.speed+s.phase),n2=Math.cos(now*s.speed*.71+s.phase*1.7);s.x+=(s.vx+n1*.11)*dt*.06;s.y+=s.vy*dt*.055;if(s.age>s.life||s.y<-s.ry*1.5||s.x<-s.rx*2||s.x>w+s.rx*2)smoke[i]=makeSmoke(false,i);var breathe=.78+.22*Math.sin(now*.00055+s.phase),fade=Math.min(1,s.age/550,Math.max(0,(s.life-s.age)/850)),al=s.alpha*breathe*fade,col=s.hue<30?'255,65,24':'65,88,255',x=s.x+n1*s.rx*.16,y=s.y+n2*s.ry*.12;glow(x,y,s.rx*1.65,col,al*.6);glow(x+s.rx*.23,y-s.ry*.12,s.rx*.85,col,al*.65);glow(x-s.rx*.2,y+s.ry*.18,s.rx*.7,col,al*.42);glow(x,y,s.rx*.42,s.hue<30?'255,124,55':'67,100,255',al*.36);}ctx.restore();}
 function subdivide(a,b,rough,out,depth){if(depth<=0){out.push(b);return;}var dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),mid={x:(a.x+b.x)/2+(Math.random()-.5)*len*rough,y:(a.y+b.y)/2+(Math.random()-.5)*len*rough};subdivide(a,mid,rough*.72,out,depth-1);subdivide(mid,b,rough*.72,out,depth-1);}
 function makeBolt(side){var start=side==='blue'?{x:rand(w*.72,w*.98),y:rand(-h*.08,h*.18)}:{x:rand(w*.02,w*.25),y:rand(-h*.08,h*.2)},end=side==='blue'?{x:rand(w*.63,w*.96),y:rand(h*.55,h*.94)}:{x:rand(w*.05,w*.34),y:rand(h*.55,h*.9)},points=[start];subdivide(start,end,.25,points,5);var branches=[];for(var i=4;i<points.length-3;i+=Math.floor(rand(3,7))){if(Math.random()>.68)continue;var p=points[i],tip={x:p.x+(side==='blue'?-1:1)*rand(w*.035,w*.12),y:p.y+rand(h*.035,h*.13)},branch=[p];subdivide(p,tip,.32,branch,3);branches.push(branch);}return{side:side,points:points,branches:branches,age:0,duration:rand(180,390),power:rand(.58,1)};}
 function strokeBolt(points,color,width,alpha,blur){if(!points||points.length<2)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(var i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.stroke();ctx.restore();}
 function drawLightning(now,dt){if(now>nextFlash&&bolts.length===0){flashSide=Math.random()<.56?'blue':'fire';bolts.push(makeBolt(flashSide));if(Math.random()<.56)bolts.push(makeBolt(flashSide));nextFlash=now+rand(1450,4100);flash=rand(.12,.34);}if(bolts.length&&Math.random()<.08&&bolts.length<4)bolts.push(makeBolt(flashSide));for(var i=bolts.length-1;i>=0;i--){var b=bolts[i];b.age+=dt;var env=b.age<38?b.age/38:Math.max(0,1-(b.age-38)/(b.duration-38)),col=b.side==='blue'?'104,205,255':'255,143,61',core=b.side==='blue'?'235,250,255':'255,236,184',power=b.power*env;for(var q=0;q<b.branches.length;q++)strokeBolt(b.branches[q],'rgb('+col+')',2.4,power*.55,15);strokeBolt(b.points,'rgb('+col+')',5.5,power*.34,28);strokeBolt(b.points,'rgb('+core+')',1.35,power*.96,7);if(b.age>b.duration)bolts.splice(i,1);}if(flash>0){flash=Math.max(0,flash-dt*.00125);var c=flashSide==='blue'?'67,139,255':'255,87,34',cx=flashSide==='blue'?w*.86:w*.12,grad=ctx.createRadialGradient(cx,h*.35,0,cx,h*.35,Math.max(w,h)*.72);grad.addColorStop(0,'rgba('+c+','+(flash*.5)+')');grad.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);}}
 function drawEmbers(now,dt){ctx.save();ctx.globalCompositeOperation='lighter';for(var i=0;i<embers.length;i++){var p=embers[i];p.age+=dt;p.phase+=p.tw;p.x+=p.vx*dt+Math.sin(now*.0005+p.phase)*p.curl*dt*.012;p.y-=p.vy*dt*.055;if(p.age>p.life||p.y<-18||p.x<-25||p.x>w+25){embers[i]=makeEmber(false);continue;}var life=Math.min(1,p.age/180,Math.max(0,(p.life-p.age)/260)),f=.5+.5*Math.sin(p.phase*1.9+Math.sin(now*.001+p.phase)),al=life*(.12+f*.65);glow(p.x,p.y,p.r*7,p.color,al*.22);ctx.fillStyle='rgba('+p.color+','+al+')';ctx.beginPath();ctx.arc(p.x,p.y,p.r*(.6+f*.55),0,6.283);ctx.fill();if(p.r>1.3&&f>.78){ctx.strokeStyle='rgba(255,190,105,'+(al*.22)+')';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.sin(p.phase)*3,p.y-5);ctx.stroke();}}ctx.restore();}
 function drawRain(dt){ctx.save();ctx.strokeStyle='rgba(100,171,255,.08)';ctx.lineWidth=.7;ctx.lineCap='round';for(var i=0;i<rain.length;i++){var d=rain[i];d.y+=d.v*dt*.05;d.x-=d.v*dt*.018;if(d.y>h+30||d.x<-30){rain[i]=makeRain();rain[i].y=-rand(0,100);continue;}ctx.globalAlpha=d.a;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-3,d.y+d.len);ctx.stroke();}ctx.restore();}
 function frame(now){raf=0;if(!active||disposed||document.hidden||root.classList.contains('is-done'))return;if(now-last<30){raf=requestAnimationFrame(frame);return;}var dt=last?Math.min(48,now-last):32;last=now;ctx.clearRect(0,0,w,h);drawSmoke(now,dt);drawRain(dt);drawEmbers(now,dt);drawLightning(now,dt);raf=requestAnimationFrame(frame);}
 function start(){if(disposed||motion.matches||document.hidden||root.classList.contains('is-done')||raf)return;active=true;last=0;nextFlash=performance.now()+rand(250,850);raf=requestAnimationFrame(frame);}
 function stop(){active=false;if(raf){cancelAnimationFrame(raf);raf=0;}ctx.clearRect(0,0,w,h);}
 function visibility(){if(document.hidden)stop();else start();}
 function resizeCanvas(){resize();if(active&&!raf)start();}
 resize();start();window.addEventListener('resize',resizeCanvas,{passive:true});document.addEventListener('visibilitychange',visibility);
 var observer=window.MutationObserver?new MutationObserver(function(){if(root.classList.contains('is-done'))stop();else start();}):null;if(observer)observer.observe(root,{attributes:true,attributeFilter:['class']});
 if(motion.addEventListener)motion.addEventListener('change',function(){if(motion.matches)stop();else start();});else if(motion.addListener)motion.addListener(function(){if(motion.matches)stop();else start();});
 window.addEventListener('pagehide',function(){disposed=true;stop();window.removeEventListener('resize',resizeCanvas);document.removeEventListener('visibilitychange',visibility);if(observer)observer.disconnect();},{once:true});
}());


/* v3.7.0 — animações progressivas e resposta neon ao ponteiro */
(function(){
  'use strict';
  var doc=document, root=doc.documentElement;
  var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  // Realce neon acompanha o ponteiro apenas em links e controles dourados.
  var targets=doc.querySelectorAll('.eyebrow,.section-label,.nav-link,.text-link,.button-primary,.button-secondary,.nav-cta,.line-icon,.mini-icon,.contact-link-icon,.project-footer a,.footer-social a,.gold-glow');
  targets.forEach(function(el){
    el.classList.add('gold-interactive');
    el.addEventListener('pointermove',function(e){
      if(e.pointerType==='touch') return;
      var rect=el.getBoundingClientRect();
      el.style.setProperty('--wp-pointer-x',(e.clientX-rect.left)+'px');
      el.style.setProperty('--wp-pointer-y',(e.clientY-rect.top)+'px');
    },{passive:true});
  });
  // Entrada suave por rolagem; conteúdo permanece visível se IntersectionObserver não existir.
  var reveal=doc.querySelectorAll('.section-heading,.value-card,.skill-panel,.project-card,.contact-form,.contact-copy,.intro-strip-inner,.hero-copy,.hero-visual');
  if(!('IntersectionObserver' in window)) return;
  doc.body.classList.add('wp-reveal-ready');
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('wp-visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:0.12,rootMargin:'0px 0px -35px 0px'});
  reveal.forEach(function(el,i){
    el.classList.add('wp-reveal');
    el.style.setProperty('--wp-reveal-delay',Math.min(i%4,3)*85+'ms');
    observer.observe(el);
  });
  window.addEventListener('pagehide',function(){observer.disconnect();},{once:true});
})();


/* v3.8.0 — rolagem total ao topo + microanimação das cinco áreas */
(function(){
 'use strict';
 var top=document.getElementById('back-to-top');
 if(top){
   top.addEventListener('click',function(e){
     e.preventDefault();
     window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
     if(history.replaceState) history.replaceState(null,'',location.pathname+location.search);
   });
 }
 var terms=['infraestrutura','desenvolvimento','automação','inteligência artificial','experiência digital'];
 var nodes=document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,strong,li');
 nodes.forEach(function(el){
   if(el.children.length>3) return;
   var txt=(el.textContent||'').trim().toLocaleLowerCase('pt-BR');
   if(terms.some(function(t){return txt===t || (txt.length<70 && txt.indexOf(t)!==-1 && el.children.length<=2);})){
     el.classList.add('capability-kinetic');
   }
 });
})();
