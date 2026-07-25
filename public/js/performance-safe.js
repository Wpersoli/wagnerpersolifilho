(function () {
  'use strict';

  var body = document.body;
  if (!body) return;

  var scrolling = false;
  var endTimer = 0;
  var idleDelay = 140;

  function emit(name) {
    document.dispatchEvent(new CustomEvent(name));
  }

  function endScrolling() {
    endTimer = 0;
    if (!scrolling) return;
    scrolling = false;
    body.classList.remove('is-scrolling');
    emit('wagner:scroll-end');
  }

  function markScrolling() {
    if (!scrolling) {
      scrolling = true;
      body.classList.add('is-scrolling');
      emit('wagner:scroll-start');
    }
    window.clearTimeout(endTimer);
    endTimer = window.setTimeout(endScrolling, idleDelay);
  }

  window.addEventListener('scroll', markScrolling, { passive: true });
  window.addEventListener('wheel', markScrolling, { passive: true });
  window.addEventListener('touchmove', markScrolling, { passive: true });
  if ('onscrollend' in window) window.addEventListener('scrollend', endScrolling, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) endScrolling();
  });
}());
