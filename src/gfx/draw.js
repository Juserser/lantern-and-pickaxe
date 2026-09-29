// 월드 엔티티 그리기 (저해상도 캔버스에 픽셀 느낌으로)
G.D = (function () {
  const D = {};
  const R = G.R;
  let ctx = null, FL = null;
  const TAU = Math.PI * 2;

  function rect(x, y, w, h, c) { ctx.fillStyle = FL || c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function circ(x, y, r, c) {
    x = Math.round(x); y = Math.round(y); r = Math.max(0, Math.round(r));
    ctx.fillStyle = FL || c;
    for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); ctx.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
  }
  function ell(x, y, rx, ry, c) {
    x = Math.round(x); y = Math.round(y); rx = Math.max(0.5, rx); ry = Math.max(1, Math.round(ry));
    ctx.fillStyle = FL || c;
    for (let dy = -ry; dy <= ry; dy++) { const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.35); ctx.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
  }
  function ellO(x, y, rx, ry, c, o) { ell(x, y, rx + 1, ry + 1, o || '#1a1020'); ell(x, y, rx, ry, c); }
  function circO(x, y, r, c, o) { circ(x, y, r + 1, o || '#1a1020'); circ(x, y, r, c); }
  function shadow(x, y, rx) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; const ry = Math.max(1, Math.round(rx * 0.38)); for (let dy = -ry; dy <= ry; dy++) { const hw = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); ctx.fillRect(Math.round(x) - hw, Math.round(y) + dy, hw * 2 + 1, 1); } }
  function line(x0, y0, x1, y1, c, w) {
    ctx.strokeStyle = FL || c; ctx.lineWidth = w || 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); ctx.stroke();
  }
  function eyes(x, y, f, gap, c) { rect(x + f * 1, y, 1, 2, c || '#1a1020'); rect(x + f * (1 + gap), y, 1, 2, c || '#1a1020'); }
  D.prims = { rect, circ, ell, ellO, circO, shadow, line };

  D.begin = function () { ctx = R.wctx; FL = null; };
  const sx = v => v - R.cam.left, sy = v => v - R.cam.top;

  // ───────────── 플레이어
  D.player = function (p, slot, t) {
    const spr = G.SPR.ch[p.c]; if (!spr) return;
    let x = Math.round(sx(p.x)), y = Math.round(sy(p.y));
    const f = p.f >= 0 ? 1 : -1;
    if (p.st === 'g') {
      // 유령(부활 대기)
      ctx.globalAlpha = 0.45;
      ctx.drawImage(f > 0 ? spr.r[0] : spr.l[0], x - 8, y - 14 + Math.sin(t * 3) * 2);
      ctx.globalAlpha = 1;
      return;
    }
    shadow(x, y + 3, 6);
    if (p.st === 'x') {
      // 눈물방울 상태
      const img = f > 0 ? spr.r[0] : spr.l[0];
      ctx.drawImage(img, x - 9, y - 6, 18, 10);
      const ty = y - 14 + Math.sin(t * 4) * 1.5;
      rect(x - 1, ty, 3, 1, '#8fd8ff'); rect(x - 2, ty + 1, 5, 3, '#8fd8ff'); rect(x - 1, ty + 4, 3, 1, '#8fd8ff'); rect(x, ty - 1, 1, 1, '#8fd8ff'); rect(x - 1, ty + 1, 1, 1, '#fff');
      // 남은 시간 링
      const k = G.U.clamp(p.dt / G.C.DOWN_TIME, 0, 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y - 2, 11, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      if (p.rv > 0) {
        ctx.strokeStyle = G.COLORS.p[1 - slot]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y - 2, 14, -Math.PI / 2, -Math.PI / 2 + TAU * p.rv); ctx.stroke();
      }
      return;
    }
    if (p.fr >= 99) x += Math.round(Math.sin(t * 60)) ;
    const moving = p.mv;
    const frame = moving ? Math.floor(t * 9) % 2 : 0;
    const bob = moving ? -Math.abs(Math.sin(t * 13)) * 1.6 : Math.sin(t * 3 + slot) * 0.4;
    let w = 16, h = 16;
    if (p.at > 0.6) { w = 18; h = 15; }
    if (p.st === 'd') { w = 19; h = 13; }
    if (!moving && p.at <= 0) { const br = Math.sin(t * 3 + slot * 1.3); h = 16 + (br > 0.6 ? 0 : 0); }
    const top = Math.round(y + 4 - h + bob), left = Math.round(x - w / 2);
    const aimUp = Math.sin(p.a) < -0.5;
    if (aimUp) held(p, x, y + bob, t, slot);
    const blink = p.inv && Math.floor(t * 18) % 2 === 0;
    let img = f > 0 ? spr.r[frame] : spr.l[frame];
    if (p.fl > 0) img = f > 0 ? spr.flashR : spr.flashL;
    if (!blink) ctx.drawImage(img, left, top, w, h);
    else { ctx.globalAlpha = 0.4; ctx.drawImage(img, left, top, w, h); ctx.globalAlpha = 1; }
    // 모자
    if (p.hat && p.hat !== 'none' && G.SPR.hats[p.hat]) {
      const hs = G.SPR.hats[p.hat], hi = f > 0 ? hs.r : hs.l;
      const ax = f > 0 ? spr.hat[0] : 15 - spr.hat[0];
      const hx = left + Math.round(ax * w / 16) - (hi.width >> 1);
      const hy = top + Math.round(spr.hat[1] * h / 16) - hi.height + 1 - hs.float + (hs.float ? Math.sin(t * 3) : 0);
      ctx.drawImage(hi, hx, Math.round(hy));
    }
    if (!aimUp) held(p, x, y + bob, t, slot);
    // 무서움 땀방울
    if (p.fr > 70 && Math.floor(t * 2) % 2 === 0) { rect(x + f * 7, top + 3, 1, 2, '#8fd8ff'); }
  };

  function held(p, x, y, t, slot) {
    const ch = G.CHARS[p.c]; const f = p.f >= 0 ? 1 : -1;
    const a = p.a;
    const hx = x + Math.cos(a) * 7, hy = y - 5 + Math.sin(a) * 4;
    switch (ch.held) {
      case 'lantern': {
        const sw = Math.sin(t * 5) * 1;
        const lx = x + f * 8 + sw, ly = y - 4;
        line(x + f * 5, y - 6, lx, ly - 3, '#5a4030');
        rect(lx - 2, ly - 3, 5, 1, '#5a4030'); rect(lx - 2, ly + 3, 5, 1, '#5a4030');
        rect(lx - 2, ly - 2, 5, 5, '#ffe9a0'); rect(lx - 1, ly - 1, 3, 3, '#fff8d8');
        break;
      }
      case 'pickaxe': {
        let ang = a;
        if (p.at > 0) ang = a - 1.2 + (1 - p.at) * 2.4;
        else ang = f > 0 ? -0.9 : Math.PI + 0.9;
        const bx = x + f * 3, by = y - 5;
        const ex = bx + Math.cos(ang) * 10, ey = by + Math.sin(ang) * 10;
        line(bx, by, ex, ey, '#8a5a3c', 1);
        const px2 = Math.cos(ang + Math.PI / 2) * 4, py2 = Math.sin(ang + Math.PI / 2) * 4;
        line(ex - px2, ey - py2, ex + px2, ey + py2, '#c8d0dc', 2);
        if (p.at > 0.3) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (p.at * 0.8).toFixed(2) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y - 4, 16 * (p.ar || 1), a - 1.0, a + 1.0); ctx.stroke();
        }
        break;
      }
      case 'bomb': {
        if (p.at > 0.4) break;
        circO(x + f * 7, y - 3, 2, '#3a3450'); rect(x + f * 7, y - 7, 1, 2, '#c8a060');
        if (Math.floor(t * 10) % 2) rect(x + f * 7, y - 8, 1, 1, '#ffd36b');
        break;
      }
      case 'jar': {
        const jx = x + f * 7, jy = y - 3;
        rect(jx - 2, jy - 3, 5, 6, '#cfe9ff'); rect(jx - 2, jy - 4, 5, 1, '#8a5a3c');
        rect(jx - 1 + (Math.floor(t * 6) % 3), jy - 1, 1, 1, '#fff3a0'); rect(jx + (Math.floor(t * 4) % 2), jy + 1, 1, 1, '#d8ff8a');
        break;
      }
      case 'pan': {
        const ang = p.at > 0 ? a - 1 + (1 - p.at) * 2 : (f > 0 ? -0.4 : Math.PI + 0.4);
        const bx = x + f * 4, by = y - 4;
        line(bx, by, bx + Math.cos(ang) * 5, by + Math.sin(ang) * 5, '#5a4030');
        circO(bx + Math.cos(ang) * 8, by + Math.sin(ang) * 8, 3, '#3a3a44');
        break;
      }
      case 'staff': {
        const ang = p.at > 0 ? a - 0.6 + (1 - p.at) * 1.2 : (f > 0 ? -1.2 : Math.PI + 1.2);
        const bx = x + f * 5, by = y - 3;
        const ex = bx + Math.cos(ang) * 11, ey = by + Math.sin(ang) * 11;
        line(bx, by, ex, ey, '#8a5a3c', 1);
        circ(ex, ey, 2, '#d7a8ff'); rect(ex, ey - 1, 1, 1, '#ffffff');
        if (Math.floor(t * 6) % 2) rect(ex + 2, ey - 3, 1, 1, '#fff3a0');
        break;
      }
      case 'snow': {
        if (p.at > 0.4) break;
        circO(x + f * 7, y - 3, 2, '#ffffff'); rect(x + f * 6, y - 4, 1, 1, '#e0f4ff');
        break;
      }
      case 'shield': {
        if (p.at > 0.3) { ctx.strokeStyle = 'rgba(200,255,200,' + (p.at * 0.8).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 4, 16 * (p.ar || 1), a - 1.2, a + 1.2); ctx.stroke(); }
        break;
      }
    }
  }

  // ───────────── 빛줄기
  D.tether = function (a, b, t, syn, strong) {
    const x0 = sx(a.x), y0 = sy(a.y) - 6, x1 = sx(b.x), y1 = sy(b.y) - 6;
    const len = Math.hypot(x1 - x0, y1 - y0); if (len < 2) return;
    const n = Math.ceil(len / 2);
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    const cols = syn.length ? syn.map(s => G.TAGS[s].color) : [G.COLORS.p[0], '#ffe0f0', G.COLORS.p[1]];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const wave = Math.sin(k * Math.PI * 3 - t * 9) * 2.2 * Math.sin(k * Math.PI);
      const px = x0 + (x1 - x0) * k + nx * wave, py = y0 + (y1 - y0) * k + ny * wave;
      const c = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))];
      ctx.fillStyle = c; ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      if (strong || i % 2 === 0) { ctx.globalAlpha = 0.45; ctx.fillRect(Math.round(px), Math.round(py) + 1, 1, 1); ctx.fillRect(Math.round(px), Math.round(py) - 1, 1, 1); ctx.globalAlpha = 1; }
    }
    // 가운데 하트
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + Math.sin(t * 4) * 1.5;
    R.drawHeartPx(ctx, Math.round(mx), Math.round(my), 2, '#ff7aa8');
  };

  // ───────────── 몬스터
  const EN = {};
  EN.mushroom = (x, y, e, t, c) => {
    const sq = Math.sin(t * 8 + e[0]) * 0.8;
    shadow(x, y + 3, 6);
    ellO(x, y, 3, 3 + sq * 0.3, c[1]);
    eyes(x - 2, y - 1, 1, 2);
    ellO(x, y - 5 - sq * 0.4, 7, 4, c[0]);
    rect(x - 4, y - 7, 2, 2, '#fff'); rect(x + 2, y - 6, 2, 1, '#fff'); rect(x, y - 9, 1, 1, '#fff');
  };
  EN.mushling = (x, y, e, t, c) => {
    shadow(x, y + 2, 4);
    ellO(x, y, 2, 2, c[1]); ellO(x, y - 3, 4, 3, c[0]); rect(x - 2, y - 4, 1, 1, '#fff');
    rect(x - 1, y - 1, 1, 1, '#1a1020'); rect(x + 1, y - 1, 1, 1, '#1a1020');
  };
  EN.bat = (x, y, e, t, c) => {
    const fy = y - 8 + Math.sin(t * 6 + e[0]) * 2;
    shadow(x, y + 2, 4);
    const w = Math.sin(t * 22 + e[0]) > 0;
    const wy = w ? -3 : 1;
    ctx.fillStyle = FL || '#1a1020';
    for (let s = -1; s <= 1; s += 2) {
      rect(x + s * 3 - (s < 0 ? 5 : 0), fy + wy, 6, 2, '#1a1020'); rect(x + s * 3 - (s < 0 ? 4 : 0), fy + wy + (w ? 1 : 0), 5, 1, c[0]);
      rect(x + s * 8 - (s < 0 ? 1 : 0), fy + wy + (w ? -1 : 2), 1, 2, '#1a1020');
    }
    circO(x, fy, 3, c[0]);
    rect(x - 2, fy - 4, 1, 2, c[0]); rect(x + 2, fy - 4, 1, 2, c[0]);
    rect(x - 1, fy - 1, 1, 1, c[1]); rect(x + 1, fy - 1, 1, 1, c[1]);
  };
  EN.emberbat = EN.bat;
  EN.snail = (x, y, e, t, c) => {
    const f = e[6] || 1; const s = Math.sin(t * 3 + e[0]);
    shadow(x, y + 3, 8);
    ellO(x + f * 2, y + 1, 7 + s * 0.5, 2, c[0]);
    rect(x + f * 7, y - 5, 1, 5, c[0]); rect(x + f * 9, y - 4, 1, 4, c[0]);
    rect(x + f * 7, y - 6, 1, 1, '#1a1020'); rect(x + f * 9, y - 5, 1, 1, '#1a1020');
    circO(x - f * 1, y - 4, 5, c[1]);
    circ(x - f * 1, y - 4, 3, '#b8804a'); circ(x - f * 1, y - 4, 1, c[1]);
  };
  EN.worm = (x, y, e, t, c) => {
    if (e[7] === 1) { // 땅속
      rect(x - 4, y, 9, 2, '#5a4030'); rect(x - 2, y - 1, 5, 1, '#6d5040');
      if (Math.floor(t * 10 + e[0]) % 3 === 0) rect(x + ((t * 20) % 6) - 3, y - 2, 1, 1, '#8d7055');
      return;
    }
    const f = e[6] || 1;
    shadow(x, y + 3, 7);
    for (let i = 2; i >= 0; i--) {
      const ox = -f * i * 4, oy = Math.sin(t * 10 - i) * 1;
      circO(x + ox, y - 2 + oy - (i === 0 ? 1 : 0), i === 0 ? 4 : 3, i % 2 ? c[1] : c[0]);
    }
    rect(x + f * 1, y - 4, 1, 2, '#1a1020'); rect(x + f * 3, y - 4, 1, 2, '#1a1020');
  };
  EN.shadow = (x, y, e, t, c) => {
    const fy = y - 6 + Math.sin(t * 3 + e[0]) * 1.5;
    ctx.globalAlpha = e[4] & 64 ? 1 : 0.8;
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + i * 1.05 + e[0];
      circ(x + Math.cos(a) * 3, fy + Math.sin(a) * 2, 3, '#1a1030');
    }
    circ(x, fy, 5, c[0]);
    ctx.globalAlpha = 1;
    rect(x - 2, fy - 1, 1, 2, c[1]); rect(x + 2, fy - 1, 1, 2, c[1]);
    if (!(e[4] & 64)) { rect(x - 2, fy - 1, 1, 1, '#fff'); rect(x + 2, fy - 1, 1, 1, '#fff'); }
  };
  EN.crabling = (x, y, e, t, c) => {
    const f = e[6] || 1; const w = Math.sin(t * 14 + e[0]) > 0 ? 1 : 0;
    shadow(x, y + 3, 8);
    for (let i = -1; i <= 1; i++) { rect(x - 7, y + i * 2 + w, 3, 1, '#1a1020'); rect(x + 5, y + i * 2 - w, 3, 1, '#1a1020'); }
    ellO(x, y - 2, 6, 4, c[0]);
    rect(x - 3, y - 6, 2, 2, c[1]); rect(x + 1, y - 7, 2, 3, c[1]);
    rect(x - 2, y - 9, 1, 3, '#1a1020'); rect(x + 2, y - 9, 1, 3, '#1a1020');
    // 집게 (앞쪽)
    circO(x + f * 8, y - 3, 3, c[1]); rect(x + f * 10, y - 3, 2, 1, '#1a1020');
  };
  EN.shardfly = (x, y, e, t, c) => {
    const fy = y - 9 + Math.sin(t * 5 + e[0]) * 2;
    shadow(x, y + 2, 3);
    const w = Math.sin(t * 30) > 0;
    ctx.globalAlpha = 0.6; rect(x - 5, fy - (w ? 3 : 1), 4, 2, '#e0f4ff'); rect(x + 2, fy - (w ? 3 : 1), 4, 2, '#e0f4ff'); ctx.globalAlpha = 1;
    rect(x - 1, fy - 4, 3, 1, c[1]); rect(x - 2, fy - 3, 5, 4, c[0]); rect(x - 1, fy + 1, 3, 1, c[1]); rect(x, fy + 2, 1, 1, c[1]);
    rect(x - 1, fy - 2, 1, 1, '#fff');
    if (e[7] === 2) { ctx.globalAlpha = 0.6; circ(x, fy, 4, '#ffffff'); ctx.globalAlpha = 1; }
  };
  EN.salamander = (x, y, e, t, c) => {
    const f = e[6] || 1; const wig = Math.sin(t * 14 + e[0]);
    shadow(x, y + 3, 8);
    for (let i = 3; i >= 0; i--) {
      const ox = -f * i * 3, oy = Math.sin(t * 14 - i * 0.9) * (i * 0.5);
      circ(x + ox, y - 1 + oy, i === 0 ? 3 : 2, i === 0 ? c[0] : (i % 2 ? c[0] : '#e05a2a'));
    }
    rect(x - f * 11, y - 1 + wig, 2, 1, c[1]);
    rect(x + f * 1, y - 3, 1, 1, '#1a1020');
    rect(x - f * 3, y - 2, 1, 1, c[1]); rect(x - f * 6, y - 1, 1, 1, c[1]);
    rect(x - 2, y + 1 + (wig > 0 ? 1 : 0), 1, 2, '#1a1020'); rect(x - f * 5, y + 1 + (wig > 0 ? 0 : 1), 1, 2, '#1a1020');
  };
  EN.golem = (x, y, e, t, c) => {
    const f = e[6] || 1; const sq = e[7] === 2 ? 2 : 0;
    shadow(x, y + 4, 10);
    rect(x - 9, y - 16 + sq, 18, 18 - sq, '#1a1020');
    rect(x - 8, y - 15 + sq, 16, 16 - sq, c[0]);
    rect(x - 8, y - 15 + sq, 16, 3, '#a8968a'); rect(x - 5, y - 8, 4, 1, '#6b5b4d'); rect(x + 2, y - 4, 5, 1, '#6b5b4d');
    rect(x - 12, y - 10 + sq, 4, 8, '#1a1020'); rect(x - 11, y - 9 + sq, 3, 6, c[0]);
    rect(x + 8, y - 10 + sq, 4, 8, '#1a1020'); rect(x + 8, y - 9 + sq, 3, 6, c[0]);
    rect(x - 4 + f, y - 11 + sq, 2, 2, c[1]); rect(x + 2 + f, y - 11 + sq, 2, 2, c[1]);
    if (e[7] === 1) { rect(x - 4 + f, y - 11 + sq, 2, 2, '#fff'); rect(x + 2 + f, y - 11 + sq, 2, 2, '#fff'); }
  };
  EN.slime = (x, y, e, t, c, size) => {
    size = size || 7;
    const hop = e[7] === 1 ? Math.abs(Math.sin(t * 8)) * 5 : 0;
    const sq = e[7] === 1 ? 0 : Math.sin(t * 6 + e[0]) * 0.6;
    shadow(x, y + 3, size);
    ellO(x, y - size * 0.6 - hop, size + sq, size * 0.7 - sq, c[0]);
    rect(x - size * 0.5, y - size * 1.0 - hop, 2, 2, c[1]);
    rect(x - 2, y - size * 0.6 - hop, 1, 2, '#1a1020'); rect(x + 2, y - size * 0.6 - hop, 1, 2, '#1a1020');
  };
  EN.slimelet = (x, y, e, t, c) => EN.slime(x, y, e, t, c, 4);
  EN.fairy = (x, y, e, t, c) => {
    const fy = y - 10 + Math.sin(t * 4 + e[0]) * 2;
    if (e[7] === 1) { ctx.globalAlpha = 0.4; }
    shadow(x, y + 2, 3);
    const w = Math.sin(t * 28) > 0;
    ctx.globalAlpha *= 0.7; rect(x - 5, fy - 3 - (w ? 1 : 0), 4, 3, '#fff6ff'); rect(x + 2, fy - 3 - (w ? 1 : 0), 4, 3, '#fff6ff'); ctx.globalAlpha = e[7] === 1 ? 0.4 : 1;
    circO(x, fy, 3, c[0]); rect(x - 1, fy - 1, 1, 1, '#1a1020'); rect(x + 1, fy - 1, 1, 1, '#1a1020');
    rect(x, fy - 6, 1, 2, c[1]); rect(x - 1, fy - 7, 3, 1, c[1]);
    ctx.globalAlpha = 1;
  };
  EN.jelly = (x, y, e, t, c) => {
    const fy = y - 12 + Math.sin(t * 2 + e[0]) * 2.5;
    shadow(x, y + 3, 7);
    for (let i = -2; i <= 2; i++) {
      const tx = x + i * 3; for (let k = 0; k < 6; k++) rect(tx + Math.sin(t * 5 + k * 0.8 + i) * 1.2, fy + 3 + k, 1, 1, c[1]);
    }
    ctx.globalAlpha = 0.85;
    ell(x, fy, 8, 6, '#1a1020'); ell(x, fy, 7, 5, c[0]); ell(x, fy - 1, 5, 3, '#cbb8ff');
    ctx.globalAlpha = 1;
    rect(x - 2, fy, 1, 1, '#1a1020'); rect(x + 2, fy, 1, 1, '#1a1020');
    if (e[7] === 1) { ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.3; circ(x, fy, 9, '#ffd6f5'); ctx.globalAlpha = 1; }
  };

  EN.icebat = EN.bat;
  EN.goldmole = (x, y, e, t, c) => {
    const f = e[6] || 1, bob = e[7] === 1 ? Math.abs(Math.sin(t * 16)) * 1.5 : 0;
    shadow(x, y + 3, 7);
    circO(x - f * 4, y - 6 - bob, 4, '#c9a14a');
    rect(x - f * 4 - 1, y - 11 - bob, 3, 2, '#8a6a2a'); rect(x - f * 4, y - 7 - bob, 1, 2, '#ffd36b');
    ellO(x, y - 3 - bob, 5, 4, c[0]);
    ell(x + f * 2, y - 2 - bob, 3, 2, '#e8c39e');
    rect(x + f * 3, y - 5 - bob, 1, 1, '#1a1020');
    circ(x + f * 5, y - 3 - bob, 1, '#ff9eb5');
    rect(x - 3, y + 1, 2, 1, '#e8c39e'); rect(x + 2, y + 1, 2, 1, '#e8c39e');
    if (Math.floor(t * 8 + e[0]) % 3 === 0) rect(x - f * 7, y - 13 - bob, 1, 1, '#fff3a0');
  };
  EN.mimic = (x, y, e, t, c) => {
    const hop = e[7] === 1 ? Math.abs(Math.sin(t * 8)) * 5 : 0, open = e[7] ? 3 : 1, yy = y - hop;
    shadow(x, y + 3, 8);
    rect(x - 8, yy - 9, 16, 12, '#1a1020'); rect(x - 7, yy - 8, 14, 10, c[0]); rect(x - 7, yy - 4, 14, 2, '#ffd36b');
    rect(x - 7, yy - 11 - open, 14, 4, '#1a1020'); rect(x - 6, yy - 10 - open, 12, 3, '#c9955a');
    rect(x - 6, yy - 8, 12, open, '#5a1020');
    for (let i = 0; i < 4; i++) { rect(x - 6 + i * 3, yy - 8, 1, 1, '#ffffff'); rect(x - 5 + i * 3, yy - 9 + open, 1, 1, '#ffffff'); }
    if (open > 1) rect(x - 1, yy - 7, 3, 2, '#ff7aa8');
    rect(x - 4, yy - 12 - open, 1, 1, c[1]); rect(x + 3, yy - 12 - open, 1, 1, c[1]);
  };
  EN.snowman = (x, y, e, t, c) => {
    const f = e[6] || 1;
    shadow(x, y + 3, 6);
    circO(x, y - 3, 5, c[0]); circO(x, y - 10, 4, c[0]);
    rect(x - 1, y - 11, 1, 1, '#1a1020'); rect(x + 1, y - 11, 1, 1, '#1a1020'); rect(x + f * 2, y - 10, 2, 1, c[1]);
    rect(x - 4, y - 14, 9, 1, '#3a2a30'); rect(x - 2, y - 17, 5, 3, '#3a2a30');
    rect(x, y - 4, 1, 1, '#3a3a5a'); rect(x, y - 2, 1, 1, '#3a3a5a');
    rect(x - 4, y - 7, 9, 1, '#ff5c7a');
    if (e[7] === 2) circO(x + f * 7, y - 9, 2, '#ffffff');
  };
  EN.seal = (x, y, e, t, c) => {
    const f = e[6] || 1;
    shadow(x, y + 3, 9);
    ellO(x, y - 3, 8, 4, c[0]); ellO(x + f * 6, y - 6, 4, 3, c[0]);
    rect(x + f * 7, y - 7, 1, 1, '#1a1020'); rect(x + f * 9, y - 6, 1, 1, c[1]);
    rect(x - f * 10, y - 3, 3, 2, c[1]); rect(x - 2, y, 3, 1, c[1]);
    rect(x - 3, y - 5, 1, 1, '#ffffff'); rect(x + 1, y - 4, 1, 1, '#ffffff');
  };
  EN.bee = (x, y, e, t, c) => {
    const f = e[6] || 1, fy = y - 9 + Math.sin(t * 9 + e[0]) * 2, w = Math.sin(t * 40) > 0;
    shadow(x, y + 2, 3);
    ctx.globalAlpha = 0.7; rect(x - 3, fy - 4 - (w ? 1 : 0), 3, 2, '#ffffff'); rect(x + 1, fy - 4 - (w ? 1 : 0), 3, 2, '#ffffff'); ctx.globalAlpha = 1;
    ellO(x, fy, 4, 3, c[0]); rect(x - 1, fy - 2, 1, 5, c[1]); rect(x + 2, fy - 2, 1, 5, c[1]);
    rect(x + f * 3, fy - 1, 1, 1, '#1a1020'); rect(x - f * 5, fy, 1, 1, '#1a1020');
  };
  EN.flowertrap = (x, y, e, t, c) => {
    shadow(x, y + 3, 7);
    rect(x, y - 6, 1, 8, '#3a8a3a'); ellO(x - 4, y, 3, 1, c[1]); ellO(x + 4, y, 3, 1, c[1]);
    const hy = y - 10;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 0.8; circ(x + Math.cos(a) * 5, hy + Math.sin(a) * 4, 3, c[0]); }
    circO(x, hy, 3, '#ffd24a');
    if (e[7] === 2) { rect(x - 2, hy, 5, 2, '#5a1020'); rect(x - 2, hy, 1, 1, '#ffffff'); rect(x + 2, hy, 1, 1, '#ffffff'); }
    else { rect(x - 1, hy - 1, 1, 1, '#1a1020'); rect(x + 1, hy - 1, 1, 1, '#1a1020'); }
  };
  EN.ladybug = (x, y, e, t, c) => {
    const f = e[6] || 1, hop = e[7] === 1 ? Math.abs(Math.sin(t * 8)) * 4 : 0, yy = y - hop;
    shadow(x, y + 3, 6);
    ellO(x, yy - 4, 6, 5, c[0]); rect(x, yy - 9, 1, 9, c[1]);
    circ(x - 3, yy - 5, 1, c[1]); circ(x + 3, yy - 3, 1, c[1]); circ(x + 3, yy - 7, 1, c[1]); circ(x - 3, yy - 2, 1, c[1]);
    circO(x + f * 6, yy - 4, 2, c[1]); rect(x + f * 6, yy - 5, 1, 1, '#ffffff');
  };
  EN.butterfly = (x, y, e, t, c) => {
    const fy = y - 10 + Math.sin(t * 4 + e[0]) * 2;
    if (e[7] === 1) ctx.globalAlpha = 0.4;
    shadow(x, y + 2, 3);
    const w = Math.abs(Math.sin(t * 10)) * 3 + 1;
    ell(x - 3, fy - 1, w, 4, c[0]); ell(x + 3, fy - 1, w, 4, c[0]); ell(x - 2, fy + 3, w * 0.6, 2, c[1]); ell(x + 2, fy + 3, w * 0.6, 2, c[1]);
    rect(x, fy - 3, 1, 7, '#3a2a30'); rect(x - 1, fy - 5, 1, 2, '#3a2a30'); rect(x + 1, fy - 5, 1, 2, '#3a2a30');
    ctx.globalAlpha = 1;
  };

  // e = [id, type, x, y, flags, hpFrac, facing, anim, affix]
  // flags: 1 hit, 2 slow, 4 burn, 8 stun, 16 elite, 32 frozen, 64 inLight
  D.enemy = function (e, t) {
    const x = Math.round(sx(e[2])), y = Math.round(sy(e[3]));
    if (x < -30 || y < -40 || x > G.C.W + 30 || y > G.C.H + 30) return;
    const def = G.ENEMIES[e[1]]; if (!def) return;
    const fn = EN[e[1]] || EN.mushroom;
    const fl = e[4];
    const aff = e[8] ? G.AFFIX_KEYS[e[8] - 1] : null, acol = aff ? G.AFFIXES[aff].col : '#ffd36b';
    const small = fl & 128;
    if (small) { ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7); ctx.translate(-x, -y); }
    if (fl & 16) { ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.15; circ(x, y - 4, def.r + 5, acol); ctx.globalAlpha = 1; }
    const ghost = aff === 'ghost' && !(fl & 64);
    FL = (fl & 1) ? '#ffffff' : (fl & 32) ? '#bfefff' : null;
    if (ghost) ctx.globalAlpha = 0.28;
    fn(x, y, e, t, def.col);
    ctx.globalAlpha = 1;
    FL = null;
    if (small) ctx.restore();
    if (aff) {
      const ay = y - def.r * 2 - 9;
      rect(x - 11, ay, 3, 3, '#1a1020'); rect(x - 10, ay + 1, 1, 1, acol);
      if (aff === 'fire' && Math.floor(t * 8) % 2) rect(x + ((t * 30) % 10) - 5, y - 16, 1, 1, '#ff7a2e');
      if (aff === 'ice') rect(x + Math.cos(t * 3) * 7, y - 6 + Math.sin(t * 3) * 3, 1, 1, '#bfefff');
      if (aff === 'swift') rect(x - (e[6] || 1) * (6 + ((t * 40) % 6)), y - 4, 2, 1, '#ffe36b');
    }
    if (fl & 2) { rect(x - 3, y + 2, 1, 1, '#8fd8ff'); rect(x + 3, y + 1, 1, 1, '#8fd8ff'); }
    if (fl & 8) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; rect(x + Math.cos(a) * 5, y - 14 + Math.sin(a) * 2, 1, 1, '#ffe36b'); } }
    if ((fl & 16) && e[5] < 1) { rect(x - 7, y - def.r * 2 - 8, 14, 2, '#1a1020'); rect(x - 7, y - def.r * 2 - 8, Math.round(14 * e[5]), 2, '#ffd36b'); }
    else if (e[5] < 1 && e[5] > 0) { rect(x - 5, y + 5, 10, 1, 'rgba(0,0,0,0.5)'); rect(x - 5, y + 5, Math.round(10 * e[5]), 1, '#ff7aa8'); }
  };

  // ───────────── 투사체
  D.proj = function (p, t) {
    const x = Math.round(sx(p[2])), y = Math.round(sy(p[3])), a = p[4] || 0, z = p[5] || 0;
    switch (p[1]) {
      case 'orb': circ(x, y - 6, 3, '#fff3a0'); circ(x, y - 6, 2, '#ffffff'); break;
      case 'dart': rect(x - 1, y - 7, 3, 3, '#d8ff8a'); rect(x, y - 6, 1, 1, '#fff'); rect(x - Math.cos(a) * 3, y - 6 - Math.sin(a) * 3, 1, 1, '#b0e060'); break;
      case 'acorn': circO(x, y - 5, 2, '#a0643c'); rect(x - 2, y - 8, 5, 1, '#5a3a20'); break;
      case 'bomb': shadow(x, y + 1, 3); circO(x, y - 4 - z, 3, '#3a3450'); rect(x - 1, y - 6 - z, 1, 1, '#8a84a8'); if (Math.floor(t * 16) % 2) rect(x, y - 9 - z, 1, 1, '#ffd36b'); break;
      case 'bigbomb': {
        shadow(x, y + 2, 7); const pulse = Math.floor(t * (p[6] ? 18 : 6)) % 2;
        circO(x, y - 6, 6, pulse ? '#ff5c5c' : '#3a3450'); rect(x - 2, y - 10, 2, 2, '#8a84a8'); rect(x, y - 14, 1, 3, '#c8a060'); rect(x, y - 15, 1, 1, '#ffd36b'); break;
      }
      case 'fireball': circ(x, y - 6, 4, '#ff7a2e'); circ(x, y - 6, 2, '#ffe0a0'); break;
      case 'firebolt': rect(x - 2, y - 7, 4, 3, '#ff9a3c'); rect(x - 1, y - 6, 2, 1, '#fff0a0'); break;
      case 'star': rect(x - 2, y - 6, 5, 1, '#fff3a0'); rect(x, y - 8, 1, 5, '#fff3a0'); rect(x, y - 6, 1, 1, '#fff'); break;
      case 'fly': { const bl = Math.sin(t * 12 + p[0]) > 0; rect(x - 1, y - 7, 2, 2, bl ? '#e8ff9a' : '#b8e070'); rect(x, y - 7, 1, 1, '#fff'); break; }
      case 'shard': ctx.save(); ctx.translate(x, y - 6); ctx.rotate(a); rect(-3, -1, 6, 3, '#6fb6ff'); rect(-2, 0, 4, 1, '#e0f4ff'); ctx.restore(); break;
      case 'estar': rect(x - 2, y - 5, 5, 1, '#f3c6ff'); rect(x, y - 7, 1, 5, '#f3c6ff'); rect(x, y - 5, 1, 1, '#fff'); break;
      case 'spore': circ(x, y - 5, 3, '#ffb3c7'); circ(x - 1, y - 6, 1, '#fff'); break;
      case 'efire': circ(x, y - 5, 3, '#ff5c2e'); circ(x, y - 5, 1, '#ffe0a0'); break;
      case 'rock': shadow(x, y + 1, 5); circO(x, y - 5 - z, 4, '#8d7b6a'); rect(x - 2, y - 7 - z, 2, 2, '#b5a390'); break;
      case 'wstar': circ(x, y - 6, 3, '#d7a8ff'); rect(x - 4, y - 6, 9, 1, '#fff'); rect(x, y - 10, 1, 9, '#fff'); break;
      case 'bubble': ctx.globalAlpha = 0.8; circ(x, y - 6, 4, '#8fd8ff'); circ(x - 1, y - 7, 1, '#fff'); ctx.globalAlpha = 1; break;
      case 'rune': {
        const hot = p[6];
        ctx.strokeStyle = hot ? '#ffffff' : '#d7a8ff'; ctx.lineWidth = 1;
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, 13, 7, 0, 0, TAU); ctx.stroke();
        for (let i = 0; i < 5; i++) { const aa = t * 3 + i * TAU / 5; rect(x + Math.cos(aa) * 9, y + Math.sin(aa) * 4.5, 1, 1, '#fff3a0'); }
        ctx.globalAlpha = 1; break;
      }
      case 'meteor': {
        shadow(x, y + 1, 5); ctx.globalAlpha = 0.4; circ(x, y, 3, '#fff3a0'); ctx.globalAlpha = 1;
        const zz = y - 6 - z;
        rect(x + 3, zz - 6, 2, 2, '#ffd36b'); rect(x + 5, zz - 9, 1, 1, '#ffd36b');
        circ(x, zz, 3, '#fff3a0'); rect(x - 1, zz - 1, 2, 2, '#ffffff'); break;
      }
      case 'snow': circO(x, y - 5, 2, '#ffffff'); rect(x - 1, y - 6, 1, 1, '#e0f4ff'); break;
      case 'bigsnow': shadow(x, y + 2, 9); circO(x, y - 8, 8, '#ffffff'); circ(x - 3, y - 11, 2, '#e0f4ff'); rect(x + 2, y - 5, 2, 1, '#c8dcf0'); break;
      case 'petal': ctx.save(); ctx.translate(x, y - 5); ctx.rotate(t * 6 + p[0]); rect(-2, -1, 4, 2, '#ff9eb5'); rect(-1, -1, 1, 1, '#ffffff'); ctx.restore(); break;
      case 'honeyball': shadow(x, y + 1, 4); circO(x, y - 5 - z, 3, '#ffc83c'); rect(x - 1, y - 7 - z, 1, 1, '#fff3a0'); break;
      case 'goo': circO(x, y - 5, 2, '#7dff9a'); rect(x - 1, y - 6, 1, 1, '#e0ffe8'); break;
      default: circ(x, y - 5, 2, '#fff');
    }
  };

  // ───────────── 줍는 것
  D.pickup = function (k, t) {
    const x = Math.round(sx(k[2])), y = Math.round(sy(k[3])), b = Math.sin(t * 5 + k[0]) * 1.5;
    switch (k[1]) {
      case 'xp': rect(x - 1, y - 4 + b, 2, 2, '#e8ff9a'); rect(x, y - 4 + b, 1, 1, '#fff'); break;
      case 'xpb': circ(x, y - 4 + b, 2, '#e8ff9a'); rect(x, y - 5 + b, 1, 1, '#fff'); break;
      case 'gem': shadow(x, y + 2, 3); rect(x - 2, y - 4 + b, 5, 3, '#ffd36b'); rect(x - 1, y - 5 + b, 3, 1, '#fff3c0'); rect(x - 1, y - 1 + b, 3, 1, '#d9a030'); rect(x, y, 1, 1, '#d9a030'); break;
      case 'gemb': shadow(x, y + 2, 4); rect(x - 3, y - 5 + b, 7, 4, '#ff7aa8'); rect(x - 2, y - 6 + b, 5, 1, '#ffd0e0'); rect(x - 2, y - 1 + b, 5, 1, '#c04070'); rect(x - 1, y + b, 3, 1, '#c04070'); rect(x - 2, y - 5 + b, 1, 1, '#fff'); break;
      case 'heart': shadow(x, y + 2, 3); R.drawHeartPx(ctx, x, y - 4 + Math.round(b), 2, '#ff5c7a'); rect(x - 2, y - 6 + Math.round(b), 1, 1, '#fff'); break;
      case 'fruit': shadow(x, y + 2, 3); circO(x, y - 4 + b, 2, '#ff4d6d'); rect(x, y - 7 + b, 1, 2, '#5cb85c'); break;
      case 'star': shadow(x, y + 2, 4); { const s = 3 + Math.sin(t * 8) * 0.8; rect(x - s, y - 6 + b, s * 2 + 1, 1, '#fff3a0'); rect(x, y - 6 - s + b, 1, s * 2 + 1, '#fff3a0'); circ(x, y - 6 + b, 1, '#ffffff'); } break;
      case 'lampshroom': shadow(x, y + 2, 4); ellO(x, y - 2 + b, 2, 3, '#fff0e0'); ellO(x, y - 6 + b, 5, 3, '#9dffb0'); rect(x - 2, y - 7 + b, 1, 1, '#fff'); break;
      case 'pickcrate': shadow(x, y + 2, 6); rect(x - 6, y - 9, 12, 10, '#1a1020'); rect(x - 5, y - 8, 10, 8, '#b8804a'); rect(x - 5, y - 5, 10, 1, '#8a5a3c'); line(x - 3, y - 11, x + 3, y - 5, '#c8d0dc', 1); break;
      case 'relic': shadow(x, y + 2, 5); rect(x - 5, y - 9 + b, 11, 8, '#1a1020'); rect(x - 4, y - 8 + b, 9, 6, '#ff7aa8'); rect(x, y - 8 + b, 1, 6, '#ffd36b'); rect(x - 4, y - 6 + b, 9, 1, '#ffd36b'); rect(x - 2, y - 11 + b, 2, 2, '#ffd36b'); rect(x + 1, y - 11 + b, 2, 2, '#ffd36b'); break;
      case 'egg': shadow(x, y + 2, 4); ellO(x, y - 5 + b, 3, 4, '#fff6e8'); rect(x - 1, y - 7 + b, 1, 1, '#ffb3c7'); rect(x + 1, y - 4 + b, 1, 1, '#8fd8ff'); rect(x - 2, y - 3 + b, 1, 1, '#9dffb0'); break;
      case 'key': shadow(x, y + 2, 4); for (let i = 0; i < 5; i++) { const aa = i * TAU / 5 + t; circ(x + Math.cos(aa) * 2.5, y - 9 + b + Math.sin(aa) * 2.5, 1, '#ffb3c7'); } rect(x, y - 9 + b, 1, 1, '#fff3a0'); rect(x, y - 6 + b, 1, 6, '#ffd36b'); rect(x + 1, y - 2 + b, 2, 1, '#ffd36b'); rect(x + 1, y - 4 + b, 1, 1, '#ffd36b'); break;
      case 'lunch': shadow(x, y + 2, 7); rect(x - 7, y - 4, 14, 6, '#1a1020'); rect(x - 6, y - 3, 12, 4, '#ff7aa8'); rect(x - 6, y - 3, 12, 1, '#ffd0e0'); rect(x - 4, y - 6, 3, 2, '#fff'); rect(x + 1, y - 6, 3, 2, '#ffd36b'); break;
    }
  };

  // ───────────── 오브젝트
  // o = [id, type, x, y, state, extra]
  D.object = function (o, t) {
    const x = Math.round(sx(o[2])), y = Math.round(sy(o[3]));
    if (x < -50 || y < -60 || x > G.C.W + 50 || y > G.C.H + 50) return;
    switch (o[1]) {
      case 'door': {
        // 별빛 문
        const open = o[4] >= 1;
        shadow(x, y + 4, 12);
        rect(x - 12, y - 26, 24, 30, '#1a1020');
        rect(x - 11, y - 25, 22, 28, '#4a3b63');
        rect(x - 8, y - 22, 16, 25, open ? '#fff3c0' : '#120c1e');
        if (open) { for (let i = 0; i < 5; i++) { const yy = y - 20 + ((t * 20 + i * 5) % 22); rect(x - 6 + (i * 3) % 12, yy, 1, 1, '#ffffff'); } }
        rect(x - 3, y - 31, 7, 5, '#1a1020'); rect(x - 2, y - 30, 5, 3, '#ffd36b'); rect(x, y - 32, 1, 1, '#ffd36b');
        if (!open) {
          // 어둠 결계
          const k = o[5] || 0;
          ctx.globalAlpha = 0.75 - k * 0.5;
          for (let i = 0; i < 10; i++) { const a = t * 1.5 + i * 0.63; circ(x + Math.cos(a) * 9, y - 12 + Math.sin(a * 1.3) * 10, 3, '#231040'); }
          ctx.globalAlpha = 1;
          if (k > 0) { ctx.strokeStyle = '#fff3a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 12, 18, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); }
        }
        break;
      }
      case 'chest': {
        const opened = o[4] >= 1; shadow(x, y + 3, 8);
        rect(x - 8, y - 9, 16, 12, '#1a1020'); rect(x - 7, y - 8, 14, 10, '#b8804a'); rect(x - 7, y - 4, 14, 2, '#ffd36b');
        if (!opened) { rect(x - 7, y - 11, 14, 4, '#1a1020'); rect(x - 6, y - 10, 12, 3, '#c9955a'); rect(x - 1, y - 6, 2, 3, '#fff3a0'); if (Math.floor(t * 3) % 2) rect(x + 5, y - 12, 1, 1, '#fff'); }
        else { rect(x - 7, y - 15, 14, 5, '#1a1020'); rect(x - 6, y - 14, 12, 3, '#8a5a3c'); rect(x - 5, y - 8, 10, 2, '#fff3a0'); }
        if (!opened && o[5]) {
          // 잠긴 협동 상자
          rect(x - 2, y - 9, 5, 5, '#1a1020'); rect(x - 1, y - 8, 3, 3, '#b8b8d0'); rect(x, y - 7, 1, 1, '#1a1020');
          ctx.strokeStyle = '#b8b8d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 0.5, y - 9, 2, Math.PI, 0); ctx.stroke();
          ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3; rect(x - 9, y - 13, 1, 1, '#ffb3c7'); rect(x + 8, y - 12, 1, 1, '#ffb3c7'); ctx.globalAlpha = 1;
        }
        break;
      }
      case 'plate': {
        const col = o[4] === 2 ? '#ffd36b' : o[4] === 1 ? '#9dffb0' : '#8fd8ff';
        const dn = o[4] ? 0 : 1;
        ell(x, y + 1, 10, 4, '#1a1020'); ell(x, y - dn, 9, 3, '#5a5a78'); ell(x, y - dn, 6, 2, col);
        if (o[4] === 0) { const bb = Math.round(Math.sin(t * 5) * 1.5); rect(x, y - 14 + bb, 1, 4, col); rect(x - 1, y - 11 + bb, 3, 1, col); rect(x, y - 10 + bb, 1, 1, col); }
        break;
      }
      case 'bell': {
        shadow(x, y + 3, 7);
        rect(x - 7, y - 25, 15, 2, '#6b4a30'); rect(x - 7, y - 25, 1, 28, '#6b4a30'); rect(x + 7, y - 25, 1, 28, '#6b4a30');
        const sw = o[5] ? Math.round(Math.sin(t * 25) * 2) : 0;
        rect(x - 2 + sw, y - 22, 5, 2, '#ffd36b'); rect(x - 4 + sw, y - 20, 9, 6, '#ffd36b'); rect(x - 5 + sw, y - 14, 11, 2, '#e0a830');
        rect(x + sw, y - 12, 1, 2, '#8a6a2a'); rect(x - 2 + sw, y - 19, 1, 3, '#fff3a0');
        if (o[4] === 2) for (let i = 0; i < 3; i++) { const aa = t * 2 + i * 2.1; rect(x + Math.cos(aa) * 10, y - 18 + Math.sin(aa) * 6, 1, 1, '#fff3a0'); }
        else if (o[5]) { ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y - 17, 12 + ((t * 30) % 8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        break;
      }
      case 'cart': {
        shadow(x, y + 3, 10);
        rect(x - 10, y - 11, 20, 10, '#1a1020'); rect(x - 9, y - 10, 18, 8, '#8a6b5a'); rect(x - 9, y - 10, 18, 1, '#b89a80'); rect(x - 9, y - 6, 18, 1, '#6b4a3a');
        if (o[4] === 0) { rect(x - 6, y - 13, 4, 3, '#ffd36b'); rect(x - 1, y - 14, 4, 4, '#ff7aa8'); rect(x + 4, y - 13, 3, 3, '#8fd8ff'); }
        circO(x - 6, y - 1, 2, '#3a3450'); circO(x + 6, y - 1, 2, '#3a3450');
        if (o[4] === 1) for (let i = 0; i < 3; i++) rect(x - 16 - i * 5 - ((t * 60) % 5), y - 8 + i * 3, 4, 1, '#ffffff');
        if (o[4] === 0) { const bb = Math.sin(t * 4) * 1.5; rect(x, y - 26 + bb, 1, 5, '#fff'); rect(x, y - 19 + bb, 1, 1, '#fff'); }
        break;
      }
      case 'camp': {
        shadow(x, y + 3, 10);
        circ(x - 8, y, 2, '#8d8aa8'); circ(x + 8, y, 2, '#8d8aa8'); circ(x - 5, y + 2, 2, '#6b6a88'); circ(x + 5, y + 2, 2, '#6b6a88');
        rect(x - 7, y - 1, 14, 2, '#6b4a30'); rect(x - 5, y - 2, 10, 1, '#8a5a3c');
        if (o[4] === 0) for (let i = 0; i < 3; i++) { const fh = 6 + Math.sin(t * 12 + i * 2) * 2; rect(x - 4 + i * 3, y - 2 - fh, 3, fh, '#ff7a2e'); rect(x - 3 + i * 3, y - fh, 1, fh - 2, '#ffe0a0'); }
        else if (Math.floor(t * 3) % 2) rect(x, y - 3, 1, 1, '#ff7a2e');
        break;
      }
      case 'shop': {
        // 달팽이 상인 느릿
        shadow(x, y + 3, 14);
        rect(x - 18, y - 22, 36, 3, '#ff7aa8'); rect(x - 18, y - 19, 36, 2, '#fff');
        rect(x - 16, y - 19, 1, 20, '#8a5a3c'); rect(x + 15, y - 19, 1, 20, '#8a5a3c');
        rect(x - 14, y - 4, 28, 6, '#8a5a3c'); rect(x - 14, y - 4, 28, 1, '#c9955a');
        rect(x - 10, y - 7, 3, 3, '#ff5c7a'); rect(x - 3, y - 7, 3, 3, '#ffd36b'); rect(x + 4, y - 7, 3, 3, '#6fb6ff');
        const s = Math.sin(t * 2) * 0.5;
        ellO(x + 20, y + 1, 7, 2, '#b8e070'); circO(x + 18, y - 5 + s, 5, '#d7a86e'); circ(x + 18, y - 5 + s, 2, '#b8804a');
        rect(x + 25, y - 6, 1, 6, '#b8e070'); rect(x + 27, y - 5, 1, 5, '#b8e070'); rect(x + 25, y - 7, 1, 1, '#1a1020'); rect(x + 27, y - 6, 1, 1, '#1a1020');
        break;
      }
      case 'fountain': {
        shadow(x, y + 4, 13);
        ellO(x, y, 12, 5, '#8d8aa8'); ell(x, y - 1, 10, 3, '#6fb6ff');
        rect(x - 2, y - 12, 4, 11, '#1a1020'); rect(x - 1, y - 11, 2, 10, '#b8b4d0');
        for (let i = 0; i < 4; i++) { const k = (t * 1.5 + i / 4) % 1; rect(x + Math.cos(i * 1.6) * k * 8, y - 13 + k * k * 12 - k * 6, 1, 1, '#cfe9ff'); }
        if (o[4] >= 1) { ctx.globalAlpha = 0.5; ell(x, y - 1, 10, 3, '#3a3450'); ctx.globalAlpha = 1; }
        break;
      }
      case 'altar': {
        shadow(x, y + 3, 10);
        rect(x - 9, y - 8, 18, 10, '#1a1020'); rect(x - 8, y - 7, 16, 8, '#6b5b8a'); rect(x - 8, y - 7, 16, 2, '#8d7bb0');
        if (o[4] === 0) { const g = 2 + Math.sin(t * 4); circ(x, y - 12, g, '#ff5c7a'); }
        if (o[4] === 1) { ctx.globalAlpha = 0.5; circ(x, y - 12, 4, '#ff5c7a'); ctx.globalAlpha = 1; }
        break;
      }
      case 'event': {
        // 이벤트 NPC (extra = 종류)
        const kind = o[5];
        shadow(x, y + 3, 7);
        if (kind === 'wish') {
          const s = 4 + Math.sin(t * 5); rect(x - s, y - 12, s * 2 + 1, 1, '#fff3a0'); rect(x, y - 12 - s, 1, s * 2 + 1, '#fff3a0'); circ(x, y - 12, 2, '#ffffff');
          for (let i = 0; i < 3; i++) rect(x - 6 - i * 3, y - 16 + i * 2, 1, 1, '#fff3a0');
        } else if (kind === 'babybat') { EN.bat(x, y + 4, [o[0], 'bat', 0, 0, 0, 1, 1, 0], t, ['#8a6bb8', '#ffb3c7']); rect(x + 3, y - 4, 1, 2, '#8fd8ff'); }
        else if (kind === 'cricket') { ellO(x, y - 4, 4, 3, '#6b8f3a'); rect(x - 3, y - 9, 1, 3, '#6b8f3a'); rect(x + 2, y - 9, 1, 3, '#6b8f3a'); rect(x - 5, y - 2, 10, 1, '#8a5a3c'); }
        else if (kind === 'shroom') { EN.mushroom(x, y, [o[0]], t, ['#b85cff', '#fff0e0']); }
        else { rect(x - 5, y - 12, 10, 12, '#1a1020'); rect(x - 4, y - 11, 8, 10, '#c9955a'); }
        if (o[4] === 0) { const b = Math.sin(t * 4) * 1.5; rect(x - 1, y - 24 + b, 3, 1, '#fff'); rect(x + 1, y - 23 + b, 1, 2, '#fff'); rect(x, y - 21 + b, 1, 1, '#fff'); rect(x, y - 19 + b, 1, 1, '#fff'); }
        break;
      }
      case 'dome': {
        ctx.globalAlpha = 0.28 + Math.sin(t * 8) * 0.06;
        circ(x, y - 4, o[5] || 36, '#8fd18a'); ctx.globalAlpha = 0.8;
        ctx.strokeStyle = '#c8ffc0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 4, o[5] || 36, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1; break;
      }
      case 'mushlamp': { shadow(x, y + 2, 4); ellO(x, y - 2, 2, 3, '#fff0e0'); ellO(x, y - 7, 5, 3, '#9dffb0'); break; }
    }
  };

  // ───────────── 장판
  D.hazard = function (h, t) {
    const x = Math.round(sx(h[2])), y = Math.round(sy(h[3])), r = h[4], life = h[5];
    ctx.globalAlpha = Math.min(1, life * 2) * 0.8;
    switch (h[1]) {
      case 'slime': ell(x, y, r, r * 0.5, '#7ab84a'); ell(x - 1, y - 1, r * 0.5, r * 0.25, '#a8e070'); break;
      case 'fire': {
        ell(x, y, r, r * 0.45, '#8a2a10');
        for (let i = 0; i < 3; i++) { const fx = x + (i - 1) * r * 0.5, fh = 3 + Math.sin(t * 16 + i * 2 + h[0]) * 1.5; rect(fx - 1, y - fh, 3, fh, '#ff7a2e'); rect(fx, y - fh - 1, 1, fh - 1, '#ffd36b'); }
        break;
      }
      case 'lavapool': ell(x, y, r, r * 0.55, '#c0401a'); ell(x, y, r * 0.7, r * 0.35, '#ff7a2e'); if (Math.sin(t * 5 + h[0]) > 0.7) rect(x, y - 1, 2, 2, '#ffe0a0'); break;
      case 'spore': ctx.globalAlpha *= 0.55; circ(x, y - 3, r, '#ffb3c7'); ctx.globalAlpha = 1; break;
      case 'dark': ctx.globalAlpha *= 0.7; circ(x, y - 2, r, '#120a24'); break;
      case 'honey': ell(x, y, r, r * 0.5, '#d89018'); ell(x - 1, y - 1, r * 0.65, r * 0.3, '#ffc83c'); if (Math.sin(t * 3 + h[0]) > 0.8) rect(x + 2, y - 1, 1, 1, '#fff3a0'); break;
    }
    ctx.globalAlpha = 1;
  };

  // ───────────── 예고 표시 (빨간 범위)
  // tl = [shape, x, y, a, b, ang, prog]  shape: c 원 / l 직선(a=길이,b=폭) / r 링(a=안, b=밖)
  D.telegraph = function (tl, t) {
    const x = sx(tl[1]), y = sy(tl[2]), k = tl[6];
    ctx.save();
    const blink = k > 0.75 && Math.floor(t * 20) % 2 === 0;
    ctx.fillStyle = blink ? 'rgba(255,120,140,0.45)' : 'rgba(255,60,90,0.22)';
    ctx.strokeStyle = 'rgba(255,90,120,0.9)'; ctx.lineWidth = 1;
    if (tl[0] === 'c') {
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), tl[3], 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,60,90,0.35)'; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), tl[3] * k, 0, TAU); ctx.fill();
    } else if (tl[0] === 'l') {
      ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(tl[5]);
      ctx.fillRect(0, -tl[4] / 2, tl[3], tl[4]); ctx.strokeRect(0.5, -tl[4] / 2 + 0.5, tl[3], tl[4]);
      ctx.fillStyle = 'rgba(255,60,90,0.35)'; ctx.fillRect(0, -tl[4] / 2, tl[3] * k, tl[4]);
    } else if (tl[0] === 'r') {
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), tl[4], 0, TAU); ctx.arc(Math.round(x), Math.round(y), tl[3], 0, TAU, true); ctx.fill();
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), tl[4], 0, TAU); ctx.stroke();
    } else if (tl[0] === 'a') {
      // 부채꼴: a=반경, b=각도폭
      ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y)); ctx.arc(Math.round(x), Math.round(y), tl[3], tl[5] - tl[4] / 2, tl[5] + tl[4] / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  // ───────────── 보스
  D.boss = function (b, t) {
    const x = Math.round(sx(b.x)), y = Math.round(sy(b.y));
    FL = b.fl ? '#ffffff' : null;
    const fn = BOSS[b.k]; if (fn) fn(x, y, b, t);
    FL = null;
  };
  const BOSS = {};
  BOSS.mushking = (x, y, b, t) => {
    const s = b.s, z = b.z || 0;
    shadow(x, y + 4, 20 - z * 0.1);
    const yy = y - z;
    const br = s === 'sleep' ? Math.sin(t * 2) * 1.2 : 0;
    ellO(x, yy - 8, 11, 10 + br * 0.5, '#fff0e0');
    rect(x - 7, yy - 4, 14, 3, '#f0d8c0');
    // 얼굴
    if (s === 'sleep') { rect(x - 6, yy - 10, 4, 1, '#1a1020'); rect(x + 3, yy - 10, 4, 1, '#1a1020'); rect(x - 1, yy - 5, 3, 1, '#c07080'); }
    else { rect(x - 6, yy - 12, 2, 3, '#1a1020'); rect(x + 4, yy - 12, 2, 3, '#1a1020'); rect(x - 7, yy - 14, 4, 1, '#1a1020'); rect(x + 4, yy - 14, 4, 1, '#1a1020'); ellO(x, yy - 5, 2, 1, '#8a2a40'); }
    rect(x - 9, yy - 8, 2, 1, '#ffb3c7'); rect(x + 8, yy - 8, 2, 1, '#ffb3c7');
    ellO(x, yy - 24 + br, 24, 13, b.ph > 1 ? '#ff4d6d' : '#ff6b8a');
    ell(x - 6, yy - 30 + br, 12, 4, b.ph > 1 ? '#ff7a90' : '#ff9eb5');
    const sp = [[-14, -26], [-4, -32], [8, -28], [16, -22], [-18, -20], [2, -22]];
    for (const [ox, oy] of sp) circ(x + ox, yy + oy + br, 2, '#ffffff');
    // 잠옷 모자
    rect(x + 8, yy - 40 + br, 8, 4, '#6fb6ff'); rect(x + 12, yy - 44 + br, 4, 4, '#6fb6ff'); circ(x + 17, yy - 44 + br, 2, '#ffffff');
  };
  BOSS.crab = (x, y, b, t) => {
    const f = Math.cos(b.a) >= 0 ? 1 : -1;
    const w = Math.sin(t * 10) > 0 ? 1 : 0;
    shadow(x, y + 5, 24);
    for (let i = 0; i < 3; i++) { rect(x - 24 - (i === 1 ? w : 0), y - 4 + i * 4, 8, 2, '#1a1020'); rect(x + 17 + (i === 1 ? w : 0), y - 4 + i * 4, 8, 2, '#1a1020'); }
    ellO(x, y - 8, 20, 12, '#6fb6ff');
    ell(x, y - 12, 15, 6, '#9fd0ff');
    // 등 수정
    const g = b.ph > 1 ? '#ffd6f5' : '#e0f4ff';
    rect(x - 10, y - 26, 4, 10, g); rect(x - 3, y - 30, 5, 14, g); rect(x + 5, y - 25, 4, 9, g);
    rect(x - 2, y - 29, 1, 10, '#fff');
    // 눈
    rect(x + f * 5, y - 22, 1, 6, '#1a1020'); rect(x + f * 10, y - 21, 1, 5, '#1a1020');
    circO(x + f * 5, y - 23, 2, '#ffffff'); circO(x + f * 10, y - 22, 2, '#ffffff');
    rect(x + f * 5 + f, y - 23, 1, 1, '#1a1020'); rect(x + f * 10 + f, y - 22, 1, 1, '#1a1020');
    // 집게 (정면 방패)
    const ca = b.a, cl = b.s === 'sweep' ? 30 : 22;
    for (const off of [-0.55, 0.55]) {
      const cx = x + Math.cos(ca + off) * cl, cy = y - 8 + Math.sin(ca + off) * cl * 0.6;
      circO(cx, cy, 7, '#4a8ad6'); circ(cx - 2, cy - 2, 3, '#9fd0ff');
      rect(cx + Math.cos(ca) * 6 - 1, cy + Math.sin(ca) * 4 - 1, 3, 3, '#1a1020');
    }
  };
  BOSS.moleking = (x, y, b, t) => {
    if (b.s === 'under') {
      rect(x - 10, y - 1, 20, 4, '#5a3020'); rect(x - 7, y - 3, 14, 2, '#7a4530');
      for (let i = 0; i < 4; i++) rect(x - 8 + ((t * 30 + i * 5) % 16), y - 4 - (i % 2), 2, 1, '#9a6040');
      return;
    }
    const pop = b.s === 'pop' ? Math.min(1, b.z || 1) : 1;
    shadow(x, y + 4, 22);
    const yy = y + (1 - pop) * 20;
    ellO(x, yy - 16, 20, 18, '#8d5a44');
    ell(x, yy - 10, 13, 10, '#e8c39e');
    // 눈 & 화난 눈썹
    rect(x - 8, yy - 24, 3, 3, '#1a1020'); rect(x + 6, yy - 24, 3, 3, '#1a1020');
    rect(x - 10, yy - 27, 5, 1, '#1a1020'); rect(x - 7, yy - 28, 2, 1, '#1a1020'); rect(x + 6, yy - 27, 5, 1, '#1a1020'); rect(x + 6, yy - 28, 2, 1, '#1a1020');
    ellO(x, yy - 17, 4, 3, '#ff7aa8'); rect(x - 1, yy - 18, 1, 1, '#fff');
    // 발톱
    for (const s of [-1, 1]) { ellO(x + s * 20, yy - 6, 6, 4, '#e8c39e'); for (let k = -1; k <= 1; k++) rect(x + s * 25, yy - 7 + k * 2, 3, 1, '#fff'); }
    // 왕관
    rect(x - 8, yy - 38, 16, 5, '#ffd24a'); rect(x - 8, yy - 41, 2, 3, '#ffd24a'); rect(x - 1, yy - 42, 2, 4, '#ffd24a'); rect(x + 6, yy - 41, 2, 3, '#ffd24a'); rect(x - 1, yy - 37, 2, 2, '#ff4d6d');
    if (b.ph > 1) { for (let i = 0; i < 2; i++) rect(x - 20 + i * 38 + Math.sin(t * 9) * 2, yy - 32 - ((t * 20) % 8), 2, 2, '#ffb070'); }
  };
  BOSS.whale = (x, y, b, t) => {
    const fy = y - 20 + Math.sin(t * 1.5) * 3;
    const f = Math.cos(b.a || 0) >= 0 ? 1 : -1;
    shadow(x, y + 4, 26);
    // 꼬리
    const tw = Math.sin(t * 3) * 4;
    rect(x - f * 30 - 3, fy - 12 + tw, 7, 5, '#1a1020'); rect(x - f * 36 - 3, fy - 16 + tw, 8, 4, '#2a2150'); rect(x - f * 36 - 3, fy - 5 + tw, 8, 4, '#2a2150');
    ellO(x, fy - 8, 30, 15, '#2a2150');
    ell(x + f * 4, fy - 1, 22, 6, '#4a3a80');
    for (let i = 0; i < 8; i++) { const sx2 = x - 22 + ((i * 37) % 44), sy2 = fy - 18 + ((i * 13) % 12); const on = Math.sin(t * 3 + i) > 0; rect(sx2, sy2, 1, 1, on ? '#ffffff' : '#d7a8ff'); }
    // 눈
    circO(x + f * 16, fy - 12, 3, b.ph > 1 ? '#ff7aa8' : '#fff3a0'); rect(x + f * 17, fy - 13, 1, 2, '#1a1020');
    // 지느러미
    ell(x - f * 2, fy + 5, 7, 3, '#3a2d6a');
    // 분수공 별
    if (Math.floor(t * 2) % 2) { rect(x - f * 6, fy - 26, 1, 3, '#d7a8ff'); rect(x - f * 8, fy - 25, 5, 1, '#d7a8ff'); }
  };

  BOSS.yeti = (x, y, b, t) => {
    const f = Math.cos(b.a || 0) >= 0 ? 1 : -1, br = Math.sin(t * 3);
    shadow(x, y + 4, 22);
    ellO(x - 9, y + 1, 5, 2, '#c8dcf0'); ellO(x + 9, y + 1, 5, 2, '#c8dcf0');
    ellO(x, y - 16, 20, 17 + br * 0.5, '#f0f8ff');
    for (let i = 0; i < 6; i++) circ(x - 15 + i * 6, y - 31 + (i % 2) * 2 + br * 0.5, 3, '#ffffff');
    ellO(x - f * 20, y - 12 + br, 5, 8, '#e0f0ff'); ellO(x + f * 20, y - 12 - br, 5, 8, '#e0f0ff');
    ell(x + f * 4, y - 20, 10, 7, '#8fb8d8');
    rect(x + f * 1, y - 23, 2, 2, '#1a1020'); rect(x + f * 8, y - 23, 2, 2, '#1a1020');
    if (b.s === 'breath') { rect(x + f * 3 - 2, y - 18, 6, 3, '#1a3050'); for (let i = 0; i < 3; i++) rect(x + f * (12 + i * 4), y - 17 + Math.sin(t * 20 + i) * 2, 2, 1, '#bfefff'); }
    else rect(x + f * 3 - 2, y - 17, 5, 1, '#3a5a7a');
    rect(x + f * 1 - 1, y - 18, 2, 1, '#ff9eb5'); rect(x + f * 9 - 1, y - 18, 2, 1, '#ff9eb5');
    rect(x - 14, y - 9, 28, 3, '#ff5c7a'); rect(x - f * 9, y - 9, 3, 8, '#ff5c7a');
    if (b.ph > 1) { rect(x - 6, y - 38, 2, 4, '#bfefff'); rect(x, y - 40, 2, 6, '#bfefff'); rect(x + 6, y - 38, 2, 4, '#bfefff'); }
    if (b.s === 'tired') for (let i = 0; i < 3; i++) { const aa = t * 5 + i * 2.1; rect(x + Math.cos(aa) * 10, y - 36 + Math.sin(aa) * 3, 1, 1, '#ffe36b'); }
  };
  BOSS.queenbee = (x, y, b, t) => {
    const f = Math.cos(b.a || 0) >= 0 ? 1 : -1, fy = y - 22 + Math.sin(t * 4) * 3, w = Math.sin(t * 40) > 0;
    shadow(x, y + 4, 16);
    ctx.globalAlpha = 0.6; ell(x - 9, fy - 13 - (w ? 3 : 0), 9, 6, '#ffffff'); ell(x + 9, fy - 13 - (w ? 3 : 0), 9, 6, '#ffffff'); ctx.globalAlpha = 1;
    ellO(x - f * 10, fy + 2, 11, 9, '#ffd24a');
    rect(x - f * 10 - 8, fy, 16, 2, '#3a2a20'); rect(x - f * 10 - 7, fy + 4, 14, 2, '#3a2a20');
    rect(x - f * 22 - (f > 0 ? 0 : -1), fy + 2, 3, 1, '#1a1020');
    circO(x + f * 2, fy - 4, 7, '#3a2a20');
    circO(x + f * 11, fy - 8, 7, '#ffd24a');
    rect(x + f * 13, fy - 10, 2, 3, b.ph > 1 ? '#ff4d6d' : '#1a1020'); rect(x + f * 8, fy - 10, 2, 3, b.ph > 1 ? '#ff4d6d' : '#1a1020');
    rect(x + f * 9, fy - 5, 2, 1, '#ff7aa8'); rect(x + f * 14, fy - 5, 2, 1, '#ff7aa8');
    const cx = x + f * 11;
    rect(cx - 4, fy - 17, 9, 3, '#ffd24a'); rect(cx - 4, fy - 19, 1, 2, '#ffd24a'); rect(cx, fy - 20, 1, 3, '#ff5c7a'); rect(cx + 4, fy - 19, 1, 2, '#ffd24a');
    line(cx - 3, fy - 14, cx - 6, fy - 20, '#3a2a20'); line(cx + 3, fy - 14, cx + 6, fy - 20, '#3a2a20');
    if (b.s === 'tired') for (let i = 0; i < 3; i++) { const aa = t * 5 + i * 2.1; rect(cx + Math.cos(aa) * 8, fy - 24 + Math.sin(aa) * 3, 1, 1, '#ffe36b'); }
  };

  // ───────────── 펫
  D.pet = function (pt, t) {
    const x = Math.round(sx(pt[3])), y = Math.round(sy(pt[4])), sp = pt[1], st = pt[2], f = pt[5] >= 0 ? 1 : -1;
    if (x < -20 || y < -30 || x > G.C.W + 20 || y > G.C.H + 20) return;
    const c = G.PETS[sp].col, bob = Math.round(Math.sin(t * 6 + pt[0] * 2));
    let top = y - 8;
    switch (sp) {
      case 'chick': shadow(x, y + 2, 3 + st); circO(x, y - 3 + bob, 3 + st, c[0]); rect(x + f * (3 + st), y - 4 + bob, 2, 1, c[1]); rect(x + f, y - 5 + bob, 1, 1, '#1a1020'); if (st >= 1) rect(x - 1, y - 7 - st + bob, 2, 2, '#ff5c5c'); top = y - 9 - st; break;
      case 'slime': shadow(x, y + 2, 4 + st); ellO(x, y - 2, 4 + st, 3 + st, c[0]); rect(x - 1, y - 3, 1, 1, '#1a1020'); rect(x + 2, y - 3, 1, 1, '#1a1020'); rect(x - 2 - st, y - 4 - st, 1, 1, '#ffffff'); top = y - 7 - st * 2; break;
      case 'firefly': { const fy = y - 10 + Math.round(Math.sin(t * 3 + pt[0]) * 3); circ(x, fy, 2 + st, c[1]); rect(x, fy, 1, 1, '#ffffff'); ctx.globalAlpha = 0.5; rect(x - 3 - st, fy - 2, 2, 1, '#ffffff'); rect(x + 2 + st, fy - 2, 2, 1, '#ffffff'); ctx.globalAlpha = 1; top = fy - 4 - st; break; }
      case 'batpet': { const fy = y - 9 + Math.round(Math.sin(t * 6) * 2), w = Math.sin(t * 20) > 0; rect(x - 5 - st, fy + (w ? -2 : 0), 4 + st, 2, c[0]); rect(x + 2, fy + (w ? -2 : 0), 4 + st, 2, c[0]); circO(x, fy, 2 + (st >> 1), c[0]); rect(x - 1, fy - 1, 1, 1, c[1]); rect(x + 1, fy - 1, 1, 1, c[1]); top = fy - 5; break; }
      case 'hammy': shadow(x, y + 2, 4 + st); ellO(x, y - 3, 4 + st * 0.5, 3 + st * 0.5, c[0]); ell(x + f, y - 2, 2, 1, c[1]); rect(x + f * 2, y - 4, 1, 1, '#1a1020'); rect(x - 2, y - 7 - st, 1, 1, c[0]); rect(x + 2, y - 7 - st, 1, 1, c[0]); top = y - 9 - st; break;
    }
    if (st >= 2) { rect(x - 1, top - 2, 3, 1, '#ffd24a'); rect(x - 1, top - 3, 1, 1, '#ffd24a'); rect(x + 1, top - 3, 1, 1, '#ffd24a'); }
    rect(x, top + 1 - 5, 1, 1, G.COLORS.p[pt[0]]);
  };

  // ───────────── 굴집 연못
  D.pond = function (x, y, t) {
    x = Math.round(sx(x)); y = Math.round(sy(y));
    ell(x, y + 1, 44, 17, '#5a3d30'); ell(x, y, 42, 15, '#23406e'); ell(x, y - 1, 38, 12, '#3a6aa8');
    for (let i = 0; i < 5; i++) { const k = (t * 0.3 + i / 5) % 1; rect(x - 30 + i * 13 + Math.sin(t + i) * 3, y - 6 + (i % 3) * 4, 4, 1, 'rgba(200,230,255,' + (0.6 * (1 - k)).toFixed(2) + ')'); }
    ell(x - 24, y + 4, 4, 2, '#5cb85c'); ell(x + 26, y - 4, 4, 2, '#5cb85c'); rect(x + 26, y - 6, 1, 1, '#ffb3c7');
    const fx2 = x + Math.cos(t * 0.7) * 20, fy2 = y + Math.sin(t * 1.1) * 5;
    ctx.globalAlpha = 0.45; ell(fx2, fy2, 3, 1, '#1a2a4a'); ctx.globalAlpha = 1;
  };

  // ───────────── 굴집 시설 스프라이트
  D.station = function (k, x, y, t, near) {
    x = Math.round(sx(x)); y = Math.round(sy(y));
    if (near) { ctx.globalAlpha = 0.35 + Math.sin(t * 5) * 0.15; circ(x, y - 4, 16, '#ffd36b'); ctx.globalAlpha = 1; }
    switch (k) {
      case 'forge':
        shadow(x, y + 3, 12); rect(x - 11, y - 14, 22, 17, '#1a1020'); rect(x - 10, y - 13, 20, 15, '#6b5b6a'); rect(x - 6, y - 8, 12, 7, '#2a1a1a');
        rect(x - 5, y - 5, 10, 4, Math.sin(t * 8) > 0 ? '#ff7a2e' : '#ffb35c'); rect(x + 12, y - 6, 8, 3, '#8d8aa8'); rect(x + 14, y - 9, 4, 3, '#8d8aa8'); break;
      case 'garden':
        shadow(x, y + 3, 13); rect(x - 13, y - 5, 26, 8, '#1a1020'); rect(x - 12, y - 4, 24, 6, '#6b4630');
        for (let i = 0; i < 4; i++) { const px = x - 9 + i * 6, s = Math.sin(t * 2 + i) * 0.5; rect(px, y - 9 + s, 1, 5, '#5cb85c'); rect(px - 2, y - 9 + s, 2, 2, '#7dff9a'); rect(px + 1, y - 10 + s, 2, 2, '#7dff9a'); if (i % 2) rect(px, y - 11, 1, 1, '#ff7aa8'); }
        break;
      case 'skills':
        shadow(x, y + 3, 10); rect(x - 10, y - 12, 20, 14, '#1a1020'); rect(x - 9, y - 11, 9, 12, '#3a2d6a'); rect(x + 1, y - 11, 8, 12, '#3a2d6a');
        for (let i = 0; i < 4; i++) rect(x - 7 + i * 4, y - 8 + (i % 2) * 4, 1, 1, Math.sin(t * 3 + i) > 0 ? '#fff3a0' : '#d7a8ff'); break;
      case 'codex':
        shadow(x, y + 3, 11); rect(x - 11, y - 22, 22, 25, '#1a1020'); rect(x - 10, y - 21, 20, 23, '#8a5a3c');
        for (let r = 0; r < 3; r++) { rect(x - 9, y - 20 + r * 7, 18, 1, '#5a3a20'); for (let i = 0; i < 5; i++) rect(x - 8 + i * 3.4, y - 19 + r * 7, 2, 6, ['#ff7aa8', '#6fb6ff', '#ffd36b', '#7dff9a', '#d7a8ff'][(i + r) % 5]); }
        break;
      case 'wardrobe':
        shadow(x, y + 3, 11); rect(x - 11, y - 24, 22, 27, '#1a1020'); rect(x - 10, y - 23, 20, 25, '#c9955a'); rect(x, y - 23, 1, 25, '#8a5a3c');
        rect(x - 3, y - 12, 1, 3, '#ffd36b'); rect(x + 2, y - 12, 1, 3, '#ffd36b'); rect(x - 8, y - 30, 7, 5, '#ff7aa8'); break;
      case 'mirror':
        shadow(x, y + 3, 8); rect(x - 8, y - 24, 16, 27, '#1a1020'); rect(x - 7, y - 23, 14, 25, '#ffd36b'); rect(x - 5, y - 21, 10, 21, '#bfe4ff');
        rect(x - 3, y - 19, 2, 6, '#ffffff'); break;
      case 'album':
        shadow(x, y + 3, 12);
        for (let i = 0; i < 3; i++) { const px = x - 12 + i * 9, py = y - 18 + (i % 2) * 4; rect(px, py, 8, 9, '#fff6ee'); rect(px + 1, py + 1, 6, 5, ['#ff7aa8', '#6fb6ff', '#ffd36b'][i]); }
        rect(x - 14, y - 22, 28, 1, '#8a5a3c'); break;
      case 'door':
        shadow(x, y + 4, 14); rect(x - 13, y - 30, 26, 34, '#1a1020'); rect(x - 12, y - 29, 24, 32, '#4a3b63');
        rect(x - 9, y - 26, 18, 29, '#120c1e');
        for (let i = 0; i < 6; i++) { const yy = y - 24 + ((t * 14 + i * 5) % 26); rect(x - 7 + (i * 5) % 14, yy, 1, 1, '#d7a8ff'); }
        rect(x - 3, y - 35, 7, 5, '#1a1020'); rect(x - 2, y - 34, 5, 3, '#ffd36b'); break;
      case 'gacha':
        shadow(x, y + 3, 10);
        rect(x - 9, y - 12, 18, 15, '#1a1020'); rect(x - 8, y - 11, 16, 13, '#ff5c7a'); rect(x - 8, y - 11, 16, 2, '#ff9eb5');
        rect(x - 3, y - 6, 6, 4, '#3a2030'); rect(x + 5, y - 7, 2, 4, '#ffd36b');
        circ(x, y - 19, 8, '#1a1020'); circ(x, y - 19, 7, '#cfe9ff');
        for (let i = 0; i < 5; i++) circ(x - 4 + (i % 3) * 4, y - 17 - Math.floor(i / 3) * 4, 2, ['#ffd36b', '#7dff9a', '#6fb6ff', '#ff7aa8', '#d7a8ff'][i]);
        rect(x - 4, y - 24, 2, 2, '#ffffff');
        break;
      case 'nest':
        shadow(x, y + 3, 12);
        ell(x, y - 2, 12, 5, '#8a6a2a'); ell(x, y - 3, 10, 3, '#c9a14a');
        for (let i = 0; i < 6; i++) rect(x - 11 + i * 4, y - 4 + (i % 2), 3, 1, '#e0c070');
        { const m = G.App.meta || {}, n = Math.min(3, (m.eggs || []).length); for (let i = 0; i < n; i++) { const wob = Math.sin(t * 8 + i) > 0.9 ? 1 : 0; ellO(x - 4 + i * 4 + wob, y - 6, 2, 3, '#fff6e8'); } }
        break;
      case 'pond':
        shadow(x, y + 3, 6);
        rect(x - 1, y - 16, 1, 18, '#8a5a3c'); line(x, y - 16, x + 9, y - 22, '#8a5a3c');
        line(x + 9, y - 22, x + 11, y - 4 + Math.sin(t * 3), 'rgba(255,255,255,0.6)');
        rect(x + 10, y - 4 + Math.round(Math.sin(t * 3)), 3, 2, '#ff5c7a');
        rect(x - 6, y - 2, 6, 4, '#6b4a30'); rect(x - 5, y - 3, 4, 1, '#8fd8ff');
        break;
      case 'duel':
        shadow(x, y + 3, 11);
        rect(x - 1, y - 14, 2, 17, '#6b4a30');
        rect(x - 12, y - 22, 24, 11, '#1a1020'); rect(x - 11, y - 21, 22, 9, '#c9955a');
        line(x - 7, y - 19, x - 1, y - 14, '#c8d0dc', 1); line(x + 7, y - 19, x + 1, y - 14, '#c8d0dc', 1);
        rect(x - 8, y - 20, 3, 1, '#c8d0dc'); rect(x + 6, y - 20, 3, 1, '#c8d0dc');
        rect(x - 1, y - 20, 2, 2, Math.floor(t * 3) % 2 ? '#ff7aa8' : '#6fb6ff');
        break;
      case 'deco':
        shadow(x, y + 3, 10); rect(x - 10, y - 14, 20, 17, '#1a1020'); rect(x - 9, y - 13, 18, 15, '#ffb3c7'); rect(x - 7, y - 11, 14, 4, '#fff'); rect(x - 5, y - 5, 10, 5, '#ff7aa8'); break;
    }
  };

  // 굴집 가구
  D.furniture = function (id, x, y, t) {
    x = Math.round(sx(x)); y = Math.round(sy(y));
    switch (id) {
      case 'rug': ctx.globalAlpha = 0.9; ell(x, y, 36, 14, '#c0506e'); ell(x, y, 31, 11, '#ff9eb5'); ell(x, y, 20, 7, '#ffd0e0'); ctx.globalAlpha = 1; break;
      case 'plant': shadow(x, y + 2, 6); rect(x - 5, y - 6, 10, 8, '#1a1020'); rect(x - 4, y - 5, 8, 6, '#c9704a'); for (let i = 0; i < 5; i++) ellO(x - 6 + i * 3, y - 12 - (i % 2) * 4 + Math.sin(t * 2 + i) * 0.6, 3, 2, '#5cb85c'); break;
      case 'bed': shadow(x, y + 3, 16); rect(x - 16, y - 30, 32, 33, '#1a1020'); rect(x - 15, y - 29, 30, 13, '#8a5a3c'); rect(x - 15, y - 14, 30, 16, '#8a5a3c');
        rect(x - 13, y - 27, 26, 7, '#6fb6ff'); rect(x - 13, y - 27, 7, 4, '#ffffff'); rect(x - 13, y - 12, 26, 7, '#ff7aa8'); rect(x - 13, y - 12, 7, 4, '#ffffff'); break;
      case 'fire': shadow(x, y + 3, 14); rect(x - 14, y - 22, 28, 25, '#1a1020'); rect(x - 13, y - 21, 26, 23, '#8d7b8a'); rect(x - 15, y - 23, 30, 3, '#6b5b6a'); rect(x - 8, y - 12, 16, 13, '#2a1a1a');
        for (let i = 0; i < 3; i++) { const fh = 5 + Math.sin(t * 12 + i * 2) * 2; rect(x - 5 + i * 4, y - fh, 3, fh, '#ff7a2e'); rect(x - 4 + i * 4, y - fh + 2, 1, fh - 2, '#ffe0a0'); } break;
      case 'shelf': shadow(x, y + 3, 10); rect(x - 10, y - 26, 20, 29, '#1a1020'); rect(x - 9, y - 25, 18, 27, '#8a5a3c');
        for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) rect(x - 8 + i * 4, y - 24 + r * 9, 3, 7, ['#6fb6ff', '#ffd36b', '#ff7aa8', '#7dff9a'][(i + r) % 4]); break;
      case 'fish': shadow(x, y + 3, 9); rect(x - 9, y - 14, 18, 17, '#1a1020'); rect(x - 8, y - 13, 16, 12, '#8fd8ff'); rect(x - 8, y - 1, 16, 3, '#8a5a3c');
        { const fx = x - 4 + Math.sin(t) * 3; rect(fx, y - 8, 4, 2, '#ff8a4c'); rect(fx + (Math.cos(t) > 0 ? -1 : 4), y - 8, 1, 2, '#ff8a4c'); } rect(x + 3, y - 11 + ((t * 8) % 6), 1, 1, '#fff'); break;
      case 'table': shadow(x, y + 3, 16); rect(x - 16, y - 12, 32, 6, '#1a1020'); rect(x - 15, y - 11, 30, 4, '#c9955a'); rect(x - 13, y - 7, 2, 9, '#8a5a3c'); rect(x + 11, y - 7, 2, 9, '#8a5a3c');
        circ(x - 6, y - 14, 3, '#fff'); circ(x + 6, y - 14, 3, '#fff'); rect(x - 7, y - 15, 2, 1, '#ff7aa8'); rect(x + 5, y - 15, 2, 1, '#ffd36b'); rect(x, y - 18, 1, 5, '#fff3a0'); break;
      case 'window': rect(x - 14, y - 20, 28, 20, '#1a1020'); rect(x - 13, y - 19, 26, 18, '#1a1640');
        for (let i = 0; i < 6; i++) rect(x - 11 + (i * 7) % 22, y - 17 + (i * 5) % 14, 1, 1, Math.sin(t * 2 + i) > 0 ? '#fff' : '#d7a8ff');
        circ(x + 7, y - 14, 3, '#fff3c0'); rect(x, y - 19, 1, 18, '#8a5a3c'); rect(x - 13, y - 10, 26, 1, '#8a5a3c'); break;
      case 'piano': shadow(x, y + 3, 12); rect(x - 12, y - 14, 24, 17, '#1a1020'); rect(x - 11, y - 13, 22, 15, '#ff7aa8'); rect(x - 10, y - 6, 20, 4, '#fff');
        for (let i = 0; i < 5; i++) rect(x - 8 + i * 4, y - 6, 1, 2, '#1a1020'); break;
      case 'arcade': shadow(x, y + 3, 9); rect(x - 8, y - 24, 16, 27, '#1a1020'); rect(x - 7, y - 23, 14, 25, '#6f5cff'); rect(x - 5, y - 20, 10, 8, '#0a0a1a');
        rect(x - 4 + (Math.floor(t * 4) % 6), y - 16, 2, 2, '#7dff9a'); rect(x - 3, y - 19, 1, 1, '#ff5c7a'); rect(x - 5, y - 9, 10, 3, '#3a2a5a'); rect(x - 3, y - 11, 1, 2, '#ff5c7a'); circ(x + 3, y - 8, 1, '#ffd36b'); break;
      case 'teddy': shadow(x, y + 3, 9); circO(x, y - 6, 7, '#b8804a'); circO(x, y - 16, 5, '#b8804a'); circO(x - 4, y - 21, 2, '#b8804a'); circO(x + 4, y - 21, 2, '#b8804a');
        ell(x, y - 14, 2, 1, '#e8c39e'); rect(x - 2, y - 17, 1, 1, '#1a1020'); rect(x + 2, y - 17, 1, 1, '#1a1020'); rect(x - 3, y - 11, 7, 2, '#ff5c7a'); ell(x, y - 5, 4, 3, '#e8c39e'); break;
      case 'mushlamp': shadow(x, y + 3, 6); rect(x - 1, y - 12, 3, 15, '#fff0e0'); ellO(x, y - 14, 8, 5, '#ff6b8a'); rect(x - 4, y - 16, 2, 2, '#ffffff'); rect(x + 3, y - 15, 1, 1, '#ffffff');
        ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.08; circ(x, y - 10, 12, '#ffb3c7'); ctx.globalAlpha = 1; break;
      case 'mobile': rect(x, y, 1, 6, '#8a6a4a'); rect(x - 14, y + 6, 29, 1, '#8a6a4a');
        for (let i = 0; i < 3; i++) { const mx = x - 13 + i * 13, my = y + 12 + Math.sin(t * 2 + i) * 2; rect(mx, y + 7, 1, my - y - 8, '#8a6a4a'); if (i === 1) { circ(mx, my, 3, '#fff3c0'); rect(mx + 1, my - 2, 2, 2, '#1a1640'); } else { rect(mx - 2, my, 5, 1, '#ffd36b'); rect(mx, my - 2, 1, 5, '#ffd36b'); } }
        break;
      case 'lights': for (let i = 0; i < 12; i++) { const lx = x - 88 + i * 16, ly = y + Math.sin(i * 0.9) * 3; rect(lx, ly - 1, 16, 1, '#3a2a30'); circ(lx, ly + 2, 1, ['#ffd36b', '#ff7aa8', '#8fd8ff', '#7dff9a'][i % 4]); } break;
    }
  };

  return D;
})();
