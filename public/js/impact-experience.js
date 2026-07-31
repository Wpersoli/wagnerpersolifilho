'use strict';
(function impactExperience() {
  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var scrolling = false;
  var pointerX = -100;
  var pointerY = -100;
  var previousPointerX = -100;
  var previousPointerY = -100;
  var pointerActive = false;
  var ringX = -100;
  var ringY = -100;
  var frame = 0;
  var parallaxFrame = 0;
  var resizeTimer = 0;
  var lastSparkAt = 0;
  var cursorDot = null;
  var cursorRing = null;
  var hero = document.getElementById('top');
  var chatPanel = document.getElementById('chatPanel');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.proj-card'));
  var projectVisuals = Array.prototype.slice.call(document.querySelectorAll('.project-visual'));
  var particleCanvas = null;
  var particleContext = null;
  var particleFrame = 0;
  var particleLastTime = 0;
  var particleOpacity = 0;
  var particleWidth = 0;
  var particleHeight = 0;
  var particleDpr = 1;
  var particles = [];
  var sparks = [];
  var particleSprites = [];
  var randomSeed = 0x5a17c0de;
  var palette = [
    { fill: '53,207,255', glow: '53,207,255' },
    { fill: '124,92,255', glow: '124,92,255' },
    { fill: '255,61,127', glow: '255,61,127' },
    { fill: '17,255,183', glow: '17,255,183' }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function seededRandom() {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  }

  function presentationActive() {
    return body.classList.contains('pmode-active') || body.classList.contains('pmode-visible') || body.classList.contains('presenting');
  }

  function protectedUiActive() {
    return Boolean(chatPanel && chatPanel.classList.contains('open')) || body.classList.contains('impact-chat-open');
  }

  function effectsSuppressed() {
    return document.hidden || presentationActive() || protectedUiActive();
  }

  function syncChatState() {
    body.classList.toggle('impact-chat-open', Boolean(chatPanel && chatPanel.classList.contains('open')));
  }

  function updateProjectParallax() {
    parallaxFrame = 0;
    if (reduceMotion.matches || presentationActive()) return;
    var viewportCenter = window.innerHeight * .5;
    projectVisuals.forEach(function (visual) {
      var rect = visual.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > window.innerHeight + 120) return;
      var center = rect.top + rect.height * .5;
      var offset = clamp((viewportCenter - center) * .022, -11, 11);
      visual.style.setProperty('--impact-parallax-y', offset.toFixed(2) + 'px');
    });
  }

  function scheduleProjectParallax() {
    if (parallaxFrame) return;
    parallaxFrame = window.requestAnimationFrame(updateProjectParallax);
  }

  function setScrollVariables() {
    frame = 0;
    var y = Math.max(0, window.scrollY || 0);
    root.style.setProperty('--impact-scroll', String(Math.min(18, y * .008)));
    updateProjectParallax();
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
      previousPointerX = pointerX;
      previousPointerY = pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerActive = true;
      if (cursorDot) cursorDot.style.transform = 'translate3d(' + pointerX + 'px,' + pointerY + 'px,0)';
      if (!body.classList.contains('impact-cursor-ready')) body.classList.add('impact-cursor-ready');
      createPointerSparks(event.timeStamp || performance.now());
    }, { passive: true });

    document.addEventListener('pointerover', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a,button,[role="button"],.proj-card,.stack-group') : null;
      body.classList.toggle('impact-cursor-hover', Boolean(target));
      var protectedUi = event.target && event.target.closest ? event.target.closest('#chatPanel,input,textarea,select,.pmode-controls,.pmode-balloon,.pmode-modal-bg,.mobile-nav,.cookie-banner') : null;
      body.classList.toggle('impact-ui-focus', Boolean(protectedUi));
    }, { passive: true });

    document.addEventListener('pointerout', function (event) {
      if (!event.relatedTarget) {
        pointerActive = false;
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
        var x = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 0, 100);
        var y = clamp(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 0, 100);
        card.style.setProperty('--impact-glare-x', x.toFixed(1) + '%');
        card.style.setProperty('--impact-glare-y', y.toFixed(1) + '%');
        card.style.setProperty('--impact-glare-strength', '1');
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--impact-glare-strength', '0');
      }, { passive: true });
    });
  }



  function buildParticleSprites() {
    particleSprites = palette.map(function (color) {
      var sprite = document.createElement('canvas');
      var size = 36;
      sprite.width = size;
      sprite.height = size;
      var spriteContext = sprite.getContext('2d', { alpha: true });
      var gradient = spriteContext.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(' + color.fill + ',1)');
      gradient.addColorStop(.16, 'rgba(' + color.fill + ',.88)');
      gradient.addColorStop(.42, 'rgba(' + color.glow + ',.30)');
      gradient.addColorStop(1, 'rgba(' + color.glow + ',0)');
      spriteContext.fillStyle = gradient;
      spriteContext.fillRect(0, 0, size, size);
      return sprite;
    });
  }

  function particleCountForViewport() {
    var count = particleWidth < 700 ? 18 : particleWidth < 1100 ? 34 : 58;
    var cores = Number(navigator.hardwareConcurrency || 4);
    if (cores <= 4) count = Math.round(count * .72);
    return count;
  }

  function makeParticle(index) {
    var depth = .45 + seededRandom() * .85;
    return {
      x: seededRandom() * particleWidth,
      y: seededRandom() * particleHeight,
      vx: (seededRandom() - .5) * .018 * depth,
      vy: (-.010 - seededRandom() * .022) * depth,
      radius: (.48 + seededRandom() * 1.18) * depth,
      alpha: .18 + seededRandom() * .56,
      phase: seededRandom() * Math.PI * 2,
      drift: .00035 + seededRandom() * .00065,
      color: palette[index % palette.length],
      spriteIndex: index % palette.length,
      depth: depth
    };
  }

  function rebuildParticles() {
    var target = particleCountForViewport();
    particles = [];
    for (var i = 0; i < target; i += 1) particles.push(makeParticle(i));
    sparks = [];
  }

  function resizeParticleLayer() {
    resizeTimer = 0;
    if (!particleCanvas || !particleContext) return;
    particleWidth = Math.max(1, window.innerWidth);
    particleHeight = Math.max(1, window.innerHeight);
    particleDpr = Math.min(window.devicePixelRatio || 1, particleWidth < 700 ? 1.2 : 1.5);
    particleCanvas.width = Math.round(particleWidth * particleDpr);
    particleCanvas.height = Math.round(particleHeight * particleDpr);
    particleCanvas.style.width = particleWidth + 'px';
    particleCanvas.style.height = particleHeight + 'px';
    particleContext.setTransform(particleDpr, 0, 0, particleDpr, 0, 0);
    rebuildParticles();
  }

  function scheduleParticleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeParticleLayer, 120);
  }

  function createPointerSparks(now) {
    if (!particleContext || !pointerActive || scrolling || effectsSuppressed() || now - lastSparkAt < 26) return;
    if (previousPointerX < 0 || previousPointerY < 0) return;
    lastSparkAt = now;
    var dx = pointerX - previousPointerX;
    var dy = pointerY - previousPointerY;
    var speed = Math.sqrt(dx * dx + dy * dy);
    if (speed < 2) return;
    var amount = speed > 18 ? 2 : 1;
    for (var i = 0; i < amount; i += 1) {
      var spriteIndex = (sparks.length + i) % palette.length;
      var color = palette[spriteIndex];
      sparks.push({
        x: pointerX + (seededRandom() - .5) * 7,
        y: pointerY + (seededRandom() - .5) * 7,
        vx: -dx * (.014 + seededRandom() * .014) + (seededRandom() - .5) * .12,
        vy: -dy * (.014 + seededRandom() * .014) + (seededRandom() - .5) * .12,
        life: 1,
        radius: .7 + seededRandom() * 1.25,
        color: color,
        spriteIndex: spriteIndex
      });
    }
    if (sparks.length > 44) sparks.splice(0, sparks.length - 44);
  }

  function drawPointerHalo(context, alpha, time) {
    if (!pointerActive || !finePointer.matches || pointerX < 0 || pointerY < 0 || effectsSuppressed() || scrolling) return;
    var pulse = .5 + Math.sin(time * .0032) * .5;
    context.save();
    context.globalAlpha = alpha * (.24 + pulse * .08);
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(124,92,255,.76)';
    context.shadowColor = 'rgba(53,207,255,.55)';
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(pointerX, pointerY, 24 + pulse * 3, 0, Math.PI * 1.62);
    context.stroke();
    context.globalAlpha = alpha * .18;
    context.strokeStyle = 'rgba(53,207,255,.62)';
    context.beginPath();
    context.arc(pointerX, pointerY, 34 - pulse * 2, Math.PI * .78, Math.PI * 1.82);
    context.stroke();
    context.restore();
  }

  function drawParticleLayer(time) {
    particleFrame = 0;
    if (!particleContext || !particleCanvas) return;
    var minimumFrame = scrolling ? 54 : 30;
    if (particleLastTime && time - particleLastTime < minimumFrame) {
      particleFrame = window.requestAnimationFrame(drawParticleLayer);
      return;
    }
    var delta = particleLastTime ? clamp(time - particleLastTime, 0, 58) : 33.33;
    particleLastTime = time;
    var targetOpacity = effectsSuppressed() ? 0 : scrolling ? .35 : 1;
    particleOpacity += (targetOpacity - particleOpacity) * .085;
    particleContext.clearRect(0, 0, particleWidth, particleHeight);

    if (particleOpacity > .008) {
      particleContext.save();
      particleContext.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i += 1) {
        var particle = particles[i];
        var sway = Math.sin(time * particle.drift + particle.phase) * .006 * delta * particle.depth;
        particle.vx += sway * .018;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        if (pointerActive && !scrolling && !effectsSuppressed()) {
          var pdx = pointerX - particle.x;
          var pdy = pointerY - particle.y;
          var distanceSquared = pdx * pdx + pdy * pdy;
          if (distanceSquared > 36 && distanceSquared < 25000) {
            var distance = Math.sqrt(distanceSquared);
            var strength = (1 - distance / 158) * .00058 * delta * particle.depth;
            particle.vx += (-pdy / distance) * strength;
            particle.vy += (pdx / distance) * strength;
          }
        }

        particle.vx *= .9975;
        particle.vy = Math.min(-.004, particle.vy * .9996);
        if (particle.x < -18) particle.x = particleWidth + 18;
        else if (particle.x > particleWidth + 18) particle.x = -18;
        if (particle.y < -18) {
          particle.y = particleHeight + 18;
          particle.x = seededRandom() * particleWidth;
        }

        var pulse = .72 + Math.sin(time * .0017 + particle.phase) * .28;
        var alpha = particle.alpha * pulse * particleOpacity;
        var particleSize = (9 + particle.radius * 8) * pulse;
        particleContext.globalAlpha = alpha;
        particleContext.drawImage(
          particleSprites[particle.spriteIndex],
          particle.x - particleSize * .5,
          particle.y - particleSize * .5,
          particleSize,
          particleSize
        );
      }

      for (var s = sparks.length - 1; s >= 0; s -= 1) {
        var spark = sparks[s];
        spark.life -= delta * .00245;
        if (spark.life <= 0) {
          sparks.splice(s, 1);
          continue;
        }
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;
        spark.vx *= .982;
        spark.vy *= .982;
        var sparkAlpha = spark.life * .72 * particleOpacity;
        var sparkSize = (8 + spark.radius * 7) * spark.life;
        particleContext.globalAlpha = sparkAlpha;
        particleContext.drawImage(
          particleSprites[spark.spriteIndex],
          spark.x - sparkSize * .5,
          spark.y - sparkSize * .5,
          sparkSize,
          sparkSize
        );
      }
      particleContext.globalAlpha = 1;
      particleContext.restore();
      drawPointerHalo(particleContext, particleOpacity, time);
    }
    particleFrame = window.requestAnimationFrame(drawParticleLayer);
  }

  function createParticleLayer() {
    if (reduceMotion.matches || !document.createElement('canvas').getContext) return;
    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'impactParticleLayer';
    particleCanvas.className = 'impact-particle-layer';
    particleCanvas.setAttribute('aria-hidden', 'true');
    particleCanvas.setAttribute('role', 'presentation');
    body.appendChild(particleCanvas);
    particleContext = particleCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!particleContext) {
      particleCanvas.remove();
      particleCanvas = null;
      return;
    }
    buildParticleSprites();
    resizeParticleLayer();
    particleFrame = window.requestAnimationFrame(drawParticleLayer);
  }

  function observeProtectedStates() {
    syncChatState();
    if (!chatPanel || typeof MutationObserver === 'undefined') return;
    new MutationObserver(syncChatState).observe(chatPanel, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  }

  window.addEventListener('scroll', scheduleScrollVariables, { passive: true });
  window.addEventListener('resize', function () {
    scheduleScrollVariables();
    scheduleProjectParallax();
    scheduleParticleResize();
  }, { passive: true });
  window.addEventListener('wagner:scroll-start', function () {
    scrolling = true;
    cards.forEach(function (card) { card.style.setProperty('--impact-glare-strength', '0'); });
  });
  window.addEventListener('wagner:scroll-end', function () {
    scrolling = false;
    scheduleProjectParallax();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) body.classList.remove('impact-cursor-ready');
  });

  body.classList.add('impact-enhanced');
  setScrollVariables();
  observeProtectedStates();
  createCursor();
  createParticleLayer();
  bindHeroMotion();
  bindCardGlare();

  window.addEventListener('pagehide', function () {
    if (particleFrame) window.cancelAnimationFrame(particleFrame);
    if (frame) window.cancelAnimationFrame(frame);
    if (parallaxFrame) window.cancelAnimationFrame(parallaxFrame);
  }, { once: true });
}());
