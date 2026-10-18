(function () {
  'use strict';

  if (window.WagnerChatClient) return;

  var REQUEST_TIMEOUT_MS = 30000;

  function safeMessage(value, fallback) {
    var text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch (_) {
      return {};
    }
  }

  async function request(history) {
    if (!Array.isArray(history)) {
      throw new TypeError('Histórico de chat inválido.');
    }

    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: history }),
        signal: controller.signal
      });

      var data = await readJson(response);
      if (!response.ok) {
        var serverError = safeMessage(data.error, response.statusText || 'Falha no assistente.');
        var requestError = new Error('HTTP ' + response.status + ': ' + serverError);
        requestError.status = response.status;
        throw requestError;
      }

      var reply = '';
      if (Array.isArray(data.content)) {
        reply = data.content.map(function (block) {
          return block && typeof block.text === 'string' ? block.text : '';
        }).join('').trim();
      } else if (typeof data.text === 'string') {
        reply = data.text.trim();
      } else if (data.error) {
        throw new Error(String(data.error));
      }

      return { text: reply };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  window.WagnerChatClient = Object.freeze({ request: request });
}());
