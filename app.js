/* ==========================================================
   Recanto dos Hábitos — mini RPG cozy de hábitos
   Site 100% estático: os dados ficam no navegador (localStorage).
   ========================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     CONFIGURAÇÕES DO JOGO (fáceis de ajustar)
     --------------------------------------------------------- */
  const KEY = 'recanto-dos-habitos:v1';
  const DEFAULT_PTS_HABIT = 10;   // pontos por hábito concluído
  const DEFAULT_PTS_QUEST = 50;   // pontos por quest concluída
  const WEEK_START = 0;           // 0 = semana começa no domingo, 1 = na segunda

  // XP necessário para sair do nível L e ir para L+1
  const xpNeed = (L) => 120 + 40 * (L - 1);

  const TITLES = [
    'Visitante curiosa', 'Nova moradora', 'Aprendiz de jardim', 'Jardineira', 'Padeira de domingo',
    'Cozinheira do recanto', 'Guardiã da horta', 'Sábia da floresta', 'Mestra do recanto', 'Lenda do recanto'
  ];
  // O que o recanto ganha ao chegar em cada nível
  const UNLOCKS = {
    2: 'flores no jardim', 3: 'uma árvore frondosa', 4: 'uma cerquinha de madeira', 5: 'uma segunda árvore',
    6: 'um laguinho', 7: 'um lampião na entrada', 8: 'uma horta', 10: 'um gatinho de guarda'
  };

  const DAY_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DAY_NAME = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const MONTH_NAME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const HABIT_ICONS = ['🌱', '💧', '🏃', '📚', '🧘', '🛏️', '🍎', '🦷', '✍️', '🎧', '🧹', '☕', '🌞', '📝', '🐶', '🎨', '💪', '🥗', '🧺', '🌙'];
  const ITEM_ICONS = ['☕', '🍰', '🎬', '🛁', '📖', '🎮', '🍫', '🧁', '🛍️', '💆', '🍕', '🎧', '🌸', '🧋', '🌿', '🎁', '🧶', '🕯️', '🍷', '🛋️'];

  const DEFAULT_SHOP = [
    ['☕', 'Café especial na rua', 40], ['🍫', 'Chocolate favorito', 30], ['🎬', 'Filme ou episódio sem culpa', 50],
    ['🛁', 'Banho demorado com música', 60], ['🍰', 'Sobremesa especial', 80], ['🌿', 'Planta nova', 150],
    ['📖', 'Livro novo', 200], ['🎁', 'Presente surpresa pra mim', 300]
  ];

  /* ---------------------------------------------------------
     UTILITÁRIOS
     --------------------------------------------------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const startOfWeek = (d) => addDays(d, -((d.getDay() - WEEK_START + 7) % 7));
  const fmtShort = (ds) => { const [, m, d] = ds.split('-'); return `${d}/${m}`; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const isFem = (wd) => wd >= 1 && wd <= 5;
  const ordLabel = (n, wd) => (n === -1 ? (isFem(wd) ? 'Última' : 'Último') : `${n}${isFem(wd) ? 'ª' : 'º'}`);

  const COIN = '<svg class="ico" width="18" height="18" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="4" height="8" fill="#e8a93a"/><rect x="0" y="2" width="8" height="4" fill="#e8a93a"/><rect x="1" y="1" width="6" height="6" fill="#e8a93a"/><rect x="3" y="2" width="2" height="4" fill="#fbe08a"/></svg>';
  const CHECK = '<svg viewBox="0 0 9 9" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">' +
    [[1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [1, 5], [2, 6], [3, 7]]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join('') + '</svg>';

  /* ---------------------------------------------------------
     ESTADO
     --------------------------------------------------------- */
  const defaultShop = () => DEFAULT_SHOP.map(([icon, name, cost]) => ({ id: uid(), icon, name, cost }));
  const defaultState = () => ({
    v: 1,
    profile: { name: '', avatar: null, onboarded: false },
    settings: { sound: true, theme: 'auto', ptsHabit: DEFAULT_PTS_HABIT, ptsQuest: DEFAULT_PTS_QUEST },
    habits: [],          // {id,title,notes,icon,freq,days,monthMode,monthDay,monthNth,monthWeekday,createdAt,deleted}
    comps: {},           // { habitId: { 'YYYY-MM-DD': pontosGanhos } }
    quests: [],          // {id,title,notes,steps:[{id,text,done}],pts,due,main,done,doneAt,awarded}
    shop: defaultShop(), // {id,icon,name,cost}
    purchases: [],       // {id,name,icon,cost,at}
    achievements: {},    // { id: 'YYYY-MM-DD' }
    ui: { tab: 'habits', filter: 'today' }
  });

  let storageOk = true;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { storageOk = false; }
    return defaultState();
  }
  function migrate(o) {
    const d = defaultState();
    const s = Object.assign(d, o);
    s.profile = Object.assign(defaultState().profile, o.profile || {});
    s.settings = Object.assign(defaultState().settings, o.settings || {});
    s.ui = Object.assign({ tab: 'habits', filter: 'today' }, o.ui || {});
    ['habits', 'quests', 'shop', 'purchases'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.comps || typeof s.comps !== 'object') s.comps = {};
    if (!s.achievements || typeof s.achievements !== 'object') s.achievements = {};
    return s;
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
    catch (e) { if (storageOk) { storageOk = false; toast('Não consegui salvar neste navegador. Faça um backup em Perfil.'); } }
  }

  /* ---------------------------------------------------------
     REGRAS: agenda dos hábitos
     --------------------------------------------------------- */
  const activeHabits = () => S.habits.filter((h) => !h.deleted);
  const habitById = (id) => S.habits.find((h) => h.id === id);
  const isDone = (h, ds) => !!(S.comps[h.id] && S.comps[h.id][ds]);

  // dia do mês em que um hábito mensal cai em (ano, mês)
  function monthlyDay(h, y, m) {
    const dim = daysInMonth(y, m);
    if (h.monthMode === 'weekday') {
      const wd = h.monthWeekday;
      if (h.monthNth === -1) {
        const lastWd = new Date(y, m, dim).getDay();
        return dim - ((lastWd - wd + 7) % 7);
      }
      const firstWd = new Date(y, m, 1).getDay();
      return 1 + ((wd - firstWd + 7) % 7) + (h.monthNth - 1) * 7;
    }
    return Math.min(h.monthDay, dim);
  }
  const monthlyStr = (h, y, m) => `${y}-${pad(m + 1)}-${pad(monthlyDay(h, y, m))}`;

  function isDue(h, d) {
    if (ymd(d) < h.createdAt) return false;
    if (h.freq === 'daily') return true;
    if (h.freq === 'weekly') return (h.days || []).includes(d.getDay());
    return d.getDate() === monthlyDay(h, d.getFullYear(), d.getMonth());
  }

  // situação do hábito mensal: ocorrência deste mês (ou a próxima)
  function monthlyInfo(h) {
    const t = today(), ts = ymd(t);
    for (let k = 0; k < 3; k++) {
      const f = new Date(t.getFullYear(), t.getMonth() + k, 1);
      const ds = monthlyStr(h, f.getFullYear(), f.getMonth());
      if (ds < h.createdAt) continue;
      if (k > 0) return { ds, state: 'upcoming' };
      if (isDone(h, ds)) return { ds, state: 'done' };
      return { ds, state: ds < ts ? 'late' : ds === ts ? 'today' : 'upcoming' };
    }
    return { ds: ts, state: 'upcoming' };
  }

  function ruleText(h) {
    if (h.freq === 'daily') return 'Todos os dias';
    if (h.freq === 'weekly') {
      const d = [...(h.days || [])].sort((a, b) => a - b);
      return d.length === 7 ? 'Todos os dias' : d.map((i) => DAY_ABBR[i]).join(', ');
    }
    if (h.monthMode === 'weekday') return `${ordLabel(h.monthNth, h.monthWeekday)} ${DAY_NAME[h.monthWeekday]} do mês`;
    return h.monthDay >= 29 ? `Dia ${h.monthDay} (ou o último dia do mês)` : `Todo dia ${h.monthDay}`;
  }

  function streak(h) {
    const t = today();
    let n = 0;
    for (let i = 0; i < 500; i++) {
      const d = addDays(t, -i), ds = ymd(d);
      if (ds < h.createdAt) break;
      if (!isDue(h, d)) continue;
      if (isDone(h, ds)) n++;
      else if (i === 0) continue;
      else break;
    }
    return n;
  }

  // hábitos que aparecem em "Hoje"
  function todayList() {
    const t = today(), ts = ymd(t), out = [];
    for (const h of activeHabits()) {
      if (h.freq === 'monthly') {
        const ds = monthlyStr(h, t.getFullYear(), t.getMonth());
        if (ds < h.createdAt) continue;
        if (ds === ts || (ds < ts && !isDone(h, ds))) out.push({ h, date: ds });
      } else if (isDue(h, t)) out.push({ h, date: ts });
    }
    return out;
  }

  /* ---------------------------------------------------------
     REGRAS: pontos, XP, níveis
     --------------------------------------------------------- */
  function earnedHabits() { let t = 0; for (const id in S.comps) for (const d in S.comps[id]) t += S.comps[id][d]; return t; }
  const earnedQuests = () => S.quests.filter((q) => q.done).reduce((a, q) => a + (q.awarded || 0), 0);
  const xpTotal = () => earnedHabits() + earnedQuests();
  const spent = () => S.purchases.reduce((a, p) => a + p.cost, 0);
  const coins = () => xpTotal() - spent();

  function levelInfo(xp = xpTotal()) {
    let L = 1, rem = xp;
    while (rem >= xpNeed(L)) { rem -= xpNeed(L); L++; }
    return { level: L, cur: rem, need: xpNeed(L) };
  }
  const titleFor = (L) => TITLES[Math.min(L - 1, TITLES.length - 1)];

  function dayPts(ds) {
    let p = 0;
    for (const id in S.comps) { const v = S.comps[id][ds]; if (v) p += v; }
    for (const q of S.quests) if (q.done && q.doneAt === ds) p += q.awarded || 0;
    return p;
  }
  function activeDates() {
    const set = new Set();
    for (const id in S.comps) for (const d in S.comps[id]) set.add(d);
    return set;
  }
  function globalStreak() {
    const dates = activeDates();
    let d = today();
    if (!dates.has(ymd(d))) d = addDays(d, -1);
    let n = 0;
    while (dates.has(ymd(d))) { n++; d = addDays(d, -1); }
    return n;
  }
  const totalDone = () => { let n = 0; for (const id in S.comps) n += Object.keys(S.comps[id]).length; return n; };

  /* ---------------------------------------------------------
     CONQUISTAS
     --------------------------------------------------------- */
  const ACH = [
    ['first', '🌟', 'Primeiro passo', 'Conclua seu primeiro hábito', (s) => s.done >= 1],
    ['ten', '🍀', 'Pegando o jeito', '10 hábitos concluídos', (s) => s.done >= 10],
    ['hundred', '🏅', 'Rotina de ouro', '100 hábitos concluídos', (s) => s.done >= 100],
    ['s3', '🔥', 'Aquecendo', '3 dias seguidos', (s) => s.streak >= 3],
    ['s7', '🕯️', 'Semana inteira', '7 dias seguidos', (s) => s.streak >= 7],
    ['s30', '☀️', 'Mês cozy', '30 dias seguidos', (s) => s.streak >= 30],
    ['l3', '🌳', 'Raízes fortes', 'Chegue ao nível 3', (s) => s.level >= 3],
    ['l5', '🏡', 'Casa em ordem', 'Chegue ao nível 5', (s) => s.level >= 5],
    ['l10', '👑', 'Lenda do recanto', 'Chegue ao nível 10', (s) => s.level >= 10],
    ['quest', '📜', 'Aventureira', 'Conclua uma quest', (s) => s.quests >= 1],
    ['shop', '🧺', 'Merecido!', 'Faça um resgate na loja', (s) => s.buys >= 1],
    ['perfect', '✨', 'Dia perfeito', 'Conclua todos os hábitos de hoje (mín. 3)', (s) => s.perfect]
  ];
  function checkAchievements() {
    const tl = todayList();
    const st = {
      done: totalDone(), streak: globalStreak(), level: levelInfo().level,
      quests: S.quests.filter((q) => q.done).length, buys: S.purchases.length,
      perfect: tl.length >= 3 && tl.every((x) => isDone(x.h, x.date))
    };
    for (const [id, icon, name, , test] of ACH) {
      if (!S.achievements[id] && test(st)) {
        S.achievements[id] = ymd(today());
        toast(`${icon} Conquista: ${name}!`, 'good');
      }
    }
  }

  /* ---------------------------------------------------------
     SOM E EFEITOS
     --------------------------------------------------------- */
  let audioCtx;
  function sfx(kind) {
    if (!S.settings.sound) return;
    const seqs = {
      check: [[660, .07], [880, .11]], undo: [[330, .09]], buy: [[880, .07], [1175, .12]],
      level: [[523, .1], [659, .1], [784, .1], [1047, .28]], step: [[740, .07]]
    };
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      let t = audioCtx.currentTime;
      for (const [f, dur] of seqs[kind] || []) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur);
        t += dur * 0.9;
      }
    } catch (e) { /* sem áudio, tudo bem */ }
  }
  function floatText(text, x, y) {
    const el = document.createElement('div');
    el.className = 'float'; el.textContent = text;
    el.style.left = (x == null ? innerWidth / 2 : x) + 'px';
    el.style.top = (y == null ? innerHeight / 2 : y) + 'px';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
  function confetti() {
    const colors = ['#f6cf6a', '#86c06c', '#e68a6a', '#8fcbe5', '#c1aee8', '#f4a9bd'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('i');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[i % colors.length];
      el.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      el.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
      el.style.animationDelay = (Math.random() * .5) + 's';
      $('#fx').appendChild(el);
      setTimeout(() => el.remove(), 2600);
    }
  }
  function toast(msg, kind) {
    const box = $('#toasts');
    while (box.children.length >= 2) box.firstElementChild.remove(); // no máximo 2 avisos na tela
    const el = document.createElement('div');
    el.className = 'toast px-flat' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  /* ---------------------------------------------------------
     CENÁRIO PIXEL ART (cresce com o nível)
     --------------------------------------------------------- */
  const isNightTheme = () => document.documentElement.dataset.theme === 'night';

  function drawScene(cv, level) {
    const W = 192, H = 64;
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const now = new Date();
    const hr = now.getHours() + now.getMinutes() / 60;
    const night = isNightTheme() || hr < 5.5 || hr >= 19.5;
    const dusk = !night && (hr < 8 || hr >= 17.5);

    const sky = night ? ['#1b1d45', '#272a5c', '#363774', '#4a4488']
      : dusk ? ['#f3a683', '#f6bc90', '#f9d3a0', '#fbe6bd']
        : ['#7cc0e3', '#97cfe9', '#b4dff0', '#d1ecf6'];
    sky.forEach((c, i) => R(0, i * 11, W, 12, c));

    if (night) {
      for (let i = 0; i < 30; i++) R(rnd() * W, rnd() * 34, 1, 1, i % 4 ? '#fff6d6' : '#c9c4ff');
      R(152, 8, 7, 7, '#fff3c4'); R(150, 9, 11, 5, '#fff3c4'); R(155, 6, 5, 11, '#fff3c4');
      R(154, 8, 6, 7, sky[1]); // recorte da lua crescente
    } else {
      const t = Math.min(1, Math.max(0, (hr - 5.5) / 14));
      const sx = 16 + t * 160, sy = 34 - Math.sin(t * Math.PI) * 26;
      R(sx - 3, sy - 4, 7, 9, '#ffe07a'); R(sx - 4, sy - 3, 9, 7, '#ffe07a'); R(sx - 2, sy - 5, 5, 11, '#ffe07a');
    }
    const cloud = (x, y) => {
      const c = night ? '#585a9c' : dusk ? '#fff0e0' : '#ffffff';
      R(x, y + 2, 16, 3, c); R(x + 2, y, 9, 3, c); R(x + 9, y + 1, 6, 2, c);
    };
    cloud(18, 8); cloud(110, 14); cloud(70, 4);

    // colinas ao fundo
    const far = night ? '#2f5a52' : '#a5cf86';
    for (let x = 0; x < W; x++) {
      const y = Math.round(38 + Math.sin(x / 17) * 4 + Math.sin(x / 6.5) * 1.2);
      R(x, y, 1, 47 - y, far);
    }
    // chão
    const grass = night ? '#3e7a57' : '#86c06c';
    const grassD = night ? '#336a4a' : '#6fae58';
    R(0, 45, W, 19, grass);
    for (let i = 0; i < 70; i++) R(rnd() * W, 46 + rnd() * 17, 2, 1, grassD);
    // caminho
    for (let y = 46; y < H; y++) { const w = 6 + Math.round((y - 46) * 0.9); R(88 - w / 2, y, w, 1, night ? '#8c7a64' : '#e2c48f'); }

    const tree = (x, y) => {
      R(x - 1, y - 13, 3, 14, '#6b4a33');
      [4, 8, 10, 12, 12, 10, 8].forEach((w, i) => R(x - w / 2, y - 21 + i, w, 1, night ? '#2f6b45' : '#4f8a4b'));
      R(x - 4, y - 19, 2, 1, night ? '#3f8456' : '#74b45f'); R(x - 3, y - 17, 2, 1, night ? '#3f8456' : '#74b45f');
    };
    if (level >= 3) tree(22, 50);
    if (level >= 5) tree(166, 49);

    // laguinho
    if (level >= 6) {
      const wc = night ? '#3a5f9a' : '#6fb7dd';
      [10, 16, 20, 16, 10].forEach((w, i) => R(140 - w / 2, 54 + i, w, 1, wc));
      R(134, 55, 3, 1, night ? '#7ea3dd' : '#bfe6f5');
    }
    // horta
    if (level >= 8) {
      R(30, 56, 22, 5, '#8a5a3c');
      for (let x = 32; x < 50; x += 4) { R(x, 54, 1, 2, '#6fb05f'); R(x - 1, 54, 3, 1, '#86c06c'); }
    }

    // casinha
    R(94, 24, 4, 8, '#b5654c');                         // chaminé
    R(95, 21, 2, 2, night ? '#8a8cc4' : '#ffffff'); R(97, 18, 2, 2, night ? '#8a8cc4' : '#ffffff');
    for (let i = 0; i < 9; i++) { const w = 10 + i * 3; R(88 - w / 2, 27 + i, w, 1, i % 2 ? '#d9694f' : '#e0745a'); }
    R(70, 36, 36, 1, '#a94a36');
    R(75, 37, 26, 12, '#4a3326');
    R(76, 37, 24, 11, night ? '#d9c7a4' : '#f5e3bf');
    R(85, 41, 6, 8, '#8a5a3c'); R(89, 45, 1, 1, '#f6cf6a');
    const glass = night ? '#ffd36b' : '#8fcbe5';
    [[79, 40], [93, 40]].forEach(([x, y]) => { R(x, y, 5, 5, glass); R(x + 2, y, 1, 5, '#f5e3bf'); R(x, y + 2, 5, 1, '#f5e3bf'); });

    if (level >= 4) {
      for (let x = 108; x <= 134; x += 5) R(x, 43, 2, 7, '#b58a5a');
      R(108, 45, 28, 1, '#9c7448'); R(108, 47, 28, 1, '#9c7448');
    }
    if (level >= 7) {
      R(68, 40, 1, 10, '#4a3326');
      if (night) R(64, 35, 9, 8, 'rgba(255,224,122,.28)');
      R(66, 37, 5, 4, night ? '#ffe07a' : '#f6cf6a'); R(66, 36, 5, 1, '#4a3326');
    }
    if (level >= 2) {
      const FL = [[18, 54], [12, 58], [54, 51], [66, 57], [112, 53], [122, 58], [146, 52], [176, 55], [44, 50], [186, 59]];
      const pal = ['#f4a9bd', '#ffffff', '#c1aee8', '#f6cf6a'];
      FL.slice(0, Math.min(FL.length, (level - 1) * 2)).forEach(([x, y], i) => {
        R(x, y, 1, 2, '#4f8a4b');
        const c = pal[i % pal.length];
        R(x - 1, y - 1, 1, 1, c); R(x + 1, y - 1, 1, 1, c); R(x, y - 2, 1, 1, c); R(x, y - 1, 1, 1, '#f6cf6a');
      });
    }
    if (level >= 10) {
      R(103, 46, 5, 3, '#e39a52'); R(106, 44, 3, 3, '#e39a52'); R(106, 43, 1, 1, '#e39a52'); R(108, 43, 1, 1, '#e39a52'); R(102, 45, 1, 3, '#e39a52');
    }
  }

  /* ---------------------------------------------------------
     AVATAR
     --------------------------------------------------------- */
  let defaultAvatarUrl = null;
  function defaultAvatar() {
    if (defaultAvatarUrl) return defaultAvatarUrl;
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R(0, 0, 16, 16, '#b4dff0'); R(0, 11, 16, 5, '#86c06c');
    R(3, 1, 10, 7, '#6b4a33'); R(2, 3, 12, 8, '#6b4a33'); R(4, 4, 8, 6, '#f2c7a0');
    R(4, 3, 8, 1, '#6b4a33'); R(3, 4, 1, 7, '#6b4a33'); R(12, 4, 1, 7, '#6b4a33');
    R(6, 6, 1, 1, '#2e2016'); R(9, 6, 1, 1, '#2e2016'); R(5, 7, 1, 1, '#f4a9bd'); R(10, 7, 1, 1, '#f4a9bd'); R(7, 8, 2, 1, '#c8553d');
    R(7, 10, 2, 1, '#f2c7a0'); R(4, 11, 8, 5, '#86c06c'); R(3, 11, 1, 3, '#f2c7a0'); R(12, 11, 1, 3, '#f2c7a0');
    R(4, 2, 2, 2, '#f4a9bd'); R(4, 2, 1, 1, '#f6cf6a');
    defaultAvatarUrl = c.toDataURL('image/png');
    return defaultAvatarUrl;
  }
  const avatarSrc = () => S.profile.avatar || defaultAvatar();

  function renderAvatarCanvas(img, res, zoom, ox, oy, poster) {
    const c = document.createElement('canvas'); c.width = c.height = res;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const side = Math.min(img.width, img.height) / zoom;
    const sx = Math.min(img.width - side, Math.max(0, (img.width - side) / 2 * (1 + ox / 100)));
    const sy = Math.min(img.height - side, Math.max(0, (img.height - side) / 2 * (1 + oy / 100)));
    g.drawImage(img, sx, sy, side, side, 0, 0, res, res);
    if (poster) {
      const id = g.getImageData(0, 0, res, res), d = id.data, lv = 6, step = 255 / (lv - 1);
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / step) * step;
      g.putImageData(id, 0, 0);
    }
    return c;
  }

  /* ---------------------------------------------------------
     TEMA
     --------------------------------------------------------- */
  function applyTheme() {
    const t = S.settings.theme;
    const dark = t === 'night' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'night' : 'day';
    const m = $('meta[name=theme-color]');
    if (m) m.content = dark ? '#22233f' : '#f6e9c9';
  }

  /* ---------------------------------------------------------
     RENDER — herói
     --------------------------------------------------------- */
  let lastHero = null;
  function renderHero() {
    const li = levelInfo(), pct = Math.round(li.cur / li.need * 100);
    $('#hero').innerHTML = `
      <div class="hero px">
        <canvas id="scene" class="scene" aria-label="Seu recanto, que cresce a cada nível"></canvas>
        <div class="hero-body">
          <button class="avatar-frame px-flat" data-act="avatar" aria-label="Editar avatar"><img class="pix" alt="Seu avatar" src="${avatarSrc()}"><span class="edit-badge px-flat" aria-hidden="true">✎</span></button>
          <div class="hero-info">
            <div class="hero-name">${esc(S.profile.name || 'Aventureira')}</div>
            <div class="hero-title">Nível ${li.level} · ${esc(titleFor(li.level))}</div>
          </div>
          <div class="coin-chip px-flat" title="Pontos para gastar na loja">${COIN}<span id="coinNum">${coins()}</span></div>
        </div>
        <div class="xp-wrap">
          <div class="xp-label"><span>XP</span><span>${li.cur} / ${li.need}</span></div>
          <div class="bar px-flat butter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progresso para o próximo nível"><i id="xpfill"></i></div>
        </div>
      </div>`;
    drawScene($('#scene'), li.level);
    const bar = $('#xpfill');
    bar.style.width = (lastHero && lastHero.level === li.level ? lastHero.pct : 0) + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + '%'; }));
    lastHero = { level: li.level, pct };
  }

  /* ---------------------------------------------------------
     RENDER — hábitos
     --------------------------------------------------------- */
  function weekStrip(h) {
    const t = today(), ts = ymd(t), ws = startOfWeek(t);
    let cells = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), ds = ymd(d);
      const due = isDue(h, d), done = isDone(h, ds), future = ds > ts;
      const cls = ['wd', due ? 'due' : 'none', done ? 'done' : '', ds === ts ? 'today' : '', future ? 'future' : '', due && !done && !future && ds < ts ? 'missed' : ''].join(' ');
      const label = DAY_LETTER[d.getDay()];
      const inner = done ? CHECK : label;
      if ((due && !future) || done) cells += `<button class="${cls}" data-act="toggle" data-id="${h.id}" data-date="${ds}" aria-pressed="${done}" aria-label="${cap(DAY_NAME[d.getDay()])}, dia ${d.getDate()}${done ? ' (concluído)' : ''}">${inner}</button>`;
      else cells += `<span class="${cls}" aria-hidden="true">${label}</span>`;
    }
    return `<div class="strip">${cells}</div>`;
  }

  function habitRow(h, ctx) {
    const t = today(), ts = ymd(t);
    let date = null, done = false, enabled = false, meta = ruleText(h);
    if (h.freq === 'monthly') {
      const m = monthlyInfo(h);
      date = m.ds; done = m.state === 'done'; enabled = m.ds <= ts;
      const txt = { done: `Concluído em ${fmtShort(m.ds)} ✓`, late: `Atrasada · era dia ${fmtShort(m.ds)}`, today: 'É hoje!', upcoming: `Próxima: ${fmtShort(m.ds)}` }[m.state];
      meta = `${ruleText(h)} · ${txt}`;
    } else if (isDue(h, t)) {
      date = ts; done = isDone(h, ts); enabled = true;
    }
    const st = streak(h);
    if (st >= 2) meta += ` · <span class="flame">🔥 ${st}</span>`;
    let strip = '';
    if (ctx === 'daily' || ctx === 'weekly') {
      strip = weekStrip(h);
      if (ctx === 'weekly') {
        const ws = startOfWeek(t); let due = 0, dn = 0;
        for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (isDue(h, d)) { due++; if (isDone(h, ymd(d))) dn++; } }
        meta += ` · ${dn}/${due} nesta semana`;
      }
    }
    const label = done ? 'Desfazer conclusão' : 'Concluir';
    return `
      <article class="habit f-${h.freq} ${done ? 'done' : ''}">
        <button class="check ${done ? 'on' : ''}" ${enabled ? '' : 'disabled'} data-act="toggle" data-id="${h.id}" data-date="${date || ''}" aria-pressed="${done}" aria-label="${label}: ${esc(h.title)}">${CHECK}</button>
        <div class="h-main" data-act="edit-habit" data-id="${h.id}" role="button" tabindex="0" aria-label="Editar ${esc(h.title)}">
          <div class="h-title"><span class="h-icon">${h.icon || '🌱'}</span>${esc(h.title)}</div>
          ${h.notes ? `<div class="h-notes">${esc(h.notes)}</div>` : ''}
          <div class="h-meta">${meta}</div>
        </div>
        <div class="pts">+${S.settings.ptsHabit}${COIN}</div>
        ${strip}
      </article>`;
  }

  function mainQuestMini() {
    const q = S.quests.find((x) => !x.done && x.main);
    if (!q) return '';
    const total = q.steps.length, dn = q.steps.filter((s) => s.done).length;
    const pct = total ? Math.round(dn / total * 100) : 0;
    return `<button class="quest-mini px" data-act="tab" data-v="quests">
      <div class="t"><span>⭐ ${esc(q.title)}</span><span class="q-pts">+${q.pts}${COIN}</span></div>
      <div class="bar slim px-flat sky"><i style="width:${pct}%"></i></div>
      <small class="muted">${total ? `${dn} de ${total} etapas` : 'Quest principal'}</small></button>`;
  }

  function renderHabits() {
    const f = S.ui.filter, hs = activeHabits();
    const counts = { daily: 0, weekly: 0, monthly: 0 };
    hs.forEach((h) => counts[h.freq]++);
    let html = `<div class="chips-row" role="tablist" aria-label="Filtro de hábitos">${[['today', 'Hoje'], ['daily', 'Diários'], ['weekly', 'Semanais'], ['monthly', 'Mensais']]
      .map(([k, l]) => `<button class="fchip ${f === k ? 'on' : ''}" role="tab" aria-selected="${f === k}" data-act="filter" data-v="${k}">${l}<span class="n">${k === 'today' ? todayList().length : counts[k]}</span></button>`).join('')}</div>`;

    if (!hs.length) {
      return html + `<div class="card px empty">
        <div class="big">🌱</div><h3>Seu recanto está vazio</h3>
        <p class="muted">Crie seu primeiro hábito. Cada vez que você concluir um, ganha ${S.settings.ptsHabit} pontos de XP e moedas para a loja.</p>
        <div class="btns"><button class="btn" data-act="new-habit">Criar hábito</button><button class="btn alt" data-act="samples">Usar exemplos</button></div></div>`;
    }
    html += mainQuestMini();

    if (f === 'today') {
      const t = today(), list = todayList();
      const dn = list.filter((x) => isDone(x.h, x.date)).length;
      const pct = list.length ? Math.round(dn / list.length * 100) : 0;
      html += `<section class="card px day-card">
        <div class="row between"><span class="date">${cap(DAY_NAME[t.getDay()])}, ${t.getDate()} de ${MONTH_NAME[t.getMonth()]}</span><span class="muted"><b>${dn}</b>/${list.length}</span></div>
        <div class="bar px-flat"><i style="width:${pct}%"></i></div>
        ${list.length && dn === list.length ? '<div class="done-msg">✨ Tudo feito por hoje! Aproveite o recanto.</div>' : ''}
      </section>`;
      if (!list.length) html += `<div class="card px empty"><div class="big">🍃</div><h3>Nada marcado para hoje</h3><p class="muted">Dia livre! Veja a aba Semanais ou Mensais, ou crie um hábito novo.</p></div>`;
      else html += list.map((x) => habitRow(x.h, 'today')).join('');
    } else {
      let list = hs.filter((h) => h.freq === f);
      if (f === 'monthly') list = list.sort((a, b) => monthlyInfo(a).ds.localeCompare(monthlyInfo(b).ds));
      if (!list.length) {
        const what = { daily: 'diário', weekly: 'semanal', monthly: 'mensal' }[f];
        html += `<div class="card px empty"><div class="big">🗓️</div><h3>Nenhum hábito ${what}</h3><p class="muted">Crie um hábito com esta frequência.</p><div class="btns"><button class="btn" data-act="new-habit">Novo hábito</button></div></div>`;
      } else html += list.map((h) => habitRow(h, f)).join('');
    }
    return html;
  }

  /* ---------------------------------------------------------
     RENDER — quests
     --------------------------------------------------------- */
  function dueBadge(q) {
    if (!q.due) return '';
    const diff = Math.round((new Date(q.due + 'T00:00:00') - today()) / 86400000);
    if (diff < 0) return `<span class="q-due late">⏰ Atrasada (${fmtShort(q.due)})</span>`;
    if (diff === 0) return '<span class="q-due">⏰ Prazo: hoje</span>';
    return `<span class="q-due">⏰ ${diff} ${diff === 1 ? 'dia' : 'dias'} (${fmtShort(q.due)})</span>`;
  }
  function questCard(q) {
    const total = q.steps.length, dn = q.steps.filter((s) => s.done).length;
    const pct = total ? Math.round(dn / total * 100) : 0;
    const ready = dn === total;
    return `<article class="quest px">
      ${q.main ? '<span class="ribbon px-flat">⭐ Quest principal</span>' : ''}
      <div class="row between"><h3>${esc(q.title)}</h3><span class="q-pts">+${q.pts}${COIN}</span></div>
      ${q.notes ? `<p class="muted">${esc(q.notes)}</p>` : ''}
      ${dueBadge(q)}
      ${total ? `<ul class="steps">${q.steps.map((s) => `<li class="step ${s.done ? 'done' : ''}">
          <button class="check ${s.done ? 'on' : ''}" data-act="quest-step" data-id="${q.id}" data-sid="${s.id}" aria-pressed="${s.done}" aria-label="Etapa: ${esc(s.text)}">${CHECK}</button><span>${esc(s.text)}</span></li>`).join('')}</ul>
        <div class="bar slim px-flat sky" style="margin-top:12px"><i style="width:${pct}%"></i></div>` : ''}
      <div class="actions" style="margin-top:14px">
        <button class="btn ghost sm" data-act="quest-edit" data-id="${q.id}">Editar</button>
        <button class="btn alt" data-act="quest-done" data-id="${q.id}" ${ready ? '' : 'disabled'}>${ready ? `Concluir quest +${q.pts}` : `Faltam ${total - dn} etapa${total - dn > 1 ? 's' : ''}`}</button>
      </div></article>`;
  }
  function renderQuests() {
    const open = S.quests.filter((q) => !q.done).sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));
    const done = S.quests.filter((q) => q.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    let html = `<h2 class="section-title" style="margin-top:34px">Quests</h2>
      <p class="muted" style="margin:0 6px 4px">Metas grandes que valem mais pontos. Divida em etapas e conclua quando terminar.</p>`;
    if (!open.length) html += `<div class="card px empty"><div class="big">📜</div><h3>Nenhuma quest ativa</h3><p class="muted">Crie um objetivo master: algo que você quer alcançar, valendo ${S.settings.ptsQuest} pontos.</p><div class="btns"><button class="btn" data-act="new-quest">Nova quest</button></div></div>`;
    else html += open.map(questCard).join('');
    if (done.length) {
      html += `<h2 class="section-title">Concluídas</h2><div class="card px"><ul class="history">${done.map((q) =>
        `<li><span>✅ ${esc(q.title)} <small class="muted">+${q.awarded}</small></span><span class="when">${q.doneAt ? fmtShort(q.doneAt) : ''} <button class="btn ghost sm" data-act="quest-undo" data-id="${q.id}">Reabrir</button></span></li>`).join('')}</ul></div>`;
    }
    return html;
  }

  /* ---------------------------------------------------------
     RENDER — loja
     --------------------------------------------------------- */
  function renderShop() {
    const c = coins();
    let html = `<section class="card px wallet" style="margin-top:34px">
      <div><div class="muted" style="font-weight:800">Seus pontos</div><div class="big">${COIN.replace('width="18" height="18"', 'width="30" height="30"')}${c}</div></div>
      <button class="btn ghost sm" data-act="new-item">+ Item</button></section>`;
    if (!S.shop.length) html += `<div class="card px empty"><div class="big">🧺</div><h3>A loja está vazia</h3><p class="muted">Crie recompensas para você mesma: um café, um filme, uma folga.</p></div>`;
    else html += `<div class="shop-grid">${S.shop.map((it) => `
      <article class="item px">
        <button class="edit-mini" data-act="edit-item" data-id="${it.id}" aria-label="Editar ${esc(it.name)}">✎</button>
        <div class="emoji-big">${it.icon}</div><div class="name">${esc(it.name)}</div>
        <div class="cost">${COIN}${it.cost}</div>
        <button class="btn ${c >= it.cost ? '' : 'ghost'} sm" data-act="buy" data-id="${it.id}" ${c >= it.cost ? '' : 'disabled'}>${c >= it.cost ? 'Resgatar' : `Faltam ${it.cost - c}`}</button>
      </article>`).join('')}</div>`;
    if (S.purchases.length) {
      html += `<h2 class="section-title">Seus resgates</h2><div class="card px"><ul class="history">${S.purchases.slice(0, 15).map((p) =>
        `<li><span>${p.icon} ${esc(p.name)}</span><span class="when">−${p.cost} · ${fmtShort(p.at.slice(0, 10))}</span></li>`).join('')}</ul></div>`;
    }
    return html;
  }

  /* ---------------------------------------------------------
     RENDER — perfil
     --------------------------------------------------------- */
  function renderProfile() {
    const li = levelInfo();
    const t = today(), days = [];
    for (let i = 6; i >= 0; i--) { const d = addDays(t, -i); days.push({ d, p: dayPts(ymd(d)) }); }
    const max = Math.max(...days.map((x) => x.p), 10);
    const next = Object.keys(UNLOCKS).map(Number).find((l) => l > li.level);
    return `
      <section class="card px" style="margin-top:34px">
        <div class="profile-top">
          <button class="avatar-big px-flat" data-act="avatar" aria-label="Editar avatar"><img class="pix" alt="Seu avatar" src="${avatarSrc()}"></button>
          <div class="stack" style="min-width:0">
            <h2 style="overflow-wrap:anywhere">${esc(S.profile.name || 'Aventureira')}</h2>
            <div class="muted" style="font-weight:800">Nível ${li.level} · ${esc(titleFor(li.level))}</div>
            <div class="row" style="flex-wrap:wrap"><button class="btn sm" data-act="avatar">Avatar</button><button class="btn ghost sm" data-act="settings">Ajustes</button></div>
          </div>
        </div>
        ${next ? `<p class="hint" style="margin-top:14px">🎁 No nível ${next} o recanto ganha ${UNLOCKS[next]}.</p>` : ''}
      </section>
      <section class="card px"><h3>Números</h3>
        <div class="stats" style="margin-top:10px">
          <div class="stat px-flat"><b>${xpTotal()}</b><span>XP total</span></div>
          <div class="stat px-flat"><b>${coins()}</b><span>Pontos na carteira</span></div>
          <div class="stat px-flat"><b>${totalDone()}</b><span>Hábitos concluídos</span></div>
          <div class="stat px-flat"><b>${globalStreak()} 🔥</b><span>Dias seguidos</span></div>
          <div class="stat px-flat"><b>${S.quests.filter((q) => q.done).length}</b><span>Quests feitas</span></div>
          <div class="stat px-flat"><b>${S.purchases.length}</b><span>Resgates</span></div>
        </div></section>
      <section class="card px"><h3>Últimos 7 dias</h3><p class="hint">Pontos ganhos por dia</p>
        <div class="chart" role="img" aria-label="Gráfico de pontos dos últimos 7 dias">${days.map((x, i) => `
          <div class="col ${i === 6 ? 'today' : ''}"><span class="v">${x.p || ''}</span><div class="b px-flat" style="height:${Math.max(4, Math.round(x.p / max * 100))}px"></div><span class="l">${DAY_LETTER[x.d.getDay()]}</span></div>`).join('')}</div></section>
      <section class="card px"><h3>Conquistas <small class="muted">${Object.keys(S.achievements).length}/${ACH.length}</small></h3>
        <div class="ach-grid">${ACH.map(([id, icon, name, desc]) => `<div class="ach px-flat ${S.achievements[id] ? '' : 'locked'}"><span class="ic">${icon}</span><span><b>${name}</b><small>${desc}</small></span></div>`).join('')}</div></section>
      <section class="card px"><h3>Seus dados</h3>
        <p class="hint">Tudo fica salvo só neste navegador. Faça backup de vez em quando, principalmente antes de limpar o histórico do navegador ou trocar de aparelho.</p>
        <div class="actions" style="justify-content:flex-start;margin-top:12px"><button class="btn sm" data-act="export">Exportar backup</button><button class="btn ghost sm" data-act="import">Importar backup</button></div></section>`;
  }

  /* ---------------------------------------------------------
     RENDER — geral
     --------------------------------------------------------- */
  let renderedDay = ymd(today());
  function render() {
    applyTheme();
    renderHero();
    const tab = S.ui.tab;
    $('#main').innerHTML = { habits: renderHabits, quests: renderQuests, shop: renderShop, profile: renderProfile }[tab]();
    $$('.tab').forEach((b) => { const on = b.dataset.v === tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
    $('#fab').hidden = tab === 'profile';
    $('#fab').setAttribute('aria-label', { habits: 'Novo hábito', quests: 'Nova quest', shop: 'Novo item da loja' }[tab] || 'Adicionar');
    renderedDay = ymd(today());
  }

  function commit(prevLevel) {
    checkAchievements();
    save();
    render();
    const nl = levelInfo().level;
    if (prevLevel && nl > prevLevel) levelUpModal(nl);
  }

  /* ---------------------------------------------------------
     MODAL
     --------------------------------------------------------- */
  const dlg = $('#modal');
  let dlgOnClose = null;
  function openModal(html, mount, onClose) {
    dlg.innerHTML = html;
    dlgOnClose = onClose || null;
    if (!dlg.open) dlg.showModal();
    if (mount) mount(dlg);
  }
  const closeModal = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeModal(); });
  dlg.addEventListener('close', () => { dlg.innerHTML = ''; const f = dlgOnClose; dlgOnClose = null; if (f) f(); });

  function confirmModal({ title, text, ok = 'Confirmar', danger = false, onOk }) {
    openModal(`<div class="modal-in"><h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="actions"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn ${danger ? 'danger' : ''}" id="okBtn">${esc(ok)}</button></div></div>`,
      (d) => { $('#okBtn', d).addEventListener('click', () => { closeModal(); onOk(); }); });
  }

  const emojiRadios = (name, list, sel) => list.map((e) => `<label class="emoji"><input type="radio" name="${name}" value="${e}" ${e === sel ? 'checked' : ''}><span>${e}</span></label>`).join('');

  /* ---------- hábito: criar / editar ---------- */
  function habitModal(id) {
    const h = id ? habitById(id) : null;
    const t = today();
    const f = S.ui.filter;
    const d = h || {
      title: '', notes: '', icon: '🌱', freq: f === 'weekly' ? 'weekly' : f === 'monthly' ? 'monthly' : 'daily',
      days: [t.getDay()], monthMode: 'day', monthDay: t.getDate(), monthNth: 1, monthWeekday: t.getDay()
    };
    const radio = (name, v, label, cur) => `<label><input type="radio" name="${name}" value="${v}" ${String(cur) === String(v) ? 'checked' : ''}><span>${label}</span></label>`;
    openModal(`<form class="modal-in" id="f-habit" autocomplete="off">
      <h2>${h ? 'Editar hábito' : 'Novo hábito'}</h2>
      <div class="field"><label class="lbl" for="h-title">O que você quer cultivar?</label>
        <input type="text" id="h-title" name="title" maxlength="60" required placeholder="Ex.: Caminhar 15 minutos" value="${esc(d.title)}"></div>
      <div class="field"><label class="lbl" for="h-notes">Notas (opcional)</label>
        <textarea id="h-notes" name="notes" rows="2" maxlength="200" placeholder="Um lembrete gentil para você">${esc(d.notes)}</textarea></div>
      <div class="field"><span class="lbl">Ícone</span><div class="emoji-grid">${emojiRadios('icon', HABIT_ICONS, d.icon)}</div></div>
      <div class="field"><span class="lbl">Com que frequência?</span>
        <div class="seg">${radio('freq', 'daily', 'Diário', d.freq)}${radio('freq', 'weekly', 'Semanal', d.freq)}${radio('freq', 'monthly', 'Mensal', d.freq)}</div></div>
      <div class="field" id="opt-weekly"><span class="lbl">Em quais dias da semana?</span>
        <div class="dayrow">${DAY_ABBR.map((n, i) => `<label class="daychip"><input type="checkbox" name="day" value="${i}" ${(d.days || []).includes(i) ? 'checked' : ''}><span title="${DAY_NAME[i]}">${n}</span></label>`).join('')}</div></div>
      <div class="field" id="opt-monthly">
        <span class="lbl">Em qual dia do mês?</span>
        <div class="seg">${radio('monthMode', 'day', 'Dia do mês', d.monthMode)}${radio('monthMode', 'weekday', 'Dia da semana', d.monthMode)}</div>
        <div id="m-day" class="inline"><span>Todo dia</span><select name="monthDay" aria-label="Dia do mês">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${d.monthDay === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        <div id="m-wd" class="inline"><select name="monthNth" id="m-nth" aria-label="Qual ocorrência"></select><select name="monthWeekday" id="m-wdsel" aria-label="Dia da semana">${DAY_NAME.map((n, i) => `<option value="${i}" ${d.monthWeekday === i ? 'selected' : ''}>${n}</option>`).join('')}</select><span>do mês</span></div>
      </div>
      <p class="rule px-flat" id="rule" aria-live="polite"></p>
      <p class="hint">Vale <b>+${S.settings.ptsHabit} pontos</b> a cada vez que você concluir.</p>
      <div class="actions">
        ${h ? '<button type="button" class="btn danger sm" id="delBtn">Excluir</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" data-act="close">Cancelar</button>
        <button type="submit" class="btn">${h ? 'Salvar' : 'Criar hábito'}</button>
      </div></form>`,
      (m) => {
        const form = $('#f-habit', m);
        const nth = $('#m-nth', form), wdSel = $('#m-wdsel', form);
        const fillNth = () => {
          const wd = Number(wdSel.value), keep = nth.value || String(d.monthNth);
          nth.innerHTML = [1, 2, 3, 4, -1].map((n) => `<option value="${n}">${ordLabel(n, wd)}</option>`).join('');
          nth.value = keep;
        };
        const read = () => {
          const fd = new FormData(form);
          return {
            title: String(fd.get('title') || '').trim(), notes: String(fd.get('notes') || '').trim(), icon: fd.get('icon') || '🌱',
            freq: fd.get('freq'), days: fd.getAll('day').map(Number), monthMode: fd.get('monthMode'),
            monthDay: Number(fd.get('monthDay')), monthNth: Number(fd.get('monthNth')), monthWeekday: Number(fd.get('monthWeekday'))
          };
        };
        const sync = () => {
          const v = read();
          $('#opt-weekly', form).hidden = v.freq !== 'weekly';
          $('#opt-monthly', form).hidden = v.freq !== 'monthly';
          $('#m-day', form).hidden = v.monthMode !== 'day';
          $('#m-wd', form).hidden = v.monthMode !== 'weekday';
          $('#rule', form).textContent = '🗓️ ' + (v.freq === 'weekly' && !v.days.length ? 'Escolha pelo menos um dia' : ruleText(v));
        };
        fillNth(); sync();
        wdSel.addEventListener('change', fillNth);
        form.addEventListener('change', sync);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = read();
          if (!v.title) return toast('Dê um nome ao hábito.');
          if (v.freq === 'weekly' && !v.days.length) return toast('Escolha pelo menos um dia da semana.');
          if (h) Object.assign(h, v);
          else S.habits.push(Object.assign({ id: uid(), createdAt: ymd(today()), deleted: false }, v));
          closeModal();
          if (!h) { S.ui.filter = S.ui.filter === 'today' ? 'today' : v.freq; toast('Hábito criado! 🌱', 'good'); }
          else toast('Hábito atualizado.');
          commit();
        });
        const del = $('#delBtn', form);
        if (del) del.addEventListener('click', () => {
          if (del.dataset.armed) { h.deleted = true; closeModal(); toast('Hábito removido. Os pontos que ele rendeu foram mantidos.'); commit(); }
          else { del.dataset.armed = '1'; del.textContent = 'Confirmar exclusão'; }
        });
      });
  }

  /* ---------- quest: criar / editar ---------- */
  function questModal(id) {
    const q = id ? S.quests.find((x) => x.id === id) : null;
    const d = q || { title: '', notes: '', steps: [], pts: S.settings.ptsQuest, due: '', main: !S.quests.some((x) => !x.done && x.main) };
    const stepRow = (s) => `<div class="step-edit"><input type="text" name="step" maxlength="80" placeholder="Etapa" value="${esc(s ? s.text : '')}" data-sid="${s ? s.id : ''}" data-done="${s && s.done ? 1 : ''}"><button type="button" class="x" aria-label="Remover etapa">✕</button></div>`;
    openModal(`<form class="modal-in" id="f-quest" autocomplete="off">
      <h2>${q ? 'Editar quest' : 'Nova quest'}</h2>
      <div class="field"><label class="lbl" for="q-title">Qual é o objetivo?</label>
        <input type="text" id="q-title" name="title" maxlength="80" required placeholder="Ex.: Ler 2 livros neste mês" value="${esc(d.title)}"></div>
      <div class="field"><label class="lbl" for="q-notes">Por que isso importa? (opcional)</label>
        <textarea id="q-notes" name="notes" rows="2" maxlength="200">${esc(d.notes)}</textarea></div>
      <div class="field"><span class="lbl">Etapas (opcional)</span><div id="steps">${d.steps.map(stepRow).join('')}</div>
        <button type="button" class="btn ghost sm" id="addStep" style="justify-self:start">+ Adicionar etapa</button></div>
      <div class="inline"><div class="field" style="flex:1;min-width:120px"><label class="lbl" for="q-pts">Pontos</label><input type="number" id="q-pts" name="pts" min="1" max="9999" value="${d.pts}"></div>
        <div class="field" style="flex:1;min-width:150px"><label class="lbl" for="q-due">Prazo (opcional)</label><input type="date" id="q-due" name="due" value="${d.due || ''}"></div></div>
      <label class="toggle-row"><input type="checkbox" name="main" ${d.main ? 'checked' : ''}> ⭐ Quest principal (aparece em destaque)</label>
      <div class="actions">
        ${q ? '<button type="button" class="btn danger sm" id="delBtn">Excluir</button>' : ''}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn">${q ? 'Salvar' : 'Criar quest'}</button>
      </div></form>`,
      (m) => {
        const form = $('#f-quest', m), box = $('#steps', form);
        $('#addStep', form).addEventListener('click', () => { box.insertAdjacentHTML('beforeend', stepRow(null)); box.lastElementChild.querySelector('input').focus(); });
        box.addEventListener('click', (e) => { const x = e.target.closest('.x'); if (x) x.parentElement.remove(); });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const title = String(fd.get('title') || '').trim();
          if (!title) return toast('Dê um nome à quest.');
          const steps = $$('input[name=step]', form).filter((i) => i.value.trim()).map((i) => ({ id: i.dataset.sid || uid(), text: i.value.trim(), done: !!i.dataset.done }));
          const v = { title, notes: String(fd.get('notes') || '').trim(), steps, pts: Math.max(1, parseInt(fd.get('pts'), 10) || S.settings.ptsQuest), due: fd.get('due') || '', main: !!fd.get('main') };
          if (v.main) S.quests.forEach((x) => { x.main = false; });
          if (q) Object.assign(q, v); else S.quests.push(Object.assign({ id: uid(), done: false }, v));
          closeModal(); if (!q) toast('Quest criada! 📜', 'good'); commit();
        });
        const del = $('#delBtn', form);
        if (del) del.addEventListener('click', () => {
          if (del.dataset.armed) { S.quests = S.quests.filter((x) => x.id !== q.id); closeModal(); toast('Quest removida.'); commit(); }
          else { del.dataset.armed = '1'; del.textContent = 'Confirmar exclusão'; }
        });
      });
  }

  /* ---------- loja: criar / editar item ---------- */
  function itemModal(id) {
    const it = id ? S.shop.find((x) => x.id === id) : null;
    const d = it || { icon: '☕', name: '', cost: 50 };
    openModal(`<form class="modal-in" id="f-item" autocomplete="off">
      <h2>${it ? 'Editar recompensa' : 'Nova recompensa'}</h2>
      <div class="field"><label class="lbl" for="i-name">Recompensa</label><input type="text" id="i-name" name="name" maxlength="50" required placeholder="Ex.: Uma tarde livre" value="${esc(d.name)}"></div>
      <div class="field"><span class="lbl">Ícone</span><div class="emoji-grid">${emojiRadios('icon', ITEM_ICONS, d.icon)}</div></div>
      <div class="field"><label class="lbl" for="i-cost">Custo em pontos</label><input type="number" id="i-cost" name="cost" min="1" max="99999" value="${d.cost}"></div>
      <div class="actions">${it ? '<button type="button" class="btn danger sm" id="delBtn">Excluir</button>' : ''}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn">${it ? 'Salvar' : 'Adicionar'}</button></div></form>`,
      (m) => {
        const form = $('#f-item', m);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form), name = String(fd.get('name') || '').trim();
          if (!name) return toast('Dê um nome à recompensa.');
          const v = { name, icon: fd.get('icon') || '🎁', cost: Math.max(1, parseInt(fd.get('cost'), 10) || 1) };
          if (it) Object.assign(it, v); else S.shop.push(Object.assign({ id: uid() }, v));
          closeModal(); commit();
        });
        const del = $('#delBtn', form);
        if (del) del.addEventListener('click', () => {
          if (del.dataset.armed) { S.shop = S.shop.filter((x) => x.id !== it.id); closeModal(); commit(); }
          else { del.dataset.armed = '1'; del.textContent = 'Confirmar exclusão'; }
        });
      });
  }

  /* ---------- avatar ---------- */
  function avatarModal() {
    openModal(`<form class="modal-in" id="f-av">
      <h2>Seu avatar</h2>
      <p class="hint">Escolha uma foto sua. Ela vira pixel art direto no seu aparelho e não é enviada para lugar nenhum.</p>
      <canvas id="avPrev" class="avatar-preview px-flat" width="64" height="64" aria-label="Prévia do avatar"></canvas>
      <button type="button" class="btn sky" id="pick">📷 Escolher foto</button>
      <div id="avCtl" class="stack" hidden>
        <div class="range-row"><label for="r-res">Pixels</label><input type="range" id="r-res" min="16" max="64" step="8" value="32"></div>
        <div class="range-row"><label for="r-zoom">Zoom</label><input type="range" id="r-zoom" min="100" max="300" step="5" value="100"></div>
        <div class="range-row"><label for="r-x">Horizontal</label><input type="range" id="r-x" min="-100" max="100" step="5" value="0"></div>
        <div class="range-row"><label for="r-y">Vertical</label><input type="range" id="r-y" min="-100" max="100" step="5" value="0"></div>
        <label class="toggle-row"><input type="checkbox" id="r-poster" checked> Paleta reduzida (visual mais retrô)</label>
      </div>
      <div class="actions"><button type="button" class="btn ghost sm" id="rmAv" ${S.profile.avatar ? '' : 'hidden'}>Remover foto</button><span class="spacer"></span>
        <button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn" id="saveAv" disabled>Salvar</button></div></form>`,
      (m) => {
        const prev = $('#avPrev', m), pg = prev.getContext('2d');
        let img = null, out = null;
        const showCurrent = () => {
          const im = new Image();
          im.onload = () => { prev.width = prev.height = im.width; pg.imageSmoothingEnabled = false; pg.drawImage(im, 0, 0); };
          im.src = avatarSrc();
        };
        showCurrent();
        const redraw = () => {
          if (!img) return;
          out = renderAvatarCanvas(img, +$('#r-res', m).value, +$('#r-zoom', m).value / 100, +$('#r-x', m).value, +$('#r-y', m).value, $('#r-poster', m).checked);
          prev.width = prev.height = out.width; pg.imageSmoothingEnabled = false; pg.drawImage(out, 0, 0);
        };
        $('#pick', m).addEventListener('click', () => {
          const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
          inp.onchange = () => {
            const file = inp.files && inp.files[0]; if (!file) return;
            const url = URL.createObjectURL(file), im = new Image();
            im.onload = () => { img = im; $('#avCtl', m).hidden = false; $('#saveAv', m).disabled = false; redraw(); URL.revokeObjectURL(url); };
            im.onerror = () => toast('Não consegui abrir essa imagem.');
            im.src = url;
          };
          inp.click();
        });
        $('#avCtl', m).addEventListener('input', redraw);
        $('#rmAv', m).addEventListener('click', () => { S.profile.avatar = null; closeModal(); commit(); });
        $('#f-av', m).addEventListener('submit', (e) => {
          e.preventDefault(); if (!out) return;
          S.profile.avatar = out.toDataURL('image/png'); closeModal(); toast('Avatar atualizado! ✨', 'good'); commit();
        });
      });
  }

  /* ---------- ajustes ---------- */
  function settingsModal() {
    const s = S.settings;
    const radio = (v, label) => `<label><input type="radio" name="theme" value="${v}" ${s.theme === v ? 'checked' : ''}><span>${label}</span></label>`;
    openModal(`<form class="modal-in" id="f-set" autocomplete="off">
      <h2>Ajustes</h2>
      <div class="field"><label class="lbl" for="s-name">Seu nome</label><input type="text" id="s-name" name="name" maxlength="24" value="${esc(S.profile.name)}" placeholder="Aventureira"></div>
      <div class="field"><span class="lbl">Aparência</span><div class="seg">${radio('auto', 'Automático')}${radio('day', '☀️ Dia')}${radio('night', '🌙 Noite')}</div></div>
      <label class="toggle-row"><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}> Efeitos sonoros</label>
      <div class="inline"><div class="field" style="flex:1;min-width:130px"><label class="lbl" for="s-ph">Pontos por hábito</label><input type="number" id="s-ph" name="ptsHabit" min="1" max="999" value="${s.ptsHabit}"></div>
        <div class="field" style="flex:1;min-width:130px"><label class="lbl" for="s-pq">Pontos por quest</label><input type="number" id="s-pq" name="ptsQuest" min="1" max="9999" value="${s.ptsQuest}"></div></div>
      <p class="hint">Mudar os pontos vale só para conclusões novas; o que você já ganhou não muda.</p>
      <div class="actions"><button type="button" class="btn danger sm" id="resetBtn">Apagar tudo</button><span class="spacer"></span>
        <button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn">Salvar</button></div></form>`,
      (m) => {
        $('#f-set', m).addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          S.profile.name = String(fd.get('name') || '').trim();
          S.settings.theme = fd.get('theme'); S.settings.sound = !!fd.get('sound');
          S.settings.ptsHabit = Math.max(1, parseInt(fd.get('ptsHabit'), 10) || DEFAULT_PTS_HABIT);
          S.settings.ptsQuest = Math.max(1, parseInt(fd.get('ptsQuest'), 10) || DEFAULT_PTS_QUEST);
          closeModal(); commit();
        });
        $('#resetBtn', m).addEventListener('click', () => confirmModal({
          title: 'Apagar tudo?', text: 'Isso remove hábitos, pontos, quests, loja e avatar deste navegador. Não dá para desfazer (a menos que você tenha um backup).',
          ok: 'Apagar tudo', danger: true, onOk: () => { S = defaultState(); lastHero = null; save(); render(); welcomeModal(); }
        }));
      });
  }

  /* ---------- boas-vindas ---------- */
  function welcomeModal() {
    openModal(`<form class="modal-in" id="f-wel" autocomplete="off">
      <h2>Bem-vinda ao Recanto 🏡</h2>
      <p>Aqui cada hábito cumprido rende pontos. Eles viram <b>XP</b> (para subir de nível e fazer seu recanto crescer) e <b>moedas</b> para trocar por recompensas na loja.</p>
      <div class="field"><label class="lbl" for="w-name">Como devo te chamar?</label><input type="text" id="w-name" name="name" maxlength="24" placeholder="Seu nome ou apelido" autofocus></div>
      <label class="toggle-row"><input type="checkbox" name="samples" checked> Começar com alguns hábitos de exemplo (você edita depois)</label>
      <div class="actions"><button type="submit" class="btn">Começar</button></div></form>`,
      (m) => {
        $('#f-wel', m).addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          S.profile.name = String(fd.get('name') || '').trim();
          S.profile.onboarded = true;
          if (fd.get('samples')) addSamples();
          closeModal(); commit();
        });
      },
      () => { if (!S.profile.onboarded) { S.profile.onboarded = true; save(); render(); } });
  }

  function addSamples() {
    const t = ymd(today());
    const base = { notes: '', createdAt: t, deleted: false, days: [], monthMode: 'day', monthDay: 1, monthNth: 1, monthWeekday: 1 };
    S.habits.push(
      Object.assign({}, base, { id: uid(), title: 'Beber 2 litros de água', icon: '💧', freq: 'daily' }),
      Object.assign({}, base, { id: uid(), title: 'Ler 15 minutos', icon: '📚', freq: 'daily' }),
      Object.assign({}, base, { id: uid(), title: 'Caminhar 20 minutos', icon: '🏃', freq: 'weekly', days: [1, 3, 5] }),
      Object.assign({}, base, { id: uid(), title: 'Arrumar a casa', icon: '🧹', freq: 'weekly', days: [6] }),
      Object.assign({}, base, { id: uid(), title: 'Revisar as finanças', icon: '📝', freq: 'monthly', monthDay: 5 })
    );
    if (!S.quests.length) S.quests.push({
      id: uid(), title: 'Minha primeira semana no recanto', notes: 'Ver como a rotina funciona na prática.', pts: S.settings.ptsQuest, due: '', main: true, done: false,
      steps: [{ id: uid(), text: 'Ajustar meus hábitos ao meu dia', done: false }, { id: uid(), text: 'Cumprir os hábitos por 3 dias seguidos', done: false }, { id: uid(), text: 'Resgatar minha primeira recompensa', done: false }]
    });
  }

  /* ---------- subir de nível ---------- */
  function levelUpModal(level) {
    sfx('level'); confetti();
    const unlock = UNLOCKS[level];
    openModal(`<div class="modal-in levelup">
      <div class="muted" style="font-weight:800">Você subiu de nível!</div>
      <div class="big">NÍVEL ${level}</div>
      <h3>${esc(titleFor(level))}</h3>
      <canvas id="lvScene" class="scene px-flat"></canvas>
      ${unlock ? `<p>🎁 Seu recanto ganhou <b>${unlock}</b>.</p>` : '<p class="muted">Continue cuidando dos seus hábitos.</p>'}
      <div class="actions" style="justify-content:center"><button class="btn" data-act="close">Que delícia!</button></div></div>`,
      (m) => drawScene($('#lvScene', m), level));
  }

  /* ---------------------------------------------------------
     AÇÕES
     --------------------------------------------------------- */
  function toggleHabit(id, ds, ev) {
    const h = habitById(id); if (!h || !ds) return;
    const c = S.comps[id] || (S.comps[id] = {});
    const prev = levelInfo().level;
    if (c[ds]) {
      const pts = c[ds];
      if (coins() - pts < 0) return toast('Esses pontos já foram gastos na loja. Ganhe mais antes de desfazer.');
      delete c[ds]; sfx('undo');
    } else {
      if (ds > ymd(today())) return;
      c[ds] = S.settings.ptsHabit; sfx('check');
      const r = ev && ev.currentTarget ? ev.currentTarget.getBoundingClientRect() : null;
      floatText(`+${S.settings.ptsHabit}`, r ? r.left + r.width / 2 : null, r ? r.top : null);
    }
    commit(prev);
  }
  function toggleStep(qid, sid) {
    const q = S.quests.find((x) => x.id === qid); if (!q) return;
    const s = q.steps.find((x) => x.id === sid); if (!s) return;
    s.done = !s.done; sfx(s.done ? 'step' : 'undo'); commit();
  }
  function completeQuest(qid) {
    const q = S.quests.find((x) => x.id === qid); if (!q || q.done) return;
    const prev = levelInfo().level;
    q.done = true; q.doneAt = ymd(today()); q.awarded = q.pts;
    confetti(); sfx('level'); toast(`📜 Quest concluída! +${q.pts} pontos`, 'good');
    commit(prev);
  }
  function undoQuest(qid) {
    const q = S.quests.find((x) => x.id === qid); if (!q || !q.done) return;
    if (coins() - q.awarded < 0) return toast('Esses pontos já foram gastos na loja.');
    q.done = false; delete q.awarded; delete q.doneAt; commit();
  }
  function buy(id) {
    const it = S.shop.find((x) => x.id === id); if (!it) return;
    if (coins() < it.cost) return toast('Pontos insuficientes ainda.');
    confirmModal({
      title: `Resgatar ${it.icon}?`, text: `${it.name} por ${it.cost} pontos. Você fica com ${coins() - it.cost}.`, ok: 'Resgatar',
      onOk: () => {
        S.purchases.unshift({ id: uid(), name: it.name, icon: it.icon, cost: it.cost, at: new Date().toISOString() });
        sfx('buy'); confetti(); toast(`${it.icon} Aproveite: ${it.name}!`, 'good'); commit();
      }
    });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `recanto-backup-${ymd(today())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup baixado.');
  }
  function importData() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const o = JSON.parse(rd.result);
          if (!o || !Array.isArray(o.habits)) throw new Error('formato');
          confirmModal({
            title: 'Importar backup?', text: 'Seus dados atuais neste navegador serão substituídos pelos do arquivo.', ok: 'Importar', danger: true,
            onOk: () => { S = migrate(o); S.profile.onboarded = true; lastHero = null; save(); render(); toast('Backup importado! 🎉', 'good'); }
          });
        } catch (e) { toast('Esse arquivo não parece um backup do Recanto.'); }
      };
      rd.readAsText(f);
    };
    inp.click();
  }

  /* ---------------------------------------------------------
     EVENTOS
     --------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case 'toggle': toggleHabit(id, el.dataset.date, { currentTarget: el }); break;
      case 'edit-habit': habitModal(id); break;
      case 'new-habit': closeModal(); habitModal(); break;
      case 'samples': addSamples(); commit(); break;
      case 'filter': S.ui.filter = el.dataset.v; save(); render(); break;
      case 'tab': S.ui.tab = el.dataset.v; save(); render(); scrollTo({ top: 0 }); break;
      case 'fab': ({ habits: () => habitModal(), quests: () => questModal(), shop: () => itemModal() }[S.ui.tab] || (() => { }))(); break;
      case 'new-quest': questModal(); break;
      case 'quest-edit': questModal(id); break;
      case 'quest-step': toggleStep(id, el.dataset.sid); break;
      case 'quest-done': completeQuest(id); break;
      case 'quest-undo': undoQuest(id); break;
      case 'new-item': itemModal(); break;
      case 'edit-item': itemModal(id); break;
      case 'buy': buy(id); break;
      case 'avatar': avatarModal(); break;
      case 'settings': settingsModal(); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'close': closeModal(); break;
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.h-main[data-act]')) { e.preventDefault(); e.target.click(); }
  });
  // vira o dia com o app aberto
  const checkDay = () => { if (ymd(today()) !== renderedDay) render(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
  setInterval(checkDay, 60000);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.settings.theme === 'auto') render(); });

  /* ---------------------------------------------------------
     INÍCIO
     --------------------------------------------------------- */
  render();
  if (!S.profile.onboarded) welcomeModal();
  if (!storageOk) toast('Este navegador bloqueou o salvamento. Seus dados não vão persistir.');
})();
