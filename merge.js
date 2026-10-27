/* ==========================================================
   Recanto dos Hábitos — junção de dados entre aparelhos
   Cada registro (hábito, conclusão, quest, item da loja, compra,
   campo do perfil ou ajuste) tem um "carimbo" de quando foi alterado.
   Ao juntar dois aparelhos, vence o registro com carimbo mais novo.
   Apagar vira um "túmulo" (carimbo sem registro), para que um
   aparelho desatualizado não ressuscite o que foi apagado.
   Sem dependências: roda no navegador e no Node (testes).
   ========================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecantoMerge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // transforma o estado em { chave: valor }. A chave identifica o registro.
  function flatten(s) {
    const f = {};
    for (const k in (s.profile || {})) f['pf:' + k] = s.profile[k];
    for (const k in (s.settings || {})) f['st:' + k] = s.settings[k];
    for (const h of s.habits || []) f['h:' + h.id] = h;
    for (const id in (s.comps || {})) for (const d in s.comps[id]) f['c:' + id + ':' + d] = s.comps[id][d];
    for (const q of s.quests || []) f['q:' + q.id] = q;
    for (const i of s.shop || []) f['s:' + i.id] = i;
    for (const p of s.purchases || []) f['p:' + p.id] = p;
    for (const id in (s.achievements || {})) f['a:' + id] = s.achievements[id];
    return f;
  }

  const ser = (v) => JSON.stringify(v === undefined ? null : v);
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }

  // foto do estado (chave -> texto) para descobrir o que mudou depois
  function snapshot(s) {
    const f = flatten(s), o = {};
    for (const k in f) o[k] = ser(f[k]);
    return o;
  }

  // compara com a foto anterior e carimba o que mudou ou foi apagado
  function restamp(s, last, now) {
    now = now || Date.now();
    s.stamps = s.stamps || {};
    const cur = snapshot(s);
    let changed = false;
    for (const k in cur) {
      if (!(k in last) || cur[k] !== last[k]) { s.stamps[k] = now; changed = true; }
      else if (s.stamps[k] == null) s.stamps[k] = 1; // dado antigo, sem histórico: carimbo mínimo
    }
    for (const k in last) if (!(k in cur)) { s.stamps[k] = now; changed = true; }
    return { snap: cur, changed };
  }

  const sortBy = (a, b) => ((a.created || 0) - (b.created || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  function unflatten(flat, stamps, base) {
    const out = {
      v: 1, profile: Object.assign({}, base.profile), settings: Object.assign({}, base.settings),
      habits: [], comps: {}, quests: [], shop: [], purchases: [], achievements: {}, stamps
    };
    for (const key in flat) {
      const val = flat[key], i = key.indexOf(':'), p = key.slice(0, i), rest = key.slice(i + 1);
      if (p === 'pf') out.profile[rest] = val;
      else if (p === 'st') out.settings[rest] = val;
      else if (p === 'h') out.habits.push(val);
      else if (p === 'c') { const j = rest.indexOf(':'); const id = rest.slice(0, j), d = rest.slice(j + 1); (out.comps[id] || (out.comps[id] = {}))[d] = val; }
      else if (p === 'q') out.quests.push(val);
      else if (p === 's') out.shop.push(val);
      else if (p === 'p') out.purchases.push(val);
      else if (p === 'a') out.achievements[rest] = val;
    }
    out.habits.sort(sortBy); out.quests.sort(sortBy); out.shop.sort(sortBy);
    out.purchases.sort((a, b) => (b.at || '').localeCompare(a.at || '') || (a.id < b.id ? -1 : 1));
    // no máximo uma quest principal aberta: fica a de carimbo mais novo
    const mains = out.quests.filter((q) => !q.done && q.main);
    if (mains.length > 1) {
      mains.sort((a, b) => (stamps['q:' + b.id] || 0) - (stamps['q:' + a.id] || 0));
      mains.slice(1).forEach((q) => { q.main = false; });
    }
    return out;
  }

  // junta dois estados (a = local, b = remoto). Resultado igual nos dois sentidos.
  function merge(a, b) {
    const fa = flatten(a), fb = flatten(b), sa = a.stamps || {}, sb = b.stamps || {};
    const keys = new Set([...Object.keys(fa), ...Object.keys(fb), ...Object.keys(sa), ...Object.keys(sb)]);
    const flat = {}, stamps = {};
    for (const k of keys) {
      const inA = k in fa, inB = k in fb;
      const ua = sa[k] != null ? sa[k] : (inA ? 1 : 0);
      const ub = sb[k] != null ? sb[k] : (inB ? 1 : 0);
      let pickA;
      if (ua !== ub) pickA = ua > ub;
      else { // empate: desempata pelo conteúdo, para os dois aparelhos escolherem igual
        const ha = inA ? stable(fa[k]) : '', hb = inB ? stable(fb[k]) : '';
        pickA = ha >= hb;
      }
      const src = pickA ? fa : fb;
      if (k in src) flat[k] = JSON.parse(JSON.stringify(src[k]));
      stamps[k] = pickA ? ua : ub;
    }
    return unflatten(flat, stamps, a);
  }

  // mesma informação? (ignora a ordem das listas)
  function fingerprint(s) {
    const f = flatten(s), st = s.stamps || {}, keys = Object.keys(f).concat(Object.keys(st).filter((k) => !(k in f))).sort();
    return keys.map((k) => k + '=' + (k in f ? stable(f[k]) : '∅') + '@' + (st[k] || 0)).join('\n');
  }
  const equal = (a, b) => fingerprint(a) === fingerprint(b);

  // troca o estado inteiro (importar backup / apagar tudo) de um jeito que se propaga:
  // tudo que existia vira túmulo e tudo que existe agora ganha carimbo novo
  function replaceState(oldS, newS, now) {
    now = now || Date.now();
    const stamps = {};
    for (const k of Object.keys(flatten(oldS))) stamps[k] = now;
    for (const k of Object.keys(oldS.stamps || {})) stamps[k] = now;
    for (const k of Object.keys(flatten(newS))) stamps[k] = now;
    newS.stamps = stamps;
    return newS;
  }

  return { flatten, snapshot, restamp, merge, equal, fingerprint, replaceState };
});
