/* WAGNER.OS v2.10.0 — resilient animated logo controller */
(function () {
  'use strict';

  var videos = Array.prototype.slice.call(document.querySelectorAll('.brand-motion-video'));
  if (!videos.length) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var pageVisible = !document.hidden;

  function canAnimate() {
    return pageVisible && !(reducedMotion && reducedMotion.matches);
  }

  function play(video) {
    if (!video || !canAnimate()) return;
    var promise;
    try {
      promise = video.play();
    } catch (err) {
      video.closest('.brand-video-mark, .boot-video-shell')?.classList.add('brand-video-paused');
      return;
    }
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {
        video.closest('.brand-video-mark, .boot-video-shell')?.classList.add('brand-video-paused');
      });
    }
  }

  function pause(video) {
    try { video.pause(); } catch (err) { /* noop */ }
  }

  videos.forEach(function (video) {
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');

    var ready = function () {
      video.classList.add('is-ready');
      var shell = video.closest('.brand-video-mark, .boot-video-shell');
      if (shell) shell.classList.remove('brand-video-paused');
      play(video);
    };

    if (video.readyState >= 2) ready();
    else video.addEventListener('loadeddata', ready, { once: true });

    video.addEventListener('error', function () {
      video.classList.remove('is-ready');
      var shell = video.closest('.brand-video-mark, .boot-video-shell');
      if (shell) shell.classList.add('brand-video-paused');
    });
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting && canAnimate()) play(video);
        else pause(video);
      });
    }, { threshold: 0.08 });
    videos.forEach(function (video) { observer.observe(video); });
  }

  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
    videos.forEach(function (video) {
      if (pageVisible) play(video);
      else pause(video);
    });
  });

  if (reducedMotion && typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', function () {
      videos.forEach(function (video) {
        if (canAnimate()) play(video);
        else pause(video);
      });
    });
  }

  var brandLink = document.querySelector('.brand-video-link');
  if (brandLink) {
    brandLink.addEventListener('pointerenter', function () {
      var video = brandLink.querySelector('.brand-motion-video');
      if (!video || !canAnimate()) return;
      video.classList.remove('is-burst');
      void video.offsetWidth;
      video.classList.add('is-burst');
      window.setTimeout(function () { video.classList.remove('is-burst'); }, 700);
    }, { passive: true });
  }
}());
