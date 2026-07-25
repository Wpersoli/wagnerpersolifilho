(function () {
  'use strict';

  var hero = document.querySelector('.cyber-hero');
  var canvas = document.getElementById('heroLightningCanvas');
  var flash = document.getElementById('heroElectricFlash');
  var energyButton = document.getElementById('heroEnergyToggle');
  var progress = document.querySelector('#scrollProgress span');
  var copyEmailButton = document.getElementById('copyEmailBtn');
  var copyEmailLabel = document.getElementById('copyEmailLabel');
  var reduceMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduceMotion = Boolean(reduceMotionQuery && reduceMotionQuery.matches);

  /* Scroll telemetry is frame-throttled to avoid layout work on every event. */
  var scrollFrame = 0;
  function paintScrollProgress() {
    scrollFrame = 0;
    if (!progress) return;
    var root = document.documentElement;
    var range = Math.max(1, root.scrollHeight - root.clientHeight);
    var value = Math.max(0, Math.min(1, window.scrollY / range));
    progress.style.width = (value * 100).toFixed(2) + '%';
  }
  function requestScrollPaint() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintScrollProgress);
  }
  window.addEventListener('scroll', requestScrollPaint, { passive: true });
  window.addEventListener('resize', requestScrollPaint, { passive: true });
  paintScrollProgress();

  /* Clipboard enhancement for the contact channel. */
  function legacyCopy(value) {
    var input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    input.remove();
    return copied;
  }

  function setCopiedState(copied) {
    if (!copyEmailButton || !copyEmailLabel) return;
    copyEmailButton.classList.toggle('is-copied', copied);
    copyEmailLabel.textContent = copied ? 'COPIADO ✓' : 'E-MAIL ⧉';
    window.setTimeout(function () {
      copyEmailButton.classList.remove('is-copied');
      copyEmailLabel.textContent = 'E-MAIL ⧉';
    }, 2200);
  }

  if (copyEmailButton) {
    copyEmailButton.addEventListener('click', function () {
      var email = copyEmailButton.getAttribute('data-email') || '';
      if (!email) return;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(function () {
          setCopiedState(true);
        }).catch(function () {
          setCopiedState(legacyCopy(email));
        });
      } else {
        setCopiedState(legacyCopy(email));
      }
    });
  }

  /* Global keyboard shortcuts. They never intercept form fields. */
  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)) return;
    var key = String(event.key || '').toLowerCase();
    if (key === 'p') {
      var presentation = document.getElementById('pmodeBtn') || document.getElementById('pmodeMobileBtn');
      if (presentation) presentation.click();
    } else if (key === 'c') {
      var chat = document.getElementById('fabChat');
      if (chat) chat.click();
    } else if (key === 't') {
      var terminal = document.getElementById('logs');
      if (terminal) terminal.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  });

  /* Electric hero engine: visibility-aware, DPR-capped and adaptive. */
  if (!hero || !canvas || reduceMotion) return;

  var ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  var width = 0;
  var height = 0;
  var dpr = 1;
  var bolts = [];
  var sparks = [];
  var raf = 0;
  var strikeTimer = 0;
  var overdrive = false;
  var pageVisible = !document.hidden;
  var heroVisible = true;
  var scrollPaused = false;
  var lastPointerStrike = 0;
  var hitTimer = 0;
  var quality = 'high';
  var maxBolts = 10;
  var maxSparks = 72;
  var logoAnchors = [
    [.095, .15], [.15, .18], [.22, .21], [.32, .17], [.42, .19],
    [.39, .29], [.31, .34], [.35, .47], [.29, .58], [.31, .73],
    [.25, .77], [.20, .63], [.15, .49], [.12, .37]
  ];

  function random(min, max) { return min + Math.random() * (max - min); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function engineVisible() { return pageVisible && heroVisible && !scrollPaused; }

  function resolveQuality() {
    var cores = navigator.hardwareConcurrency || 4;
    if (width < 720 || cores <= 2) quality = 'low';
    else if (width < 1180 || cores <= 4) quality = 'medium';
    else quality = 'high';
    maxBolts = quality === 'high' ? 11 : quality === 'medium' ? 8 : 5;
    maxSparks = quality === 'high' ? 72 : quality === 'medium' ? 48 : 26;
    hero.setAttribute('data-fx-quality', quality);
  }

  function resizeCanvas() {
    var rect = hero.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    resolveQuality();
    var cap = quality === 'high' ? 1.25 : quality === 'medium' ? 1.1 : 1;
    dpr = Math.min(cap, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildPath(startX, startY, endX, endY, displacement, detail) {
    var points = [{ x: startX, y: startY }, { x: endX, y: endY }];
    var offset = displacement;
    while (offset > detail) {
      var next = [points[0]];
      for (var i = 1; i < points.length; i += 1) {
        var a = points[i - 1];
        var b = points[i];
        var mx = (a.x + b.x) * .5;
        var my = (a.y + b.y) * .5;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var nx = -dy / length;
        var ny = dx / length;
        var jitter = random(-offset, offset);
        next.push({ x: mx + nx * jitter, y: my + ny * jitter });
        next.push(b);
      }
      points = next;
      offset *= .53;
    }
    return points;
  }

  function makeBolt(options) {
    var distance = Math.hypot(options.targetX - options.startX, options.targetY - options.startY);
    var detail = quality === 'low' ? 12 : quality === 'medium' ? 9 : 7;
    var points = buildPath(options.startX, options.startY, options.targetX, options.targetY, Math.min(88, distance * .13), detail);
    var branches = [];
    var branchCount = quality === 'low' ? Math.min(1, options.branches || 0) : options.branches || 0;

    for (var i = 0; i < branchCount; i += 1) {
      var index = Math.floor(random(points.length * .24, points.length * .78));
      var origin = points[clamp(index, 1, points.length - 2)];
      var angle = random(-1.35, 1.35);
      var length = random(55, 150) * (overdrive ? 1.22 : 1);
      var bx = clamp(origin.x + Math.cos(angle) * length, 3, width - 3);
      var by = clamp(origin.y + Math.sin(angle) * length, 3, height - 3);
      branches.push(buildPath(origin.x, origin.y, bx, by, 28, quality === 'high' ? 8 : 11));
    }

    return {
      points: points,
      branches: branches,
      born: performance.now(),
      duration: random(220, overdrive ? 510 : 390),
      width: random(1.05, overdrive ? 2.25 : 1.85),
      hue: Math.random() > .22 ? '72, 214, 255' : '238, 252, 255'
    };
  }

  function drawPath(points, alpha, lineWidth, rgb, blur) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(38, 187, 255,' + Math.min(.95, alpha).toFixed(3) + ')';
    ctx.shadowBlur = quality === 'low' ? Math.min(8, blur) : blur;
    ctx.stroke();
    ctx.restore();
  }

  function drawBolt(bolt, now) {
    var life = (now - bolt.born) / bolt.duration;
    if (life >= 1) return false;
    var flicker = .76 + Math.random() * .24;
    var alpha = Math.pow(1 - life, 1.5) * flicker;

    if (quality !== 'low') drawPath(bolt.points, alpha * .30, bolt.width * 7.5, '25, 130, 255', 34);
    drawPath(bolt.points, alpha * .78, bolt.width * 2.2, bolt.hue, 18);
    drawPath(bolt.points, Math.min(1, alpha * 1.24), Math.max(.65, bolt.width * .72), '245, 254, 255', 5);

    for (var i = 0; i < bolt.branches.length; i += 1) {
      drawPath(bolt.branches[i], alpha * .38, bolt.width * 1.18, '74, 211, 255', 13);
      drawPath(bolt.branches[i], alpha * .70, Math.max(.45, bolt.width * .42), '232, 252, 255', 4);
    }
    return true;
  }

  function emitSparks(x, y, count, force) {
    var total = Math.min(count || 18, maxSparks);
    for (var i = 0; i < total; i += 1) {
      var angle = random(-Math.PI * .92, -Math.PI * .08);
      var speed = random(22, force ? 150 : 96);
      sparks.push({
        x: x + random(-8, 8),
        y: y + random(-5, 5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: performance.now(),
        life: random(360, force ? 980 : 700),
        size: random(.7, force ? 2.5 : 1.8),
        hue: Math.random() > .24 ? '112,226,255' : '244,253,255'
      });
    }
    if (sparks.length > maxSparks) sparks.splice(0, sparks.length - maxSparks);
  }

  function drawSpark(spark, now) {
    var age = now - spark.born;
    if (age >= spark.life) return false;
    var t = age / 1000;
    var life = age / spark.life;
    spark.vy += 52 * (1 / 60);
    spark.x += spark.vx * (1 / 60);
    spark.y += spark.vy * (1 / 60);
    var alpha = Math.pow(1 - life, 1.7);
    ctx.save();
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + spark.hue + ',' + alpha.toFixed(3) + ')';
    ctx.shadowColor = 'rgba(46,193,255,' + Math.min(.95, alpha).toFixed(3) + ')';
    ctx.shadowBlur = quality === 'low' ? 5 : 12;
    ctx.fill();
    if (quality !== 'low') {
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * .025, spark.y - spark.vy * .025);
      ctx.strokeStyle = 'rgba(210,249,255,' + (alpha * .65).toFixed(3) + ')';
      ctx.lineWidth = Math.max(.45, spark.size * .6);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  function anchorPoint(index) {
    var anchor = logoAnchors[index % logoAnchors.length];
    return { x: width * anchor[0], y: height * anchor[1] };
  }

  function randomLogoTarget() {
    return anchorPoint(Math.floor(random(0, logoAnchors.length)));
  }

  function frame(now) {
    raf = 0;
    ctx.clearRect(0, 0, width, height);
    var active = [];
    for (var i = 0; i < bolts.length; i += 1) {
      if (drawBolt(bolts[i], now)) active.push(bolts[i]);
    }
    bolts = active;
    var activeSparks = [];
    for (var j = 0; j < sparks.length; j += 1) {
      if (drawSpark(sparks[j], now)) activeSparks.push(sparks[j]);
    }
    sparks = activeSparks;
    if ((bolts.length || sparks.length) && engineVisible()) raf = window.requestAnimationFrame(frame);
  }

  function ensureAnimation() {
    if (!raf && (bolts.length || sparks.length) && engineVisible()) raf = window.requestAnimationFrame(frame);
  }

  function activateFlash() {
    if (flash) {
      flash.classList.remove('is-active');
      void flash.offsetWidth;
      flash.classList.add('is-active');
    }
    hero.classList.remove('is-electrified');
    void hero.offsetWidth;
    hero.classList.add('is-electrified');
    window.clearTimeout(hitTimer);
    hitTimer = window.setTimeout(function () { hero.classList.remove('is-electrified'); }, 680);
  }

  function stageTarget() {
    if (Math.random() > .34) return randomLogoTarget();
    return { x: width * random(.245, .345), y: height * random(.69, .82) };
  }

  function pushBolt(options) {
    bolts.push(makeBolt(options));
    if (bolts.length > maxBolts) bolts.splice(0, bolts.length - maxBolts);
  }

  function strikeLogoChain(intense) {
    if (!engineVisible() || width < 10 || height < 10) return;
    var fromIndex = Math.floor(random(0, logoAnchors.length));
    var toIndex = (fromIndex + Math.floor(random(2, 7))) % logoAnchors.length;
    var from = anchorPoint(fromIndex);
    var to = anchorPoint(toIndex);
    pushBolt({
      startX: from.x,
      startY: from.y,
      targetX: to.x,
      targetY: to.y,
      branches: intense ? 3 : 1
    });
    if (intense) {
      var platform = { x: width * random(.27, .33), y: height * random(.70, .79) };
      pushBolt({
        startX: to.x,
        startY: to.y,
        targetX: platform.x,
        targetY: platform.y,
        branches: 3
      });
      emitSparks(platform.x, platform.y, quality === 'high' ? 28 : 16, true);
    } else if (Math.random() > .55) {
      emitSparks(to.x, to.y, quality === 'high' ? 8 : 5, false);
    }
    ensureAnimation();
  }

  function strike(mode, x, y) {
    if (!engineVisible() || width < 10 || height < 10) return;
    var target = typeof x === 'number' && typeof y === 'number' ? { x: x, y: y } : stageTarget();
    if (typeof x !== 'number' && Math.random() > (overdrive ? .25 : .48)) strikeLogoChain(mode === 'burst' || overdrive);
    var startSide = Math.random();
    var startX;
    var startY;
    if (startSide < .68) {
      startX = target.x + random(-width * .23, width * .24);
      startY = random(-20, height * .08);
    } else if (startSide < .84) {
      startX = random(-15, width * .04);
      startY = random(height * .12, height * .50);
    } else {
      startX = random(width * .52, width * .70);
      startY = random(height * .05, height * .34);
    }

    pushBolt({
      startX: startX,
      startY: startY,
      targetX: target.x,
      targetY: target.y,
      branches: mode === 'burst' ? 4 : (overdrive ? 3 : 2)
    });

    if (mode === 'burst') {
      pushBolt({
        startX: random(width * .02, width * .23),
        startY: random(height * .08, height * .40),
        targetX: target.x + random(-60, 55),
        targetY: target.y + random(-35, 30),
        branches: 3
      });
      if (quality !== 'low') {
        pushBolt({
          startX: random(width * .44, width * .64),
          startY: random(-12, height * .16),
          targetX: target.x + random(-40, 70),
          targetY: target.y + random(-20, 25),
          branches: 2
        });
      }
      emitSparks(target.x, target.y, quality === 'high' ? 34 : quality === 'medium' ? 22 : 12, true);
      activateFlash();
    } else if (Math.random() > .62) {
      emitSparks(target.x, target.y, quality === 'high' ? 12 : 7, false);
      activateFlash();
    }
    ensureAnimation();
  }

  function clearTimer() {
    if (strikeTimer) window.clearTimeout(strikeTimer);
    strikeTimer = 0;
  }

  function scheduleStrike(initial) {
    clearTimer();
    if (!engineVisible()) return;
    var minDelay = overdrive ? 720 : quality === 'low' ? 2800 : 1750;
    var maxDelay = overdrive ? 1550 : quality === 'low' ? 5200 : 3900;
    var delay = initial ? 620 : random(minDelay, maxDelay);
    strikeTimer = window.setTimeout(function () {
      strike(Math.random() > .82 ? 'burst' : 'normal');
      scheduleStrike(false);
    }, delay);
  }

  function setOverdrive(value, announce) {
    overdrive = Boolean(value);
    hero.setAttribute('data-energy', overdrive ? 'overdrive' : 'auto');
    if (energyButton) {
      energyButton.setAttribute('aria-pressed', String(overdrive));
      energyButton.textContent = overdrive ? 'ENERGY // MAX' : 'ENERGY // AUTO';
      energyButton.title = overdrive ? 'Reduzir intensidade elétrica (tecla E)' : 'Ativar intensidade elétrica máxima (tecla E)';
    }
    try { window.localStorage.setItem('wagner_energy_mode', overdrive ? 'max' : 'auto'); } catch (error) { /* optional */ }
    if (announce) strike('burst');
    scheduleStrike(false);
  }

  resizeCanvas();
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(hero);
  else window.addEventListener('resize', resizeCanvas, { passive: true });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      heroVisible = Boolean(entries[0] && entries[0].isIntersecting);
      if (heroVisible) scheduleStrike(true);
      else {
        clearTimer();
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        bolts = [];
        sparks = [];
        ctx.clearRect(0, 0, width, height);
      }
    }, { threshold: .04 }).observe(hero);
  }

  if (energyButton) energyButton.addEventListener('click', function () { setOverdrive(!overdrive, true); });

  var stage = hero.querySelector('.hero-brand-stage');
  if (stage) {
    stage.setAttribute('title', 'Clique para disparar uma descarga de energia');
    stage.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      var rect = hero.getBoundingClientRect();
      strike('burst', event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: true });
  }

  hero.addEventListener('pointermove', function (event) {
    if (!overdrive || event.pointerType !== 'mouse') return;
    var now = performance.now();
    if (now - lastPointerStrike < 1200 || Math.random() > .048) return;
    lastPointerStrike = now;
    var rect = hero.getBoundingClientRect();
    strike('normal', event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: true });

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (!event.ctrlKey && !event.metaKey && !event.altKey && String(event.key || '').toLowerCase() === 'e') {
      setOverdrive(!overdrive, true);
    }
  });

  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
    if (engineVisible()) scheduleStrike(true);
    else clearTimer();
  });

  document.addEventListener('wagner:scroll-start', function () {
    scrollPaused = true;
    clearTimer();
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  });

  document.addEventListener('wagner:scroll-end', function () {
    scrollPaused = false;
    if (engineVisible()) {
      ensureAnimation();
      scheduleStrike(false);
    }
  });

  if (reduceMotionQuery && typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', function (event) {
      if (event.matches) {
        clearTimer();
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        bolts = [];
        sparks = [];
        ctx.clearRect(0, 0, width, height);
      }
    });
  }

  var saved = 'auto';
  try { saved = window.localStorage.getItem('wagner_energy_mode') || 'auto'; } catch (error) { saved = 'auto'; }
  setOverdrive(saved === 'max', false);
  window.setTimeout(function () { strike('burst'); }, 760);
}());
