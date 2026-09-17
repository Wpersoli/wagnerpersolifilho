(function () {
  'use strict';

  var canvas = document.getElementById('matrixCanvas');
  if (!canvas || !canvas.getContext) return;

  var context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  var hero = document.querySelector('.hero');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fontSize = reduceMotion ? 17 : 14;
  var frameInterval = 1000 / (reduceMotion ? 18 : 30);
  var width = 1;
  var height = 1;
  var ratio = 1;
  var drops = [];
  var lastFrame = 0;
  var frames = 0;
  var active = false;
  var raf = 0;
  var glyphs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]'.split('');

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    ratio = Math.min(window.devicePixelRatio || 1, reduceMotion ? 1 : 1.25);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    var spacing = reduceMotion ? 24 : 14;
    var columns = Math.ceil(width / spacing);
    drops = new Array(columns);
    for (var index = 0; index < columns; index += 1) {
      drops[index] = Math.floor(Math.random() * -(height / fontSize));
    }
    context.clearRect(0, 0, width, height);
  }

  function isPostHero() {
    var threshold = hero ? Math.max(320, hero.offsetHeight * 0.62) : 420;
    return window.scrollY >= threshold;
  }

  function draw(now) {
    raf = window.requestAnimationFrame(draw);
    if (document.hidden || now - lastFrame < frameInterval) return;
    lastFrame = now;

    var shouldRun = isPostHero();
    if (!shouldRun) {
      if (active) context.clearRect(0, 0, width, height);
      active = false;
      return;
    }

    active = true;
    frames += 1;
    context.fillStyle = 'rgba(0, 4, 2, 0.075)';
    context.fillRect(0, 0, width, height);
    context.font = '600 ' + fontSize + 'px JetBrains Mono, Consolas, monospace';
    context.textAlign = 'center';

    var spacing = width / drops.length;
    for (var index = 0; index < drops.length; index += 1) {
      var glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      var x = index * spacing + spacing / 2;
      var y = drops[index] * fontSize;
      context.fillStyle = Math.random() > 0.965 ? '#d9ffe2' : '#00ff41';
      context.fillText(glyph, x, y);
      if (y > height && Math.random() > 0.972) drops[index] = 0;
      else drops[index] += 1;
    }
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 140);
  }, { passive: true });

  resize();
  raf = window.requestAnimationFrame(draw);

  window.WagnerMatrixRain = {
    getState: function () {
      return {
        active: active,
        frames: frames,
        columns: drops.length,
        fpsLimit: reduceMotion ? 18 : 30,
        width: width,
        height: height
      };
    },
    stop: function () {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}());
