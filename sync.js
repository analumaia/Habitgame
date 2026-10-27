/* ==========================================================
   Recanto dos Hábitos — sincronização com o Firebase
   Login com Google + um documento por pessoa em  users/{uid}
   (campo "data" guarda o estado inteiro em JSON).
   Se firebase-config.js não estiver preenchido, o app segue só local.
   ========================================================== */
(function () {
  'use strict';
  const FIREBASE_VERSION = '10.12.2';
  const MAX_DOC_CHARS = 900000; // limite do Firestore é ~1 MiB por documento

  const cfg = window.FIREBASE_CONFIG;
  const configured = !!(cfg && cfg.apiKey && cfg.projectId && !/COLE|SEU_/i.test(cfg.apiKey + cfg.projectId));

  const ready = () => window.dispatchEvent(new Event('recanto:sync-ready'));
  const noop = () => { };

  function expose(api) { window.RecantoSync = api; ready(); }

  // ---- sem configuração: tudo continua funcionando só neste aparelho ----
  if (!configured || !window.RecantoMerge || !window.RecantoSyncCore) {
    expose({
      getInfo: () => ({ configured: false, user: null, status: 'off', error: null, lastSync: null }),
      onChange: () => noop, signIn: () => Promise.resolve(), signOut: () => Promise.resolve(),
      syncNow: () => Promise.resolve(), notifyChanged: noop, notifyOnline: noop
    });
    return;
  }

  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
  const friendly = (e) => {
    const code = (e && e.code) || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') { const x = new Error(''); x.silent = true; return x; }
    let msg = (e && e.message) || 'Algo deu errado.';
    if (code === 'auth/unauthorized-domain') msg = 'Este endereço ainda não foi autorizado no Firebase (Authentication → Settings → Authorized domains).';
    else if (code === 'auth/popup-blocked') msg = 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.';
    else if (code === 'permission-denied') msg = 'Sem permissão no Firestore. Confira as regras de segurança do guia.';
    else if (code === 'auth/operation-not-allowed') msg = 'O login com Google não está ativado no Firebase.';
    else if (code === 'auth/network-request-failed') msg = 'Sem conexão com a internet.';
    const out = new Error(msg); out.offline = code === 'unavailable' || code === 'auth/network-request-failed' || (typeof navigator !== 'undefined' && navigator.onLine === false);
    return out;
  };

  async function start() {
    const [appMod, authMod, fsMod] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')
    ]);
    const fbApp = appMod.initializeApp(cfg);
    const auth = authMod.getAuth(fbApp);
    const db = fsMod.getFirestore(fbApp);
    const ref = () => fsMod.doc(db, 'users', auth.currentUser.uid);
    const parse = (snap) => { try { return snap.exists() ? JSON.parse(snap.data().data) : null; } catch (e) { return null; } };

    const backend = {
      signIn: () => authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider()).catch((e) => { throw friendly(e); }),
      signOut: () => authMod.signOut(auth),
      onAuth: (cb) => authMod.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null)),
      subscribe: (cb, errCb) => fsMod.onSnapshot(ref(), (snap) => {
        if (snap.metadata.hasPendingWrites) return; // eco da nossa própria gravação
        cb(parse(snap));
      }, (e) => errCb(friendly(e))),
      transact: (fn) => fsMod.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref());
        const merged = fn(parse(snap));
        const json = JSON.stringify(merged);
        if (json.length > MAX_DOC_CHARS) throw new Error('Seu histórico ficou grande demais para a sincronização. Exporte um backup e me avise para dividirmos os dados por ano.');
        if (!snap.exists() || snap.data().data !== json) tx.set(ref(), { data: json, schema: 1, updatedAt: fsMod.serverTimestamp() });
        return merged;
      }).catch((e) => { throw e && e.message && !e.code ? e : friendly(e); })
    };

    const core = window.RecantoSyncCore.createSync({
      app: window.Recanto, backend, merge: window.RecantoMerge.merge, equal: window.RecantoMerge.equal
    });
    window.addEventListener('recanto:changed', () => core.notifyChanged());
    window.addEventListener('online', () => core.notifyOnline());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) core.syncNow(); });
    expose(core);
  }

  // enquanto o SDK carrega (ou se falhar, ex.: sem internet), o app mostra o estado
  let retry = null;
  const unavailable = (msg) => ({
    getInfo: () => ({ configured: true, user: null, status: 'unavailable', error: msg, lastSync: null }),
    onChange: () => noop, signIn: () => Promise.reject(new Error(msg)), signOut: () => Promise.resolve(),
    syncNow: () => Promise.resolve(), notifyChanged: noop, notifyOnline: noop
  });
  function boot() {
    start().catch((e) => {
      console.warn('Recanto: não consegui iniciar o Firebase', e);
      expose(unavailable('Não consegui carregar o Firebase. Verifique a internet e recarregue a página.'));
      if (!retry) retry = () => { window.removeEventListener('online', retry); boot(); };
      window.addEventListener('online', retry);
    });
  }
  boot();
})();
