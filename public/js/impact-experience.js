'use strict';
(function impactExperience() {
  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var scrolling = false;
  var pointerX = -100;
  var pointerY = -100;
  var ringX = -100;
  var ringY = -100;
  var frame = 0;
  var cursorDot = null;
  var cursorRing = null;
  var hero = document.getElementById('top');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.proj-card'));

  function presentationActive() {
    return body.classList.contains('pmode-active') || body.classList.contains('pmode-visible') || body.classList.contains('presenting');
  }

  function setScrollVariables() {
    frame = 0;
    var y = Math.max(0, window.scrollY || 0);
    root.style.setProperty('--impact-scroll', String(Math.min(18, y * .008)));
  }

  function scheduleScrollVariables() {
    if (frame) return;
    frame = window.requestAnimationFrame(setScrollVariables);
  }

  function createCursor() {
    if (!finePointer.matches || reduceMotion.matches) return;
    cursorDot = document.createElement('span');
    cursorRing = document.createElement('span');
    cursorDot.className = 'impact-cursor-dot';
    cursorRing.className = 'impact-cursor-ring';
    cursorDot.setAttribute('aria-hidden', 'true');
    cursorRing.setAttribute('aria-hidden', 'true');
    body.appendChild(cursorDot);
    body.appendChild(cursorRing);

    document.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (cursorDot) cursorDot.style.transform = 'translate3d(' + pointerX + 'px,' + pointerY + 'px,0)';
      if (!body.classList.contains('impact-cursor-ready')) body.classList.add('impact-cursor-ready');
    }, { passive: true });

    document.addEventListener('pointerover', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a,button,[role="button"],.proj-card,.stack-group') : null;
      body.classList.toggle('impact-cursor-hover', Boolean(target));
      var protectedUi = event.target && event.target.closest ? event.target.closest('#chatPanel,input,textarea,select,.pmode-controls,.pmode-balloon,.pmode-modal-bg') : null;
      body.classList.toggle('impact-ui-focus', Boolean(protectedUi));
    }, { passive: true });

    document.addEventListener('pointerout', function (event) {
      if (!event.relatedTarget) {
        body.classList.remove('impact-cursor-ready', 'impact-cursor-hover', 'impact-ui-focus');
      }
    }, { passive: true });

    function animateCursor() {
      if (cursorRing && !document.hidden && !scrolling && !presentationActive()) {
        ringX += (pointerX - ringX) * .16;
        ringY += (pointerY - ringY) * .16;
        cursorRing.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0)';
      }
      window.requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  function bindHeroMotion() {
    if (!hero || reduceMotion.matches || !finePointer.matches) return;
    hero.addEventListener('pointermove', function (event) {
      if (scrolling || presentationActive()) return;
      var rect = hero.getBoundingClientRect();
      var nx = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
      var ny = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
      root.style.setProperty('--impact-hero-x', (nx * 18).toFixed(2) + 'px');
      root.style.setProperty('--impact-hero-y', (ny * 12).toFixed(2) + 'px');
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      root.style.setProperty('--impact-hero-x', '0px');
      root.style.setProperty('--impact-hero-y', '0px');
    }, { passive: true });
  }

  function bindCardGlare() {
    if (reduceMotion.matches || !finePointer.matches) return;
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        if (scrolling || presentationActive()) return;
        var rect = card.getBoundingClientRect();
        var x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100));
        var y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100));
        card.style.setProperty('--impact-glare-x', x.toFixed(1) + '%');
        card.style.setProperty('--impact-glare-y', y.toFixed(1) + '%');
        card.style.setProperty('--impact-glare-strength', '1');
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--impact-glare-strength', '0');
      }, { passive: true });
    });
  }

  window.addEventListener('scroll', scheduleScrollVariables, { passive: true });
  window.addEventListener('wagner:scroll-start', function () {
    scrolling = true;
    cards.forEach(function (card) { card.style.setProperty('--impact-glare-strength', '0'); });
  });
  window.addEventListener('wagner:scroll-end', function () { scrolling = false; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) body.classList.remove('impact-cursor-ready');
  });

  setScrollVariables();
  createCursor();
  bindHeroMotion();
  bindCardGlare();
}());
