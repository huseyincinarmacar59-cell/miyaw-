// Miyav Doku - mantık çözücü: tahminsiz, insan gibi adım adım çözer.
// Her adım {cat, xs, msg, hl} döndürür.
(function (root) {
  // Türkçe ekler
  const E = {
    'satır': { da: 'satırda', a: 'satıra', in: 'satırın', lar: 'satırlar', larda: 'satırlardaki' },
    'sütun': { da: 'sütunda', a: 'sütuna', in: 'sütunun', lar: 'sütunlar', larda: 'sütunlardaki' },
    'renk': { da: 'renkte', a: 'renge', in: 'rengin', lar: 'renkler', larda: 'renklerdeki' }
  };
  function makeUnits(N, regions) {
    const rows = [], cols = [], regs = [];
    for (let k = 0; k < N; k++) { rows.push([]); cols.push([]); regs.push([]); }
    for (let i = 0; i < N * N; i++) { rows[(i / N) | 0].push(i); cols[i % N].push(i); regs[regions[i]].push(i); }
    return { rows, cols, regs };
  }
  function neighborsAndLines(N, regions, i) {
    const r = (i / N) | 0, c = i % N, g = regions[i], out = [];
    for (let j = 0; j < N * N; j++) {
      if (j === i) continue;
      const rr = (j / N) | 0, cc = j % N;
      if (rr === r || cc === c || regions[j] === g || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)) out.push(j);
    }
    return out;
  }
  function combos(arr, k, start, cur, out) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  }

  // state: {cand: Uint8Array(N*N) 1=aday, cat: Uint8Array}
  function nextStep(N, regions, st, maxK) {
    const U = makeUnits(N, regions);
    const kinds = [['satır', U.rows], ['sütun', U.cols], ['renk', U.regs]];
    const filled = (unit) => unit.some(i => st.cat[i]);
    const cands = (unit) => unit.filter(i => st.cand[i] && !st.cat[i]);
    // 1) tek aday
    for (const [name, units] of kinds) for (const u of units) {
      if (filled(u)) continue;
      const c = cands(u);
      if (c.length === 0) return { bad: true };
      if (c.length === 1) return { cat: c[0], xs: [], msg: `Bu ${name} için kedinin gidebileceği tek kare kaldı 🐱`, hl: u };
    }
    // 2) k'lı sıkışma (k=1..maxK)
    const tryConf = (k) => {
      // A türü: k renk, adayları tam k satırda (veya sütunda) -> o satırlardaki diğer renkler X
      // B türü: k satır (sütun), adayları tam k renkte -> o renklerin dışarıdaki adayları X
      const openRegs = U.regs.map((u, g) => g).filter(g => !filled(U.regs[g]));
      for (const [lname, lines, lineOf] of [['satır', U.rows, i => (i / N) | 0], ['sütun', U.cols, i => i % N]]) {
        const openLines = lines.map((u, l) => l).filter(l => !filled(lines[l]));
        const cs = []; combos(openRegs, k, 0, [], cs);
        for (const set of cs) {
          const ls = new Set(); set.forEach(g => cands(U.regs[g]).forEach(i => ls.add(lineOf(i))));
          if (ls.size !== k) continue;
          const xs = []; ls.forEach(l => cands(lines[l]).forEach(i => { if (!set.includes(regions[i])) xs.push(i); }));
          if (xs.length) return { xs, msg: k === 1 ? `Bu rengin bütün boş kareleri aynı ${E[lname].da}. O ${E[lname].in} geri kalanına kedi gelemez ❌` : `Bu ${k} renk sadece ${k} ${E[lname].a} sığıyor. O ${E[lname].larda} diğer kareler boş kalmalı ❌`, hl: set.flatMap(g => cands(U.regs[g])) };
        }
        const cl = []; combos(openLines, k, 0, [], cl);
        for (const set of cl) {
          const gs = new Set(); set.forEach(l => cands(lines[l]).forEach(i => gs.add(regions[i])));
          if (gs.size !== k) continue;
          const xs = []; gs.forEach(g => cands(U.regs[g]).forEach(i => { if (!set.includes(lineOf(i))) xs.push(i); }));
          if (xs.length) return { xs, msg: k === 1 ? `Bu ${E[lname].da}ki bütün boş kareler aynı renkte. O rengin kedisi bu ${E[lname].da} olmalı, rengin diğer kareleri ❌` : `Bu ${k} ${lname} sadece ${k} renkten kare içeriyor. O renklerin dışarıdaki kareleri ❌`, hl: set.flatMap(l => cands(lines[l])) };
        }
      }
      return null;
    };
    let s = tryConf(1); if (s) return s;
    // 3) bir adım ileri bakma: buraya kedi koyunca bir satır/sütun/renk tamamen kapanıyorsa X
    for (let i = 0; i < N * N; i++) {
      if (!st.cand[i] || st.cat[i]) continue;
      const kill = new Set(neighborsAndLines(N, regions, i)); kill.add(i);
      const r = (i / N) | 0, c = i % N, g = regions[i];
      for (const [name, units] of kinds) for (let k = 0; k < units.length; k++) {
        const u = units[k];
        if (filled(u)) continue;
        if ((name === 'satır' && k === r) || (name === 'sütun' && k === c) || (name === 'renk' && k === g)) continue;
        if (cands(u).every(j => kill.has(j))) return { xs: [i], msg: `Buraya kedi koyarsan bir ${E[name].a} hiç yer kalmaz. Burası ❌ olmalı`, hl: cands(u) };
      }
    }
    for (let k = 2; k <= maxK; k++) { s = tryConf(k); if (s) return s; }
    return null;
  }

  function apply(N, regions, st, step) {
    if (step.cat !== undefined) {
      st.cat[step.cat] = 1;
      neighborsAndLines(N, regions, step.cat).forEach(j => st.cand[j] = 0);
    }
    step.xs.forEach(j => st.cand[j] = 0);
  }

  // Tamamen mantıkla çözülüyor mu? Kullanılan en zor tekniği de döndürür.
  function logicSolve(N, regions, maxK) {
    const st = { cand: new Uint8Array(N * N).fill(1), cat: new Uint8Array(N * N) };
    let placed = 0, steps = 0, hard = 0;
    while (placed < N && steps < 500) {
      const s = nextStep(N, regions, st, maxK);
      if (!s || s.bad) return { ok: false };
      if (/sadece \d/.test(s.msg)) hard = Math.max(hard, 2);
      else if (/Buraya kedi koyarsan/.test(s.msg)) hard = Math.max(hard, 1);
      apply(N, regions, st, s); if (s.cat !== undefined) placed++; steps++;
    }
    return { ok: placed === N, steps, hard };
  }

  const api = { nextStep, apply, logicSolve, neighborsAndLines };
  if (typeof module !== 'undefined') module.exports = api; else root.MiyavLogic = api;
})(this);
