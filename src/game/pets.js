// 펫: 원정에 따라와 도와주는 작은 친구들 (방장/로컬에서만 시뮬레이션)
G.Pet = (function () {
  const P = {};
  const U = G.U;
  const fx = (...a) => G.fx(...a);

  // 원정 시작: 저장된 펫 배정대로 생성
  P.init = function (run) {
    const save = G.Save.data;
    run.pets = [];
    for (let slot = 0; slot < 2; slot++) {
      const i = save.petOf[slot], pd = save.pets[i];
      if (i < 0 || !pd || !G.PETS[pd.sp]) continue;
      const stage = G.petStage(pd.xp);
      run.pets.push({ slot, sp: pd.sp, stage, x: 0, y: 0, f: 1, cd: pd.sp === 'hammy' ? 12 : 1, mode: 'follow', tgt: null });
      if (pd.sp === 'firefly') { const p = run.players[slot]; p.st.light += 14 * (1 + stage * 0.6); p.lightR = p.st.light; }
    }
  };
  P.place = function (run) {
    for (const pt of run.pets) { const p = run.players[pt.slot]; pt.x = p.x + (pt.slot ? 12 : -12); pt.y = p.y + 6; pt.mode = 'follow'; pt.tgt = null; }
  };

  P.update = function (run, dt) {
    const Cb = G.Cb;
    for (const pt of run.pets) {
      const p = run.players[pt.slot], k = 1 + pt.stage * 0.5;
      pt.cd -= dt;
      let tx = p.x + (pt.slot ? 12 : -12), ty = p.y + 4, sp = 6;
      if (pt.sp === 'chick') {
        if (pt.tgt && !run.pickups.includes(pt.tgt)) pt.tgt = null;
        if (!pt.tgt && pt.cd <= 0) {
          pt.cd = 0.3;
          let best = null, bd = 110 * 110;
          for (const q of run.pickups) if (q.k === 'gem' || q.k === 'gemb') { const d = U.dist2(pt.x, pt.y, q.x, q.y); if (d < bd) { bd = d; best = q; } }
          pt.tgt = best;
        }
        if (pt.tgt) {
          tx = pt.tgt.x; ty = pt.tgt.y; sp = 3 * k;
          if (U.dist(pt.x, pt.y, tx, ty) < 7) {
            const i = run.pickups.indexOf(pt.tgt);
            if (i >= 0) { Cb.collect(run, pt.tgt, p); run.pickups.splice(i, 1); }
            pt.tgt = null;
          }
        }
      } else if (pt.sp === 'slime') {
        if (pt.cd <= 0) {
          pt.cd = 1.6 / k;
          const e = Cb.nearestEnemy(run, pt.x, pt.y, 120);
          if (e) {
            const a = U.ang(pt.x, pt.y, e.x, e.y);
            Cb.proj(run, { k: 'goo', owner: pt.slot, x: pt.x, y: pt.y - 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: 5 * k * (1 + run.floor * 0.08), life: 0.9, r: 3, chill: 1.5 });
            fx('snd', 'acorn');
          }
        }
      } else if (pt.sp === 'batpet') {
        if (pt.mode === 'dive' && pt.tgt && !pt.tgt.dead && !pt.tgt.under) {
          tx = pt.tgt.x; ty = pt.tgt.y - 4; sp = 10;
          if (U.dist(pt.x, pt.y, tx, ty) < pt.tgt.r + 5) {
            Cb.hitEnemy(run, pt.tgt, 4 * k * (1 + run.floor * 0.08), { p, kind: 'proj', x: pt.x, y: pt.y, knock: 30 });
            pt.mode = 'follow'; pt.tgt = null; pt.cd = 0.9 / k;
          }
        } else {
          pt.mode = 'follow'; pt.tgt = null;
          if (pt.cd <= 0) { pt.cd = 0.3; const e = Cb.nearestEnemy(run, p.x, p.y, 90); if (e) { pt.tgt = e; pt.mode = 'dive'; } }
        }
      } else if (pt.sp === 'hammy') {
        if (pt.cd <= 0) {
          pt.cd = 28 / k;
          if (Cb.active(p) && p.hp < p.st.maxHp) { Cb.heal(run, p, 1); fx('txt', pt.x, pt.y - 14, '힘내! 🌰', '#ffd36b', 6); }
        }
      }
      const kk = Math.min(1, dt * sp);
      pt.x += (tx - pt.x) * kk; pt.y += (ty - pt.y) * kk;
      if (Math.abs(tx - pt.x) > 0.5) pt.f = tx > pt.x ? 1 : -1;
      if (U.dist(pt.x, pt.y, p.x, p.y) > 200) { pt.x = p.x; pt.y = p.y; pt.tgt = null; pt.mode = 'follow'; }
    }
  };

  // 굴집에서는 그냥 졸졸 따라다녀요
  P.follow = function (pets, players, dt) {
    for (const pt of pets) {
      const p = players[pt.slot];
      const tx = p.x + (pt.slot ? 12 : -12), ty = p.y + 4, kk = Math.min(1, dt * 5);
      pt.x += (tx - pt.x) * kk; pt.y += (ty - pt.y) * kk;
      if (Math.abs(tx - pt.x) > 0.5) pt.f = tx > pt.x ? 1 : -1;
    }
  };
  P.hubPets = function (players) {
    const save = G.Save.data, out = [];
    for (let slot = 0; slot < 2; slot++) {
      const pd = save.pets[save.petOf[slot]];
      if (save.petOf[slot] >= 0 && pd && G.PETS[pd.sp]) out.push({ slot, sp: pd.sp, stage: G.petStage(pd.xp), x: players[slot].x, y: players[slot].y + 4, f: 1 });
    }
    return out;
  };

  P.view = list => list.map(pt => [pt.slot, pt.sp, pt.stage, Math.round(pt.x), Math.round(pt.y), pt.f]);
  P.name = pd => G.PETS[pd.sp].names[G.petStage(pd.xp)];
  return P;
})();
