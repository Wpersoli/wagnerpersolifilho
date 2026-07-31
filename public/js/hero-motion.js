(function () {
  'use strict';

  var hero = document.querySelector('.fidelity-hero');
  var stage = document.getElementById('heroFidelityStage');
  var canvas = document.getElementById('heroMotionCanvas');
  var energyButton = document.getElementById('heroEnergyToggle');
  if (!hero || !stage || !canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var width = 1;
  var height = 1;
  var dpr = 1;
  var particles = [];
  var sparks = [];
  var arcs = [];
  var raf = 0;
  var heroVisible = true;
  var pageVisible = !document.hidden;
  var scrollPaused = false;
  var lastTime = performance.now();
  var lastPaint = 0;
  var nextBurst = 0;
  var burstTimer = 0;
  var pointer = { x: .31, y: .56 };
  var pointerFrame = 0;
  var pointerEvent = null;

  var logoBox = { x: .045, y: .084, w: .443, h: .66 };
  var anchors = [
    [.095, .17], [.155, .14], [.235, .19], [.32, .16], [.39, .23],
    [.36, .37], [.29, .34], [.33, .46], [.29, .58], [.33, .73],
    [.255, .63], [.205, .52], [.16, .39], [.12, .28]
  ];

  function random(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function resize() {
    var rect = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, width > 1200 ? 1.2 : 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  function buildParticles() {
    var count = reduceMotion ? 16 : (width > 1100 ? 46 : width > 700 ? 32 : 20);
    particles = [];
    for (var i = 0; i < count; i += 1) {
      particles.push({
        x: random(.08, .48),
        y: random(.18, .80),
        r: random(.5, 1.9),
        speed: random(.015, .055),
        drift: random(-.018, .018),
        phase: random(0, Math.PI * 2),
        alpha: random(.18, .8)
      });
    }
  }

  function pointFromAnchor(anchor) {
    return { x: anchor[0] * width, y: anchor[1] * height };
  }

  function makeLightning(a, b, strength) {
    var start = pointFromAnchor(a);
    var end = pointFromAnchor(b);
    var points = [start];
    var segments = Math.max(8, Math.round(12 + strength * 8));
    for (var i = 1; i < segments; i += 1) {
      var t = i / segments;
      var x = start.x + (end.x - start.x) * t;
      var y = start.y + (end.y - start.y) * t;
      var dx = end.x - start.x;
      var dy = end.y - start.y;
      var len = Math.max(1, Math.hypot(dx, dy));
      var nx = -dy / len;
      var ny = dx / len;
      var jitter = Math.sin(t * Math.PI) * random(-11, 11) * strength;
      points.push({ x: x + nx * jitter, y: y + ny * jitter });
    }
    points.push(end);
    return { points: points, born: performance.now(), life: random(260, 620), strength: strength };
  }

  function triggerBurst(x, y) {
    var now = performance.now();
    var target = typeof x === 'number' ? { x: x / width, y: y / height } : anchors[Math.floor(random(3, anchors.length))];
    var originSet = [[.01, random(.12,.55)], [random(.16,.52), .01], [.52, random(.08,.4)]];
    for (var i = 0; i < (reduceMotion ? 2 : 5); i += 1) {
      var origin = originSet[i % originSet.length];
      arcs.push(makeLightning(origin, [target.x || target[0], target.y || target[1]], random(.75, 1.35)));
    }
    for (var s = 0; s < (reduceMotion ? 8 : 30); s += 1) {
      sparks.push({
        x: (target.x || target[0]) * width,
        y: (target.y || target[1]) * height,
        vx: random(-110, 110),
        vy: random(-145, 60),
        life: random(420, 1100),
        born: now,
        r: random(.6, 2.4)
      });
    }
    hero.classList.remove('is-motion-burst');
    void hero.offsetWidth;
    hero.classList.add('is-motion-burst');
    window.clearTimeout(burstTimer);
    burstTimer = window.setTimeout(function () { hero.classList.remove('is-motion-burst'); }, 760);
  }

  function drawGlowLine(points, alpha, widthLine) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(52, 178, 255,' + (alpha * .42).toFixed(3) + ')';
    ctx.lineWidth = widthLine * 7;
    ctx.shadowColor = 'rgba(29, 156, 255,' + alpha.toFixed(3) + ')';
    ctx.shadowBlur = 28;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(88, 220, 255,' + (alpha * .9).toFixed(3) + ')';
    ctx.lineWidth = widthLine * 2.1;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(247, 255, 255,' + Math.min(1, alpha * 1.2).toFixed(3) + ')';
    ctx.lineWidth = Math.max(.7, widthLine * .65);
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.restore();
  }

  function drawContourCurrent(time) {
    var t = time * .00022;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < anchors.length - 1; i += 1) {
      var a = pointFromAnchor(anchors[i]);
      var b = pointFromAnchor(anchors[i + 1]);
      var phase = (t + i * .083) % 1;
      var x = a.x + (b.x - a.x) * phase;
      var y = a.y + (b.y - a.y) * phase;
      var pulse = .55 + .45 * Math.sin(time * .007 + i);
      var grad = ctx.createRadialGradient(x, y, 0, x, y, 16 + 10 * pulse);
      grad.addColorStop(0, 'rgba(255,255,255,' + (.92 * pulse).toFixed(3) + ')');
      grad.addColorStop(.18, 'rgba(125,235,255,' + (.72 * pulse).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(25,120,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 18 + 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(dt, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < particles.length; i += 1) {
      var p = particles[i];
      p.y -= p.speed * dt;
      p.x += Math.sin(time * .0016 + p.phase) * p.drift * dt;
      if (p.y < .12) {
        p.y = random(.72, .86);
        p.x = random(.09, .47);
      }
      var x = p.x * width;
      var y = p.y * height;
      var flicker = .35 + .65 * Math.abs(Math.sin(time * .003 + p.phase));
      ctx.fillStyle = 'rgba(126,229,255,' + (p.alpha * flicker).toFixed(3) + ')';
      ctx.shadowColor = 'rgba(44,184,255,.85)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, p.r * flicker + .35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSparks(now) {
    var alive = [];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < sparks.length; i += 1) {
      var s = sparks[i];
      var age = now - s.born;
      if (age >= s.life) continue;
      var k = age / 1000;
      var alpha = Math.pow(1 - age / s.life, 1.6);
      var x = s.x + s.vx * k;
      var y = s.y + s.vy * k + 90 * k * k;
      ctx.fillStyle = 'rgba(235,254,255,' + alpha.toFixed(3) + ')';
      ctx.shadowColor = 'rgba(43,192,255,.95)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      alive.push(s);
    }
    sparks = alive;
    ctx.restore();
  }

  function drawArcs(now) {
    var alive = [];
    for (var i = 0; i < arcs.length; i += 1) {
      var arc = arcs[i];
      var age = now - arc.born;
      if (age >= arc.life) continue;
      var alpha = Math.pow(1 - age / arc.life, 1.4) * (.72 + Math.random() * .28);
      drawGlowLine(arc.points, alpha, arc.strength);
      alive.push(arc);
    }
    arcs = alive;
  }

  function engineVisible() {
    return heroVisible && pageVisible && !scrollPaused;
  }

  function stopLoop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function ensureLoop() {
    if (!raf && engineVisible()) raf = window.requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (!engineVisible()) return;
    if (now - lastPaint < 1000 / 40) {
      ensureLoop();
      return;
    }
    var dt = Math.min(40, Math.max(1, now - lastTime));
    lastTime = now;
    lastPaint = now;
    ctx.clearRect(0, 0, width, height);
    drawParticles(dt, now);
    drawContourCurrent(now);
    drawArcs(now);
    drawSparks(now);

    if (now >= nextBurst) {
      triggerBurst();
      var overdrive = hero.getAttribute('data-energy') === 'overdrive';
      nextBurst = now + random(overdrive ? 850 : 1500, overdrive ? 1550 : 2800);
    }
    ensureLoop();
  }

  function paintPointerMotion() {
    pointerFrame = 0;
    if (!pointerEvent || scrollPaused) return;
    var rect = stage.getBoundingClientRect();
    pointer.x = clamp((pointerEvent.clientX - rect.left) / rect.width, 0, 1);
    pointer.y = clamp((pointerEvent.clientY - rect.top) / rect.height, 0, 1);
    hero.style.setProperty('--hero-logo-shift-x', ((pointer.x - .5) * 18).toFixed(2) + 'px');
    hero.style.setProperty('--hero-logo-shift-y', ((pointer.y - .5) * 14).toFixed(2) + 'px');
  }

  stage.addEventListener('pointermove', function (event) {
    pointerEvent = event;
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(paintPointerMotion);
  }, { passive: true });

  stage.addEventListener('pointerleave', function () {
    pointerEvent = null;
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    hero.style.setProperty('--hero-logo-shift-x', '0px');
    hero.style.setProperty('--hero-logo-shift-y', '0px');
  }, { passive: true });

  stage.addEventListener('pointerdown', function (event) {
    var rect = stage.getBoundingClientRect();
    triggerBurst(event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: true });

  if (energyButton) {
    energyButton.addEventListener('click', function () {
      window.setTimeout(triggerBurst, 30);
    });
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize, { passive: true });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      heroVisible = Boolean(entries[0] && entries[0].isIntersecting);
      if (heroVisible) {
        lastTime = performance.now();
        lastPaint = 0;
        ensureLoop();
      } else {
        stopLoop();
      }
    }, { threshold: .02 }).observe(stage);
  }

  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
    if (pageVisible) {
      lastTime = performance.now();
      lastPaint = 0;
      ensureLoop();
    } else {
      stopLoop();
    }
  });

  document.addEventListener('wagner:scroll-start', function () {
    scrollPaused = true;
    stopLoop();
  });
  document.addEventListener('wagner:scroll-end', function () {
    scrollPaused = false;
    lastTime = performance.now();
    lastPaint = 0;
    ensureLoop();
  });

  resize();
  hero.setAttribute('data-motion-ready', 'true');
  nextBurst = performance.now() + 500;
  triggerBurst();
  ensureLoop();
}());
