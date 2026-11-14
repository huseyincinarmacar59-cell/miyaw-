// Miyav Doku - bölüm üretici ve çözücü (tarayıcı + node)
(function (root) {
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sizeFor(level) {
    if (level <= 4) return 5;
    if (level <= 12) return 6;
    if (level <= 30) return 7;
    if (level <= 60) return 8;
    if (level <= 110) return 9;
    return 10;
  }

  // Çözüm say (en fazla limit kadar). regions: N*N dizi
  function solve(N, regions, limit) {
    const sols = [];
    const cur = new Array(N);
    function rec(r, colMask, regMask, prev) {
      if (sols.length >= limit) return;
      if (r === N) { sols.push(cur.slice()); return; }
      for (let c = 0; c < N; c++) {
        if (colMask & (1 << c)) continue;
        if (prev >= 0 && Math.abs(prev - c) <= 1) continue;
        const g = regions[r * N + c];
        if (regMask & (1 << g)) continue;
        cur[r] = c;
        rec(r + 1, colMask | (1 << c), regMask | (1 << g), c);
        if (sols.length >= limit) return;
      }
    }
    rec(0, 0, 0, -1);
    return sols;
  }

  function randomQueens(N, rand) {
    for (let tries = 0; tries < 1000; tries++) {
      const q = [];
      const used = new Set();
      let ok = true;
      for (let r = 0; r < N; r++) {
        const opts = [];
        for (let c = 0; c < N; c++) {
          if (used.has(c)) continue;
          if (r > 0 && Math.abs(q[r - 1] - c) <= 1) continue;
          opts.push(c);
        }
        if (!opts.length) { ok = false; break; }
        const c = opts[Math.floor(rand() * opts.length)];
        q.push(c); used.add(c);
      }
      if (ok) return q;
    }
    return null;
  }

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function growRegions(N, queens, rand) {
    const reg = new Array(N * N).fill(-1);
    const weight = [];
    for (let r = 0; r < N; r++) { reg[r * N + queens[r]] = r; weight.push(0.3 + rand() * 1.7); }
    let left = N * N - N;
    while (left > 0) {
      // ağırlıklı bölge seç
      let tot = 0; for (const w of weight) tot += w;
      let x = rand() * tot, g = 0;
      for (; g < N; g++) { x -= weight[g]; if (x <= 0) break; }
      if (g >= N) g = N - 1;
      const front = [];
      for (let i = 0; i < N * N; i++) {
        if (reg[i] !== -1) continue;
        const r = (i / N) | 0, c = i % N;
        for (const [dr, dc] of DIRS) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
          if (reg[rr * N + cc] === g) { front.push(i); break; }
        }
      }
      if (!front.length) { weight[g] *= 0.5; if (weight[g] < 1e-6) weight[g] = 1e-6; continue; }
      reg[front[Math.floor(rand() * front.length)]] = g;
      left--;
    }
    return reg;
  }

  function connectedWithout(N, reg, g, skip) {
    let start = -1, count = 0;
    for (let i = 0; i < N * N; i++) if (reg[i] === g && i !== skip) { count++; if (start < 0) start = i; }
    if (count === 0) return false;
    const seen = new Set([start]); const st = [start];
    while (st.length) {
      const i = st.pop(); const r = (i / N) | 0, c = i % N;
      for (const [dr, dc] of DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        const j = rr * N + cc;
        if (j === skip || reg[j] !== g || seen.has(j)) continue;
        seen.add(j); st.push(j);
      }
    }
    return seen.size === count;
  }

  // Zorluk: ilk bölümler sadece temel mantık, sonra daha ileri teknikler
  function maxKFor(level) { return level <= 40 ? 1 : level <= 200 ? 2 : 3; }

  function generate(level) {
    const N = sizeFor(level);
    const rand = rng(level * 7919 + 12345);
    for (let attempt = 0; attempt < 3000; attempt++) {
      const queens = randomQueens(N, rand);
      const qset = new Set(queens.map((c, r) => r * N + c));
      const reg = growRegions(N, queens, rand);
      for (let it = 0; it < 400; it++) {
        const sols = solve(N, reg, 2);
        let alt = null;
        for (const s of sols) if (s.some((c, r) => c !== queens[r])) { alt = s; break; }
        if (!alt) {
          if (sols.length === 1) {
            const Lg = (typeof module !== 'undefined') ? require('./logic.js') : root.MiyavLogic;
            if (Lg.logicSolve(N, reg, maxKFor(level)).ok) return { N, regions: reg, solution: queens, level };
          }
          break;
        }
        // alternatif çözümün kraliçelerinden birinin hücresini komşu bölgeye ver
        const cand = [];
        alt.forEach((c, r) => { const i = r * N + c; if (!qset.has(i)) cand.push(i); });
        let moved = false;
        for (let k = cand.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [cand[k], cand[j]] = [cand[j], cand[k]]; }
        for (const i of cand) {
          const g = reg[i];
          if (!connectedWithout(N, reg, g, i)) continue;
          const r = (i / N) | 0, c = i % N;
          const nb = [];
          for (const [dr, dc] of DIRS) {
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
            const g2 = reg[rr * N + cc];
            if (g2 !== g && !nb.includes(g2)) nb.push(g2);
          }
          if (!nb.length) continue;
          reg[i] = nb[Math.floor(rand() * nb.length)];
          moved = true; break;
        }
        if (!moved) break;
      }
    }
    return null;
  }

  const api = { generate, solve, sizeFor, maxKFor };
  if (typeof module !== 'undefined') module.exports = api; else root.MiyavGen = api;
})(this);
