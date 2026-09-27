// 몬스터 AI
G.AI = (function () {
  const AI = {};
  const U = G.U, C = G.C, S = C.TILE;
  const fx = (...a) => G.fx(...a);
  const Cb = () => G.Cb;

  // 플레이어별 흐름장 (BFS 거리)
  AI.flow = function (run) {
    const m = run.map;
    run.flows = run.players.map(p => {
      if (!Cb().active(p)) return null;
      const dist = new Int16Array(m.w * m.h).fill(-1);
      const sx = Math.floor(p.x / S), sy = Math.floor(p.y / S);
      if (sx < 0 || sy < 0 || sx >= m.w || sy >= m.h) return null;
      const q = [sx + sy * m.w]; dist[q[0]] = 0; let h = 0;
      while (h < q.length) {
        const c = q[h++]; const x = c % m.w, y = (c / m.w) | 0;
        if (dist[c] > 40) continue;
        for (let k = 0; k < 4; k++) {
          const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
          const n = ny * m.w + nx;
          if (dist[n] < 0 && !G.isSolidTile(m.tiles[n])) { dist[n] = dist[c] + 1; q.push(n); }
        }
      }
      return dist;
    });
  };

  function target(run, e) {
    let best = null, bd = 1e9;
    for (const p of run.players) {
      if (!Cb().active(p)) continue;
      let d = U.dist(e.x, e.y, p.x, p.y);
      if (e.tg === p.slot) d *= 0.8; // 끈적한 타겟
      if (d < bd) { bd = d; best = p; }
    }
    if (best) e.tg = best.slot;
    return best;
  }
  AI.target = target;

  // 목표를 향해 (벽 뒤면 흐름장)
  function seek(run, e, p, spd, dt, away) {
    let tx = p.x, ty = p.y;
    const m = run.map;
    if (!away && !G.World.los(m, e.x, e.y, p.x, p.y) && run.flows && run.flows[p.slot]) {
      const f = run.flows[p.slot];
      const cx = Math.floor(e.x / S), cy = Math.floor(e.y / S);
      let best = f[cy * m.w + cx], bx = cx, by = cy;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue;
        const nx = cx + i, ny = cy + j; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const v = f[ny * m.w + nx];
        if (v >= 0 && (best < 0 || v < best)) {
          if (i && j && (G.isSolidTile(G.World.get(m, cx + i, cy)) || G.isSolidTile(G.World.get(m, cx, cy + j)))) continue;
          best = v; bx = nx; by = ny;
        }
      }
      tx = bx * S + 8; ty = by * S + 8;
    }
    let a = U.ang(e.x, e.y, tx, ty);
    if (away) a += Math.PI;
    steer(e, Math.cos(a) * spd, Math.sin(a) * spd, 0.12);
  }
  function steer(e, vx, vy, k) { e.vx = U.lerp(e.vx, vx, k); e.vy = U.lerp(e.vy, vy, k); }

  function speed(e) { return e.spd * (e.slowT > 0 ? 0.5 : 1) * (e.fear ? 0.8 : 1); }
  function trail(run, e, dt) {
    if (!e.def.trail) return;
    e.trailT = (e.trailT || 0) - dt;
    if (e.trailT <= 0 && Math.hypot(e.vx, e.vy) > 8) { e.trailT = e.def.trail === 'fire' ? 0.5 : 0.7; G.Run.hazard(run, e.def.trail, e.x, e.y + 2, e.def.trail === 'fire' ? 7 : 9, e.def.trail === 'fire' ? 2.2 : 4); }
  }

  AI.update = function (run, e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.frozen > 0) e.frozen -= dt;
    if (e.stun > 0) e.stun -= dt;
    if (e.popT > 0) { e.popT -= dt; }
    if (e.burn > 0) {
      e.burn -= dt; e.burnT = (e.burnT || 0) - dt;
      if (e.burnT <= 0) { e.burnT = 0.5; Cb().hitEnemy(run, e, (3 + run.floor * 0.5) * (run.synergy.includes('fire') ? 1.5 : 1), { kind: 'dot', x: e.x, y: e.y }); if (e.dead) return; fx('burst', e.x, e.y - 8, 2, '#ff8a4c', 20, 0.4); }
    }
    // 넉백
    if (e.kvx || e.kvy) {
      G.World.moveSafe(run.map, e, e.kvx * dt, e.kvy * dt, e.r * 0.8);
      e.kvx *= 1 - 10 * dt; e.kvy *= 1 - 10 * dt;
      if (Math.abs(e.kvx) < 3) e.kvx = 0; if (Math.abs(e.kvy) < 3) e.kvy = 0;
    }
    const p = target(run, e);
    if (e.stun > 0 || e.frozen > 0 || !p) { e.vx *= 0.8; e.vy *= 0.8; return; }
    const fn = AI[e.def.ai] || AI.chase;
    fn(run, e, p, dt);
    G.World.move(run.map, e, e.vx * dt, e.vy * dt, e.r * 0.8);
    if (Math.abs(e.vx) > 3) e.f = e.vx > 0 ? 1 : -1;
    trail(run, e, dt);
    // 접촉 피해
    if (!e.under && !e.harmless) for (const q of run.players) {
      if (!Cb().active(q)) continue;
      if (U.dist2(e.x, e.y, q.x, q.y) < (e.r + q.r - 1) * (e.r + q.r - 1)) Cb().hurt(run, q, e.dmg, { x: e.x, y: e.y });
    }
    // 그림자는 빛 속에 있을 때 표시
    if (e.def.shadow) e.lit = G.Run.inLight(run, e.x, e.y);
  };

  AI.chase = function (run, e, p, dt) {
    const d = U.dist(e.x, e.y, p.x, p.y);
    seek(run, e, p, speed(e) * (d > 150 ? 1.2 : 1), dt);
    if (e.def.shadow) { // 빛에서는 느리게
      if (G.Run.inLight(run, e.x, e.y)) { e.vx *= 0.93; e.vy *= 0.93; }
    }
  };

  AI.bat = function (run, e, p, dt) {
    const lit = G.Run.inLight(run, e.x, e.y) && run.players.some(q => G.Cb.lightPower(q) && G.Cb.active(q) && U.dist(q.x, q.y, e.x, e.y) < q.lightR);
    const wob = Math.sin(e.t * 5 + e.id) * 30;
    if (lit && e.t - (e.diveT || -9) > 0.6) {
      // 빛을 피해 도망
      const src = run.players.filter(q => G.Cb.lightPower(q)).sort((a, b) => U.dist(a.x, a.y, e.x, e.y) - U.dist(b.x, b.y, e.x, e.y))[0];
      const a = U.ang(src.x, src.y, e.x, e.y) + Math.sin(e.t * 3) * 0.6;
      steer(e, Math.cos(a) * speed(e), Math.sin(a) * speed(e), 0.1);
      e.anim = 0;
    } else {
      const a = U.ang(e.x, e.y, p.x, p.y);
      const perp = a + Math.PI / 2;
      const sp = speed(e) * 1.2;
      steer(e, Math.cos(a) * sp + Math.cos(perp) * wob, Math.sin(a) * sp + Math.sin(perp) * wob, 0.08);
      if (U.dist(e.x, e.y, p.x, p.y) < 50) e.diveT = e.t;
    }
  };

  AI.burrow = function (run, e, p, dt) {
    e.stT -= dt;
    const d = U.dist(e.x, e.y, p.x, p.y);
    if (e.st === 'under') {
      e.under = true; e.anim = 1;
      seek(run, e, p, speed(e) * 1.3, dt);
      if (d < 36 || e.stT < -6) { e.st = 'emerge'; e.stT = 0.55; e.vx = e.vy = 0; run.tels.push({ s: 'c', x: e.x, y: e.y, a: 14, t: 0, T: 0.55, own: e.id }); fx('snd', 'burrow'); }
    } else if (e.st === 'emerge') {
      e.under = true; e.anim = 1; e.vx = e.vy = 0;
      if (e.stT <= 0) {
        e.st = 'up'; e.stT = 2.6; e.under = false; e.anim = 0;
        fx('burst', e.x, e.y, 10, '#8d7055', 60, 0.5); fx('shake', 1.5);
        for (const q of run.players) if (G.Cb.active(q) && U.dist(q.x, q.y, e.x, e.y) < 16) G.Cb.hurt(run, q, e.dmg, { x: e.x, y: e.y });
        const a = U.ang(e.x, e.y, p.x, p.y); e.vx = Math.cos(a) * 140; e.vy = Math.sin(a) * 140;
      }
    } else {
      e.under = false; e.anim = 0;
      if (e.stT > 2.2) { e.vx *= 0.92; e.vy *= 0.92; }
      else seek(run, e, p, speed(e) * 0.6, dt);
      if (e.stT <= 0) { e.st = 'under'; e.stT = 0; fx('burst', e.x, e.y, 6, '#8d7055', 40, 0.4); }
    }
  };

  AI.charger = function (run, e, p, dt) {
    e.stT -= dt;
    const d = U.dist(e.x, e.y, p.x, p.y);
    if (e.st === 'wind') {
      e.vx *= 0.8; e.vy *= 0.8;
      if (e.stT <= 0) { e.st = 'charge'; e.stT = 0.5; e.vx = Math.cos(e.fa) * 185; e.vy = Math.sin(e.fa) * 185; fx('snd', 'dash'); }
      return;
    }
    if (e.st === 'charge') {
      e.vx = Math.cos(e.fa) * 185; e.vy = Math.sin(e.fa) * 185;
      if (e.stT <= 0) { e.st = 'rest'; e.stT = 0.9; }
      return;
    }
    if (e.st === 'rest') { e.vx *= 0.85; e.vy *= 0.85; if (e.stT <= 0) e.st = 'walk'; return; }
    // 걷기: 정면을 천천히 플레이어 쪽으로 돌림
    const want = U.ang(e.x, e.y, p.x, p.y);
    e.fa += U.clamp(U.angDiff(e.fa, want), -2.2 * dt, 2.2 * dt);
    e.f = Math.cos(e.fa) >= 0 ? 1 : -1;
    seek(run, e, p, speed(e), dt);
    if (d < 80 && e.stT <= 0 && G.World.los(run.map, e.x, e.y, p.x, p.y)) {
      e.st = 'wind'; e.stT = 0.6; e.fa = want;
      run.tels.push({ s: 'l', x: e.x, y: e.y, a: 95, b: 12, ang: e.fa, t: 0, T: 0.6, own: e.id, follow: true });
    }
  };

  AI.ranged = function (run, e, p, dt) {
    e.stT -= dt;
    const d = U.dist(e.x, e.y, p.x, p.y);
    if (e.st === 'aim') {
      e.vx *= 0.85; e.vy *= 0.85; e.anim = 2;
      if (e.stT <= 0) {
        const a = U.ang(e.x, e.y, p.x, p.y), sp = 105 + run.floor * 3;
        G.Cb.proj(run, { k: e.def.shot === 'star' ? 'estar' : 'shard', owner: -1, x: e.x, y: e.y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: e.dmg, life: 2.4, r: 3 });
        fx('snd', 'shoot'); e.st = 'move'; e.stT = 2 + Math.random(); e.anim = 0;
      }
      return;
    }
    const wantD = 95;
    if (d < wantD - 25) seek(run, e, p, speed(e), dt, true);
    else if (d > wantD + 25) seek(run, e, p, speed(e), dt);
    else { const a = U.ang(e.x, e.y, p.x, p.y) + Math.PI / 2 * (e.id % 2 ? 1 : -1); steer(e, Math.cos(a) * speed(e) * 0.6, Math.sin(a) * speed(e) * 0.6, 0.08); }
    if (e.stT <= 0 && d < 170 && G.World.los(run.map, e.x, e.y, p.x, p.y)) { e.st = 'aim'; e.stT = 0.45; }
  };

  AI.slam = function (run, e, p, dt) {
    e.stT -= dt;
    const d = U.dist(e.x, e.y, p.x, p.y);
    if (e.st === 'wind') {
      e.vx = 0; e.vy = 0; e.anim = 1;
      if (e.stT <= 0) {
        e.st = 'rest'; e.stT = 1.2; e.anim = 2;
        fx('snd', 'slam'); fx('shake', 4); fx('ring', e.x, e.y, 4, 36, '#c8b8a0', 0.35); fx('burst', e.x, e.y, 14, '#8d7b6a', 70, 0.5);
        for (const q of run.players) if (G.Cb.active(q) && U.dist(q.x, q.y, e.x, e.y) < 36) G.Cb.hurt(run, q, e.dmg, { x: e.x, y: e.y });
      }
      return;
    }
    if (e.st === 'rest') { e.vx *= 0.8; e.vy *= 0.8; if (e.stT <= 0) { e.st = 'walk'; e.anim = 0; } return; }
    seek(run, e, p, speed(e), dt);
    if (d < 34) { e.st = 'wind'; e.stT = 0.85; run.tels.push({ s: 'c', x: e.x, y: e.y, a: 36, t: 0, T: 0.85, own: e.id }); }
  };

  AI.hop = function (run, e, p, dt) {
    e.stT -= dt;
    if (e.st === 'hop') {
      e.anim = 1;
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 0.6 + Math.random() * 0.5; e.anim = 0; fx('burst', e.x, e.y + 2, 3, e.def.col[0], 30, 0.3); }
      return;
    }
    e.vx *= 0.8; e.vy *= 0.8;
    if (e.stT <= 0) {
      e.st = 'hop'; e.stT = 0.38;
      const a = U.ang(e.x, e.y, p.x, p.y) + (Math.random() - 0.5) * 0.5, sp = speed(e) * 3.2;
      e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
    }
  };

  AI.blink = function (run, e, p, dt) {
    e.stT -= dt;
    if (e.st === 'fade') {
      e.anim = 1; e.vx = e.vy = 0;
      if (e.stT <= 0) {
        // 순간이동
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 35;
          const nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r;
          if (!G.World.solidAt(run.map, nx, ny)) { fx('burst', e.x, e.y - 8, 6, '#f3c6ff', 40, 0.4); e.x = nx; e.y = ny; break; }
        }
        e.st = 'cast'; e.stT = 0.45; e.anim = 0;
        fx('burst', e.x, e.y - 8, 6, '#fff6a8', 40, 0.4);
      }
      return;
    }
    if (e.st === 'cast') {
      e.vx = e.vy = 0;
      if (e.stT <= 0) {
        const a0 = U.ang(e.x, e.y, p.x, p.y);
        for (let i = -1; i <= 1; i++) { const a = a0 + i * 0.35; G.Cb.proj(run, { k: 'estar', owner: -1, x: e.x, y: e.y - 8, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, dmg: e.dmg, life: 2.2, r: 3 }); }
        fx('snd', 'shoot'); e.st = 'drift'; e.stT = 2.4 + Math.random();
      }
      return;
    }
    const a = e.t * 1.3 + e.id;
    steer(e, Math.cos(a) * speed(e) * 0.5, Math.sin(a) * speed(e) * 0.5, 0.05);
    if (e.stT <= 0) { e.st = 'fade'; e.stT = 0.4; }
  };

  AI.pulse = function (run, e, p, dt) {
    e.stT -= dt;
    if (e.st === 'charge') {
      e.vx *= 0.9; e.vy *= 0.9; e.anim = 1;
      if (e.stT <= 0) {
        e.st = 'drift'; e.stT = 3.5 + Math.random(); e.anim = 0;
        fx('ring', e.x, e.y - 8, 6, 46, '#ffd6f5', 0.4); fx('snd', 'wave');
        for (const q of run.players) if (G.Cb.active(q) && U.dist(q.x, q.y, e.x, e.y) < 46) G.Cb.hurt(run, q, e.dmg, { x: e.x, y: e.y });
      }
      return;
    }
    seek(run, e, p, speed(e), dt);
    if (e.stT <= 0 && U.dist(e.x, e.y, p.x, p.y) < 90) { e.st = 'charge'; e.stT = 0.85; run.tels.push({ s: 'c', x: e.x, y: e.y, a: 46, t: 0, T: 0.85, own: e.id, follow: true }); }
  };

  return AI;
})();
