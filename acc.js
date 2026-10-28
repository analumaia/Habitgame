/* Acessórios do avatar: desenhados em pixel art (grade 32x32) e sobrepostos à foto.
   Cada acessório ocupa um "espaço" (cabeça, mão, pescoço...). Ao subir de nível, o mais novo de cada espaço vale. */
(function (root) {
  'use strict';
  const O = '#4a3428', PINK = '#e8849a', PINK2 = '#c25a74', GOLD = '#f2c94c', GOLD2 = '#d9a62e', GRN = '#6fb05a', CREAM = '#f7efd8', YEL = '#f7d56b';
  const flower = (x, y, c) => [[x, y, 3, 3, c], [x + 1, y + 1, 1, 1, YEL]];
  const basket = (top) => [[19, 25, 12, 6, '#c98f55'], [19, 27, 12, 1, '#a86f3c'], [19, 29, 12, 1, '#a86f3c'], [18, 24, 14, 1, '#b07a45'], ...top];
  const sparkle = (x, y) => [[x + 1, y, 1, 3, '#fff5b8'], [x, y + 1, 3, 1, '#fff5b8']];
  const stripes = [[3, 27, 26, 4, '#d9534f'], [3, 28, 26, 1, CREAM], [3, 30, 26, 1, CREAM], [22, 30, 4, 2, '#d9534f']];

  // [id, espaço, nível, nome, formas [x, y, w, h, cor]]
  const ITEMS = [
    ['laco', 'head', 3, 'Laço rosa', [[3, 2, 3, 4, PINK], [7, 2, 3, 4, PINK], [6, 3, 2, 2, PINK2], [3, 5, 3, 1, PINK2], [7, 5, 3, 1, PINK2]]],
    ['chapeu', 'head', 4, 'Chapéu de fazendeiro', [[3, 8, 26, 3, '#e7c26b'], [3, 10, 26, 1, '#c79a45'], [11, 1, 10, 1, '#efd185'], [9, 2, 14, 6, '#efd185'], [9, 6, 14, 2, '#b5553c']]],
    ['cesta', 'handR', 5, 'Cesta de flores', basket([[20, 22, 3, 3, PINK], [23, 21, 3, 3, '#fff'], [26, 22, 3, 3, YEL], [20, 22, 1, 1, YEL], [22, 24, 6, 1, GRN], [24, 22, 1, 1, YEL], [27, 23, 1, 1, '#d98a2b']])],
    ['cachecol', 'neck', 6, 'Cachecol vermelho', [[3, 27, 26, 4, '#d9534f'], [3, 29, 26, 1, '#b73f3b'], [22, 30, 4, 2, '#d9534f']]],
    ['regador', 'handL', 7, 'Regador', [[1, 25, 2, 4, '#4f86a8'], [3, 25, 9, 6, '#6aa6c9'], [3, 29, 9, 2, '#4f86a8'], [4, 24, 7, 1, '#8cc0de'], [12, 26, 2, 1, '#6aa6c9'], [13, 24, 2, 2, '#6aa6c9'], [14, 23, 3, 1, '#cfe6f3']]],
    ['borboleta', 'pet', 9, 'Borboleta', [[22, 3, 4, 3, '#b68de0'], [22, 6, 3, 2, '#d3b6ee'], [27, 3, 4, 3, '#b68de0'], [28, 6, 3, 2, '#d3b6ee'], [26, 4, 1, 5, O], [25, 1, 1, 2, O], [27, 1, 1, 2, O]]],
    ['coroa-flores', 'head', 11, 'Coroa de flores', [[3, 6, 26, 2, GRN], [5, 4, 22, 2, GRN], ...flower(4, 5, PINK), ...flower(9, 3, '#fff'), ...flower(14, 2, '#c9a7ee'), ...flower(19, 3, PINK), ...flower(24, 5, '#fff')]],
    ['passarinho', 'pet', 13, 'Passarinho', [[18, 5, 3, 2, '#4f86a8'], [20, 4, 7, 5, '#6aa6c9'], [25, 2, 4, 4, '#6aa6c9'], [29, 3, 2, 1, '#e68a2b'], [27, 3, 1, 1, O], [21, 7, 5, 2, CREAM], [22, 9, 1, 2, '#e68a2b'], [24, 9, 1, 2, '#e68a2b']]],
    ['cachecol2', 'neck', 15, 'Cachecol listrado', stripes],
    ['lanterna', 'handL', 17, 'Lanterna', [[7, 20, 4, 2, '#8a5a3c'], [5, 22, 8, 2, '#8a5a3c'], [6, 24, 6, 6, '#ffd36a'], [6, 26, 6, 1, '#8a5a3c'], [8, 25, 2, 3, '#fff4b8'], [5, 30, 8, 1, '#8a5a3c']]],
    ['cogumelo', 'head', 18, 'Chapéu de cogumelo', [[9, 1, 14, 2, '#d9534f'], [6, 3, 20, 4, '#d9534f'], [4, 7, 24, 3, '#d9534f'], [4, 9, 24, 1, '#b73f3b'], [11, 2, 3, 2, '#fff'], [18, 4, 3, 3, '#fff'], [7, 6, 2, 2, '#fff'], [23, 6, 2, 2, '#fff'], [14, 8, 3, 1, '#fff']]],
    ['cesta2', 'handR', 20, 'Cesta de maçãs', basket([[20, 22, 4, 3, '#d9534f'], [24, 21, 4, 4, '#e0463f'], [28, 22, 3, 3, '#d9534f'], [25, 20, 1, 1, GRN], [21, 21, 1, 1, GRN]])],
    ['brilhos', 'aura', 22, 'Brilhos encantados', [...sparkle(1, 10), ...sparkle(28, 14), ...sparkle(13, 12), ...sparkle(2, 18)]],
    ['coroa', 'head', 25, 'Coroa dourada', [[8, 5, 16, 4, GOLD], [8, 8, 16, 1, GOLD2], [8, 2, 3, 3, GOLD], [14, 1, 4, 4, GOLD], [21, 2, 3, 3, GOLD], [15, 6, 2, 2, '#e0463f'], [10, 6, 2, 1, '#6aa6c9'], [20, 6, 2, 1, '#6fb05a'], ...sparkle(2, 3), ...sparkle(27, 3)]]
  ];
  const MAX_LEVEL = 25;

  function paint(shapes) {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    for (const [x, y, w, h] of shapes) { g.fillStyle = O; g.fillRect(x - 1, y - 1, w + 2, h + 2); }
    for (const [x, y, w, h, col] of shapes) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    return c;
  }
  const cache = {};
  const byId = (id) => ITEMS.find((i) => i[0] === id);
  const info = (i) => ({ id: i[0], slot: i[1], level: i[2], name: i[3] });

  // acessórios ativos no nível: o mais novo de cada espaço
  function equipped(level) {
    const by = {};
    for (const i of ITEMS) if (i[2] <= level) by[i[1]] = i;
    return ITEMS.filter((i) => by[i[1]] === i);
  }
  // imagem (data URL) com todos os acessórios ativos sobrepostos
  function overlay(level) {
    const items = equipped(level);
    if (!items.length) return '';
    const key = items.map((i) => i[0]).join(',');
    if (cache[key]) return cache[key];
    const slots = ['aura', 'neck', 'handL', 'handR', 'head', 'pet'];
    const sorted = items.slice().sort((a, b) => slots.indexOf(a[1]) - slots.indexOf(b[1]));
    return (cache[key] = paint([].concat(...sorted.map((i) => i[4]))).toDataURL());
  }
  // miniatura de um acessório isolado, recortada no tamanho do desenho
  function thumb(id) {
    if (cache['t' + id]) return cache['t' + id];
    const sh = byId(id)[4];
    const x0 = Math.max(0, Math.min(...sh.map((s) => s[0])) - 1), y0 = Math.max(0, Math.min(...sh.map((s) => s[1])) - 1);
    const x1 = Math.min(32, Math.max(...sh.map((s) => s[0] + s[2])) + 1), y1 = Math.min(32, Math.max(...sh.map((s) => s[1] + s[3])) + 1);
    const w = x1 - x0, h = y1 - y0, side = Math.max(w, h);
    const c = document.createElement('canvas'); c.width = c.height = side;
    c.getContext('2d').drawImage(paint(sh), x0, y0, w, h, Math.floor((side - w) / 2), Math.floor((side - h) / 2), w, h);
    return (cache['t' + id] = c.toDataURL());
  }
  const all = () => ITEMS.map(info);
  const at = (level) => ITEMS.filter((i) => i[2] === level).map(info);

  root.RecantoAcc = { all, at, equipped: (l) => equipped(l).map(info), overlay, thumb, MAX_LEVEL };
})(window);
