'use strict';

/* Chromium releases file descriptors and shared-memory segments
   asynchronously after the E2E process exits. A short deterministic pause
   prevents the following visual audit from attaching to a half-closed browser
   process on GitHub Actions and Windows runners. */
var waitMs = Number(process.env.CI_BROWSER_SETTLE_MS || 5000);
if (!Number.isFinite(waitMs) || waitMs < 250 || waitMs > 10000) waitMs = 5000;
setTimeout(function () {
  process.stdout.write('Browser test environment settled.\n');
}, waitMs);
