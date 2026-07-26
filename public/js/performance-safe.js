(function () {
  'use strict';

  var body = document.body;
  if (!body) return;

  var scrolling = false;
  var endTimer = 0;
  var idleDelay = 88;
  var lastY = window.scrollY;
  var samples = 0;

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function endScrolling() {
    window.clearTimeout(endTimer);
    endTimer = 0;
    if (!scrolling) return;
    scrolling = false;
    body.classList.remove('is-scrolling');
    emit('wagner:scroll-end', { y: window.scrollY });
  }

  function markScrolling() {
    var currentY = window.scrollY;
    if (currentY === lastY && scrolling) return;
    lastY = currentY;
    samples += 1;
    if (!scrolling) {
      scrolling = true;
      body.classList.add('is-scrolling');
      emit('wagner:scroll-start', { y: currentY });
    }
    window.clearTimeout(endTimer);
    endTimer = window.setTimeout(endScrolling, idleDelay);
  }

  window.addEventListener('scroll', markScrolling, { passive: true });
  if ('onscrollend' in window) window.addEventListener('scrollend', endScrolling, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) endScrolling();
  });

  window.WagnerScrollDiagnostics = {
    getState: function () {
      return { scrolling: scrolling, y: window.scrollY, samples: samples, nativeWheel: true };
    }
  };
}());
