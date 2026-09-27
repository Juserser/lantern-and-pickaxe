// 캔버스, 카메라, 맵 베이크, 조명, 파티클
G.R = (function () {
  const R = {};
  const C = G.C;
  let screen, sctx, wc, wctx, lc, lctx;
  R.scale = 3; R.ox = 0; R.oy = 0; R.dpr = 1;
  R.cam = { x: 0, y: 0, shake: 0, sx: 0, sy: 0, left: 0, top: 0 };
  R.time = 0;

  R.init = function () {
    screen = document.getElementById('screen');
    sctx = screen.getContext('2d');
    wc = document.createElement('canvas'); wc.width = C.W; wc.height = C.H;
    wctx = wc.getContext('2d');
    lc = document.createElement('canvas'); lc.width = C.W / 2; lc.height = C.H / 2;
    lctx = lc.getContext('2d');
    R.sctx = sctx; R.wctx = wctx; R.wc = wc; R.screen = screen;
    bakeLightSprites();
    window.addEventListener('resize', R.resize);
    R.resize();
  };

  R.resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.dpr = dpr;
    const cw = Math.floor(window.innerWidth * dpr), ch = Math.floor(window.innerHeight * dpr);
    screen.width = cw; screen.height = ch;
    let s = Math.min(cw / C.W, ch / C.H);
    const si = Math.floor(s);
    if (si >= 2 && si / s > 0.86) s = si;
    R.scale = s;
    R.ox = Math.floor((cw - C.W * s) / 2);
    R.oy = Math.floor((ch - C.H * s) / 2);
  };

  // 화면 좌표(CSS px) → 논리 좌표
  R.toLogical = (px, py) => [((px * R.dpr) - R.ox) / R.scale, ((py * R.dpr) - R.oy) / R.scale];

  R.uiBegin = function () {
    sctx.setTransform(R.scale, 0, 0, R.scale, R.ox, R.oy);
    sctx.imageSmoothingEnabled = false;
  };

  R.present = function () {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.fillStyle = '#000';
    sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(wc, R.ox, R.oy, C.W * R.scale, C.H * R.scale);
  };

  // ───────────── 카메라
  R.setCamera = function (tx, ty, map, dt, snap) {
    const cam = R.cam;
    if (snap) { cam.x = tx; cam.y = ty; }
    else { const k = Math.min(1, dt * 10); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; }
    let x = cam.x, y = cam.y;
    if (map) {
      const mw = map.w * C.TILE, mh = map.h * C.TILE;
      x = mw <= C.W ? mw / 2 : G.U.clamp(x, C.W / 2, mw - C.W / 2);
      y = mh <= C.H ? mh / 2 : G.U.clamp(y, C.H / 2, mh - C.H / 2);
    }
    cam.shake = Math.max(0, cam.shake - dt * 18);
    const sh = G.settings && G.settings.shake === false ? 0 : cam.shake;
    cam.sx = sh ? (Math.random() * 2 - 1) * sh : 0;
    cam.sy = sh ? (Math.random() * 2 - 1) * sh : 0;
    cam.left = Math.round(x - C.W / 2 + cam.sx);
    cam.top = Math.round(y - C.H / 2 + cam.sy);
  };
  R.shake = v => { R.cam.shake = Math.min(8, Math.max(R.cam.shake, v)); };
  // 월드 → 논리 화면
  R.sx = wx => wx - R.cam.left;
  R.sy = wy => wy - R.cam.top;

  // ───────────── 맵 베이크
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  R.hash = hash;

  R.map = null; // { canvas, map }
  R.bakeMap = function (map) {
    const T = G.T, S = C.TILE;
    const cv = document.createElement('canvas'); cv.width = map.w * S; cv.height = map.h * S;
    const cx = cv.getContext('2d');
    R.map = { canvas: cv, ctx: cx, map, explored: new Uint8Array(map.w * map.h), lava: [], lights: [] };
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) drawTile(map, x, y);
    for (const d of map.deco) drawDeco(map, d);
    // 정적 광원
    const pal = map.pal;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y * map.w + x];
      if (t === T.LAVA) { R.map.lava.push([x, y]); if ((x + y * 3) % 3 === 0) R.map.lights.push({ x: x * S + 8, y: y * S + 8, r: 46, c: '#ff8a3c', a: 0.35 }); }
      if (t === T.CRYSTAL) R.map.lights.push({ x: x * S + 8, y: y * S + 8, r: 42, c: pal.glow, a: 0.45 });
    }
    for (const d of map.deco) {
      if (d[2] === 'gm') R.map.lights.push({ x: d[0], y: d[1], r: 38, c: pal.glow, a: 0.5 });
      if (d[2] === 'cr') R.map.lights.push({ x: d[0], y: d[1], r: 30, c: pal.glow, a: 0.4 });
      if (d[2] === 'hint') R.map.lights.push({ x: d[0], y: d[1], r: 14, c: '#fff3a0', a: 0.5 });
      if (d[2] === 'lamp') R.map.lights.push({ x: d[0], y: d[1], r: 70, c: '#ffc36b', a: 0.5 });
    }
  };
  R.updateTile = function (x, y) {
    if (!R.map) return;
    const m = R.map.map;
    for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) if (i >= 0 && j >= 0 && i < m.w && j < m.h) drawTile(m, i, j);
    for (const d of m.deco) {
      const tx = Math.floor(d[0] / C.TILE), ty = Math.floor(d[1] / C.TILE);
      if (Math.abs(tx - x) <= 2 && Math.abs(ty - y) <= 2) drawDeco(m, d);
    }
    if (m.tiles[y * m.w + x] === G.T.FLOOR) m.deco = m.deco.filter(d => !(d[2] === 'hint' && Math.floor(d[0] / C.TILE) === x && Math.floor(d[1] / C.TILE) === y));
    // 수정 벽이 사라지면 광원 제거
    const S = C.TILE;
    R.map.lights = R.map.lights.filter(l => !(Math.floor(l.x / S) === x && Math.floor(l.y / S) === y && m.tiles[y * m.w + x] !== G.T.CRYSTAL && l.r === 42));
  };

  function px(cx, x, y, w, h, c) { cx.fillStyle = c; cx.fillRect(x, y, w, h); }

  function drawTile(map, x, y) {
    const T = G.T, S = C.TILE, cx = R.map.ctx, pal = map.pal;
    const t = map.tiles[y * map.w + x];
    const X = x * S, Y = y * S;
    const at = (i, j) => (i < 0 || j < 0 || i >= map.w || j >= map.h) ? T.BEDROCK : map.tiles[j * map.w + i];
    const solid = G.isSolidTile;
    const h0 = hash(x, y, 1);
    cx.clearRect(X, Y, S, S);
    if (!solid(t) || t === T.BOULDER) {
      // 바닥
      const base = t === T.LAVA ? '#b8401e' : pal.floor[Math.floor(h0 * 3)];
      px(cx, X, Y, S, S, base);
      if (t !== T.LAVA) {
        for (let k = 0; k < 5; k++) {
          const hx = Math.floor(hash(x, y, 10 + k) * 16), hy = Math.floor(hash(x, y, 20 + k) * 16);
          px(cx, X + hx, Y + hy, 1, 1, k % 2 ? pal.floor[2] : pal.floor[1]);
        }
        if (h0 > 0.85) { px(cx, X + 4, Y + 9, 3, 1, pal.floor[2]); px(cx, X + 6, Y + 10, 2, 1, pal.floor[2]); }
        // 벽 아래 그림자
        if (solid(at(x, y - 1)) && at(x, y - 1) !== T.BOULDER) { cx.fillStyle = 'rgba(0,0,0,0.28)'; cx.fillRect(X, Y, S, 4); cx.fillStyle = 'rgba(0,0,0,0.14)'; cx.fillRect(X, Y + 4, S, 2); }
        if (solid(at(x - 1, y)) && at(x - 1, y) !== T.BOULDER) { cx.fillStyle = 'rgba(0,0,0,0.16)'; cx.fillRect(X, Y, 2, S); }
      }
      if (t === T.BOULDER) drawBoulder(cx, X, Y, h0);
      return;
    }
    // 벽 계열
    const faceBelow = !solid(at(x, y + 1)) || at(x, y + 1) === T.BOULDER;
    const openAbove = !solid(at(x, y - 1)) || at(x, y - 1) === T.BOULDER;
    const bedrock = t === T.BEDROCK;
    const topH = faceBelow ? 10 : 16;
    px(cx, X, Y, S, topH, bedrock ? pal.edge : pal.wall[1]);
    if (!bedrock) {
      for (let k = 0; k < 7; k++) {
        const hx = Math.floor(hash(x, y, 30 + k) * 15), hy = Math.floor(hash(x, y, 40 + k) * (topH - 1));
        px(cx, X + hx, Y + hy, 2, 1, k % 3 ? pal.wall[0] : pal.wall[2]);
      }
      if (openAbove) px(cx, X, Y, S, 1, pal.wallTop);
    } else {
      for (let k = 0; k < 4; k++) px(cx, X + Math.floor(hash(x, y, 50 + k) * 15), Y + Math.floor(hash(x, y, 60 + k) * 14), 1, 1, pal.wall[2]);
    }
    if (faceBelow) {
      // 앞면
      px(cx, X, Y + 10, S, 6, bedrock ? '#0a0612' : pal.wall[2]);
      px(cx, X, Y + 10, S, 1, pal.edge);
      for (let k = 0; k < 3; k++) px(cx, X + 2 + Math.floor(hash(x, y, 70 + k) * 12), Y + 12, 1, 3, pal.edge);
      px(cx, X, Y + 15, S, 1, 'rgba(0,0,0,0.5)');
    }
    // 옆 테두리
    if (!solid(at(x - 1, y))) px(cx, X, Y, 1, S, pal.edge);
    if (!solid(at(x + 1, y))) px(cx, X + 15, Y, 1, S, pal.edge);
    // 광석
    if (t === T.ORE || t === T.BIGORE || t === T.RAINBOW) {
      const cols = t === T.ORE ? ['#ffd36b', '#fff3c0'] : t === T.BIGORE ? ['#ff7aa8', '#ffd0e0'] : null;
      const n = t === T.ORE ? 3 : 5;
      for (let k = 0; k < n; k++) {
        const gx = X + 3 + Math.floor(hash(x, y, 80 + k) * 9), gy = Y + 2 + Math.floor(hash(x, y, 90 + k) * (topH - 5));
        const c = cols || ['#ff6b6b', '#ffd36b', '#7dff9a', '#6fb6ff', '#d7a8ff'][k % 5];
        px(cx, gx, gy, 2, 2, Array.isArray(c) ? c[0] : c);
        px(cx, gx, gy, 1, 1, Array.isArray(c) ? c[1] : '#fff');
      }
    }
    if (t === T.CRYSTAL) {
      const g = pal.glow;
      px(cx, X + 5, Y + 2, 3, 9, g); px(cx, X + 6, Y + 1, 1, 1, g); px(cx, X + 9, Y + 5, 3, 6, g); px(cx, X + 10, Y + 4, 1, 1, g);
      px(cx, X + 5, Y + 3, 1, 5, '#ffffff'); px(cx, X + 9, Y + 6, 1, 3, '#ffffff');
    }
  }
  function drawDeco(map, d) {
    const cx = R.map.ctx, x = d[0], y = d[1], pal = map.pal;
    const t = map.tiles[Math.floor(y / C.TILE) * map.w + Math.floor(x / C.TILE)];
    if (d[2] !== 'hint' && G.isSolidTile(t)) return;
    switch (d[2]) {
      case 'gm': px(cx, x - 1, y - 1, 2, 3, '#e8dcc8'); px(cx, x - 3, y - 4, 6, 3, pal.glow); px(cx, x - 2, y - 5, 4, 1, pal.glow); px(cx, x - 2, y - 4, 1, 1, '#ffffff'); break;
      case 'gr': px(cx, x, y - 3, 1, 3, '#5f8a3a'); px(cx, x - 2, y - 2, 1, 2, '#6f9a4a'); px(cx, x + 2, y - 2, 1, 2, '#4f7a2a'); break;
      case 'fl': px(cx, x, y - 2, 1, 2, '#5f8a3a'); px(cx, x - 1, y - 3, 3, 1, '#ffb3c7'); px(cx, x, y - 4, 1, 3, '#ffb3c7'); px(cx, x, y - 3, 1, 1, '#ffd24a'); break;
      case 'pb': px(cx, x - 1, y - 1, 3, 2, 'rgba(0,0,0,0.25)'); px(cx, x - 1, y - 2, 3, 2, pal.wall[0]); px(cx, x - 1, y - 2, 1, 1, pal.wallTop); break;
      case 'cr': px(cx, x - 1, y - 5, 2, 5, pal.glow); px(cx, x + 1, y - 3, 2, 3, pal.glow); px(cx, x - 1, y - 5, 1, 2, '#ffffff'); break;
      case 'st': px(cx, x - 1, y, 3, 1, '#d7a8ff'); px(cx, x, y - 1, 1, 3, '#d7a8ff'); px(cx, x, y, 1, 1, '#ffffff'); break;
      case 'em': px(cx, x - 1, y - 1, 3, 2, '#3a2020'); px(cx, x, y - 1, 1, 1, '#ff7a2e'); break;
      case 'hint': px(cx, x, y, 1, 1, '#fff3a0'); px(cx, x + 2, y + 3, 1, 1, '#ffffff'); break;
      case 'lamp': px(cx, x, y - 16, 1, 10, '#3a2a20'); px(cx, x - 3, y - 7, 7, 1, '#3a2a20'); px(cx, x - 3, y - 6, 7, 5, '#ffd36b'); px(cx, x - 2, y - 5, 5, 3, '#fff3c0'); px(cx, x - 3, y - 1, 7, 1, '#3a2a20'); break;
    }
  }
  function drawBoulder(cx, X, Y, h) {
    const o = '#1a1210';
    cx.fillStyle = 'rgba(0,0,0,0.35)'; cx.beginPath(); cx.ellipse(X + 8, Y + 13, 7, 2.5, 0, 0, Math.PI * 2); cx.fill();
    px(cx, X + 3, Y + 2, 10, 11, o); px(cx, X + 2, Y + 4, 12, 7, o);
    px(cx, X + 4, Y + 3, 8, 9, '#8d7b6a'); px(cx, X + 3, Y + 5, 10, 5, '#8d7b6a');
    px(cx, X + 4, Y + 3, 4, 3, '#b5a390'); px(cx, X + 9, Y + 9, 3, 2, '#6b5b4d'); px(cx, X + 5, Y + 10, 3, 1, '#6b5b4d');
    px(cx, X + 5, Y + 4, 1, 1, '#e0d4c0');
  }

  R.drawMap = function () {
    if (!R.map) return;
    const cam = R.cam;
    wctx.drawImage(R.map.canvas, cam.left, cam.top, C.W, C.H, 0, 0, C.W, C.H);
    // 용암 일렁임
    const t = R.time, S = C.TILE;
    for (const [x, y] of R.map.lava) {
      const X = x * S - cam.left, Y = y * S - cam.top;
      if (X < -S || Y < -S || X > C.W || Y > C.H) continue;
      const w = Math.sin(t * 2 + x * 0.7 + y * 1.3);
      wctx.fillStyle = w > 0 ? '#ff7a2e' : '#e0561e';
      wctx.fillRect(X, Y, S, S);
      wctx.fillStyle = '#ffb35c';
      const o = Math.floor((t * 6 + x * 5 + y * 3) % 16);
      wctx.fillRect(X + o % 13, Y + 3 + (x % 3) * 4, 3, 1);
      wctx.fillRect(X + (o + 7) % 12, Y + 10, 2, 1);
      if (Math.sin(t * 3 + x * 2.1 + y) > 0.95) { wctx.fillStyle = '#ffe0a0'; wctx.fillRect(X + 7, Y + 7, 2, 2); }
    }
    // 금 간 타일
    const m = R.map.map;
    const x0 = Math.max(0, Math.floor(cam.left / S)), y0 = Math.max(0, Math.floor(cam.top / S));
    const x1 = Math.min(m.w - 1, x0 + Math.ceil(C.W / S) + 1), y1 = Math.min(m.h - 1, y0 + Math.ceil(C.H / S) + 1);
    wctx.fillStyle = 'rgba(10,6,4,0.85)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = m.dmg[y * m.w + x];
      if (!d) continue;
      const X = x * S - cam.left, Y = y * S - cam.top;
      wctx.fillRect(X + 7, Y + 2, 1, 4); wctx.fillRect(X + 6, Y + 5, 1, 3);
      if (d > 1) { wctx.fillRect(X + 8, Y + 5, 4, 1); wctx.fillRect(X + 3, Y + 8, 4, 1); }
      if (d > 2) { wctx.fillRect(X + 10, Y + 6, 1, 4); wctx.fillRect(X + 4, Y + 3, 1, 3); }
    }
  };

  // ───────────── 조명
  let lightSpr, glowSpr = {};
  function bakeLightSprites() {
    const n = 128;
    lightSpr = document.createElement('canvas'); lightSpr.width = lightSpr.height = n;
    const x = lightSpr.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,1)');
    g.addColorStop(0.46, 'rgba(0,0,0,0.85)'); g.addColorStop(0.62, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.63, 'rgba(0,0,0,0.55)'); g.addColorStop(0.78, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.79, 'rgba(0,0,0,0.25)'); g.addColorStop(0.92, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
  }
  function glow(color) {
    if (glowSpr[color]) return glowSpr[color];
    const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    return (glowSpr[color] = c);
  }
  R.glowSprite = glow;

  // lights: [{x,y,r,c,a}] 월드 좌표. darkness 0~1
  R.drawLighting = function (lights, darkness, tint) {
    const cam = R.cam, lw = lc.width, lh = lc.height;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = tint || '#0b0716';
    lctx.globalAlpha = darkness;
    lctx.fillRect(0, 0, lw, lh);
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'destination-out';
    const t = R.time;
    for (const L of lights) {
      const fl = L.nof ? 1 : 1 + Math.sin(t * 9 + L.x * 0.13 + L.y * 0.07) * 0.025;
      const r = L.r * fl;
      const sx = (L.x - cam.left) / 2, sy = (L.y - cam.top) / 2, rr = r / 2;
      if (sx + rr < 0 || sy + rr < 0 || sx - rr > lw || sy - rr > lh) continue;
      lctx.globalAlpha = L.s == null ? 1 : L.s;
      lctx.drawImage(lightSpr, sx - rr, sy - rr, rr * 2, rr * 2);
    }
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'source-over';
    wctx.imageSmoothingEnabled = false;
    wctx.drawImage(lc, 0, 0, C.W, C.H);
    // 색 번짐
    wctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.c) continue;
      const sx = L.x - cam.left, sy = L.y - cam.top, r = L.r * 0.9;
      if (sx + r < 0 || sy + r < 0 || sx - r > C.W || sy - r > C.H) continue;
      wctx.globalAlpha = (L.a || 0.3) * 0.55;
      wctx.drawImage(glow(L.c), sx - r, sy - r, r * 2, r * 2);
    }
    wctx.globalAlpha = 1;
    wctx.globalCompositeOperation = 'source-over';
  };

  // 탐험 기록 (미니맵)
  R.explore = function (x, y, r) {
    if (!R.map) return;
    const m = R.map.map, S = C.TILE, e = R.map.explored;
    const tr = Math.ceil(r / S), tx = Math.floor(x / S), ty = Math.floor(y / S);
    for (let j = ty - tr; j <= ty + tr; j++) for (let i = tx - tr; i <= tx + tr; i++) {
      if (i < 0 || j < 0 || i >= m.w || j >= m.h) continue;
      if ((i - tx) * (i - tx) + (j - ty) * (j - ty) <= tr * tr) e[j * m.w + i] = 1;
    }
  };

  // ───────────── 파티클 (각자 로컬)
  const parts = [];
  R.parts = parts;
  R.part = function (o) {
    if (parts.length > 900) parts.shift();
    parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, t: 0, size: 1, color: '#fff', grav: 0, drag: 0, shape: 'sq', z: 0 }, o));
  };
  R.burst = function (x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 40) * (0.4 + Math.random() * 0.8);
      R.part(Object.assign({}, o, {
        x: x + (Math.random() - 0.5) * (o.spread || 0), y: y + (Math.random() - 0.5) * (o.spread || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0),
        life: (o.life || 0.5) * (0.6 + Math.random() * 0.6),
        color: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color,
      }));
    }
  };
  R.updateParts = function (dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  };
  R.drawParts = function (layer) {
    const cam = R.cam;
    for (const p of parts) {
      if ((p.layer || 0) !== layer) continue;
      const k = 1 - p.t / p.life;
      const x = Math.round(p.x - cam.left), y = Math.round(p.y - cam.top);
      if (x < -20 || y < -20 || x > C.W + 20 || y > C.H + 20) continue;
      wctx.globalAlpha = p.fade === false ? 1 : Math.min(1, k * 1.6);
      wctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (p.shrink === false ? 1 : 0.4 + 0.6 * k)));
      if (p.shape === 'img') {
        wctx.globalAlpha = k * (p.alpha || 0.5);
        wctx.drawImage(p.img, x - (p.img.width >> 1), y - p.img.height);
      } else if (p.shape === 'ring') {
        const r = p.r0 + (p.r1 - p.r0) * U_ease(p.t / p.life);
        wctx.strokeStyle = p.color; wctx.lineWidth = Math.max(1, Math.round(p.size * k));
        wctx.beginPath(); wctx.arc(x, y, r, 0, Math.PI * 2); wctx.stroke();
      } else if (p.shape === 'heart') {
        drawHeartPx(wctx, x, y, s, p.color);
      } else if (p.shape === 'star') {
        wctx.fillRect(x - s, y, s * 2 + 1, 1); wctx.fillRect(x, y - s, 1, s * 2 + 1);
      } else if (p.shape === 'line') {
        wctx.strokeStyle = p.color; wctx.lineWidth = 1;
        wctx.beginPath(); wctx.moveTo(x, y); wctx.lineTo(x - p.vx * 0.04, y - p.vy * 0.04); wctx.stroke();
      } else {
        wctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      }
    }
    wctx.globalAlpha = 1;
  };
  const U_ease = t => 1 - (1 - t) * (1 - t);
  function drawHeartPx(c, x, y, s, col) {
    c.fillStyle = col;
    if (s <= 1) { c.fillRect(x - 1, y - 1, 1, 1); c.fillRect(x + 1, y - 1, 1, 1); c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y + 1, 1, 1); return; }
    c.fillRect(x - 2, y - 2, 2, 2); c.fillRect(x + 1, y - 2, 2, 2); c.fillRect(x - 3, y - 1, 7, 2); c.fillRect(x - 2, y + 1, 5, 1); c.fillRect(x - 1, y + 2, 3, 1); c.fillRect(x, y + 3, 1, 1);
  }
  R.drawHeartPx = drawHeartPx;

  // ───────────── 떠다니는 글자 (UI 레이어)
  const texts = [];
  R.texts = texts;
  R.floatText = function (x, y, str, color, size, opts) {
    if (texts.length > 80) texts.shift();
    texts.push(Object.assign({ x, y, str, color: color || '#fff', size: size || 7, t: 0, life: 0.8, vy: -26 }, opts || {}));
  };
  R.updateTexts = function (dt) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]; t.t += dt; t.y += t.vy * dt; t.vy *= 1 - 2.5 * dt;
      if (t.t > t.life) texts.splice(i, 1);
    }
  };
  R.clearFx = function () { parts.length = 0; texts.length = 0; };

  return R;
})();
