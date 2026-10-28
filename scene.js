/* ==========================================================
   Recanto dos Hábitos — cenário em pixel art (visão 3/4 de cima)
   Desenhado por código, sem imagens. Cresce com o nível:
     1 casinha · 2 flores · 3 árvore · 4 cerca e portão · 5 horta
     6 poço · 7 lampião e caixa de correio · 8 girassóis · 10 gatinho
   A largura do mundo se adapta à tela, sempre com pixels inteiros.
   ========================================================== */
(function (root, factory) {
  root.RecantoScene = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const H = 100;               // altura do mundo, em pixels de arte
  const VTOP = 5;              // linhas de cima que ficam fora da vista (menos copa, mais cenário)
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---- números aleatórios estáveis (o cenário não "pisca" a cada desenho) ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const rngFor = (name) => mulberry32(strSeed(name));

  // ---- paleta ----
  const GR = { base: '#86c26b', dark: '#6fae5a', light: '#a1d57f', deep: '#5a9a4e' };
  const FOL = { base: '#4f9d59', light: '#7cc472', dark: '#37794a', edge: '#27553a' };
  const FOL2 = { base: '#62b062', light: '#92d884', dark: '#43934f', edge: '#2d6540' };
  const WOOD = { base: '#a87848', light: '#cf9c63', dark: '#7a5232', edge: '#43291c' };
  const STONE = { base: '#cdcec4', light: '#e9eae0', dark: '#9a9c92', edge: '#5f625b' };
  const RF = { L: '#e27d62', Ll: '#c9674d', C: '#d25a41', Cl: '#b6472f', R: '#b44c36', Rl: '#963b2a', ridge: '#f4a483', edge: '#6a2a1f', eave: '#8f3a2a' };
  const INK = '#3b2a22';
  const PETALS = { pink: '#f58fb2', white: '#ffffff', lilac: '#b79cf0', yellow: '#ffd75a', orange: '#ff9f6b' };

  // posições dos canteiros de flores (relativas ao centro) — [dx, y, cor]
  const FLOWER_SPOTS = [
    [-26, 70, 'pink'], [-16, 79, 'white'], [26, 71, 'yellow'], [17, 82, 'lilac'], [-38, 78, 'yellow'],
    [38, 80, 'pink'], [-30, 87, 'lilac'], [30, 88, 'white'], [-44, 68, 'white'], [44, 70, 'lilac'],
    [-10, 87, 'pink'], [-22, 62, 'lilac'], [22, 62, 'pink']
  ];

  function phaseOf(night) {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (night || h < 5.5 || h >= 19.5) return 'night';
    if (h < 8 || h >= 17.5) return 'dusk';
    return 'day';
  }

  function draw(cv, level, opt) {
    opt = opt || {};
    const W = opt.W || 180, cx = Math.floor(W / 2);
    const phase = opt.phase || phaseOf(opt.night);
    cv.width = W; cv.height = H - VTOP;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(0, -VTOP);

    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, c) => R(x, y, 1, 1, c);
    const A = (x, y, w, h, c, a) => { g.globalAlpha = a; R(x, y, w, h, c); g.globalAlpha = 1; };

    // bolha com contorno e luz vinda de cima à esquerda (copas, arbustos, pedras)
    function blob(parts, cols, seed) {
      const set = new Map(); let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (const [px, py, rx, ry] of parts) {
        for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
          if (x * x / (rx * rx) + y * y / (ry * ry) <= 1.02) {
            const X = Math.round(px + x), Y = Math.round(py + y);
            set.set(X + ',' + Y, [X, Y]);
            if (X < minx) minx = X; if (X > maxx) maxx = X; if (Y < miny) miny = Y; if (Y > maxy) maxy = Y;
          }
        }
      }
      const wx = (maxx - minx) / 2 || 1, wy = (maxy - miny) / 2 || 1, mx = (minx + maxx) / 2, my = (miny + maxy) / 2;
      const rnd = rngFor(seed || 'blob');
      set.forEach(([X, Y]) => { for (const [dx, dy] of N4) if (!set.has((X + dx) + ',' + (Y + dy))) P(X + dx, Y + dy, cols.edge); });
      set.forEach(([X, Y]) => {
        const s = -(X - mx) / wx * 0.5 - (Y - my) / wy * 0.9;
        let c = s > 0.42 ? cols.light : s < -0.3 ? cols.dark : cols.base;
        if (rnd() < 0.1) c = rnd() < 0.5 ? cols.light : cols.dark;
        P(X, Y, c);
      });
      return { minx, maxx, miny, maxy };
    }
    const halo = (x, y, r, col, a) => { for (let k = 3; k >= 1; k--) { const rr = r * k / 3; g.globalAlpha = a * (4 - k) / 3 * 0.7; g.fillStyle = col; for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) if (xx * xx + yy * yy <= rr * rr) g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1); } g.globalAlpha = 1; };
    const shadow = (x, y, rx, ry, a) => {
      g.globalAlpha = a == null ? 0.22 : a; g.fillStyle = '#1f4a30';
      for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) if (xx * xx / (rx * rx) + yy * yy / (ry * ry) <= 1) g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
      g.globalAlpha = 1;
    };

    /* ================= base: grama ================= */
    R(0, 0, W, H, GR.base);
    const rg = rngFor('grama');
    for (let i = 0; i < 320; i++) { const x = rg() * W, y = 20 + rg() * 80; R(x, y, 2 + (rg() * 3 | 0), 1, rg() < 0.5 ? GR.dark : GR.light); }
    for (let i = 0; i < 70; i++) { const x = Math.round(rg() * W), y = Math.round(22 + rg() * 70); P(x, y, GR.deep); P(x - 1, y - 1, GR.deep); P(x + 1, y - 1, GR.deep); }

    /* ================= fundo: copas e barranco ================= */
    R(0, 13, W, 7, '#dba96c'); R(0, 13, W, 1, '#efc58d'); R(0, 18, W, 2, '#b9834f'); R(0, 20, W, 1, '#7d5434');
    const rc = rngFor('barranco');
    for (let i = 0; i < 60; i++) P(rc() * W, 14 + rc() * 5, rc() < 0.5 ? '#c4915a' : '#ecc48e');
    R(0, 0, W, 8, FOL.dark);
    for (let x = -3, i = 0; x < W + 10; x += 9, i++) blob([[x, 6 + (i % 3), 7, 6], [x + 4, 4 + (i % 2), 5, 5]], i % 2 ? FOL : FOL2, 'copa' + i);
    A(0, 20, W, 3, '#2a5a3a', 0.18); // sombra do barranco no chão

    /* ================= caminho e estrada ================= */
    R(0, 93, W, 7, '#e8c68c'); R(0, 93, W, 1, '#b98f58');
    const rs = rngFor('estrada');
    for (let i = 0; i < 70; i++) P(rs() * W, 94 + rs() * 6, rs() < 0.5 ? '#d2a76b' : '#f3dba8');
    // trilha de terra do portão até a porta + pedras de passagem
    for (let y = 65; y < 93; y++) { const w = 5 + Math.round((y - 65) * 0.12); R(cx - w, y, w * 2 + 1, 1, '#e3c58f'); }
    const stoneAt = (x, y, rx, ry) => blob([[x, y, rx, ry]], { base: STONE.base, light: STONE.light, dark: STONE.dark, edge: STONE.edge }, 'pedra' + x + y);
    [[0, 69], [1, 75], [-1, 81], [0, 87]].forEach(([dx, y]) => stoneAt(cx + dx, y, 4, 2));

    /* ================= objetos (desenhados do fundo para a frente) ================= */
    const items = [];
    const add = (base, fn) => items.push([base, fn, items.length]);

    // --- flores ---
    function flower(x, y, col) {
      P(x, y - 1, '#3e8a4c'); P(x, y - 2, '#3e8a4c'); P(x - 1, y - 1, '#62b062'); P(x + 1, y - 2, '#62b062');
      const c = PETALS[col] || col;
      P(x - 1, y - 4, c); P(x + 1, y - 4, c); P(x, y - 5, c); P(x, y - 3, c);
      P(x, y - 4, col === 'yellow' ? '#e8a23a' : '#ffd75a');
    }
    function cluster(x, y, col) {
      R(x - 5, y - 1, 11, 2, '#4f9d59'); R(x - 4, y - 2, 9, 1, '#62b062'); R(x - 4, y + 1, 9, 1, '#37794a');
      flower(x - 3, y, col); flower(x, y - 1, col === 'white' ? 'pink' : 'white'); flower(x + 3, y, col);
    }

    // --- detalhes que existem desde o começo: placa, pedras e toco ---
    if (level < 4) add(78, () => {
      const x = cx + 15, y = 78;
      R(x, y - 9, 2, 10, WOOD.dark); R(x - 4, y - 12, 11, 6, WOOD.edge); R(x - 3, y - 11, 9, 4, '#d9b27a'); R(x - 3, y - 11, 9, 1, '#ecc995');
      R(x - 2, y - 9, 3, 1, WOOD.dark); R(x + 2, y - 9, 2, 1, WOOD.dark);
    });
    add(75, () => { const x = cx - 28, y = 75; blob([[x, y, 3, 2]], { base: STONE.base, light: STONE.light, dark: STONE.dark, edge: STONE.edge }, 'rochaA'); blob([[x + 5, y + 2, 2, 1]], { base: STONE.base, light: STONE.light, dark: STONE.dark, edge: STONE.edge }, 'rochaB'); });

    // --- árvore da direita (nível 3) ---
    if (level >= 3) add(58, () => {
      const x = cx + 41, y = 58;
      shadow(x + 2, y + 1, 12, 3, 0.25);
      R(x - 2, y - 12, 5, 13, WOOD.dark); R(x - 2, y - 12, 2, 13, WOOD.base); R(x - 3, y - 12, 1, 13, WOOD.edge); R(x + 3, y - 12, 1, 13, WOOD.edge); R(x - 3, y + 1, 7, 1, WOOD.edge);
      blob([[x, y - 21, 12, 11], [x - 8, y - 16, 6, 6], [x + 8, y - 16, 6, 6]], { base: '#5eb264', light: '#97dc87', dark: '#3f9250', edge: '#2a6340' }, 'arvore');
    });

    // --- horta (nível 5) ---
    if (level >= 5) add(63, () => {
      const x0 = cx - 52, y0 = 49;
      R(x0 - 1, y0 - 1, 17, 17, WOOD.edge);
      R(x0, y0, 15, 15, '#8b5a3a');
      for (let r = 0; r < 3; r++) {
        const yy = y0 + 2 + r * 5;
        R(x0, yy + 3, 15, 1, '#6e4529');
        for (let c = 0; c < 3; c++) {
          const xx = x0 + 3 + c * 4;
          if (r === 0) { P(xx, yy, '#ff9a3c'); R(xx - 1, yy - 2, 3, 2, '#5fae5f'); P(xx, yy - 3, '#7cc472'); }           // cenoura
          else if (r === 1) { blob([[xx, yy, 2, 2]], { base: '#7cc472', light: '#b4e8a0', dark: '#4f9d59', edge: '#2d6540' }, 'repolho' + c); } // repolho
          else { P(xx, yy, '#d2493c'); P(xx + 1, yy, '#d2493c'); P(xx, yy - 1, '#d2493c'); R(xx, yy - 2, 1, 1, '#4f9d59'); R(xx - 1, yy - 1, 1, 1, '#5fae5f'); } // tomate
        }
      }
      R(x0 + 5, y0 + 15, 5, 1, '#6e4529');
    });

    // --- casinha ---
    add(62, () => {
      // chaminé e fumaça
      R(cx + 14, 12, 7, 18, STONE.base); R(cx + 14, 12, 2, 18, STONE.light); R(cx + 13, 11, 9, 3, STONE.dark); R(cx + 13, 10, 9, 1, STONE.edge);
      R(cx + 13, 11, 1, 3, STONE.edge); R(cx + 21, 11, 1, 3, STONE.edge); R(cx + 21, 14, 1, 16, STONE.edge); R(cx + 13, 14, 1, 16, STONE.edge);
      for (let i = 0; i < 6; i++) P(cx + 15 + (i % 3) * 2, 16 + i * 2, STONE.dark);
      // telhado em 3 facetas (esquerda clara, frente, direita escura)
      const ROOF_T = 22, ROOF_B = 44;
      for (let y = ROOF_T; y <= ROOF_B; y++) {
        const t = (y - ROOF_T) / (ROOF_B - ROOF_T), half = Math.round(18 + t * 14), row = y - ROOF_T;
        for (let x = cx - half; x <= cx + half; x++) {
          const rel = (x - cx) / half;
          let base = RF.C, line = RF.Cl;
          if (rel < -0.5) { base = RF.L; line = RF.Ll; } else if (rel > 0.5) { base = RF.R; line = RF.Rl; }
          let c = base;
          if (row % 4 === 3) c = line;
          else if ((x + (row >> 2) * 3) % 6 === 0) c = line;
          P(x, y, c);
        }
        P(cx - half - 1, y, RF.edge); P(cx + half + 1, y, RF.edge);
      }
      R(cx - 18, 21, 37, 1, RF.edge); R(cx - 18, 22, 37, 2, RF.ridge);
      R(cx - 33, 44, 67, 2, RF.eave); R(cx - 34, 46, 69, 1, RF.edge);
      // paredes
      R(cx - 28, 47, 57, 16, '#f3e5c8');
      R(cx + 21, 47, 8, 16, '#e1cca4');
      R(cx - 29, 47, 1, 16, INK); R(cx + 29, 47, 1, 16, INK);
      A(cx - 28, 47, 57, 3, '#000', 0.16);
      // base de pedra
      const rst = rngFor('parede');
      R(cx - 28, 56, 57, 7, STONE.base);
      for (let yy = 56; yy < 63; yy += 3) {
        R(cx - 28, yy, 57, 1, STONE.dark);
        for (let x = cx - 28 + ((yy / 3 | 0) % 2) * 4; x < cx + 29; x += 8) R(x, yy + 1, 1, 2, STONE.dark);
      }
      for (let i = 0; i < 30; i++) P(cx - 28 + rst() * 57, 56 + rst() * 7, rst() < 0.5 ? STONE.light : STONE.dark);
      R(cx - 28, 55, 57, 1, '#8a6a4a');
      // vigas de madeira
      R(cx - 28, 47, 57, 2, WOOD.dark); R(cx - 28, 47, 2, 16, WOOD.dark); R(cx + 27, 47, 2, 16, WOOD.dark); R(cx - 28, 47, 57, 1, WOOD.base);
      R(cx - 9, 49, 1, 6, WOOD.dark); R(cx + 9, 49, 1, 6, WOOD.dark);
      // porta
      R(cx - 5, 49, 11, 14, WOOD.edge); R(cx - 4, 50, 9, 13, '#d9506a');
      P(cx - 4, 50, WOOD.edge); P(cx + 4, 50, WOOD.edge);
      R(cx - 3, 52, 3, 4, '#bf3a56'); R(cx + 1, 52, 3, 4, '#bf3a56'); R(cx - 3, 57, 3, 5, '#bf3a56'); R(cx + 1, 57, 3, 5, '#bf3a56');
      P(cx + 3, 58, '#f6cf6a');
      // degrau
      R(cx - 7, 63, 15, 2, STONE.light); R(cx - 7, 65, 15, 1, STONE.dark); R(cx - 8, 63, 1, 3, STONE.edge); R(cx + 8, 63, 1, 3, STONE.edge); R(cx - 7, 66, 15, 1, STONE.edge);
      // janelas
      const win = (wx) => {
        R(wx - 4, 49, 2, 10, '#5f9a7a'); R(wx + 11, 49, 2, 10, '#5f9a7a');                  // venezianas
        R(wx - 1, 49, 11, 10, WOOD.edge); R(wx, 50, 9, 8, '#9fd3ea');
        for (let i = 0; i < 4; i++) P(wx + 1 + i, 51 + i, '#d6f0fa');
        R(wx + 4, 50, 1, 8, WOOD.dark); R(wx, 53, 9, 1, WOOD.dark);
        R(wx - 2, 59, 13, 2, WOOD.base); R(wx - 2, 61, 13, 1, WOOD.edge);                    // peitoril
        if (level >= 2) {                                                                    // jardineira florida (nível 2)
          R(wx - 2, 59, 13, 4, '#9a6a3f'); R(wx - 2, 63, 13, 1, WOOD.edge); R(wx - 2, 59, 13, 1, WOOD.light);
          for (let i = 0; i < 5; i++) {
            const col = [PETALS.pink, PETALS.white, PETALS.lilac, PETALS.pink, PETALS.white][i];
            P(wx - 1 + i * 2.5, 58, '#4f9d59'); R(wx - 1 + i * 2.5 - 1, 56, 3, 2, col); P(wx - 1 + i * 2.5, 56, '#ffd75a');
          }
        }
      };
      win(cx - 20); win(cx + 12);
      A(cx - 30, 63, 62, 4, '#1f4a30', 0.25);
    });

    // --- arbustos nos cantos da casa ---
    add(63, () => {
      [[cx - 33, 59], [cx + 33, 59]].forEach(([x, y], i) => {
        blob([[x, y, 5, 4], [x + (i ? 3 : -3), y + 2, 4, 3]], { base: '#4f9d59', light: '#7cc472', dark: '#37794a', edge: '#27553a' }, 'arbusto' + i);
        if (level >= 2) { P(x - 2, y - 1, PETALS.pink); P(x + 1, y, PETALS.pink); P(x - 1, y + 2, PETALS.white); P(x + 3, y - 1, PETALS.white); }
      });
    });

    // --- faixa de flores rente à parede (nível 2) ---
    if (level >= 2) add(66, () => {
      const cols = [PETALS.pink, PETALS.white, PETALS.lilac, PETALS.yellow];
      for (let i = 0; i < 5; i++) { flower(cx - 26 + i * 4, 68, cols[i % 4]); flower(cx + 10 + i * 4, 68, cols[(i + 2) % 4]); }
    });

    // --- canteiros de flores no quintal (nível 2+) ---
    if (level >= 2) {
      const count = Math.min(FLOWER_SPOTS.length, 8 + (level - 2) * 2);
      FLOWER_SPOTS.slice(0, count).forEach(([dx, y, col]) => add(y, () => cluster(cx + dx, y, col)));
    }

    // --- poço (nível 6) ---
    if (level >= 6) add(87, () => {
      const x = cx - 40, y = 84;
      shadow(x, y + 3, 9, 3, 0.25);
      R(x - 6, y - 14, 2, 14, WOOD.dark); R(x + 5, y - 14, 2, 14, WOOD.dark);
      blob([[x, y, 8, 4]], { base: STONE.base, light: STONE.light, dark: STONE.dark, edge: STONE.edge }, 'poco');
      R(x - 5, y - 2, 11, 3, '#3a4a5a'); R(x - 4, y - 2, 9, 1, '#5b7d93');
      R(x - 8, y - 17, 17, 3, '#3f6f7a'); R(x - 6, y - 19, 13, 2, '#4f8a96'); R(x - 4, y - 21, 9, 2, '#5ea0ab'); R(x - 8, y - 14, 17, 1, '#27454c');
      R(x, y - 13, 1, 8, INK); R(x - 1, y - 6, 3, 3, '#8a5a3c');
    });

    // --- lampião e caixa de correio (nível 7) ---
    if (level >= 7) {
      add(75, () => { // lampião ao lado do caminho
        const x = cx - 9, y = 75;
        R(x, y - 14, 1, 14, INK); R(x - 2, y - 20, 5, 6, INK); R(x - 1, y - 19, 3, 4, '#ffe38a'); R(x - 3, y - 21, 7, 1, INK); P(x - 1, y - 22, INK); P(x + 1, y - 22, INK);
        R(x - 1, y, 3, 1, INK);
      });
      add(80, () => { // caixa de correio
        const x = cx + 22, y = 80;
        R(x, y - 8, 2, 9, WOOD.dark); blob([[x, y - 11, 4, 3]], { base: '#d9503f', light: '#f27a66', dark: '#a93a2c', edge: '#5e1f17' }, 'correio');
        R(x + 3, y - 15, 1, 5, INK); R(x + 4, y - 15, 3, 2, '#ffffff');
      });
    }

    // --- girassóis (nível 8) ---
    if (level >= 8) [[cx + 47, 58], [cx + 47, 68], [cx + 47, 78]].forEach(([x, y], i) => add(y, () => {
      R(x, y - 12, 1, 13, '#3e8a4c'); P(x - 1, y - 6, '#62b062'); P(x - 2, y - 7, '#62b062'); P(x + 1, y - 4, '#62b062'); P(x + 2, y - 5, '#62b062');
      blob([[x, y - 15, 4, 4]], { base: '#ffcf3a', light: '#ffe98a', dark: '#e8a226', edge: '#7a4a14' }, 'girassol' + i);
      R(x - 1, y - 16, 3, 3, '#6b3f1e'); P(x, y - 15, '#8a5a2a');
    }));

    // --- cerca e portão (nível 4) ---
    if (level >= 4) add(91, () => {
      const post = (x, y, h) => { R(x - 1, y - h, 3, h, WOOD.base); R(x - 1, y - h, 1, h, WOOD.light); R(x + 1, y - h, 1, h, WOOD.dark); R(x - 2, y - h - 1, 5, 1, WOOD.edge); R(x - 2, y - h, 1, h, WOOD.edge); R(x + 2, y - h, 1, h, WOOD.edge); R(x - 1, y, 3, 1, WOOD.edge); };
      const L = cx - 54, Rr = cx + 54;
      // laterais
      for (const x of [L, Rr]) { R(x, 56, 1, 1, WOOD.edge); R(x - 1, 63, 3, 2, WOOD.dark); for (let y = 58; y <= 90; y += 8) post(x, y + 6, 9); R(x, 62, 1, 28, WOOD.dark); R(x - 1, 70, 3, 1, WOOD.dark); R(x - 1, 80, 3, 1, WOOD.dark); }
      // frente (com abertura para o portão)
      for (const [a, b] of [[L, cx - 13], [cx + 13, Rr]]) {
        R(a, 82, b - a, 1, WOOD.dark); R(a, 86, b - a, 1, WOOD.dark);
        for (let x = a; x <= b; x += 8) post(x, 92, 10);
      }
      // portão baixo, com telhadinho em degraus
      post(cx - 12, 93, 15); post(cx + 12, 93, 15);
      R(cx - 15, 75, 31, 3, '#7a4a3a'); R(cx - 16, 75, 1, 4, WOOD.edge); R(cx + 16, 75, 1, 4, WOOD.edge); R(cx - 15, 78, 31, 1, WOOD.edge);
      R(cx - 12, 72, 25, 3, '#8f5a48'); R(cx - 13, 72, 1, 3, WOOD.edge); R(cx + 13, 72, 1, 3, WOOD.edge);
      R(cx - 8, 69, 17, 3, '#a56a54'); R(cx - 9, 69, 1, 3, WOOD.edge); R(cx + 9, 69, 1, 3, WOOD.edge); R(cx - 8, 68, 17, 1, WOOD.edge);
      R(cx - 8, 69, 17, 1, '#c28468'); R(cx - 12, 72, 25, 1, '#a56a54'); R(cx - 15, 75, 31, 1, '#8f5a48');
      A(cx - 11, 79, 23, 2, '#000', 0.12);
    });

    // --- gatinho e borboletas (nível 10) ---
    if (level >= 10) {
      add(67, () => {
        const x = cx + 8, y = 66;
        R(x - 1, y - 5, 7, 5, '#e39a52'); R(x - 1, y - 5, 7, 1, '#f3b870'); R(x + 5, y - 9, 4, 4, '#e39a52'); P(x + 5, y - 10, '#e39a52'); P(x + 8, y - 10, '#e39a52');
        P(x + 6, y - 8, INK); P(x + 8, y - 8, INK); R(x - 3, y - 3, 2, 4, '#e39a52'); P(x - 3, y + 1, '#e39a52');
        R(x - 1, y, 7, 1, '#b36f2e'); R(x + 5, y - 5, 4, 1, '#f3b870');
        R(x - 2, y - 6, 9, 1, 'rgba(0,0,0,0)');
      });
      [[cx - 18, 72, PETALS.pink], [cx + 34, 66, PETALS.yellow]].forEach(([x, y, c], i) => add(95, () => { P(x, y, c); P(x + 2, y, c); P(x - 1, y - 1, c); P(x + 3, y - 1, c); P(x + 1, y + 1, INK); P(x + 1, y, INK); }));
    }

    items.sort((a, b) => a[0] - b[0] || a[2] - b[2]).forEach((it) => it[1]());

    /* ================= luz do dia / entardecer / noite ================= */
    if (phase !== 'day') {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = phase === 'night' ? '#5d66b8' : '#ffcfa6';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      // janelas acesas
      const glow = phase === 'night' ? 1 : 0.55;
      [cx - 20, cx + 12].forEach((wx) => {
        halo(wx + 4, 54, 11, '#ffd36b', 0.3 * glow);
        g.globalAlpha = glow; R(wx, 50, 9, 8, '#ffd36b'); R(wx + 4, 50, 1, 8, '#b8742a'); R(wx, 53, 9, 1, '#b8742a'); g.globalAlpha = 1;
      });
      if (phase === 'night') {
        if (level >= 7) { halo(cx - 9, 57, 13, '#ffe38a', 0.35); R(cx - 10, 56, 3, 4, '#fff1b0'); }
        const rf = rngFor('vagalumes');
        for (let i = 0; i < Math.min(14, 4 + level); i++) { const x = rf() * W, y = 40 + rf() * 50; P(x, y, '#fff4a8'); A(x - 1, y - 1, 3, 3, '#ffe86a', 0.25); }
      }
    }
  }

  // escolhe uma escala inteira (px de arte -> px da tela) para os pixels ficarem nítidos
  function fit(cv, level, opt) {
    const wrap = cv.parentElement;
    const cssW = (wrap && wrap.clientWidth) || 358;
    let s = Math.min(4, Math.max(2, Math.round(cssW / 135)));
    while (s > 2 && Math.ceil(cssW / s) < 116) s--;
    const W = Math.ceil(cssW / s);
    draw(cv, level, Object.assign({ W }, opt || {}));
    cv.style.width = (W * s) + 'px';
    cv.style.height = ((H - VTOP) * s) + 'px';
    cv.style.marginLeft = Math.floor((cssW - W * s) / 2) + 'px';
  }

  return { draw, fit, H, phaseOf };
});
