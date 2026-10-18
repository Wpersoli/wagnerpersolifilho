(function () {
  'use strict';

  var chatClientPromise = null;

  function loadChatClient() {
    if (window.WagnerChatClient) return Promise.resolve(window.WagnerChatClient);
    if (chatClientPromise) return chatClientPromise;

    chatClientPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'js/chat-client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.feature = 'chat-client';
      script.onload = function () {
        if (window.WagnerChatClient) resolve(window.WagnerChatClient);
        else reject(new Error('Cliente do chat não inicializado.'));
      };
      script.onerror = function () {
        chatClientPromise = null;
        reject(new Error('Falha ao carregar o módulo do chat.'));
      };
      document.head.appendChild(script);
    });

    return chatClientPromise;
  }

  window.WagnerLoadChatClient = loadChatClient;

  function preloadOnIntent(element) {
    if (!element) return;
    var preload = function () { loadChatClient().catch(function () {}); };
    element.addEventListener('pointerenter', preload, { once: true, passive: true });
    element.addEventListener('focus', preload, { once: true });
    element.addEventListener('touchstart', preload, { once: true, passive: true });
  }

  preloadOnIntent(document.getElementById('fabChat'));
  preloadOnIntent(document.getElementById('assistantPreviewOpen'));

  var idlePreload = function () {
    if (document.visibilityState === 'visible') loadChatClient().catch(function () {});
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(idlePreload, { timeout: 5000 });
  } else {
    window.setTimeout(idlePreload, 3500);
  }
}());
