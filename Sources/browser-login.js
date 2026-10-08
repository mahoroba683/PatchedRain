/* Rain-specific consumer for the authenticated OpenInDiscord handoff. */
(function () {
  'use strict';
  var bridge = globalThis.__RAIN_BROWSER_LOGIN__;
  if (typeof bridge !== 'function') return;
  var diagnostic = globalThis.__RAIN_BROWSER_LOGIN_STATUS__ = {ready:false, applied:false, error:null};
  var failures=0;
  function refreshRuntime() {
    var updater=null;
    try {
      if (typeof globalThis.__turboModuleProxy==='function')
        updater=globalThis.__turboModuleProxy('BundleUpdaterManager');
    } catch (_) {}
    try {
      if (!updater && globalThis.nativeModuleProxy)
        updater=globalThis.nativeModuleProxy.BundleUpdaterManager;
      if (!updater || typeof updater.reload!=='function') {
        diagnostic.refresh='unavailable';
        console.warn('[Rain Browser Login] Session saved; reopen Discord if the login screen remains');
        return;
      }
      diagnostic.refresh='requested';
      var result=updater.reload();
      if(result && typeof result.catch==='function')result.catch(function(){diagnostic.refresh='failed';});
    } catch (_) { diagnostic.refresh='failed'; }
  }
  setInterval(function () {
    if (diagnostic.applied) return;
    try {
      var metro=globalThis.rain && globalThis.rain.metro;
      if (!metro || typeof metro.findByProps !== 'function') return;
      var auth=metro.findByProps('getToken','setToken');
      if (!auth || typeof auth.getToken !== 'function' || typeof auth.setToken !== 'function') return;
      bridge('auth', auth.getToken() ? '1' : '0');
      diagnostic.nativePhase=bridge('status') || null;
      diagnostic.ready=true;
      var token=bridge('peek');
      if (!token) return;
      // Only report completion after Discord actually accepts the same token.
      auth.setToken(token);
      if (auth.getToken() !== token) throw new Error('Discord did not retain the browser session');
      bridge('ack',token);
      diagnostic.nativePhase=bridge('status') || diagnostic.nativePhase;
      diagnostic.applied=true;
      diagnostic.error=null;
      // Let auth persistence and the URL callback settle before rebuilding JS.
      // Never fall back to the tweak's suspend/exit reload helper.
      setTimeout(refreshRuntime, 750);
    } catch (_) {
      // Never print session tokens, callback URLs, or token-bearing exceptions.
      diagnostic.error='Browser login application failed';
      if (++failures===3) console.warn('[Rain Browser Login] Could not apply browser session');
    }
  }, 500);
})();

/* Language selection belongs to Discord. All bundled intl assets are restored
 * during packaging; do not override LocaleStore or the account preference. */
globalThis.__RAIN_LOCALE_FIX__={mode:'discord',requested:null,applied:false,error:null};
