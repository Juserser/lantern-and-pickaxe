// 타일, 동굴 생성, 충돌
G.T = { FLOOR: 0, ROCK: 1, BEDROCK: 2, ORE: 3, BIGORE: 4, RAINBOW: 5, BOULDER: 6, LAVA: 7, CRYSTAL: 8, ICE: 9 };
G.TILE_HP = { 1: 3, 3: 2, 4: 3, 5: 4, 6: 6, 8: 3 };
G.isSolidTile = t => t === 1 || t === 2 || t === 3 || t === 4 || t === 5 || t === 6 || t === 8;

G.World = (function () {
  const W = {};
  const T = G.T, S = G.C.TILE;

  W.newMap = function (w, h, pal) {
    return { w, h, tiles: new Uint8Array(w * h), dmg: new Uint8Array(w * h), deco: [], pal, ver: 0 };
  };
  W.get = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? T.BEDROCK : m.tiles[y * m.w + x];
  W.set = (m, x, y, t) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) { m.tiles[y * m.w + x] = t; m.dmg[y * m.w + x] = 0; } };
  W.solidAt = (m, px, py) => G.isSolidTile(W.get(m, Math.floor(px / S), Math.floor(py / S)));
  W.tileAt = (m, px, py) => W.get(m, Math.floor(px / S), Math.floor(py / S));

  // 원(정사각 근사) vs 타일 충돌 이동
  W.move = function (m, b, dx, dy, r) {
    let hit = false;
    if (dx) {
      b.x += dx;
      const y0 = Math.floor((b.y - r + 0.5) / S), y1 = Math.floor((b.y + r - 0.5) / S);
      if (dx > 0) { const tx = Math.floor((b.x + r) / S); for (let ty = y0; ty <= y1; ty++) if (G.isSolidTile(W.get(m, tx, ty))) { b.x = tx * S - r - 0.01; hit = true; break; } }
      else { const tx = Math.floor((b.x - r) / S); for (let ty = y0; ty <= y1; ty++) if (G.isSolidTile(W.get(m, tx, ty))) { b.x = (tx + 1) * S + r + 0.01; hit = true; break; } }
    }
    if (dy) {
      b.y += dy;
      const x0 = Math.floor((b.x - r + 0.5) / S), x1 = Math.floor((b.x + r - 0.5) / S);
      if (dy > 0) { const ty = Math.floor((b.y + r) / S); for (let tx = x0; tx <= x1; tx++) if (G.isSolidTile(W.get(m, tx, ty))) { b.y = ty * S - r - 0.01; hit = true; break; } }
      else { const ty = Math.floor((b.y - r) / S); for (let tx = x0; tx <= x1; tx++) if (G.isSolidTile(W.get(m, tx, ty))) { b.y = (ty + 1) * S + r + 0.01; hit = true; break; } }
    }
    return hit;
  };
  // 긴 이동은 쪼개서
  W.moveSafe = function (m, b, dx, dy, r) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    let hit = false;
    for (let i = 0; i < steps; i++) hit = W.move(m, b, dx / steps, dy / steps, r) || hit;
    return hit;
  };
  // 벽에 끼었으면 가장 가까운 빈 칸으로
  W.unstick = function (m, b, r) {
    if (!W.solidAt(m, b.x, b.y)) return;
    const tx = Math.floor(b.x / S), ty = Math.floor(b.y / S);
    for (let rad = 1; rad < 8; rad++) for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
      if (!G.isSolidTile(W.get(m, tx + i, ty + j))) { b.x = (tx + i) * S + 8; b.y = (ty + j) * S + 8; return; }
    }
  };
  W.los = function (m, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) { const k = i / n; if (W.solidAt(m, ax + (bx - ax) * k, ay + (by - ay) * k)) return false; }
    return true;
  };

  W.serialize = function (m) {
    let s = ''; for (let i = 0; i < m.tiles.length; i++) s += String.fromCharCode(48 + m.tiles[i]);
    let d = ''; for (let i = 0; i < m.dmg.length; i++) d += String.fromCharCode(48 + m.dmg[i]);
    return { w: m.w, h: m.h, t: s, d, deco: m.deco, pal: m.pal, ver: m.ver, bi: m.bi };
  };
  W.deserialize = function (o) {
    const m = W.newMap(o.w, o.h, o.pal);
    for (let i = 0; i < o.t.length; i++) m.tiles[i] = o.t.charCodeAt(i) - 48;
    if (o.d) for (let i = 0; i < o.d.length; i++) m.dmg[i] = o.d.charCodeAt(i) - 48;
    m.deco = o.deco; m.ver = o.ver; m.bi = o.bi;
    return m;
  };

  // ───────────── 동굴 생성
  function flood(m, sx, sy, mark, id) {
    const st = [sx + sy * m.w]; mark[st[0]] = id; let n = 0; const cells = [];
    while (st.length) {
      const c = st.pop(); n++; cells.push(c);
      const x = c % m.w, y = (c / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const k = ny * m.w + nx;
        if (!mark[k] && !G.isSolidTile(m.tiles[k])) { mark[k] = id; st.push(k); }
      }
    }
    return cells;
  }
  function bfs(m, sx, sy) {
    const dist = new Int32Array(m.w * m.h).fill(-1);
    const q = [sx + sy * m.w]; dist[q[0]] = 0; let h = 0;
    while (h < q.length) {
      const c = q[h++], x = c % m.w, y = (c / m.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const k = ny * m.w + nx;
        if (dist[k] < 0 && !G.isSolidTile(m.tiles[k])) { dist[k] = dist[c] + 1; q.push(k); }
      }
    }
    return dist;
  }
  function carve(m, cx, cy, r, t) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
      if (x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1) m.tiles[y * m.w + x] = t == null ? T.FLOOR : t;
  }
  function carveLine(m, x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
      for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++) if (x + k > 0 && y + j > 0 && x + k < m.w - 1 && y + j < m.h - 1) m.tiles[(y + j) * m.w + x + k] = T.FLOOR;
    }
  }
  const clearAround = (m, x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (W.get(m, x + i, y + j) !== T.FLOOR) return false; return true; };

  W.generate = function (seed, floor, biome) {
    const rng = G.U.RNG(seed);
    const w = G.C.MAP_W, h = G.C.MAP_H;
    let m, main;
    for (let attempt = 0; attempt < 20; attempt++) {
      m = W.newMap(w, h, biome.pal);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        m.tiles[y * w + x] = edge ? T.BEDROCK : (rng() < 0.47 ? T.FLOOR : T.ROCK);
      }
      const cnt = (x, y, r) => { let n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (G.isSolidTile(W.get(m, x + i, y + j))) n++; return n; };
      for (let it = 0; it < 6; it++) {
        const nt = m.tiles.slice();
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const n1 = cnt(x, y, 1);
          const solid = it < 4 ? (n1 >= 5 || cnt(x, y, 2) <= 2) : n1 >= 5;
          nt[y * w + x] = solid ? T.ROCK : T.FLOOR;
        }
        m.tiles = nt;
      }
      // 영역 정리
      const mark = new Int32Array(w * h); let id = 0; const regions = [];
      for (let i = 0; i < w * h; i++) if (!mark[i] && !G.isSolidTile(m.tiles[i])) regions.push(flood(m, i % w, (i / w) | 0, mark, ++id));
      regions.sort((a, b) => b.length - a.length);
      main = regions[0];
      if (!main || (main.length < w * h * 0.3 && attempt < 19)) continue;
      const mainSet = new Set(main);
      for (let r = 1; r < regions.length; r++) {
        const reg = regions[r];
        if (reg.length < 18) { for (const c of reg) m.tiles[c] = T.ROCK; continue; }
        // 가장 가까운 메인 칸으로 굴 뚫기
        const a = reg[Math.floor(rng() * reg.length)], ax = a % w, ay = (a / w) | 0;
        let best = null, bd = 1e9;
        for (let k = 0; k < main.length; k += 3) { const c = main[k], d = Math.abs(c % w - ax) + Math.abs(((c / w) | 0) - ay); if (d < bd) { bd = d; best = c; } }
        carveLine(m, ax, ay, best % w, (best / w) | 0);
        for (const c of reg) mainSet.add(c);
      }
      break;
    }
    const info = { rooms: [], packs: [], chest: null };
    // 시작점
    const floorCells = [];
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (m.tiles[y * w + x] === T.FLOOR) floorCells.push([x, y]);
    let starts = floorCells.filter(([x, y]) => x < w * 0.25 && clearAround(m, x, y, 1));
    if (!starts.length) starts = floorCells.slice().sort((a, b) => a[0] - b[0]).slice(0, 20);
    const st = rng.pick(starts);
    carve(m, st[0], st[1], 1);
    let dist = bfs(m, st[0], st[1]);
    // 출구
    let maxd = 0; for (const [x, y] of floorCells) maxd = Math.max(maxd, dist[y * w + x]);
    if (maxd < 30 && (seed & 7) !== 7) return W.generate((seed * 31 + 7) >>> 0, floor, biome);
    let exits = floorCells.filter(([x, y]) => dist[y * w + x] >= maxd * 0.85 && x > 4 && y > 4 && x < w - 5 && y < h - 5);
    if (!exits.length) exits = floorCells.filter(([x, y]) => dist[y * w + x] >= maxd * 0.6 && x > 4 && y > 4 && x < w - 5 && y < h - 5);
    if (!exits.length) exits = floorCells.filter(([x, y]) => dist[y * w + x] > 10 && x > 4 && y > 4 && x < w - 5 && y < h - 5).sort((a, b) => dist[b[1] * w + b[0]] - dist[a[1] * w + a[0]]).slice(0, 10);
    if (!exits.length) return W.generate((seed * 31 + 7) >>> 0, floor, biome);
    const ex = rng.pick(exits);
    carve(m, ex[0], ex[1], 3);
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.max(Math.abs(i), Math.abs(j)) === 2) m.tiles[(ex[1] + j) * w + ex[0] + i] = T.BOULDER;
    info.start = { x: st[0] * S + 8, y: st[1] * S + 8 };
    info.exit = { x: ex[0] * S + 8, y: ex[1] * S + 8 };
    dist = bfs(m, st[0], st[1]);
    const nearExit = (x, y, r) => Math.max(Math.abs(x - ex[0]), Math.abs(y - ex[1])) <= r;

    // 숨겨진 보물방
    const hidden = [];
    for (let tries = 0; tries < 400 && hidden.length < 1; tries++) {
      const x = rng.int(4, w - 5), y = rng.int(4, h - 5);
      let ok = true;
      for (let j = -3; j <= 3 && ok; j++) for (let i = -3; i <= 3; i++) if (W.get(m, x + i, y + j) !== T.ROCK) { ok = false; break; }
      if (!ok) continue;
      let near = null;
      for (let j = -5; j <= 5 && !near; j++) for (let i = -5; i <= 5; i++) { const k = (y + j) * w + x + i; if (dist[k] > 6 && !nearExit(x + i, y + j, 4)) { near = [x + i, y + j]; break; } }
      if (!near) continue;
      carve(m, x, y, 1);
      hidden.push([x, y]);
      info.chest = { x: x * S + 8, y: y * S + 8, hidden: true };
      // 힌트 반짝이
      const dx = Math.sign(near[0] - x), dy = Math.sign(near[1] - y);
      for (let k = 2; k <= 3; k++) { const hx = x + dx * k, hy = y + dy * k; if (W.get(m, hx, hy) === T.ROCK) m.deco.push([hx * S + 4 + rng.int(0, 8), hy * S + 3 + rng.int(0, 6), 'hint']); }
    }

    // 특수 장소 후보
    const spots = floorCells.filter(([x, y]) => dist[y * w + x] >= 9 && clearAround(m, x, y, 2) && !nearExit(x, y, 7));
    const used = [];
    const takeSpot = minGap => {
      const cand = rng.shuffle(spots);
      for (const s of cand) if (used.every(u => Math.abs(u[0] - s[0]) + Math.abs(u[1] - s[1]) >= minGap)) { used.push(s); return { x: s[0] * S + 8, y: s[1] * S + 8 }; }
      return null;
    };
    const want = [];
    if (floor % 3 === 2) want.push('shop');
    if (rng.chance(0.55)) want.push('fountain');
    if (rng.chance(0.6)) want.push('event');
    if (floor >= 2 && rng.chance(0.4)) want.push('altar');
    if (!info.chest && rng.chance(0.5)) want.push('chest');
    if (rng.chance(0.4)) want.push('plates');
    if (floor >= 2 && rng.chance(0.3)) want.push('bells');
    const protect = [];
    for (const k of want) {
      const p = takeSpot(12); if (!p) continue;
      if (k === 'chest') { info.chest = p; continue; }
      const room = Object.assign({ type: k }, p);
      if (k === 'plates') {
        // 협동 발판 방: 넓게 파서 두 발판 사이를 벌려요
        const tx = Math.floor(p.x / S), ty = Math.floor(p.y / S);
        carve(m, tx, ty, 3); protect.push([tx, ty]);
      }
      if (k === 'bells') {
        // 멀리 떨어진 두 번째 종
        const q = takeSpot(16); if (!q) continue;
        room.x2 = q.x; room.y2 = q.y;
      }
      info.rooms.push(room);
    }

    // 몬스터 무리
    const packCells = rng.shuffle(floorCells.filter(([x, y]) => dist[y * w + x] >= 13 && !nearExit(x, y, 3)));
    const nPacks = 5 + Math.min(8, floor);
    for (const c of packCells) {
      if (info.packs.length >= nPacks) break;
      if (info.packs.every(p => Math.abs(p.tx - c[0]) + Math.abs(p.ty - c[1]) >= 8)) info.packs.push({ tx: c[0], ty: c[1], x: c[0] * S + 8, y: c[1] * S + 8 });
    }

    // 바이옴 꾸미기 & 광석
    decorate(m, rng, floor, biome, st, ex);
    for (const [tx, ty] of protect) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const k = (ty + j) * w + tx + i; if (m.tiles[k] === T.LAVA || m.tiles[k] === T.ICE) m.tiles[k] = T.FLOOR;
    }
    // 광차 레일
    if (floor >= 2 && rng.chance(0.4)) info.cart = rail(m, rng, dist, nearExit, hidden, st);
    m.bi = G.BIOMES.indexOf(biome);
    return { map: m, info };
  };

  function rail(m, rng, dist, nearExit, hidden, st) {
    const w = m.w, h = m.h;
    for (let tries = 0; tries < 300; tries++) {
      const L = rng.int(16, 22);
      const x0 = rng.int(3, w - L - 4), y = rng.int(3, h - 4);
      if (m.tiles[y * w + x0] !== T.FLOOR || dist[y * w + x0] < 5) continue;
      if (Math.abs(x0 - st[0]) + Math.abs(y - st[1]) < 6) continue;
      let ok = true;
      for (let x = x0; x <= x0 + L && ok; x++) {
        if (nearExit(x, y, 5)) ok = false;
        for (const [hx, hy] of hidden) if (Math.abs(x - hx) <= 3 && Math.abs(y - hy) <= 3) ok = false;
        if (W.get(m, x, y) === T.BEDROCK) ok = false;
      }
      if (!ok) continue;
      for (let x = x0; x <= x0 + L; x++) {
        m.tiles[y * w + x] = T.FLOOR;
        m.deco.push([x * S + 8, y * S + 8, 'rail']);
        for (const dy of [-1, 1]) {
          const k = (y + dy) * w + x, t = m.tiles[k];
          if (t === T.ROCK && rng.chance(0.45)) m.tiles[k] = rng.chance(0.15) ? T.BIGORE : T.ORE;
        }
      }
      return { x0: x0 * S + 8, x1: (x0 + L) * S + 8, y: y * S + 8 };
    }
    return null;
  }

  function decorate(m, rng, floor, biome, st, ex) {
    const w = m.w, h = m.h;
    const isF = (x, y) => W.get(m, x, y) === T.FLOOR;
    const nearSE = (x, y, r) => Math.max(Math.abs(x - st[0]), Math.abs(y - st[1])) <= r || Math.max(Math.abs(x - ex[0]), Math.abs(y - ex[1])) <= r;
    // 얼음 호수 (미끄러운 바닥)
    if (biome.id === 'ice') {
      const n = 5 + rng.int(0, 3);
      for (let k = 0; k < n; k++) {
        const x = rng.int(3, w - 4), y = rng.int(3, h - 4); if (!isF(x, y) || nearSE(x, y, 4)) continue;
        const r = rng.range(1.8, 3.4);
        for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= r * r && isF(x + i, y + j) && !nearSE(x + i, y + j, 3)) m.tiles[(y + j) * w + x + i] = T.ICE;
      }
    }
    // 용암 웅덩이
    if (biome.id === 'lava') {
      const n = 6 + rng.int(0, 4);
      for (let k = 0; k < n; k++) {
        const x = rng.int(3, w - 4), y = rng.int(3, h - 4); if (!isF(x, y) || nearSE(x, y, 5)) continue;
        const r = rng.range(1, 2.6);
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= r * r && isF(x + i, y + j) && !nearSE(x + i, y + j, 4)) m.tiles[(y + j) * w + x + i] = T.LAVA;
      }
    }
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const t = m.tiles[y * w + x];
      const adjF = isF(x + 1, y) || isF(x - 1, y) || isF(x, y + 1) || isF(x, y - 1);
      if (t === T.ROCK && adjF) {
        const r = rng();
        if (r < 0.055) m.tiles[y * w + x] = T.ORE;
        else if (r < 0.068) m.tiles[y * w + x] = T.BIGORE;
        else if (r < 0.071 && floor >= 3) m.tiles[y * w + x] = T.RAINBOW;
        else if ((biome.id === 'crystal' || biome.id === 'star' || biome.id === 'ice') && r < 0.1) m.tiles[y * w + x] = T.CRYSTAL;
      }
      if (t === T.FLOOR) {
        const wallN = !isF(x, y - 1) || !isF(x - 1, y) || !isF(x + 1, y);
        const r = rng();
        const px = x * S + rng.int(3, 12), py = y * S + rng.int(4, 13);
        if (biome.id === 'moss') {
          if (wallN && r < 0.045) m.deco.push([px, py, 'gm']);
          else if (r < 0.08) m.deco.push([px, py, 'gr']);
          else if (r < 0.095) m.deco.push([px, py, 'fl']);
        } else if (biome.id === 'crystal') {
          if (wallN && r < 0.04) m.deco.push([px, py, 'cr']);
          else if (r < 0.06) m.deco.push([px, py, 'pb']);
        } else if (biome.id === 'lava') {
          if (r < 0.05) m.deco.push([px, py, 'pb']);
          else if (r < 0.065) m.deco.push([px, py, 'em']);
        } else if (biome.id === 'ice') {
          if (wallN && r < 0.04) m.deco.push([px, py, 'cr']);
          else if (r < 0.07) m.deco.push([px, py, 'sn']);
        } else if (biome.id === 'garden') {
          if (wallN && r < 0.04) m.deco.push([px, py, 'gm']);
          else if (r < 0.1) m.deco.push([px, py, 'fl']);
          else if (r < 0.16) m.deco.push([px, py, 'gr']);
        } else {
          if (r < 0.035) m.deco.push([px, py, 'st']);
          else if (wallN && r < 0.06) m.deco.push([px, py, 'cr']);
        }
      }
    }
  }

  // ───────────── 보스방
  W.generateBoss = function (seed, floor, biome) {
    const rng = G.U.RNG(seed);
    const w = G.C.BOSS_MAP_W, h = G.C.BOSS_MAP_H;
    const m = W.newMap(w, h, biome.pal);
    m.tiles.fill(T.ROCK);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) m.tiles[y * w + x] = T.BEDROCK;
    const cx = 24, cy = 15;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const dx = (x - cx) / 12.5, dy = (y - cy) / 10.5;
      if (dx * dx + dy * dy <= 1) m.tiles[y * w + x] = T.FLOOR;
    }
    carve(m, 5, 15, 2);
    for (let x = 5; x <= 13; x++) for (let y = 14; y <= 16; y++) m.tiles[y * w + x] = T.FLOOR;
    // 아레나 벽을 BEDROCK으로 (못 캐게)
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (m.tiles[y * w + x] === T.ROCK) m.tiles[y * w + x] = T.BEDROCK;
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2, r = rng.range(0.75, 0.95);
      const x = Math.round(cx + Math.cos(a) * 12.5 * r), y = Math.round(cy + Math.sin(a) * 10.5 * r);
      if (W.get(m, x, y) === T.FLOOR) m.deco.push([x * S + 8, y * S + 8, biome.id === 'moss' || biome.id === 'garden' ? 'gm' : biome.id === 'lava' ? 'em' : 'cr']);
    }
    m.deco.push([5 * S + 8, 13 * S + 4, 'lamp']);
    m.bi = G.BIOMES.indexOf(biome);
    return { map: m, info: { start: { x: 5 * S + 8, y: 15 * S + 8 }, arena: { x: cx * S + 8, y: cy * S + 8 }, exit: { x: cx * S + 8, y: 6 * S + 8 }, rooms: [], packs: [] } };
  };

  // ───────────── 굴집
  W.HUB_PAL = { floor: ['#7a5642', '#83604a', '#6f4d3b'], wall: ['#5a3d30', '#654538', '#4a3128'], wallTop: '#8a6450', edge: '#2a1a14', glow: '#ffc36b' };
  W.generateHub = function () {
    const w = 40, h = 17;
    const m = W.newMap(w, h, W.HUB_PAL);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const inside = x >= 2 && x <= 37 && y >= 3 && y <= 15;
      m.tiles[y * w + x] = inside ? T.FLOOR : (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? T.BEDROCK : T.ROCK);
    }
    m.deco.push([15 * S, 5 * S, 'lamp'], [6 * S, 9 * S, 'lamp'], [24 * S, 9 * S, 'lamp'], [33 * S, 5 * S, 'lamp'], [29 * S, 11 * S, 'lamp']);
    m.bi = -1;
    return m;
  };

  return W;
})();
