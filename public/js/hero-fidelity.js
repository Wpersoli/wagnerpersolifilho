(function () {
  'use strict';

  var hero = document.querySelector('.fidelity-hero');
  var stage = document.getElementById('heroFidelityStage');
  var image = hero && hero.querySelector('.hero-fidelity-image');
  if (!hero || !stage || !image) return;

  function setReady() {
    hero.classList.add('is-fidelity-ready');
  }

  if (image.complete) {
    if (typeof image.decode === 'function') image.decode().then(setReady).catch(setReady);
    else setReady();
  } else {
    image.addEventListener('load', setReady, { once: true });
    image.addEventListener('error', function () {
      hero.classList.add('has-fidelity-image-error');
    }, { once: true });
  }

  /* Keyboard users can trigger the same electric response as pointer users. */
  stage.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    var rect = stage.getBoundingClientRect();
    var PointerCtor = window.PointerEvent || window.MouseEvent;
    stage.dispatchEvent(new PointerCtor('pointerdown', {
      bubbles: true,
      clientX: rect.left + rect.width * .31,
      clientY: rect.top + rect.height * .73,
      button: 0,
      pointerType: 'keyboard'
    }));
  });

  /* Mobile dock opens the exact existing chat implementation. */
  document.querySelectorAll('[data-open-chat="true"]').forEach(function (button) {
    button.addEventListener('click', function () {
      var chatButton = document.getElementById('fabChat');
      if (chatButton) chatButton.click();
    });
  });

  /* Hotspots receive a brief energy pulse while navigation/download continues. */
  stage.querySelectorAll('.hero-hotspot').forEach(function (hotspot) {
    hotspot.addEventListener('pointerdown', function () {
      hero.classList.remove('is-hotspot-active');
      void hero.offsetWidth;
      hero.classList.add('is-hotspot-active');
      window.setTimeout(function () { hero.classList.remove('is-hotspot-active'); }, 420);
    }, { passive: true });
  });

  function resetHeroMotion() {
    hero.style.setProperty('--hero-rx', '0deg');
    hero.style.setProperty('--hero-ry', '0deg');
    hero.style.setProperty('--hero-tx', '0px');
    hero.style.setProperty('--hero-ty', '0px');
    hero.style.setProperty('--hero-logo-shift-x', '0px');
    hero.style.setProperty('--hero-logo-shift-y', '0px');
    hero.style.setProperty('--hero-copy-shift-x', '0px');
    hero.style.setProperty('--hero-copy-shift-y', '0px');
  }

  function setHeroMotion(clientX, clientY) {
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var px = (clientX - rect.left) / rect.width;
    var py = (clientY - rect.top) / rect.height;
    var dx = (px - 0.5) * 2;
    var dy = (py - 0.5) * 2;
    hero.style.setProperty('--hero-pointer-x', (px * 100).toFixed(2) + '%');
    hero.style.setProperty('--hero-pointer-y', (py * 100).toFixed(2) + '%');
    hero.style.setProperty('--hero-rx', (-dy * 2.8).toFixed(2) + 'deg');
    hero.style.setProperty('--hero-ry', (dx * 3.6).toFixed(2) + 'deg');
    hero.style.setProperty('--hero-tx', (dx * 4.5).toFixed(2) + 'px');
    hero.style.setProperty('--hero-ty', (dy * 3.5).toFixed(2) + 'px');
    hero.style.setProperty('--hero-logo-shift-x', (dx * 9).toFixed(2) + 'px');
    hero.style.setProperty('--hero-logo-shift-y', (dy * 7).toFixed(2) + 'px');
    hero.style.setProperty('--hero-copy-shift-x', (dx * -6).toFixed(2) + 'px');
    hero.style.setProperty('--hero-copy-shift-y', (dy * -4).toFixed(2) + 'px');
  }

  var motionFrame = 0;
  var latestPointer = null;
  function paintHeroMotion() {
    motionFrame = 0;
    if (!latestPointer || (document.body && document.body.classList.contains('is-scrolling'))) return;
    setHeroMotion(latestPointer.clientX, latestPointer.clientY);
  }

  stage.addEventListener('pointermove', function (event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    latestPointer = event;
    if (!motionFrame) motionFrame = window.requestAnimationFrame(paintHeroMotion);
  }, { passive: true });

  stage.addEventListener('pointerleave', function () {
    latestPointer = null;
    if (motionFrame) window.cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    resetHeroMotion();
  }, { passive: true });
  stage.addEventListener('blur', resetHeroMotion, true);

  /* Prevent subtle perspective transforms from remaining stale after a tab restore. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    resetHeroMotion();
  });
}());
