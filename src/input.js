// 입력: 키보드 / 게임패드 / 터치 → 컨트롤러 패킷
// 패킷: { x, y, b(누름 비트: 1 공격 2 스킬 4 합동), n:[a,s,c,p,u,d,l,r] 누른 횟수 카운터 }
G.In = (function () {
  const I = {};
  const keys = new Set();
  I.mode = 'local'; // 'local' (한 키보드 2인) | 'single' (온라인: 나 혼자)
  I.enabled = false;

  const BIND = {
    p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyC', 'Space'], s: ['KeyV'], c: ['KeyB'], p: ['Escape', 'KeyP'], e: ['KeyE', 'KeyQ'] },
    p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['Period', 'Enter', 'Numpad1', 'NumpadEnter'], s: ['Slash', 'Numpad2'], c: ['Comma', 'Numpad3'], p: [], e: ['Quote', 'Semicolon', 'Numpad0'] },
    one: { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
      a: ['KeyC', 'Space', 'KeyJ', 'Period', 'Enter', 'KeyZ'], s: ['KeyV', 'KeyK', 'Slash', 'KeyX'], c: ['KeyB', 'KeyL', 'Comma'], p: ['Escape', 'KeyP'], e: ['KeyE', 'KeyQ', 'Semicolon', 'Quote'] },
  };
  const NAMES = ['a', 's', 'c', 'p', 'up', 'down', 'left', 'right', 'e'];
  function mk() { return { n: [0, 0, 0, 0, 0, 0, 0, 0, 0], padPrev: {}, padRep: 0, tx: 0, ty: 0, tb: 0 }; }
  const ctl = [mk(), mk()];

  function bindsFor(i) { return I.mode === 'local' ? (i === 0 ? BIND.p1 : BIND.p2) : BIND.one; }

  window.addEventListener('keydown', e => {
    if (!I.enabled) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Tab', 'Quote'].includes(e.code)) e.preventDefault();
    G.A.unlock();
    keys.add(e.code);
    const count = I.mode === 'local' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const b = bindsFor(i);
      NAMES.forEach((nm, k) => {
        if (b[nm].includes(e.code)) {
          if (e.repeat && (k < 4 || k === 8)) return; // 행동키는 반복 무시, 방향키 반복은 메뉴용 허용
          ctl[i].n[k]++;
        }
      });
    }
    if (e.code === 'KeyM' || e.code === 'Tab') I.onMinimap && I.onMinimap();
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  const any = arr => arr.some(k => keys.has(k));

  // 게임패드
  function padFor(i) {
    const pads = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(p => p && p.connected);
    if (!pads.length) return null;
    if (I.mode === 'single') return pads[0];
    if (pads.length === 1) return i === 1 ? pads[0] : null;
    return pads[i] || null;
  }
  function pollPad(i, c) {
    const p = padFor(i); if (!p) return { x: 0, y: 0, b: 0 };
    let x = p.axes[0] || 0, y = p.axes[1] || 0;
    if (Math.hypot(x, y) < 0.22) { x = 0; y = 0; }
    const bt = k => p.buttons[k] && p.buttons[k].pressed;
    if (bt(14)) x = -1; if (bt(15)) x = 1; if (bt(12)) y = -1; if (bt(13)) y = 1;
    const st = { a: bt(0) || bt(7), s: bt(1) || bt(2) || bt(6), c: bt(3) || bt(4) || bt(5), p: bt(9) || bt(8), e: bt(10) || bt(11) };
    ['a', 's', 'c', 'p', 'e'].forEach((k, idx) => { if (st[k] && !c.padPrev[k]) c.n[k === 'e' ? 8 : idx]++; c.padPrev[k] = st[k]; });
    // 메뉴 방향 (스틱 에지 + 반복)
    const dir = Math.abs(x) > 0.6 || Math.abs(y) > 0.6 ? (Math.abs(x) > Math.abs(y) ? (x > 0 ? 7 : 6) : (y > 0 ? 5 : 4)) : -1;
    const now = performance.now();
    if (dir >= 0 && (dir !== c.padDir || now > c.padRep)) { c.n[dir]++; c.padRep = now + (dir !== c.padDir ? 380 : 140); }
    c.padDir = dir;
    return { x, y, b: (st.a ? 1 : 0) | (st.s ? 2 : 0) | (st.c ? 4 : 0) };
  }

  // 로컬 컨트롤러 i 의 현재 패킷
  I.packet = function (i) {
    const c = ctl[i], b = bindsFor(i);
    let x = (any(b.right) ? 1 : 0) - (any(b.left) ? 1 : 0);
    let y = (any(b.down) ? 1 : 0) - (any(b.up) ? 1 : 0);
    let bits = (any(b.a) ? 1 : 0) | (any(b.s) ? 2 : 0) | (any(b.c) ? 4 : 0);
    const pad = pollPad(i, c);
    if (pad.x || pad.y) { x = pad.x; y = pad.y; }
    bits |= pad.b;
    if (i === 0 && (c.tx || c.ty)) { x = c.tx; y = c.ty; }
    if (i === 0) bits |= c.tb;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, b: bits, n: c.n.slice() };
  };

  // 호스트: 패킷 → 틱 입력 (눌림 에지 계산)
  const prevN = [null, null];
  I.frame = function (slot, pk) {
    const pn = prevN[slot] || pk.n;
    const d = k => Math.max(0, ((pk.n[k] || 0) - (pn[k] || 0)) | 0);
    const f = { x: pk.x, y: pk.y, a: !!(pk.b & 1), s: !!(pk.b & 2), c: !!(pk.b & 4),
      pa: d(0), ps: d(1), pc: d(2), pp: d(3), pu: d(4), pd: d(5), pl: d(6), pr: d(7), pe: d(8) };
    prevN[slot] = pk.n.slice();
    return f;
  };
  I.resetPrev = function (slot) { prevN[slot] = null; };
  I.EMPTY = { x: 0, y: 0, b: 0, n: [0, 0, 0, 0, 0, 0, 0, 0, 0] };

  // 터치
  I.initTouch = function () {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const el = document.getElementById('touch');
    if (!isTouch) return;
    I.touch = true;
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let sid = null, cx = 0, cy = 0;
    const c = ctl[0];
    stick.addEventListener('touchstart', e => {
      G.A.unlock();
      const t = e.changedTouches[0]; sid = t.identifier;
      const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(t); e.preventDefault();
    }, { passive: false });
    const move = t => {
      let dx = t.clientX - cx, dy = t.clientY - cy; const l = Math.hypot(dx, dy), m = 50;
      if (l > m) { dx = dx / l * m; dy = dy / l * m; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / m, ny = dy / m;
      // 메뉴용 방향 에지
      const dir = Math.hypot(nx, ny) > 0.6 ? (Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 7 : 6) : (ny > 0 ? 5 : 4)) : -1;
      if (dir >= 0 && dir !== c.tDir) c.n[dir]++;
      c.tDir = dir;
      c.tx = Math.hypot(nx, ny) < 0.2 ? 0 : nx; c.ty = Math.hypot(nx, ny) < 0.2 ? 0 : ny;
    };
    window.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === sid) { move(t); e.preventDefault(); } }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; c.tx = c.ty = 0; c.tDir = -1; knob.style.transform = ''; } };
    window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
    const idx = { a: 0, s: 1, c: 2, p: 3, e: 8 }, bit = { a: 1, s: 2, c: 4, p: 0, e: 0 };
    document.querySelectorAll('#tbtns .tb').forEach(btn => {
      const k = btn.dataset.b;
      btn.addEventListener('touchstart', e => { G.A.unlock(); c.n[idx[k]]++; c.tb |= bit[k]; btn.classList.add('on'); e.preventDefault(); }, { passive: false });
      const up = e => { c.tb &= ~bit[k]; btn.classList.remove('on'); };
      btn.addEventListener('touchend', up); btn.addEventListener('touchcancel', up);
    });
    I.showTouch = on => el.classList.toggle('hidden', !on);
  };
  I.showTouch = () => {};
  return I;
})();
