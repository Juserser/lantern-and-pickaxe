// 보스 패턴
G.Boss = (function () {
  const B = {};
  const U = G.U, C = G.C, TAU = Math.PI * 2;
  const fx = (...a) => G.fx(...a);
  const Cb = () => G.Cb;

  B.spawn = function (run, k, x, y) {
    const d = G.BOSSES[k];
    const hp = Math.round(d.hp * (1 + run.star * C.STAR_HP) * (run.floor > 12 ? 1 + (run.floor - 12) * 0.25 : 1));
    run.boss = { id: U.id(), boss: true, k, x, y, r: d.r, hp, maxHp: hp, ph: 1, s: 'dormant', stT: 0, a: Math.PI, fa: Math.PI, fl: 0, flash: 0, z: 0,
      hidden: false, vuln: 1, front: k === 'crab', t: 0, vx: 0, vy: 0, kvx: 0, kvy: 0, burn: 0, slowT: 0, frozen: 0, stun: 0, seq: 0, hitsAtStart: 0, def: null, spd: 34 };
    run.bossHits = 0;
  };

  function tgt(run, b) { return G.AI.target(run, b); }
  function tel(run, o) { run.tels.push(Object.assign({ t: 0 }, o)); }
  function next(b, s, t) { b.s = s; b.stT = t; b.sub = 0; b.subT = 0; }
  function faceTo(b, p, rate, dt) {
    const want = U.ang(b.x, b.y, p.x, p.y);
    b.fa += U.clamp(U.angDiff(b.fa, want), -rate * dt, rate * dt);
    b.a = b.fa;
  }
  function chase(run, b, p, spd, dt) {
    const a = U.ang(b.x, b.y, p.x, p.y);
    b.vx = U.lerp(b.vx, Math.cos(a) * spd, 0.08); b.vy = U.lerp(b.vy, Math.sin(a) * spd, 0.08);
  }
  function hurtArea(run, x, y, r, dmg) { for (const q of run.players) if (Cb().active(q) && U.dist(q.x, q.y, x, y) < r + q.r) Cb().hurt(run, q, dmg, { x, y }); }
  function radial(run, b, n, sp, k, off, dmg, life) {
    for (let i = 0; i < n; i++) { const a = off + i * TAU / n; Cb().proj(run, { k, owner: -1, x: b.x, y: b.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: dmg || 1, life: life || 3, r: 3 }); }
  }
  function lobRock(run, sx, sy, tx, ty, dmg, after) {
    const ft = 0.9 + Math.random() * 0.3;
    Cb().proj(run, { k: 'rock', owner: -1, x: sx, y: sy, sx, sy, tx, ty, ft, life: ft + 0.1, dmg, rad: 16, lob: true, after });
    tel(run, { s: 'c', x: tx, y: ty, a: 16, T: ft });
  }
  const dmgB = run => 1 + (run.floor >= 9 ? 1 : 0);

  B.update = function (run, b, dt) {
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;
    b.fl = b.flash > 0;
    if (b.burn > 0) { b.burn -= dt; b.burnT = (b.burnT || 0) - dt; if (b.burnT <= 0) { b.burnT = 0.5; Cb().hitEnemy(run, b, 4 + run.floor * 0.6, { kind: 'dot', x: b.x, y: b.y }); } }
    if (b.dead) return;
    const p = tgt(run, b); if (!p) return;
    if (b.s === 'dormant') {
      if (run.players.some(q => Cb().active(q) && U.dist(q.x, q.y, b.x, b.y) < 175)) {
        const d = G.BOSSES[b.k];
        fx('banner', d.name, d.title); fx('snd', 'roar'); fx('shake', 5); fx('music', 'boss');
        run.bossHits = 0; run.bossFight = true;
        next(b, b.k === 'mushking' ? 'sleep' : 'walk', 2.2);
        if (b.k === 'mushking') b.stT = 3;
      }
      return;
    }
    // 2페이즈
    if (b.ph === 1 && b.hp < b.maxHp * 0.5) {
      b.ph = 2; fx('banner', '화났다!', G.BOSSES[b.k].name + ' 2페이즈'); fx('snd', 'roar'); fx('shake', 6); fx('flash', '#ff7aa8', 0.25);
      if (b.k === 'whale') { next(b, 'dark', 7); startDark(run, b); }
    }
    b.stT -= dt;
    B[b.k](run, b, p, dt);
    if (!b.hidden && b.s !== 'jump') G.World.move(run.map, b, b.vx * dt, b.vy * dt, b.r * 0.7);
    // 접촉 피해
    if (!b.hidden && b.z < 4 && b.s !== 'sleep' && b.s !== 'stunned') for (const q of run.players) if (Cb().active(q) && U.dist(q.x, q.y, b.x, b.y) < b.r * 0.8 + q.r) Cb().hurt(run, q, 1, { x: b.x, y: b.y });
  };

  // ── 잠꾸러기 왕버섯
  B.mushking = function (run, b, p, dt) {
    const ph2 = b.ph > 1;
    switch (b.s) {
      case 'sleep':
        b.vx *= 0.8; b.vy *= 0.8; b.vuln = 1.6;
        b.subT -= dt; if (b.subT <= 0) { b.subT = 0.8; fx('txt', b.x + 14, b.y - 44, 'Z', '#bfefff', 9, { vy: -14, life: 1.2 }); }
        if (b.stT <= 0) { b.vuln = 1; fx('snd', 'roar'); fx('say', 'boss', '흐아암… 누가 깨웠어!'); next(b, 'spore', 1.8); }
        break;
      case 'walk':
        b.vuln = 1; chase(run, b, p, 30 * (ph2 ? 1.4 : 1), dt);
        if (b.stT <= 0) next(b, U.rng.pick(['spore', 'jump', 'summon', 'jump']), 1.8);
        break;
      case 'spore':
        b.vx *= 0.8; b.vy *= 0.8;
        b.subT -= dt;
        if (b.subT <= 0 && b.sub < (ph2 ? 4 : 3)) { b.subT = 0.5; radial(run, b, ph2 ? 16 : 12, 68, 'spore', b.sub * 0.27 + b.t, 1, 3.5); fx('snd', 'spore'); b.sub++; }
        if (b.stT <= 0) next(b, 'walk', 1.6);
        break;
      case 'jump':
        if (b.sub === 0) { b.sub = 1; b.jx = p.x; b.jy = p.y; b.sx0 = b.x; b.sy0 = b.y; b.jT = 0; tel(run, { s: 'c', x: p.x, y: p.y, a: 42, T: 1.0 }); fx('snd', 'warn'); }
        b.jT += dt;
        { const k = Math.min(1, b.jT / 1.0); b.x = U.lerp(b.sx0, b.jx, k); b.y = U.lerp(b.sy0, b.jy, k); b.z = Math.sin(k * Math.PI) * 60; }
        if (b.jT >= 1.0 && b.sub === 1) {
          b.sub = 2; b.z = 0; fx('snd', 'slam'); fx('shake', 7); fx('ring', b.x, b.y, 6, 48, '#ffb3c7', 0.4); fx('burst', b.x, b.y, 20, '#c8e0a0', 90, 0.6);
          hurtArea(run, b.x, b.y, 42, 1); radial(run, b, 8, 90, 'spore', 0, 1, 2);
          G.World.unstick(run.map, b, b.r * 0.7);
          b.stT = ph2 && !b.second ? 0.4 : 1.0;
          if (ph2 && !b.second) { b.second = true; b.sub = 0; b.stT = 5; }
        }
        if (b.sub === 2 && b.stT <= 0) { b.second = false; next(b, Math.random() < 0.35 ? 'sleep' : 'walk', ph2 ? 2.5 : 3.5); }
        break;
      case 'summon':
        b.vx *= 0.8; b.vy *= 0.8;
        if (b.sub === 0) { b.sub = 1; fx('say', 'boss', '얘들아~ 일어나!'); for (let i = 0; i < (ph2 ? 5 : 3); i++) { const a = i * TAU / (ph2 ? 5 : 3); G.Run.spawnEnemy(run, 'mushling', b.x + Math.cos(a) * 30, b.y + Math.sin(a) * 24, { noPop: false }); } }
        if (b.stT <= 0) next(b, 'walk', 1.5);
        break;
    }
  };

  // ── 수정 집게 게
  B.crab = function (run, b, p, dt) {
    const ph2 = b.ph > 1;
    const near = run.players.filter(q => Cb().active(q)).sort((x, y) => U.dist(x.x, x.y, b.x, b.y) - U.dist(y.x, y.y, b.x, b.y))[0] || p;
    switch (b.s) {
      case 'walk':
        b.vuln = 1; faceTo(b, near, 1.3, dt); chase(run, b, near, 26, dt);
        if (b.stT <= 0) next(b, U.rng.pick(ph2 ? ['sweep', 'shards', 'charge', 'rain'] : ['sweep', 'shards', 'charge']), 1.4);
        break;
      case 'sweep':
        b.vx *= 0.8; b.vy *= 0.8;
        if (b.sub === 0) { b.sub = 1; faceTo(b, near, 99, 1); tel(run, { s: 'a', x: b.x, y: b.y, a: 64, b: 2.0, ang: b.fa, T: 0.75 }); fx('snd', 'warn'); b.subT = 0.75; }
        b.subT -= dt;
        if (b.sub === 1 && b.subT <= 0) {
          b.sub = 2; fx('snd', 'swing'); fx('shake', 4);
          for (const q of run.players) if (Cb().active(q) && U.dist(q.x, q.y, b.x, b.y) < 64 && Math.abs(U.angDiff(b.fa, U.ang(b.x, b.y, q.x, q.y))) < 1.0) Cb().hurt(run, q, dmgB(run), { x: b.x, y: b.y });
          fx('arc', b.x, b.y - 8, 60, b.fa, 2.0, '#e0f4ff');
        }
        if (b.stT <= 0) next(b, 'walk', 1.8);
        break;
      case 'shards':
        b.vx *= 0.8; b.vy *= 0.8; faceTo(b, near, 2, dt);
        b.subT -= dt;
        if (b.subT <= 0 && b.sub < (ph2 ? 3 : 2)) {
          b.subT = 0.55; b.sub++;
          const n = ph2 ? 7 : 5;
          for (let i = 0; i < n; i++) { const a = b.fa + (i - (n - 1) / 2) * 0.22; Cb().proj(run, { k: 'shard', owner: -1, x: b.x + Math.cos(b.fa) * 18, y: b.y - 8, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: 1, life: 2.5, r: 3 }); }
          fx('snd', 'shoot');
        }
        if (b.stT <= 0) next(b, 'walk', 1.6);
        break;
      case 'charge':
        if (b.sub === 0) { b.sub = 1; faceTo(b, near, 99, 1); b.subT = 0.8; tel(run, { s: 'l', x: b.x, y: b.y, a: 170, b: 30, ang: b.fa, T: 0.8 }); fx('snd', 'warn'); b.vx = b.vy = 0; }
        b.subT -= dt;
        if (b.sub === 1 && b.subT <= 0) { b.sub = 2; b.subT = 0.7; fx('snd', 'dash'); }
        if (b.sub === 2) {
          b.vx = Math.cos(b.fa) * 250; b.vy = Math.sin(b.fa) * 250;
          const hit = G.World.solidAt(run.map, b.x + Math.cos(b.fa) * (b.r + 4), b.y + Math.sin(b.fa) * (b.r + 4));
          if (hit || b.subT <= 0) {
            b.vx = b.vy = 0;
            if (hit) { fx('snd', 'slam'); fx('shake', 7); fx('txt', b.x, b.y - 40, '꽈당! 지금이야!', '#ffd36b', 9); next(b, 'stunned', 2.2); b.vuln = 1.6; b.front = false; }
            else next(b, 'walk', 1.4);
          }
        }
        break;
      case 'stunned':
        b.vx = 0; b.vy = 0;
        if (Math.random() < 0.2) fx('burst', b.x, b.y - 34, 1, '#ffe36b', 20, 0.4);
        if (b.stT <= 0) { b.vuln = 1; b.front = true; next(b, 'walk', 1.2); }
        break;
      case 'rain':
        b.vx *= 0.8; b.vy *= 0.8;
        if (b.sub === 0) {
          b.sub = 1;
          for (const q of run.players) if (Cb().active(q)) for (let i = 0; i < 4; i++) {
            const x = q.x + (Math.random() - 0.5) * 70, y = q.y + (Math.random() - 0.5) * 50;
            run.delayed.push({ t: 1.0, fn: () => { hurtArea(run, x, y, 16, 1); fx('burst', x, y, 8, '#bfefff', 60, 0.4); fx('snd', 'break'); } });
            tel(run, { s: 'c', x, y, a: 16, T: 1.0 });
          }
        }
        if (b.stT <= 0) next(b, 'walk', 1.2);
        break;
    }
  };

  // ── 화난 용암 두더지왕
  B.moleking = function (run, b, p, dt) {
    const ph2 = b.ph > 1;
    switch (b.s) {
      case 'walk':
        b.hidden = false; b.vuln = 1; chase(run, b, p, 36, dt); b.a = U.ang(b.x, b.y, p.x, p.y);
        if (b.stT <= 0) next(b, U.rng.pick(['dig', 'dig', 'rocks', 'swipe']), 2.5);
        break;
      case 'dig':
        if (b.sub === 0) { b.sub = 1; b.hidden = true; fx('snd', 'burrow'); fx('burst', b.x, b.y, 18, '#8d5a44', 80, 0.6); fx('say', 'boss', '어디 있게~?'); }
        b.hidden = true;
        chase(run, b, p, 95, dt);
        if (Math.random() < 0.3) fx('burst', b.x, b.y, 1, '#8d5a44', 30, 0.4);
        if (b.stT <= 0) { next(b, 'erupt', 0.85); b.vx = b.vy = 0; tel(run, { s: 'c', x: b.x, y: b.y, a: 34, T: 0.85 }); fx('snd', 'warn'); }
        break;
      case 'erupt':
        b.hidden = true; b.vx = b.vy = 0;
        if (b.stT <= 0) {
          b.hidden = false; b.z = 0;
          fx('snd', 'slam'); fx('shake', 7); fx('burst', b.x, b.y, 26, ['#8d5a44', '#ffb070'], 110, 0.7);
          hurtArea(run, b.x, b.y, 34, dmgB(run));
          const n = ph2 ? 6 : 4;
          for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 40 + Math.random() * 70; lobRock(run, b.x, b.y, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.8, 1, ph2 ? 'lavapool' : null); }
          if (ph2) { G.Run.hazard(run, 'lavapool', b.x, b.y, 22, 6); radial(run, b, 14, 90, 'efire', b.t, 1, 2.5); }
          next(b, 'tired', 2.4); b.vuln = 1.35;
          fx('say', 'boss', '헉… 헉…');
        }
        break;
      case 'tired':
        b.vx *= 0.8; b.vy *= 0.8;
        if (b.stT <= 0) { b.vuln = 1; next(b, 'walk', 1.5); }
        break;
      case 'rocks':
        b.vx *= 0.8; b.vy *= 0.8;
        b.subT -= dt;
        if (b.subT <= 0 && b.sub < (ph2 ? 10 : 7)) {
          b.subT = 0.22; b.sub++;
          const q = run.players[b.sub % 2]; const t2 = Cb().active(q) ? q : p;
          lobRock(run, b.x, b.y - 20, t2.x + (Math.random() - 0.5) * 40, t2.y + (Math.random() - 0.5) * 30, 1, ph2 && b.sub % 3 === 0 ? 'fire' : null);
        }
        if (b.stT <= 0) next(b, 'walk', 1.5);
        break;
      case 'swipe':
        if (b.sub === 0) { b.sub = 1; b.a = U.ang(b.x, b.y, p.x, p.y); b.subT = 0.6; tel(run, { s: 'a', x: b.x, y: b.y, a: 58, b: 2.4, ang: b.a, T: 0.6 }); b.vx = b.vy = 0; }
        b.subT -= dt;
        if (b.sub === 1 && b.subT <= 0) {
          b.sub = 2; fx('snd', 'swing'); fx('arc', b.x, b.y - 10, 56, b.a, 2.4, '#ffb070');
          for (const q of run.players) if (Cb().active(q) && U.dist(q.x, q.y, b.x, b.y) < 58 && Math.abs(U.angDiff(b.a, U.ang(b.x, b.y, q.x, q.y))) < 1.2) Cb().hurt(run, q, dmgB(run), { x: b.x, y: b.y });
          b.subT = 0.5;
          if (ph2 && !b.twice) { b.twice = true; b.sub = 0; }
        }
        if (b.sub === 2 && b.subT <= 0) { b.twice = false; next(b, 'walk', 1.2); }
        break;
    }
  };

  // ── 어둠 고래
  function startDark(run, b) {
    run.darkMul = 0.4; run.beamBoost = 3;
    fx('banner', '빛이 사라졌어요…', '둘의 빛줄기만이 길을 밝혀요 💞'); fx('snd', 'fear');
    for (let i = 0; i < 3; i++) G.Run.spawnEnemy(run, 'shadow', b.x + (i - 1) * 40, b.y + 30, {});
  }
  function endDark(run) { run.darkMul = 1; run.beamBoost = 1; }
  B.whale = function (run, b, p, dt) {
    const ph2 = b.ph > 1;
    b.a = U.ang(b.x, b.y, p.x, p.y);
    switch (b.s) {
      case 'walk': {
        const ang = b.t * 0.6;
        const ar = run.info.arena;
        const tx = ar.x + Math.cos(ang) * 90, ty = ar.y + Math.sin(ang) * 50;
        b.vx = U.lerp(b.vx, (tx - b.x) * 1.2, 0.05); b.vy = U.lerp(b.vy, (ty - b.y) * 1.2, 0.05);
        b.vuln = 1;
        if (b.stT <= 0) next(b, U.rng.pick(ph2 ? ['stars', 'dive', 'bubbles', 'dark', 'stars'] : ['stars', 'dive', 'bubbles', 'summon']), 2.6);
        break;
      }
      case 'stars':
        b.vx *= 0.9; b.vy *= 0.9;
        b.subT -= dt;
        if (b.subT <= 0 && b.sub < (ph2 ? 6 : 4)) { b.subT = 0.42; radial(run, b, ph2 ? 20 : 16, 75, 'wstar', b.sub * 0.2, 1, 4); b.sub++; fx('snd', 'shoot'); }
        if (b.stT <= 0) next(b, 'walk', 2);
        break;
      case 'dive':
        if (b.sub === 0) { b.sub = 1; b.da = U.ang(b.x, b.y, p.x, p.y); b.subT = 0.9; tel(run, { s: 'l', x: b.x, y: b.y, a: 240, b: 34, ang: b.da, T: 0.9 }); fx('snd', 'warn'); b.vx = b.vy = 0; }
        b.subT -= dt;
        if (b.sub === 1 && b.subT <= 0) { b.sub = 2; b.subT = 0.8; fx('snd', 'dash'); }
        if (b.sub === 2) {
          b.vx = Math.cos(b.da) * 300; b.vy = Math.sin(b.da) * 300;
          if (b.subT <= 0 || G.World.solidAt(run.map, b.x + Math.cos(b.da) * 30, b.y + Math.sin(b.da) * 30)) { b.vx = b.vy = 0; next(b, 'walk', 2); fx('shake', 5); }
        }
        break;
      case 'bubbles':
        b.vx *= 0.9; b.vy *= 0.9;
        b.subT -= dt;
        if (b.subT <= 0 && b.sub < 8) {
          b.subT = 0.25; b.sub++;
          const a = b.a + (Math.random() - 0.5) * 1.2;
          Cb().proj(run, { k: 'bubble', owner: -1, x: b.x, y: b.y - 10, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, dmg: 1, life: 4.5, r: 4 });
        }
        if (b.stT <= 0) next(b, 'walk', 1.6);
        break;
      case 'summon':
        if (b.sub === 0) { b.sub = 1; for (let i = 0; i < 3; i++) G.Run.spawnEnemy(run, i === 1 ? 'jelly' : 'shadow', b.x + (i - 1) * 40, b.y + 20, {}); }
        if (b.stT <= 0) next(b, 'walk', 2);
        break;
      case 'dark':
        if (b.sub === 0) { b.sub = 1; if (run.darkMul === 1) startDark(run, b); b.stT = 7; }
        b.vuln = 0.6;
        b.vx *= 0.95; b.vy *= 0.95;
        b.subT -= dt;
        if (b.subT <= 0) { b.subT = 1.1; radial(run, b, 10, 55, 'wstar', b.t, 1, 4); }
        if (b.stT <= 0) { endDark(run); fx('banner', '빛이 돌아왔어요!', ''); next(b, 'walk', 2); }
        break;
    }
  };

  B.die = function (run, b) {
    if (b.dead) return;
    b.dead = true;
    run.darkMul = 1; run.beamBoost = 1;
    fx('snd', 'bossdie'); fx('shake', 8); fx('flash', '#ffffff', 0.7);
    for (let i = 0; i < 5; i++) fx('boom', b.x + (Math.random() - 0.5) * 40, b.y - 10 + (Math.random() - 0.5) * 30, 26, 0);
    fx('banner', '해냈다!', U.josa(G.BOSSES[b.k].name, '을/를') + ' 재웠어요 💤');
    const nStars = 1 + Math.floor(run.floor / 3) + (run.bossHits === 0 ? 1 : 0);
    Cb().drop(run, 'star', b.x, b.y, nStars, 1);
    Cb().drop(run, 'gem', b.x, b.y, 12, 2);
    Cb().drop(run, 'gemb', b.x, b.y, 3, 5);
    Cb().drop(run, 'heart', b.x, b.y, 2, 2);
    Cb().drop(run, 'xpb', b.x, b.y, 8, 3);
    run.bossesKilled.push(b.k);
    if (run.bossHits === 0) run.stats.nohitBoss++;
    for (const e of run.enemies) if (!e.dead) Cb().killEnemy(run, e, {});
    run.projs = run.projs.filter(pr => pr.owner >= 0);
    run.tels.length = 0;
    run.bossFight = false;
    const d = G.BOSSES[b.k];
    run.delayed.push({ t: 1.2, fn: () => {
      run.boss = null;
      G.Run.photo(run, `${U.today()} — ${run.players[0].name}와(과) ${run.players[1].name}, ${d.name}을(를) 재우다 ✨`);
      const ex = run.info.exit;
      run.objects.push({ id: U.id(), k: 'door', x: ex.x, y: ex.y, st: 1, prog: 1 });
      fx('snd', 'door'); fx('music', G.biomeOf(run.floor).music);
    } });
  };
  return B;
})();
