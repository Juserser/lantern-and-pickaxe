// 광석 캐기 대결: 60초 동안 누가 더 많이 캐나! (굴집 미니게임)
G.Duel = (function () {
  const D = {};
  const U = G.U, C = G.C, S = C.TILE;
  const fx = (...a) => G.fx(...a);
  const TIME = 60, POINTS = { 3: 1, 4: 3, 5: 6 };

  D.create = function () {
    const save = G.Save.data, T = G.T;
    const w = 30, h = 17;
    const m = G.World.newMap(w, h, G.BIOMES[1].pal);
    const rng = U.RNG((Math.random() * 1e9) >>> 0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const r = rng();
      m.tiles[y * w + x] = edge ? T.BEDROCK : r < 0.2 ? T.ORE : r < 0.25 ? T.BIGORE : r < 0.262 ? T.RAINBOW : T.ROCK;
    }
    // 시작 굴 두 개 + 가운데 작은 광장
    const pocket = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) m.tiles[y * w + x] = T.FLOOR; };
    pocket(3, 8, 1); pocket(26, 8, 1); pocket(15, 8, 1);
    m.bi = 1; m.ver = Math.floor(Math.random() * 1e6);
    const players = [0, 1].map(i => ({
      slot: i, c: save.char[i], x: (i ? 26 : 3) * S + 8, y: 8 * S + 8, vx: 0, vy: 0, f: i ? -1 : 1, a: i ? Math.PI : 0, moving: false, r: 5,
      hat: save.hat[i], name: save.names[i] || (i ? '2P' : '1P'), stun: 0, atkCd: 0, at: 0, bombCd: 0,
    }));
    fx('music', 'lava');
    return { map: m, t: TIME, phase: 'count', cnt: 3.2, players, score: [0, 0], bombs: [], ui: null, finished: false, boomed: false };
  };

  function hitTile(d, p, tx, ty, power) {
    const m = d.map, T = G.T, t = G.World.get(m, tx, ty);
    if (!G.TILE_HP[t]) return false;
    const k = ty * m.w + tx;
    m.dmg[k] = Math.min(15, m.dmg[k] + power);
    const cx = tx * S + 8, cy = ty * S + 8;
    if (m.dmg[k] >= G.TILE_HP[t]) {
      G.World.set(m, tx, ty, T.FLOOR); fx('tile', tx, ty, T.FLOOR, 0);
      fx('burst', cx, cy, 8, [m.pal.wall[0], m.pal.wall[1], m.pal.wallTop], 60, 0.5); fx('snd', 'break');
      const pts = POINTS[t] || 0;
      if (pts && p) { d.score[p.slot] += pts; fx('txt', cx, cy - 8, '+' + pts + '💎', G.COLORS.p[p.slot], pts > 1 ? 9 : 7); fx('snd', 'ore'); }
    } else { fx('tile', tx, ty, t, m.dmg[k]); fx('snd', 'mine'); }
    return true;
  }

  D.update = function (d, inputs, dt) {
    if (d.ui) {
      d.ui.t += dt;
      if (d.ui.t > 1.2 && (inputs[0].pa || inputs[1].pa)) d.finished = true;
      return;
    }
    if (d.phase === 'count') {
      const before = Math.ceil(d.cnt);
      d.cnt -= dt;
      if (Math.ceil(d.cnt) !== before && d.cnt > 0) fx('snd', 'nav');
      if (d.cnt <= 0) { d.phase = 'play'; fx('banner', '시작! ⛏️', '광석을 많이 캔 사람이 이겨요 · V: 폭탄으로 방해!'); fx('snd', 'levelup'); }
      return;
    }
    d.t -= dt;
    if (d.t <= 30 && !d.boomed) {
      d.boomed = true;
      const m = d.map; let n = 0;
      for (let k = 0; k < 400 && n < 30; k++) {
        const x = U.rng.int(1, m.w - 2), y = U.rng.int(1, m.h - 2), i = y * m.w + x;
        if (m.tiles[i] === G.T.ROCK) { const t = U.rng.chance(0.25) ? G.T.BIGORE : G.T.ORE; G.World.set(m, x, y, t); fx('tile', x, y, t, 0); n++; }
      }
      fx('banner', '광맥 폭발! 💥', '반짝이는 광석이 새로 생겼어요'); fx('snd', 'bigboom'); fx('shake', 5);
    }
    if (d.t <= 10 && !d.hurry) { d.hurry = true; fx('snd', 'warn'); }
    for (let i = 0; i < 2; i++) updatePlayer(d, d.players[i], inputs[i], dt);
    // 폭탄
    for (let i = d.bombs.length - 1; i >= 0; i--) {
      const b = d.bombs[i]; b.t -= dt;
      if (b.t > 0) continue;
      d.bombs.splice(i, 1);
      const p = d.players[b.owner];
      fx('boom', b.x, b.y, 26, 0); fx('snd', 'boom'); fx('shake', 3);
      const x0 = Math.floor((b.x - 26) / S), x1 = Math.floor((b.x + 26) / S), y0 = Math.floor((b.y - 26) / S), y1 = Math.floor((b.y + 26) / S);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (U.dist(b.x, b.y, tx * S + 8, ty * S + 8) <= 28) hitTile(d, p, tx, ty, 9);
      for (const q of d.players) if (U.dist(q.x, q.y, b.x, b.y) < 26) stun(q, b.x, b.y, 1.2);
    }
    if (d.t <= 0) finish(d);
  };

  function stun(q, x, y, t) {
    if (q.stun > 0) return;
    q.stun = t;
    const a = U.ang(x, y, q.x, q.y); q.vx = Math.cos(a) * 150; q.vy = Math.sin(a) * 150;
    fx('say', q.slot, U.rng.pick(['으앗!', '빙글빙글~ 💫', '반칙이야!', '너어어!']));
    fx('snd', 'hurt');
  }

  function updatePlayer(d, p, inp, dt) {
    if (p.at > 0) p.at = Math.max(0, p.at - dt * 4);
    p.atkCd -= dt; p.bombCd -= dt;
    if (inp.pe) fx('say', p.slot, U.rng.pick(['내가 이길 거야!', '메롱 😝', '광석은 내 거!', '흥! 😤']));
    if (p.stun > 0) {
      p.stun -= dt; p.vx *= 0.9; p.vy *= 0.9;
      G.World.moveSafe(d.map, p, p.vx * dt, p.vy * dt, p.r);
      return;
    }
    const spd = 88;
    p.vx = U.lerp(p.vx, inp.x * spd, 0.3); p.vy = U.lerp(p.vy, inp.y * spd, 0.3);
    p.moving = Math.hypot(inp.x, inp.y) > 0.1;
    if (p.moving) { p.a = Math.atan2(inp.y, inp.x); if (Math.abs(inp.x) > 0.15) p.f = inp.x > 0 ? 1 : -1; }
    G.World.moveSafe(d.map, p, p.vx * dt, p.vy * dt, p.r);
    if (inp.a && p.atkCd <= 0) {
      p.atkCd = 0.26; p.at = 1;
      fx('snd', 'swing');
      for (const dd of [10, 17]) {
        const tx = Math.floor((p.x + Math.cos(p.a) * dd) / S), ty = Math.floor((p.y - 2 + Math.sin(p.a) * dd) / S);
        if (hitTile(d, p, tx, ty, 1)) break;
      }
      const q = d.players[1 - p.slot];
      if (U.dist(p.x, p.y, q.x, q.y) < 20 && Math.abs(U.angDiff(p.a, U.ang(p.x, p.y, q.x, q.y))) < 1.1) stun(q, p.x, p.y, 0.7);
    }
    if (inp.ps && p.bombCd <= 0) {
      p.bombCd = 5;
      d.bombs.push({ id: U.id(), x: p.x, y: p.y + 2, t: 1.1, owner: p.slot });
      fx('snd', 'throw'); fx('say', p.slot, '폭탄 설치! 💣');
    }
  }

  function finish(d) {
    const save = G.Save.data, [a, b] = d.score;
    const w = a === b ? -1 : a > b ? 0 : 1;
    if (w >= 0) { save.stats.duel[w]++; save.penalty = 1 - w; }
    else save.penalty = -1;
    G.Save.write();
    d.ui = { m: 'duelres', t: 0, score: d.score.slice(), w, names: d.players.map(p => p.name), chars: d.players.map(p => p.c), rec: save.stats.duel.slice() };
    fx('snd', 'win'); fx('music', 'hub');
    if (w >= 0) fx('hearts', d.players[w].x, d.players[w].y - 10, 16);
  }

  D.view = function (d) {
    const save = G.Save.data;
    return {
      sc: 'duel', mv: d.map.ver, bi: 1, cx: d.map.w * S / 2, cy: d.map.h * S / 2,
      ps: d.players.map((p, i) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, c: p.c, f: p.f, a: Math.round(p.a * 100) / 100, hp: 1, mh: 1, st: 'n',
        mv: p.moving ? 1 : 0, at: Math.round(p.at * 100) / 100, hat: save.penalty === i ? G.PENALTY_HAT : p.hat, nm: p.name, lt: 110, pr: '', fr: p.stun > 0 ? 100 : 0, sc: 0, ds: p.stun > 0 ? 1 : 0 })),
      pr: d.bombs.map(b => [b.id, 'bigbomb', Math.round(b.x), Math.round(b.y), 0, 0, b.t < 0.4 ? 1 : 0]),
      dt: Math.max(0, Math.ceil(d.t)), cnt: d.phase === 'count' ? Math.ceil(d.cnt) : 0, score: d.score, ui: d.ui,
    };
  };
  return D;
})();
