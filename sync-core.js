/* ==========================================================
   Recanto dos Hábitos — núcleo da sincronização
   Não conhece o Firebase: conversa com um "backend" (sync.js) e com o app.
   Isso permite testar tudo sem internet.

   backend = {
     signIn(), signOut(),
     onAuth(cb)                 // cb({uid,email,name} | null)
     subscribe(cb, errCb)       // cb(estadoRemoto | null) a cada mudança; devolve função para cancelar
     transact(fn)               // lê o remoto, chama fn(remoto|null) -> estado a gravar, grava e devolve esse estado
   }
   app = { getState(), applyRemote(estado) }
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecantoSyncCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createSync(opts) {
    const { app, backend, merge, equal } = opts;
    const now = opts.now || Date.now;
    const setT = opts.setTimeout || setTimeout;
    const clearT = opts.clearTimeout || clearTimeout;

    let user = null, status = 'signedout', error = null, lastSync = null;
    let timer = null, retryTimer = null, busy = false, again = false, unsub = null;
    const listeners = [];

    const info = () => ({ configured: true, user, status, error, lastSync });
    const emit = () => listeners.slice().forEach((f) => { try { f(info()); } catch (e) { /* ignora */ } });
    const set = (s, e) => { status = s; error = e || null; emit(); };

    function schedule(ms) {
      if (!user) return;
      clearT(timer);
      timer = setT(push, ms == null ? 1500 : ms);
    }

    async function push() {
      if (!user) return;
      if (busy) { again = true; return; }
      busy = true; set('syncing');
      try {
        const written = await backend.transact((remote) => (remote ? merge(app.getState(), remote) : app.getState()));
        // o usuário pode ter mexido durante a gravação: junta de novo com o estado atual
        const cur = app.getState();
        const fin = merge(cur, written);
        if (!equal(fin, cur)) app.applyRemote(fin);
        if (!equal(fin, written)) again = true;
        lastSync = now(); clearT(retryTimer); set('ok');
      } catch (e) {
        set(e && e.offline ? 'offline' : 'error', (e && e.message) || String(e));
        clearT(retryTimer); retryTimer = setT(push, 30000);
      } finally {
        busy = false;
        if (again) { again = false; schedule(0); }
      }
    }

    function onRemote(remote) {
      if (!user || !remote) return;
      const cur = app.getState();
      const m = merge(cur, remote);
      if (!equal(m, cur)) app.applyRemote(m);
      if (!equal(m, remote)) schedule(500);
      else if (status === 'ok') { lastSync = now(); emit(); }
    }

    backend.onAuth((u) => {
      user = u;
      if (unsub) { try { unsub(); } catch (e) { /* ignora */ } unsub = null; }
      clearT(timer); clearT(retryTimer);
      if (!u) { set('signedout'); return; }
      set('syncing');
      unsub = backend.subscribe(onRemote, (e) => set(e && e.offline ? 'offline' : 'error', (e && e.message) || String(e)));
      push();
    });

    return {
      getInfo: info,
      onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
      signIn: () => backend.signIn(),
      signOut: () => backend.signOut(),
      syncNow() { clearT(timer); return push(); },
      notifyChanged() { schedule(); },
      notifyOnline() { return push(); }
    };
  }

  return { createSync };
});
