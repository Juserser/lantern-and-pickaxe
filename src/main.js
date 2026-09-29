// 앱: 루프, 장면, 온라인 동기화, 연출(FX), 타이틀 화면
G.App = (function () {
  const App = {};
  const C = G.C, U = G.U, R = G.R, D = G.D, UI = G.UI;
  App.mode = 'front';   // front | local | host | guest
  App.mySlot = 0;
  App.scene = null;     // { type:'hub'|'run', obj }
  App.meta = null;
  let outbox = [];      // 방장 → 참가자 FX
  let remotePk = G.In.EMPTY;
  let lastMapVerSent = null, lastMetaSent = '';
  let snaps = [];       // 참가자 스냅샷 버퍼
  let guestMap = null;
  let pred = null;      // 참가자 내 캐릭터 예측 위치
  let tick = 0, acc = 0, lastT = 0, time = 0;
  const flashLights = [];

  // ───────────── FX
  const FX = {
    snd: n => G.A.play(n),
    music: n => (n === 'none' ? G.A.stopMusic() : G.A.music(n)),
    burst: (x, y, n, color, speed, life) => R.burst(x, y, n, { color, speed: speed || 40, life: life || 0.5, grav: 40, drag: 2, size: 2 }),
    dmg: (x, y, v, kind) => {
      if (G.settings.dmgNum === false && kind !== 2) return;
      R.floatText(x + (Math.random() - 0.5) * 8, y, String(v), kind === 1 ? '#ffd36b' : kind === 2 ? '#ff6b6b' : '#ffffff', kind === 1 ? 10 : 7, { pop: true, life: kind === 1 ? 0.9 : 0.65 });
    },
    txt: (x, y, s, color, size, o) => R.floatText(x, y, s, color, size, Object.assign({ life: 1.3, vy: -18 }, o || {})),
    shake: v => R.shake(v),
    say: (who, text) => { G.HUD.say(who, text); G.A.play('say'); },
    tile: (x, y, t, d) => {
      const m = currentMap(); if (!m) return;
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
      m.tiles[y * m.w + x] = t; m.dmg[y * m.w + x] = d;
      if (R.map && R.map.map === m) R.updateTile(x, y);
    },
    ring: (x, y, r0, r1, color, life) => R.part({ shape: 'ring', x, y, r0, r1, color, life: life || 0.4, size: 2, fade: true }),
    flash: (c, a) => G.HUD.flash(c, a),
    hearts: (x, y, n) => { for (let i = 0; i < n; i++) R.part({ shape: 'heart', x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.9 + Math.random() * 0.5, color: Math.random() < 0.5 ? '#ff7aa8' : '#ffb3c7', size: Math.random() < 0.3 ? 2 : 1, shrink: false }); },
    banner: (a, b) => G.HUD.banner(a, b),
    boom: (x, y, rad, big) => {
      R.part({ shape: 'ring', x, y: y - 4, r0: 3, r1: rad, color: '#ffe0a0', life: 0.3, size: 3 });
      R.burst(x, y - 4, big ? 30 : 16, { color: ['#ff7a2e', '#ffd36b', '#ffffff', '#ff5c5c'], speed: rad * 3, life: 0.45, drag: 4, size: 3 });
      R.burst(x, y - 4, big ? 12 : 6, { color: ['#5a4a5a', '#3a3040'], speed: rad * 1.2, life: 0.9, drag: 2, size: 4, up: 20 });
      flashLights.push({ x, y, r: rad * 2.2, t: 0, life: 0.3, c: '#ffb070' });
    },
    poof: (x, y) => { R.burst(x, y, 6, { color: ['#ffffff', '#e8e0ff'], speed: 30, life: 0.45, drag: 3, size: 3 }); R.part({ shape: 'star', x, y: y - 6, vy: -20, life: 0.5, color: '#fff3a0', size: 2 }); },
    bolt: (x0, y0, x1, y1) => {
      const n = Math.max(3, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (let i = 0; i <= n; i++) { const k = i / n; R.part({ x: x0 + (x1 - x0) * k + (Math.random() - 0.5) * 6, y: y0 + (y1 - y0) * k + (Math.random() - 0.5) * 6, life: 0.18, color: i % 2 ? '#fff6a0' : '#ffffff', size: 2 }); }
      flashLights.push({ x: x1, y: y1, r: 50, t: 0, life: 0.15, c: '#fff6a0' });
    },
    arc: (x, y, r, ang, width, color) => { for (let i = 0; i < 14; i++) { const a = ang - width / 2 + (width * i) / 13; R.part({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.7, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20, life: 0.25, color, size: 2 }); } },
    after: (ch, x, y, f) => { const s = G.SPR.ch[ch]; if (s) R.part({ shape: 'img', img: f > 0 ? s.r[0] : s.l[0], x, y: y + 4, life: 0.22, alpha: 0.45 }); },
    photo: cap => { if (App.mode !== 'guest') App.pendingPhoto = cap; },
    toast: (name, icon) => { G.HUD.toast(name, icon); G.A.play('ach'); },
  };
  G.FX = FX;
  G.fx = function (name, ...args) {
    const f = FX[name]; if (f) f(...args);
    if (App.mode === 'host') outbox.push([name, ...args]);
  };

  function currentMap() {
    if (App.mode === 'guest') return guestMap;
    if (!App.scene) return null;
    return App.scene.obj.map;
  }

  // ───────────── 장면
  App.startHub = function () {
    App.scene = { type: 'hub', obj: G.Hub.create() };
    R.clearFx();
    G.Hub.checkAch(App.scene.obj);
  };
  App.startRun = function (o) {
    const s = G.Save.data;
    const chars = o.weekly === 'bombfest' ? ['nyang', 'nyang'] : s.char.slice();
    const hats = s.hat.map((h, i) => (s.penalty === i ? G.PENALTY_HAT : h));
    const run = G.Run.create({ chars, names: [s.names[0] || '1P', s.names[1] || '2P'], hats, star: o.star, daily: o.daily, weekly: o.weekly, rush: o.rush, curses: o.curses });
    App.scene = { type: 'run', obj: run };
    R.clearFx();
  };
  App.startDuel = function () {
    App.scene = { type: 'duel', obj: G.Duel.create() };
    R.clearFx();
  };

  function simInputs() {
    if (App.mode === 'local') return [G.In.frame(0, G.In.packet(0)), G.In.frame(1, G.In.packet(1))];
    return [G.In.frame(0, G.In.packet(0)), G.In.frame(1, remotePk)];
  }

  function simStep(dt) {
    const sc = App.scene;
    const inputs = simInputs();
    if (sc.type === 'hub') G.Hub.update(sc.obj, inputs, dt);
    else if (sc.type === 'duel') { G.Duel.update(sc.obj, inputs, dt); if (sc.obj.finished) App.startHub(); }
    else {
      G.Run.update(sc.obj, inputs, dt);
      if (sc.obj.finished) { App.startHub(); }
    }
  }
  function sceneView() {
    const sc = App.scene;
    return sc.type === 'hub' ? G.Hub.view(sc.obj) : sc.type === 'duel' ? G.Duel.view(sc.obj) : G.Run.view(sc.obj);
  }

  // ───────────── 네트워크 (방장)
  function hostSend(view) {
    if (!G.Net.open()) return;
    const m = currentMap();
    if (m && m.ver !== lastMapVerSent) { G.Net.send({ t: 'map', m: G.World.serialize(m) }); lastMapVerSent = m.ver; }
    const v = Object.assign({}, view);
    if (v.meta) { const js = JSON.stringify(v.meta); if (js === lastMetaSent && tick % 60 !== 0) delete v.meta; else lastMetaSent = js; }
    G.Net.send({ t: 's', v, e: outbox, k: tick });
    outbox = [];
  }
  function onHostData(m) {
    if (m.t === 'i') remotePk = m.p;
    else if (m.t === 'hello') {
      const s = G.Save.data;
      s.names[1] = (m.name || '').slice(0, 8) || '2P'; G.Save.write();
      if (App.scene && App.scene.type === 'hub') App.scene.obj.players[1].name = s.names[1];
      if (App.scene && App.scene.type === 'run') App.scene.obj.players[1].name = s.names[1];
      lastMapVerSent = null; lastMetaSent = '';
      G.In.resetPrev(1); remotePk = G.In.EMPTY;
      G.Net.send({ t: 'welcome', slot: 1 });
      hideNotice();
      G.fx('say', 1, '왔어! 👋');
    } else if (m.t === 'img?') {
      const ph = G.Save.album.find(p => p.id === m.id);
      if (ph) G.Net.send({ t: 'img', id: ph.id, img: ph.img });
    }
  }

  // ───────────── 네트워크 (참가자)
  const guestImgs = {};
  function onGuestData(m) {
    if (m.t === 'welcome') { App.mySlot = m.slot; hideFront(); hideNotice(); }
    else if (m.t === 'map') { guestMap = G.World.deserialize(m.m); }
    else if (m.t === 's') {
      if (m.v.meta) App.meta = m.v.meta; else if (App.meta) m.v.meta = App.meta;
      for (const e of m.e) { const f = FX[e[0]]; if (f) f(...e.slice(1)); }
      snaps.push({ t: performance.now() / 1000, v: m.v, k: m.k });
      while (snaps.length > 12) snaps.shift();
    } else if (m.t === 'img') {
      const im = new Image(); im.src = m.img; guestImgs[m.id] = im;
    }
  }
  App.photoImage = function (id) {
    if (App.mode === 'guest') {
      if (!guestImgs[id]) { guestImgs[id] = null; G.Net.send({ t: 'img?', id }); }
      return guestImgs[id];
    }
    if (!guestImgs[id]) { const ph = G.Save.album.find(p => p.id === id); if (ph) { const im = new Image(); im.src = ph.img; guestImgs[id] = im; } }
    return guestImgs[id];
  };

  function lerpList(a, b, k, xi, yi) {
    if (!a) return b;
    const map = new Map(); for (const e of a) map.set(e[0], e);
    return b.map(e => { const o = map.get(e[0]); if (!o) return e; const n = e.slice(); n[xi] = o[xi] + (e[xi] - o[xi]) * k; n[yi] = o[yi] + (e[yi] - o[yi]) * k; return n; });
  }
  function guestView() {
    if (!snaps.length) return null;
    const now = performance.now() / 1000 - C.INTERP_DELAY;
    const latest = snaps[snaps.length - 1];
    let s0 = snaps[0], s1 = latest;
    for (let i = 0; i < snaps.length - 1; i++) if (snaps[i].t <= now && snaps[i + 1].t >= now) { s0 = snaps[i]; s1 = snaps[i + 1]; break; }
    if (now >= latest.t) { s0 = s1 = latest; }
    const k = s1.t > s0.t ? U.clamp((now - s0.t) / (s1.t - s0.t), 0, 1) : 1;
    const a = s0.v, b = s1.v;
    if (a.sc !== b.sc) return Object.assign({}, latest.v);
    const v = Object.assign({}, b, { ui: latest.v.ui, hg: latest.v.hg, gm: latest.v.gm, xp: latest.v.xp, hint: latest.v.hint });
    v.ps = b.ps.map((p, i) => { const o = a.ps[i]; return Object.assign({}, latest.v.ps[i], { x: o.x + (p.x - o.x) * k, y: o.y + (p.y - o.y) * k }); });
    if (b.cx != null) { v.cx = a.cx + (b.cx - a.cx) * k; v.cy = a.cy + (b.cy - a.cy) * k; }
    if (b.en) { v.en = lerpList(a.en, b.en, k, 2, 3); v.pr = lerpList(a.pr, b.pr, k, 2, 3); v.pk = lerpList(a.pk, b.pk, k, 2, 3); }
    if (b.bs && a.bs) v.bs = Object.assign({}, b.bs, { x: a.bs.x + (b.bs.x - a.bs.x) * k, y: a.bs.y + (b.bs.y - a.bs.y) * k });
    // 내 캐릭터 예측
    const me = App.mySlot, srv = latest.v.ps[me];
    const map = guestMap;
    if (srv && map && !v.ui && !srv.rd && !srv.ds && ((srv.st === 'n' && latest.v.sc === 'run') || latest.v.sc === 'hub' || (latest.v.sc === 'duel' && !latest.v.cnt))) {
      const pk = Object.assign({}, G.In.packet(0));
      if (latest.v.fm === 'reverse') { pk.x = -pk.x; pk.y = -pk.y; }
      const spd = latest.v.sc === 'hub' ? 82 : latest.v.sc === 'duel' ? 88 : (srv.sp || G.CHARS[srv.c].spd);
      if (!pred || pred.sc !== latest.v.sc || pred.mv !== latest.v.mv) pred = { x: srv.x, y: srv.y, vx: 0, vy: 0, sc: latest.v.sc, mv: latest.v.mv };
      const dt = App.frameDt;
      const grip = G.World.tileAt(map, pred.x, pred.y) === G.T.ICE ? 0.035 : 0.28;
      pred.vx = U.lerp(pred.vx, pk.x * spd, grip); pred.vy = U.lerp(pred.vy, pk.y * spd, grip);
      G.World.moveSafe(map, pred, pred.vx * dt, pred.vy * dt, C.PLAYER_R);
      const ex = srv.x - pred.x, ey = srv.y - pred.y, err = Math.hypot(ex, ey);
      if (err > 48) { pred.x = srv.x; pred.y = srv.y; }
      else { const moving = Math.hypot(pk.x, pk.y) > 0.1; const kk = moving ? 0.04 : 0.18; pred.x += ex * kk; pred.y += ey * kk; }
      v.ps[me] = Object.assign({}, v.ps[me], { x: pred.x, y: pred.y, mv: Math.hypot(pk.x, pk.y) > 0.1 ? 1 : 0, f: Math.abs(pk.x) > 0.15 ? (pk.x > 0 ? 1 : -1) : v.ps[me].f });
    } else pred = null;
    return v;
  }

  // ───────────── 렌더
  function mapForView(v) {
    if (App.mode === 'guest') return guestMap && guestMap.ver === v.mv ? guestMap : null;
    return App.scene ? App.scene.obj.map : null;
  }

  function collectLights(v, t) {
    const L = [];
    const warm = '#ffc36b';
    v.ps.forEach((p, i) => {
      if (p.st === 'g') return;
      const r = p.lt * (p.st === 'x' ? 0.5 : 1);
      L.push({ x: p.x, y: p.y - 6, r, c: G.CHARS[p.c].lightPower ? warm : null, a: 0.35 });
      R.explore(p.x, p.y, Math.max(r, 40));
    });
    if (R.map) for (const l of R.map.lights) L.push(l);
    if (v.pr) for (const p of v.pr) {
      const r = { orb: 24, dart: 16, fly: 18, fireball: 30, firebolt: 18, star: 14, estar: 14, efire: 20, wstar: 16, spore: 10, bubble: 12, bigbomb: p[6] ? 30 : 12 }[p[1]];
      if (r) L.push({ x: p[2], y: p[3] - 6, r, c: { orb: '#fff3a0', dart: '#d8ff8a', fly: '#d8ff8a', fireball: '#ff8a3c', firebolt: '#ff8a3c', efire: '#ff5c2e', estar: '#f3c6ff', wstar: '#d7a8ff', bigbomb: '#ff5c5c' }[p[1]] || null, a: 0.4, nof: true });
    }
    if (v.pk) for (const k of v.pk) {
      if (k[1] === 'xp' || k[1] === 'xpb') L.push({ x: k[2], y: k[3] - 4, r: 12, c: '#d8ff8a', a: 0.3, nof: true });
      else if (k[1] === 'relic' || k[1] === 'egg' || k[1] === 'key') L.push({ x: k[2], y: k[3] - 4, r: 24, c: k[1] === 'key' ? '#ffb3c7' : '#ffd36b', a: 0.4 });
      else if (k[1] === 'lampshroom' || k[1] === 'star') L.push({ x: k[2], y: k[3] - 4, r: 26, c: k[1] === 'star' ? '#fff3a0' : '#9dffb0', a: 0.4 });
    }
    if (v.ob) for (const o of v.ob) {
      if (o[1] === 'door') L.push({ x: o[2], y: o[3] - 12, r: o[4] ? 70 : 26, c: o[4] ? '#fff3c0' : '#8a6bb8', a: 0.5 });
      if (o[1] === 'shop' || o[1] === 'fountain') L.push({ x: o[2], y: o[3] - 8, r: 50, c: o[1] === 'shop' ? '#ffd36b' : '#8fd8ff', a: 0.35 });
      if (o[1] === 'event' && o[5] === 'wish') L.push({ x: o[2], y: o[3] - 12, r: 40, c: '#fff3a0', a: 0.5 });
      if (o[1] === 'altar') L.push({ x: o[2], y: o[3] - 12, r: 28, c: '#ff5c7a', a: 0.4 });
      if (o[1] === 'chest' && !o[4]) L.push({ x: o[2], y: o[3] - 6, r: 14, c: '#ffd36b', a: 0.3 });
      if (o[1] === 'dome') L.push({ x: o[2], y: o[3] - 4, r: o[5] * 1.3, c: '#8fd18a', a: 0.25 });
      if (o[1] === 'camp') L.push({ x: o[2], y: o[3] - 6, r: 70, c: '#ff9a3c', a: 0.5 });
      if (o[1] === 'cart') L.push({ x: o[2], y: o[3] - 8, r: 34, c: '#ffd36b', a: 0.35 });
      if (o[1] === 'bell') L.push({ x: o[2], y: o[3] - 14, r: o[5] ? 50 : 24, c: '#ffd36b', a: 0.4 });
      if (o[1] === 'plate') L.push({ x: o[2], y: o[3], r: o[4] ? 30 : 16, c: o[4] ? '#9dffb0' : '#8fd8ff', a: 0.35 });
      if (o[1] === 'chest' && o[5]) L.push({ x: o[2], y: o[3] - 6, r: 20, c: '#ffb3c7', a: 0.3 });
    }
    if (v.hz) for (const h of v.hz) if (h[1] === 'fire' || h[1] === 'lavapool') L.push({ x: h[2], y: h[3], r: h[4] * 2.5, c: '#ff7a2e', a: 0.35 });
    if (v.pr) for (const p of v.pr) if (p[1] === 'rune' || p[1] === 'meteor') L.push({ x: p[2], y: p[3] - 4, r: 28, c: p[1] === 'rune' ? '#d7a8ff' : '#fff3a0', a: 0.4, nof: true });
    if (v.en) for (const e of v.en) {
      const g = { fairy: '#f3c6ff', jelly: '#d7b8ff', shardfly: '#8fd8ff', emberbat: '#ff8a3c', salamander: '#ff8a3c', slime: '#ff8a4c', slimelet: '#ff8a4c',
        goldmole: '#ffd36b', icebat: '#bfefff', butterfly: '#f3c6ff', flowertrap: '#ffb3c7' }[e[1]];
      if (g) L.push({ x: e[2], y: e[3] - 8, r: 22, c: g, a: 0.3 });
      if (e[1] === 'shadow') L.push({ x: e[2], y: e[3] - 6, r: 8, c: '#ff5c8a', a: 0.3, nof: true });
    }
    if (v.bs && !v.bs.hid) L.push({ x: v.bs.x, y: v.bs.y - 16, r: 40, c: G.BOSSES[v.bs.k].col[1], a: 0.25 });
    if (v.pt) for (const pt of v.pt) L.push({ x: pt[3], y: pt[4] - 6, r: pt[1] === 'firefly' ? 36 + pt[2] * 10 : 14, c: G.PETS[pt[1]].col[0], a: 0.35 });
    if (v.tb) {
      const [a, b] = v.ps; const n = 5;
      for (let i = 0; i <= n; i++) { const k = i / n; L.push({ x: a.x + (b.x - a.x) * k, y: a.y - 6 + (b.y - a.y) * k, r: v.dm < 1 ? 40 : 20, c: '#ff9eb5', a: 0.25 }); }
    }
    for (const f of flashLights) L.push({ x: f.x, y: f.y, r: f.r * (1 - f.t / f.life), c: f.c, a: 0.6 });
    return L;
  }

  function renderWorld(v, dt, t) {
    const map = mapForView(v);
    const wctx = R.wctx;
    wctx.fillStyle = '#07050d'; wctx.fillRect(0, 0, C.W, C.H);
    if (!map) return false;
    if (!R.map || R.map.map !== map) { R.bakeMap(map); R.setCamera(v.cx || map.w * 8, v.cy || map.h * 8, map, dt, true); }
    let cx = v.cx, cy = v.cy;
    if (cx == null) { cx = (v.ps[0].x + v.ps[1].x) / 2; cy = (v.ps[0].y + v.ps[1].y) / 2; }
    R.setCamera(cx, cy, map, dt, !!v.snap);
    R.drawMap();
    D.begin();
    // 바닥 레이어
    if (v.hz) for (const h of v.hz) D.hazard(h, t);
    if (v.tl) for (const tl of v.tl) D.telegraph(tl, t);
    if (v.sc === 'hub') {
      const fur = (App.meta && App.meta.fur) || [];
      if (fur.includes('rug')) D.furniture('rug', ...G.Hub.FUR_POS.rug, t);
      D.pond(G.Hub.POND.x, G.Hub.POND.y, t);
    }
    if (v.tb) D.tether(v.ps[0], v.ps[1], t, v.syn || [], v.dm < 1);
    // y정렬 엔티티
    const list = [];
    v.ps.forEach((p, i) => list.push([p.y, () => D.player(p, i, t)]));
    if (v.en) for (const e of v.en) list.push([e[3], () => D.enemy(e, t)]);
    if (v.pk) for (const k of v.pk) list.push([k[3] - 2, () => D.pickup(k, t)]);
    if (v.ob) for (const o of v.ob) list.push([o[1] === 'dome' ? o[3] + 40 : o[3], () => D.object(o, t)]);
    if (v.pr) for (const p of v.pr) list.push([p[3] + 1, () => D.proj(p, t)]);
    if (v.bs) list.push([v.bs.y, () => D.boss(v.bs, t)]);
    if (v.pt) for (const pt of v.pt) list.push([pt[4], () => D.pet(pt, t)]);
    if (v.sc === 'hub') {
      for (const s of G.Hub.STATIONS) { const near = v.ps.some(p => p.pr === s.name); list.push([s.y, () => D.station(s.k, s.x, s.y, t, near)]); }
      const fur = (App.meta && App.meta.fur) || [];
      for (const id of fur) if (id !== 'rug') { const [x, y] = G.Hub.FUR_POS[id]; list.push([id === 'window' || id === 'lights' ? -99 : y, () => D.furniture(id, x, y, t)]); }
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of list) fn();
    // 위성 별
    v.ps.forEach(p => { if (p.ob && p.st === 'n') for (let k = 0; k < p.ob; k++) { const a = p.oa + k * Math.PI * 2 / p.ob; D.prims.rect(R.sx(p.x + Math.cos(a) * 22) - 1, R.sy(p.y - 4 + Math.sin(a) * 15) - 1, 3, 3, '#fff3a0'); } });
    R.drawParts(0);
    // 조명
    const biome = v.sc === 'hub' ? 'hub' : v.sc === 'duel' ? 'duel' : G.BIOMES[Math.max(0, v.bi)].id;
    let dark = C.DARKNESS[biome];
    if (v.dm < 1) dark = 0.97;
    R.drawLighting(collectLights(v, t), dark, v.sc === 'hub' ? '#1a0f0a' : '#0b0716');
    return true;
  }

  function render(v, dt) {
    time += dt;
    R.time = time;
    R.updateParts(dt); R.updateTexts(dt); G.HUD.update(dt);
    for (let i = flashLights.length - 1; i >= 0; i--) { flashLights[i].t += dt; if (flashLights[i].t > flashLights[i].life) flashLights.splice(i, 1); }
    const ok = v && renderWorld(v, dt, time);
    R.present();
    UI.begin();
    if (!v) { UI.text('연결 중… 🌙', C.W / 2, C.H / 2, { size: 10, align: 'center' }); return; }
    if (!ok) { UI.text('동굴 지도를 받는 중… 🗺️', C.W / 2, C.H / 2, { size: 10, align: 'center' }); return; }
    if (v.sc === 'hub') G.HUD.hub(v, time); else if (v.sc === 'duel') G.HUD.duel(v, time); else G.HUD.run(v, time);
    G.Menus.draw(v, time);
    if (App.pendingPhoto) takePhoto();
  }

  function takePhoto() {
    const cap = App.pendingPhoto; App.pendingPhoto = null;
    try {
      const c = document.createElement('canvas'); c.width = 240; c.height = 135;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(R.wc, 0, 0, 240, 135);
      G.Save.addPhoto(c.toDataURL('image/jpeg', 0.82), cap);
      G.fx('txt', R.cam.left + C.W / 2, R.cam.top + 70, '📸 찰칵! 추억 앨범에 저장했어요', '#ffffff', 8);
      G.fx('snd', 'photo'); G.fx('flash', '#ffffff', 0.35);
    } catch (e) { console.warn('photo failed', e); }
  }

  // ───────────── 루프
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000 || 0.016);
    lastT = now;
    App.frameDt = dt;
    let v = null;
    if (App.mode === 'local' || App.mode === 'host') {
      const paused = App.mode === 'host' && !G.Net.open();
      acc += dt;
      let steps = 0;
      while (acc >= C.TICK && steps < 6) {
        if (!paused) {
          simStep(C.TICK);
          tick++;
          if (App.mode === 'host' && tick % C.SNAP_EVERY === 0) hostSend(sceneView());
        }
        acc -= C.TICK; steps++;
      }
      if (steps >= 6) acc = 0;
      v = sceneView();
      if (v.meta) App.meta = v.meta;
      if (App.mode === 'host' && tick % C.SNAP_EVERY !== 0) { /* 방장은 틱마다 뷰 생성 */ }
    } else if (App.mode === 'guest') {
      if (G.Net.open()) {
        App.sendT = (App.sendT || 0) + dt;
        if (App.sendT >= 1 / 60) { App.sendT = 0; G.Net.send({ t: 'i', p: G.In.packet(0) }); }
      }
      v = guestView();
    } else {
      return;
    }
    render(v, dt);
  }

  // ───────────── 타이틀 (DOM)
  const $ = id => document.getElementById(id);
  function showPane(id) { for (const p of document.querySelectorAll('.pane')) p.classList.add('hidden'); $(id).classList.remove('hidden'); }
  function hideFront() { $('front').classList.add('hidden'); G.In.enabled = true; G.In.showTouch(true); document.activeElement && document.activeElement.blur(); }
  function notice(text, btns) {
    $('notice-text').textContent = text;
    const box = $('notice-btns'); box.innerHTML = '';
    for (const [label, fn, cls] of btns || []) { const b = document.createElement('button'); b.className = 'btn ' + (cls || 'ghost'); b.textContent = label; b.onclick = fn; box.appendChild(b); }
    $('notice').classList.remove('hidden');
  }
  function hideNotice() { $('notice').classList.add('hidden'); }
  App.notice = notice;

  function initFront() {
    const s = G.Save.data;
    $('name0').value = s.names[0] || G.settings.myName || '';
    $('name1').value = s.names[1] || '';
    $('join-name').value = G.settings.myName || '';
    const hint = $('save-hint');
    if (G.Save.exists() && s.stats.runs) hint.textContent = `저장된 추억: 원정 ${s.stats.runs}번 · 함께한 시간 ${U.fmtTime(s.stats.playTime)} 💞`;
    else hint.textContent = '처음 오셨군요! 두 사람의 이름을 적어 주세요 🌱';
    const params = new URLSearchParams(location.search);
    if (params.get('join')) { showPane('pane-join'); $('join-code').value = params.get('join').toUpperCase(); }

    $('btn-local').onclick = () => {
      G.A.unlock();
      s.names[0] = $('name0').value.trim() || '1P'; s.names[1] = $('name1').value.trim() || '2P';
      G.settings.myName = s.names[0]; G.Save.saveSettings(); G.Save.write();
      App.mode = 'local'; G.In.mode = 'local'; App.mySlot = 0;
      hideFront(); App.startHub();
    };
    $('btn-host').onclick = () => {
      G.A.unlock();
      const nm = $('name0').value.trim() || '1P';
      s.names[0] = nm; G.settings.myName = nm; G.Save.saveSettings(); G.Save.write();
      showPane('pane-host');
      G.Net.on('code', code => { $('host-code').textContent = code; G.settings.lastCode = code; G.Save.saveSettings(); });
      G.Net.on('status', st => { $('host-status').textContent = st; });
      G.Net.on('connect', () => {
        if (App.mode !== 'host') { App.mode = 'host'; G.In.mode = 'single'; App.mySlot = 0; hideFront(); App.startHub(); }
      });
      G.Net.on('data', onHostData);
      G.Net.on('close', () => notice(`상대의 연결이 끊겼어요 🥲\n같은 코드 「${G.Net.code}」로 다시 들어오면 이어서 할 수 있어요.\n(그동안 게임은 멈춰 있어요)`, [['기다릴게요', hideNotice]]));
      G.Net.host();
    };
    $('btn-copy').onclick = () => {
      const url = location.origin + location.pathname + '?join=' + (G.Net.code || '');
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { $('btn-copy').textContent = '✅ 복사했어요!'; }).catch(() => { prompt('이 링크를 보내 주세요', url); });
    };
    $('btn-host-back').onclick = () => { G.Net.close(); showPane('pane-main'); };
    $('btn-join').onclick = () => { showPane('pane-join'); $('join-code').value = $('join-code').value || ''; $('join-code').focus(); };
    $('btn-join-back').onclick = () => { G.Net.close(); showPane('pane-main'); };
    const doJoin = () => {
      G.A.unlock();
      const code = $('join-code').value.trim().toUpperCase();
      const nm = $('join-name').value.trim() || '2P';
      if (code.length !== 4) { $('join-status').textContent = '4글자 코드를 입력해 주세요'; return; }
      G.settings.myName = nm; G.Save.saveSettings();
      G.Net.on('status', st => { $('join-status').textContent = st; });
      G.Net.on('connect', () => {
        G.Net.send({ t: 'hello', name: nm });
        App.mode = 'guest'; G.In.mode = 'single'; App.mySlot = 1;
        snaps = []; guestMap = null; pred = null;
      });
      G.Net.on('data', onGuestData);
      G.Net.on('fail', () => {});
      G.Net.on('close', () => notice('방장과의 연결이 끊겼어요 🥲', [['다시 연결', () => { hideNotice(); G.Net.join(code); }, 'pink'], ['처음으로', () => location.reload()]]));
      G.Net.join(code);
    };
    $('btn-join-go').onclick = doJoin;
    $('join-code').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
    $('btn-help').onclick = () => showPane('pane-help');
    $('btn-help-back').onclick = () => showPane('pane-main');
    $('btn-export').onclick = () => G.Save.exportFile();
    $('btn-import').onclick = () => $('file-import').click();
    $('file-import').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { G.Save.importText(r.result); alert('추억을 불러왔어요! 💞'); location.reload(); } catch (err) { alert('올바른 백업 파일이 아니에요 🥲'); } };
      r.readAsText(f);
    };
    // 설정
    $('gear').onclick = () => { const p = $('settings'); p.classList.toggle('hidden'); syncSettings(); };
    const bindRange = (id, key) => { $(id).oninput = e => { G.settings[key] = +e.target.value / 100; G.Save.saveSettings(); }; };
    bindRange('set-master', 'master'); bindRange('set-music', 'music'); bindRange('set-sfx', 'sfx');
    $('set-shake').onchange = e => { G.settings.shake = e.target.checked; G.Save.saveSettings(); };
    $('set-dmg').onchange = e => { G.settings.dmgNum = e.target.checked; G.Save.saveSettings(); };
    $('set-close').onclick = () => $('settings').classList.add('hidden');
  }
  function syncSettings() {
    $('set-master').value = G.settings.master * 100; $('set-music').value = G.settings.music * 100; $('set-sfx').value = G.settings.sfx * 100;
    $('set-shake').checked = G.settings.shake !== false; $('set-dmg').checked = G.settings.dmgNum !== false;
  }

  App.init = function () {
    G.Save.load();
    G.Save.loadSettings();
    G.SPR.init();
    R.init();
    G.In.initTouch();
    G.In.onMinimap = () => { G.HUD.minimap = !G.HUD.minimap; };
    initFront();
    requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });
    window.addEventListener('beforeunload', e => { if (App.mode === 'host' && G.Net.open()) { e.preventDefault(); e.returnValue = ''; } });
  };
  return App;
})();

window.addEventListener('load', () => G.App.init());
