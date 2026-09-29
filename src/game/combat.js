// 전투: 플레이어 행동, 피해 계산, 투사체, 줍기
G.Cb = (function () {
  const Cb = {};
  const U = G.U, C = G.C;
  const fx = (...a) => G.fx(...a);
  const TAU = Math.PI * 2;

  // ───────────── 스탯
  Cb.baseStats = function (ch, save) {
    const d = G.CHARS[ch];
    return {
      dmg: 1 + (save ? save.forge * 0.08 : 0), aspd: 1, spd: 1, maxHp: d.hp + (save ? save.garden : 0), cdr: 1, light: d.light,
      magnet: C.MAGNET, crit: 0.05, critMul: 1.8, pierce: 0, multi: 0, knock: 1, regen: 0, block: ch === 'kkobuk' ? 0.2 : 0,
      thorns: 0, xpMul: 1, burn: 0, slow: 0, chain: 0, chainN: 2, area: 1, fireball: 0, iceNova: 0, thunder: 0, fruit: 0,
      starshot: 0, vamp: 0, orbit: 0, aura: 0, brittle: 0, phoenix: 0, blizzard: 0, dragon: 0, fearMul: 1, lastStand: 0,
      lone: 0, owl: 0, hurtPlus: 0,
    };
  };
  Cb.teamStats = function () {
    return { beamRange: 1, beamDmg: 1, heartGain: 1, reviveSpd: 1, reviveHp: 0, xpMul: 1, gemMul: 1, oreMul: 1, healMul: 1, luck: 0,
      rerolls: 0, shopDisc: 0, floorHeal: 0, featherShield: 0, treasureMap: 0, chestMul: 1, mineMul: 1,
      comboDmg: 1, startHeart: 0, beamNoFear: 0, startRelic: 0 };
  };
  Cb.newPlayer = function (slot, ch, name, hat, save) {
    const st = Cb.baseStats(ch, save);
    return {
      slot, id: 'p' + slot, c: ch, name, hat, x: 0, y: 0, r: C.PLAYER_R, vx: 0, vy: 0, f: slot ? -1 : 1, a: slot ? Math.PI : 0,
      hp: st.maxHp, st, state: 'n', atkCd: 0, skCd: 0, fear: 0, inv: 0, flash: 0, at: 0, ar: 1, downT: 0, rv: 0,
      dashT: 0, dvx: 0, dvy: 0, dashHit: null, cards: {}, tagBonus: {}, atkCount: 0, regenT: 0, thunderT: 0, blizT: 0,
      phoenixUsed: false, featherUsed: false, comboT: -9, moving: false, lit: true, lightR: st.light, buff: 0, buffT: 0,
      mineTemp: false, lightTemp: false, orbitA: 0, orbitHit: {}, echo: 0, slowT: 0, lavaT: 0, sayT: 0, afterT: 0, fearSaid: false, lunchEaten: {},
    };
  };
  Cb.tagCount = (p, tag) => {
    let n = p.tagBonus[tag] || 0;
    for (const id in p.cards) if (G.CARD[id].tag === tag) n += p.cards[id];
    return n;
  };
  Cb.synergies = function (run) {
    const [a, b] = run.players, out = [];
    for (const t in G.TAGS) if (Cb.tagCount(a, t) >= 2 && Cb.tagCount(b, t) >= 2) out.push(t);
    return out;
  };
  Cb.lightPower = p => G.CHARS[p.c].lightPower || p.lightTemp;
  Cb.canMine = p => G.CHARS[p.c].miner || p.mineTemp;
  Cb.active = p => p.state === 'n' || p.state === 'd';

  function dmgMul(run, p) {
    let m = p.st.dmg;
    if (p.st.lastStand && p.hp <= 2) m += p.st.lastStand;
    if (p.buffT > 0) m += p.buff;
    if (p.st.lone && !run.tether.on) m += p.st.lone;
    if (p.st.owl && !p.lit) m += p.st.owl;
    return Math.max(0.2, m);
  }
  Cb.dmgMul = dmgMul;

  // ───────────── 조준 보조
  function nearestEnemy(run, x, y, range, ang, cone) {
    let best = null, bd = range * range;
    const cand = run.enemies.concat(run.boss && !run.boss.hidden ? [run.boss] : []);
    for (const e of cand) {
      if (e.dead || e.under) continue;
      const d2 = U.dist2(x, y, e.x, e.y); if (d2 > bd) continue;
      if (cone != null && Math.abs(U.angDiff(ang, U.ang(x, y, e.x, e.y))) > cone) continue;
      bd = d2; best = e;
    }
    return best;
  }
  Cb.nearestEnemy = nearestEnemy;
  function aimAssist(run, p, range) {
    const e = nearestEnemy(run, p.x, p.y, range, p.a, 0.75) || (p.moving ? null : nearestEnemy(run, p.x, p.y, range * 0.85));
    return e ? U.ang(p.x, p.y, e.x, e.y) : p.a;
  }

  // ───────────── 투사체 생성
  Cb.proj = function (run, o) {
    const pr = Object.assign({ id: U.id(), x: 0, y: 0, vx: 0, vy: 0, dmg: 1, owner: -1, life: 1, r: 3, pierce: 0, hit: null, homing: 0, bounce: 0, z: 0, t: 0 }, o);
    pr.hit = new Set();
    run.projs.push(pr);
    return pr;
  };

  // ───────────── 플레이어 공격
  Cb.attack = function (run, p) {
    const ch = G.CHARS[p.c], atk = ch.atk, m = dmgMul(run, p);
    p.atkCount++;
    const extra = p.st.multi;
    switch (atk.type) {
      case 'orb': case 'dart': case 'acorn': case 'snow': {
        const a0 = aimAssist(run, p, 150);
        const n = (atk.count || 1) + extra;
        for (let i = 0; i < n; i++) {
          const a = a0 + (n > 1 ? (i - (n - 1) / 2) * (atk.type === 'dart' ? 0.28 : 0.18) : 0);
          Cb.proj(run, { k: atk.type, owner: p.slot, x: p.x + Math.cos(a) * 6, y: p.y + Math.sin(a) * 6, vx: Math.cos(a) * atk.speed, vy: Math.sin(a) * atk.speed,
            dmg: atk.dmg * m, life: atk.life, r: atk.r || 3, homing: atk.homing || 0, pierce: p.st.pierce, bounce: (atk.bounce || 0) + (atk.type === 'acorn' ? p.st.pierce : 0), light: atk.type === 'orb' ? 22 : atk.type === 'dart' ? 16 : 0, chill: atk.type === 'snow' ? 2 : 0 });
        }
        fx('snd', atk.type === 'orb' ? 'orb' : atk.type === 'acorn' ? 'acorn' : 'dart');
        p.a = a0; p.f = Math.cos(a0) >= 0 ? 1 : -1;
        break;
      }
      case 'bomb': {
        const a0 = aimAssist(run, p, 110);
        const tgt = nearestEnemy(run, p.x, p.y, 100, a0, 0.4);
        const n = 1 + extra;
        for (let i = 0; i < n; i++) {
          let tx = tgt ? tgt.x : p.x + Math.cos(a0) * 70, ty = tgt ? tgt.y : p.y + Math.sin(a0) * 70;
          if (i > 0) { tx += (Math.random() - 0.5) * 40; ty += (Math.random() - 0.5) * 40; }
          const d = U.dist(p.x, p.y, tx, ty), ft = Math.max(0.25, d / atk.speed);
          Cb.proj(run, { k: 'bomb', owner: p.slot, x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, ft, life: ft + atk.fuse + 0.05, dmg: atk.dmg * m, rad: atk.radius * p.st.area, lob: true, fuse: atk.fuse });
        }
        fx('snd', 'throw');
        p.a = a0; p.f = Math.cos(a0) >= 0 ? 1 : -1;
        break;
      }
      case 'rune': {
        // 적이 있는 자리에 마법진 → 잠시 뒤 터짐
        const targets = allTargets(run).filter(e => U.dist(p.x, p.y, e.x, e.y) < atk.range).sort((a, b) => U.dist2(p.x, p.y, a.x, a.y) - U.dist2(p.x, p.y, b.x, b.y));
        const n = 1 + extra;
        const a0 = aimAssist(run, p, atk.range);
        for (let i = 0; i < n; i++) {
          const e = targets[i] || targets[0];
          const tx = e ? e.x + (i && !targets[i] ? (Math.random() - 0.5) * 30 : 0) : p.x + Math.cos(a0) * 60, ty = e ? e.y : p.y + Math.sin(a0) * 60;
          Cb.proj(run, { k: 'rune', owner: p.slot, x: tx, y: ty, still: true, life: atk.delay, fuse: atk.delay, dmg: atk.dmg * m, rad: atk.radius * p.st.area * 1.2, light: 18 });
        }
        fx('snd', 'orb');
        p.a = a0; p.f = Math.cos(a0) >= 0 ? 1 : -1;
        break;
      }
      case 'swing': case 'bash': {
        const a = aimAssist(run, p, atk.range + 14);
        p.a = a; p.f = Math.cos(a) >= 0 ? 1 : -1;
        melee(run, p, a, atk, m);
        if (extra) p.echo = 0.14;
        break;
      }
    }
    if (p.st.dragon) {
      const a = p.a;
      Cb.proj(run, { k: 'firebolt', owner: p.slot, x: p.x, y: p.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, dmg: 5 * m, life: 0.8, r: 3, burn: 1, light: 16 });
    }
    if (p.st.fireball && p.atkCount % 4 === 0) {
      const a = p.a;
      Cb.proj(run, { k: 'fireball', owner: p.slot, x: p.x, y: p.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: 18 * m, life: 1.1, r: 4, explode: 24, burn: 1, light: 26 });
    }
    p.at = 1; p.ar = p.st.area;
  };

  function melee(run, p, a, atk, m) {
    const range = atk.range * p.st.area, arc = atk.arc;
    let hitAny = false;
    const cand = run.enemies.concat(run.boss && !run.boss.hidden ? [run.boss] : []);
    for (const e of cand) {
      if (e.dead || e.under) continue;
      const d = U.dist(p.x, p.y, e.x, e.y);
      if (d > range + e.r) continue;
      if (Math.abs(U.angDiff(a, U.ang(p.x, p.y, e.x, e.y))) > arc / 2 && d > e.r + 4) continue;
      Cb.hitEnemy(run, e, atk.dmg * m, { p, kind: 'melee', x: p.x, y: p.y, knock: atk.knock * p.st.knock, mine: atk.mine });
      hitAny = true;
    }
    // 오브젝트 (상자 등)
    for (const o of run.objects) if (o.k === 'chest' && o.st === 0 && U.dist(p.x, p.y, o.x, o.y) < range + 10) G.Run.openChest(run, o);
    // 채굴
    if (atk.mine || p.mineTemp) {
      for (const dd of [10, 17, 24]) {
        if (dd > range + 6) break;
        const tx = Math.floor((p.x + Math.cos(a) * dd) / C.TILE), ty = Math.floor((p.y - 2 + Math.sin(a) * dd) / C.TILE);
        if (G.isSolidTile(G.World.get(run.map, tx, ty))) { Cb.mineTile(run, tx, ty, 1, p); hitAny = true; break; }
      }
    }
    fx('snd', atk.type === 'bash' ? 'bash' : 'swing');
    if (hitAny) run.hitstop = Math.max(run.hitstop, 0.035);
  }

  // ───────────── 채굴
  Cb.mineTile = function (run, tx, ty, power, p) {
    const m = run.map, T = G.T;
    const t = G.World.get(m, tx, ty);
    if (!G.TILE_HP[t]) { if (t === T.BEDROCK) fx('burst', tx * 16 + 8, ty * 16 + 8, 3, '#888', 30, 0.3); return false; }
    const k = ty * m.w + tx;
    const hp = G.TILE_HP[t];
    m.dmg[k] = Math.min(15, m.dmg[k] + Math.max(1, Math.round(power * run.team.st.mineMul)));
    const cx = tx * 16 + 8, cy = ty * 16 + 8;
    if (m.dmg[k] >= hp) {
      G.World.set(m, tx, ty, T.FLOOR);
      fx('tile', tx, ty, T.FLOOR, 0);
      fx('burst', cx, cy, 10, [m.pal.wall[0], m.pal.wall[1], m.pal.wallTop], 60, 0.5);
      fx('snd', 'break'); fx('shake', 2);
      run.stats.ores++;
      const om = run.team.st.oreMul * (p && p.c === 'molly' && Math.random() < 0.25 ? 2 : 1);
      if (t === T.ORE) Cb.drop(run, 'gem', cx, cy, Math.round(2 * om), 1);
      if (t === T.BIGORE) { Cb.drop(run, 'gemb', cx, cy, Math.max(1, Math.round(1 * om)), 5); Cb.drop(run, 'gem', cx, cy, 2, 1); }
      if (t === T.RAINBOW) { Cb.drop(run, 'star', cx, cy, 1, 1); Cb.drop(run, 'gem', cx, cy, 3, 1); fx('txt', cx, cy - 10, '무지개 광석!', '#ffd36b', 8); }
      if (t === T.CRYSTAL) { Cb.drop(run, 'xpb', cx, cy, 2, 3); run.lightDirty = true; }
      if (t === T.ORE || t === T.BIGORE || t === T.RAINBOW) fx('snd', 'ore');
      if (t === T.BOULDER) run.hintFlags.boulder = true;
      return true;
    }
    fx('tile', tx, ty, t, m.dmg[k]);
    fx('burst', cx, cy + 4, 3, m.pal.wallTop, 40, 0.3);
    fx('snd', 'mine');
    return false;
  };
  Cb.mineArea = function (run, x, y, rad, power, p) {
    const S = C.TILE;
    const x0 = Math.floor((x - rad) / S), x1 = Math.floor((x + rad) / S), y0 = Math.floor((y - rad) / S), y1 = Math.floor((y + rad) / S);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (U.dist(x, y, tx * S + 8, ty * S + 8) > rad + 4) continue;
      if (G.isSolidTile(G.World.get(run.map, tx, ty))) Cb.mineTile(run, tx, ty, power, p);
    }
  };

  // ───────────── 스킬
  Cb.skill = function (run, p) {
    const sk = G.CHARS[p.c].skill, m = dmgMul(run, p);
    switch (sk.type) {
      case 'wave': {
        const rad = sk.radius * p.st.area;
        fx('ring', p.x, p.y - 6, 4, rad, '#fff3a0', 0.45); fx('snd', 'wave'); fx('flash', '#fff6c0', 0.18);
        for (const e of allTargets(run)) {
          if (U.dist(p.x, p.y, e.x, e.y) > rad + e.r) continue;
          const def = e.def;
          Cb.hitEnemy(run, e, sk.dmg * m * (def && def.shadow ? 3 : 1), { p, kind: 'aoe', x: p.x, y: p.y, knock: 80 });
          if (!e.boss) e.stun = Math.max(e.stun, sk.stun);
        }
        const q = run.players[1 - p.slot];
        if (Cb.active(q) && U.dist(p.x, p.y, q.x, q.y) < rad) Cb.heal(run, q, 1, true);
        // 결계 해제 보너스
        for (const o of run.objects) if (o.k === 'door' && o.st === 0 && U.dist(p.x, p.y, o.x, o.y) < rad) o.prog = Math.min(1, (o.prog || 0) + 0.35);
        break;
      }
      case 'meteor': {
        const e0 = nearestEnemy(run, p.x, p.y, 150);
        const cx = e0 ? e0.x : p.x + Math.cos(p.a) * 50, cy = e0 ? e0.y : p.y + Math.sin(p.a) * 50;
        for (let i = 0; i < sk.n + p.st.multi; i++) {
          const a = Math.random() * TAU, r = i ? 12 + Math.random() * 40 : 0;
          const tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r * 0.8, life = 0.55 + i * 0.16;
          Cb.proj(run, { k: 'meteor', owner: p.slot, x: tx, y: ty, still: true, life, fuse: life, dmg: sk.dmg * m, rad: sk.radius * p.st.area * 1.2, light: 20, z: life * 150 });
        }
        fx('snd', 'wish'); fx('say', p.slot, '별똥별아~!');
        break;
      }
      case 'slide': case 'roll': {
        const a = p.moving ? Math.atan2(p.iy, p.ix) : p.a;
        p.state = 'd'; p.dashT = sk.dur; p.dvx = Math.cos(a) * sk.dist / sk.dur; p.dvy = Math.sin(a) * sk.dist / sk.dur; p.dashHit = new Set(); p.a = a;
        p.f = Math.cos(a) >= 0 ? 1 : -1;
        fx('snd', 'dash'); fx('burst', p.x, p.y, 8, sk.type === 'slide' ? '#bfefff' : '#c8b8a0', 40, 0.4);
        break;
      }
      case 'bigbomb': {
        Cb.proj(run, { k: 'bigbomb', owner: p.slot, x: p.x, y: p.y + 2, life: sk.fuse, dmg: sk.dmg * m, rad: sk.radius * p.st.area, fuse: sk.fuse, still: true, big: true });
        fx('snd', 'throw'); fx('say', p.slot, '물러서~!');
        break;
      }
      case 'dome': {
        run.objects.push({ id: U.id(), k: 'dome', x: p.x, y: p.y, st: 0, ex: sk.radius, life: sk.dur, owner: p.slot });
        fx('snd', 'block'); fx('ring', p.x, p.y - 4, 8, sk.radius, '#c8ffc0', 0.4);
        break;
      }
      case 'swarm': {
        for (let i = 0; i < sk.n + p.st.multi; i++) Cb.proj(run, { k: 'fly', owner: p.slot, x: p.x, y: p.y, life: sk.dur, dmg: sk.dmg * m, r: 3, swarm: true, orbA: i * TAU / sk.n, cd: 0, light: 18 });
        fx('snd', 'wish');
        break;
      }
      case 'picnic': {
        run.pickups.push({ id: U.id(), k: 'lunch', x: p.x, y: p.y + 4, vx: 0, vy: 0, v: sk.heal, t: 0, life: 14, eaten: {} });
        fx('snd', 'heal'); fx('say', p.slot, '같이 먹자! 🍙');
        break;
      }
    }
    if (p.st.iceNova) {
      fx('ring', p.x, p.y - 4, 6, 56, '#bfefff', 0.4);
      for (const e of allTargets(run)) if (U.dist(p.x, p.y, e.x, e.y) < 56 + e.r) { Cb.hitEnemy(run, e, 6 * m, { p, kind: 'aoe', x: p.x, y: p.y }); e.slowT = 2.5; }
    }
  };
  function allTargets(run) { return run.enemies.filter(e => !e.dead && !e.under).concat(run.boss && !run.boss.hidden && !run.boss.dead ? [run.boss] : []); }
  Cb.allTargets = allTargets;

  // ───────────── 합동기
  Cb.combo = function (run) {
    const [a, b] = run.players;
    const name = G.comboName(a.c, b.c);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    run.team.heart = 0;
    run.stats.combos++;
    const dm = C.COMBO_DMG * run.team.st.comboDmg * (1 + run.floor * 0.08) * ((dmgMul(run, a) + dmgMul(run, b)) / 2);
    fx('snd', 'combo'); fx('flash', '#ffffff', 0.6); fx('shake', 7);
    fx('banner', name + '!', '💞 합동기 💞');
    fx('ring', mx, my - 6, 6, 170, '#ff7aa8', 0.7); fx('ring', mx, my - 6, 4, 130, '#fff3a0', 0.55);
    fx('hearts', mx, my, 24);
    const syn = run.synergy;
    for (const e of allTargets(run)) {
      if (Math.abs(e.x - run.camX) > C.W / 2 + 20 || Math.abs(e.y - run.camY) > C.H / 2 + 20) continue;
      Cb.hitEnemy(run, e, dm, { p: a, kind: 'combo', x: mx, y: my, knock: 200 });
      if (!e.boss) e.stun = Math.max(e.stun, syn.includes('ice') ? 3 : 1.5);
      if (syn.includes('fire')) e.burn = 5;
      if (syn.includes('ice')) e.frozen = 2;
    }
    for (const p of run.players) {
      if (Cb.active(p)) { Cb.heal(run, p, 2 + (p.c === 'dotori' || (p.slot === 0 ? b : a).c === 'dotori' ? 4 : 0), true); p.inv = Math.max(p.inv, 1.2); }
      if (p.c === 'kkobuk' || (p.slot === 0 ? b : a).c === 'kkobuk') p.inv = Math.max(p.inv, 3);
    }
    if (a.c === 'yeoul' || b.c === 'yeoul') for (let i = 0; i < 8; i++) Cb.proj(run, { k: 'fly', owner: 0, x: mx, y: my, life: 6, dmg: 6, r: 3, swarm: true, orbA: i * TAU / 8, cd: 0, light: 18, ownerPos: 1 });
    if (a.c === 'nyang' || b.c === 'nyang') for (let i = 0; i < 6; i++) { const aa = i * TAU / 6; Cb.proj(run, { k: 'bigbomb', owner: 0, x: mx + Math.cos(aa) * 60, y: my + Math.sin(aa) * 40, life: 0.5 + i * 0.1, dmg: 20, rad: 40, fuse: 0.5 + i * 0.1, still: true }); }
    if (run.stats.combos === 1 && !G.Save.data.stats.combos) G.Run.photo(run, `${a.name}와(과) ${b.name}의 첫 합동기 「${name}」 💞`);
    run.stats.comboNames = name;
  };

  // ───────────── 적 피해
  Cb.inLight = (run, x, y) => G.Run.inLight(run, x, y);
  Cb.hitEnemy = function (run, e, dmg, src) {
    if (e.dead || e.under || (e.boss && e.hidden)) return false;
    const p = src.p;
    const def = e.def;
    if (def && def.shadow && src.kind !== 'combo' && !Cb.inLight(run, e.x, e.y)) {
      if (!e.shadowSaid || run.time - e.shadowSaid > 2) { e.shadowSaid = run.time; fx('txt', e.x, e.y - 16, '빛이 필요해!', '#d7a8ff', 6); }
      return false;
    }
    let d = dmg;
    let crit = false;
    if (p && src.kind !== 'dot' && src.kind !== 'beam') {
      const cc = p.st.crit + (run.synergy.includes('star') ? 0.1 : 0);
      if (Math.random() < cc) { crit = true; d *= p.st.critMul; }
      if (p.st.brittle && (e.slowT > 0 || e.frozen > 0)) d *= 1 + p.st.brittle;
    }
    // 등불 보너스
    for (const q of run.players) if (G.CHARS[q.c].lightPower && Cb.active(q) && U.dist(q.x, q.y, e.x, e.y) < q.lightR) { d *= 1.2; break; }
    // 정면 방어
    if ((def && def.front) || (e.boss && e.front)) {
      const fa = e.fa != null ? e.fa : 0;
      if (src.kind !== 'dot' && src.kind !== 'beam' && src.kind !== 'combo' && Math.abs(U.angDiff(fa, U.ang(e.x, e.y, src.x, src.y))) < 1.0) {
        d *= e.boss ? 0.1 : 0.2;
        if (!e.clankT || run.time - e.clankT > 0.3) { e.clankT = run.time; fx('txt', e.x, e.y - 18, '캉!', '#bfefff', 7); fx('snd', 'block'); fx('burst', e.x, e.y - 8, 4, '#e0f4ff', 50, 0.25); }
      }
    }
    if (def && def.mineWeak && src.mine) d *= 2;
    if (e.boss && e.vuln) d *= e.vuln;
    if (e.frozen > 0) d *= 1.15;
    d = Math.max(1, Math.round(d));
    e.hp -= d; e.flash = 0.09;
    if (p) run.stats.dmg[p.slot] += d;
    if (G.settings.dmgNum !== false || true) fx('dmg', e.x, e.y - (e.boss ? 30 : 12), d, crit ? 1 : 0);
    if (crit) { fx('snd', 'crit'); run.hitstop = Math.max(run.hitstop, 0.05); } else if (src.kind !== 'dot' && src.kind !== 'beam') fx('snd', 'hit');
    if (def && def.ai === 'flee' && src.kind !== 'dot' && src.kind !== 'beam' && Math.random() < 0.7) Cb.drop(run, 'gem', e.x, e.y, 1, 1);
    if (src.knock && !e.boss && !(def && def.heavy) && e.affix !== 'tough') {
      const a = U.ang(src.x, src.y, e.x, e.y);
      const k = src.knock * (e.elite ? 0.5 : 1) * (def && def.ai === 'slam' ? 0.3 : 1);
      e.kvx += Math.cos(a) * k; e.kvy += Math.sin(a) * k;
    }
    // 효과
    if (p && src.kind !== 'dot' && src.kind !== 'beam') {
      if (p.st.burn && Math.random() < p.st.burn) e.burn = 3;
      if (src.burn) e.burn = 3;
      if (p.st.slow && Math.random() < p.st.slow) e.slowT = 2;
      if (p.st.chain && Math.random() < p.st.chain + (run.synergy.includes('bolt') ? 0.1 : 0)) chain(run, e, d * 0.5, p.st.chainN, p);
      if (crit && p.st.starshot) for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; Cb.proj(run, { k: 'star', owner: p.slot, x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: 4 * dmgMul(run, p), life: 0.5, r: 3, hit0: e.id }); }
    }
    run.team.heart = Math.min(C.HEART_MAX, run.team.heart + d * 0.018 * run.team.st.heartGain);
    if (e.hp <= 0) {
      if (e.boss) G.Boss.die(run, e);
      else Cb.killEnemy(run, e, src);
    }
    return true;
  };
  function chain(run, from, dmg, n, p) {
    let cur = from; const seen = new Set([from.id]);
    for (let i = 0; i < n; i++) {
      let best = null, bd = 70 * 70;
      for (const e of run.enemies) { if (e.dead || e.under || seen.has(e.id)) continue; const d2 = U.dist2(cur.x, cur.y, e.x, e.y); if (d2 < bd) { bd = d2; best = e; } }
      if (!best) break;
      seen.add(best.id);
      fx('bolt', cur.x, cur.y - 8, best.x, best.y - 8);
      Cb.hitEnemy(run, best, dmg, { p, kind: 'dot', x: cur.x, y: cur.y });
      cur = best;
    }
  }
  Cb.chain = chain;

  Cb.killEnemy = function (run, e, src) {
    if (e.dead) return;
    e.dead = true;
    const def = e.def;
    const p = src && src.p;
    run.stats.kills++;
    run.codexKills[e.type] = (run.codexKills[e.type] || 0) + 1;
    fx('burst', e.x, e.y - 6, e.elite ? 22 : 10, [def.col[0], def.col[1], '#ffffff'], 70, 0.5);
    fx('poof', e.x, e.y - 6);
    fx('snd', 'kill');
    const xp = def.xp * (e.elite ? 5 : 1);
    if (xp > 0) {
      const big = Math.floor(xp / 3), small = xp - big * 3;
      for (let i = 0; i < big; i++) Cb.drop(run, 'xpb', e.x, e.y, 1, 3);
      for (let i = 0; i < small; i++) Cb.drop(run, 'xp', e.x, e.y, 1, 1);
    }
    if (Math.random() < (e.elite ? 1 : 0.22)) Cb.drop(run, 'gem', e.x, e.y, e.elite ? 6 : 1, 1);
    if (e.elite) {
      Cb.drop(run, 'heart', e.x, e.y, 1, 2); if (Math.random() < 0.35) Cb.drop(run, 'gemb', e.x, e.y, 1, 5);
      if (Math.random() < 0.2) Cb.drop(run, 'relic', e.x, e.y, 1, 1);
      if (Math.random() < 0.04) Cb.drop(run, 'egg', e.x, e.y, 1, 1);
    } else if (Math.random() < 0.025 * (run.curse.hunger ? 0.4 : 1)) Cb.drop(run, 'heart', e.x, e.y, 1, 2);
    if (e.type === 'goldmole') {
      run.stats.moles++;
      Cb.drop(run, 'gem', e.x, e.y, 10 + run.floor, 2); Cb.drop(run, 'gemb', e.x, e.y, 4, 5);
      if (Math.random() < 0.5) Cb.drop(run, 'star', e.x, e.y, 1, 1);
      fx('banner', '보물 두더지를 잡았다! 🦫', '광석이 와르르~'); fx('snd', 'chest');
    }
    if (e.type === 'mimic') {
      run.stats.mimics++;
      Cb.drop(run, 'gem', e.x, e.y, Math.round((6 + run.floor) * 2 * run.team.st.chestMul), 1);
      Cb.drop(run, 'heart', e.x, e.y, 2, 2); Cb.drop(run, 'star', e.x, e.y, 1, 1);
      if (Math.random() < 0.3) Cb.drop(run, 'egg', e.x, e.y, 1, 1);
      run.pendingLv++;
      fx('txt', e.x, e.y - 24, '보물 두 배! 🎁🎁', '#ffd36b', 9); fx('snd', 'chest');
    }
    if (p && p.st.fruit && Math.random() < p.st.fruit) Cb.drop(run, 'fruit', e.x, e.y, 1, 1);
    if (p && p.st.vamp && Math.random() < p.st.vamp) Cb.heal(run, p, 1);
    const beam = run.tether.on;
    run.team.heart = Math.min(C.HEART_MAX, run.team.heart + (beam ? C.HEART_PER_KILL_TETHER : C.HEART_PER_KILL) * run.team.st.heartGain * (run.synergy.includes('star') ? 1.3 : 1));
    if (def.split) for (let i = 0; i < 2; i++) G.Run.spawnEnemy(run, def.split, e.x + (i ? 6 : -6), e.y, { elite: false, noPop: true });
    if (e.type === 'mushroom' && Math.random() < 0.5) G.Run.hazard(run, 'spore', e.x, e.y, 12, 1.5);
  };

  // ───────────── 플레이어 피해 / 회복
  Cb.hurt = function (run, p, dmg, src) {
    if (!Cb.active(p) || p.inv > 0 || p.state === 'd') return false;
    for (const o of run.objects) if (o.k === 'dome' && U.dist(o.x, o.y, p.x, p.y) < o.ex) return false;
    if (run.team.st.featherShield && !p.featherUsed) { p.featherUsed = true; p.inv = 0.8; fx('txt', p.x, p.y - 20, '깃털 보호!', '#ffffff', 7); fx('snd', 'block'); return false; }
    if (p.st.block && Math.random() < p.st.block) { p.inv = 0.4; fx('txt', p.x, p.y - 20, '막았다!', '#bfefff', 7); fx('snd', 'block'); fx('burst', p.x, p.y - 6, 5, '#bfefff', 40, 0.3); return false; }
    let d = dmg * (1 + run.star * C.STAR_DMG) + (p.st.hurtPlus || 0);
    d = Math.floor(d) + (Math.random() < d % 1 ? 1 : 0);
    d = Math.max(1, d);
    p.hp -= d; p.inv = C.IFRAMES; p.flash = 0.12;
    run.stats.hitsTaken++; run.floorHits++;
    fx('snd', 'hurt'); fx('shake', 4); fx('burst', p.x, p.y - 6, 8, ['#ff5c7a', '#ffffff'], 60, 0.35);
    fx('dmg', p.x, p.y - 18, d, 2);
    if (src && src.x != null) { const a = U.ang(src.x, src.y, p.x, p.y); p.vx += Math.cos(a) * 120; p.vy += Math.sin(a) * 120; }
    if (p.st.thorns) for (const e of run.enemies) if (!e.dead && U.dist(p.x, p.y, e.x, e.y) < 34) Cb.hitEnemy(run, e, p.st.thorns * dmgMul(run, p), { p, kind: 'dot', x: p.x, y: p.y });
    if (p.hp <= 0) {
      p.hp = 0;
      if (p.st.phoenix && !p.phoenixUsed) {
        p.phoenixUsed = true; p.hp = 4; p.inv = 2;
        fx('banner', '불사조!', p.name + ' 부활 🔥'); fx('ring', p.x, p.y - 6, 4, 60, '#ff8a4c', 0.5); fx('snd', 'revive');
        return true;
      }
      p.state = 'x'; p.downT = run.downTime || C.DOWN_TIME; p.rv = 0; p.vx = p.vy = 0;
      fx('snd', 'down');
      const q = run.players[1 - p.slot];
      fx('say', p.slot, '으앙… 😢');
      if (Cb.active(q)) fx('say', q.slot, U.josa(p.name, '아/야') + '!!');
      run.stats.downs++;
    }
    return true;
  };
  Cb.heal = function (run, p, v, silent) {
    if (!Cb.active(p)) return;
    const h = Math.round(v * run.team.st.healMul * (p.c === 'dotori' || run.players[1 - p.slot].c === 'dotori' ? 1.5 : 1));
    const before = p.hp;
    p.hp = Math.min(p.st.maxHp, p.hp + h);
    if (p.hp > before) { fx('txt', p.x, p.y - 20, '+' + (p.hp - before) / 2 + '♥', '#ff7aa8', 7); if (!silent) fx('snd', 'heal'); fx('hearts', p.x, p.y - 8, 4); }
  };

  // ───────────── 줍는 것
  Cb.drop = function (run, k, x, y, n, v) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 30 + Math.random() * 50;
      run.pickups.push({ id: U.id(), k, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v, t: 0 });
    }
  };

  Cb.updatePickups = function (run, dt) {
    const m = run.map;
    for (let i = run.pickups.length - 1; i >= 0; i--) {
      const k = run.pickups[i];
      k.t += dt;
      if (k.life && k.t > k.life) { run.pickups.splice(i, 1); continue; }
      // 자석
      const magnetic = k.k === 'xp' || k.k === 'xpb' || k.k === 'gem' || k.k === 'gemb' || k.k === 'star';
      let target = null, td = 1e9;
      for (const p of run.players) {
        if (!Cb.active(p)) continue;
        const d = U.dist(p.x, p.y, k.x, k.y);
        const range = magnetic ? p.st.magnet : 10;
        if (d < range && d < td && k.t > 0.25) { td = d; target = p; }
      }
      if (target && magnetic) {
        const a = U.ang(k.x, k.y, target.x, target.y), sp = 60 + (1 - td / target.st.magnet) * 220 + k.t * 40;
        k.vx = U.lerp(k.vx, Math.cos(a) * sp, 0.25); k.vy = U.lerp(k.vy, Math.sin(a) * sp, 0.25);
      } else { k.vx *= 1 - 5 * dt; k.vy *= 1 - 5 * dt; }
      const b = { x: k.x, y: k.y };
      G.World.move(m, b, k.vx * dt, k.vy * dt, 2);
      k.x = b.x; k.y = b.y;
      if (target && td < (magnetic ? 7 : 11)) {
        if (collect(run, k, target)) run.pickups.splice(i, 1);
      }
    }
  };
  Cb.collect = (run, k, p) => collect(run, k, p);
  function collect(run, k, p) {
    const T = run.team;
    switch (k.k) {
      case 'xp': case 'xpb':
        T.xp += k.v * T.st.xpMul * p.st.xpMul; fx('snd', 'xp'); return true;
      case 'gem': case 'gemb':
      { const g = k.v * T.st.gemMul * (run.fmod === 'gold' ? 2 : 1);
        T.gems += g; run.stats.gems += g; fx('snd', 'gem'); fx('txt', p.x, p.y - 20, '+' + Math.round(g) + '💎', '#ffd36b', 6); return true; }
      case 'star': T.stars += 1; fx('snd', 'ach'); fx('txt', p.x, p.y - 20, '+1 별조각 ⭐', '#fff3a0', 8); return true;
      case 'heart':
        if (p.hp >= p.st.maxHp) { const q = run.players[1 - p.slot]; if (!(Cb.active(q) && q.hp < q.st.maxHp)) return false; }
        Cb.heal(run, p, 2);
        return true;
      case 'fruit': Cb.heal(run, p, 1); return true;
      case 'relic': run.pendingRelic = true; fx('txt', p.x, p.y - 24, '유물 상자! 🎁', '#ffd36b', 8); fx('snd', 'chest'); return true;
      case 'egg': run.eggsFound++; fx('txt', p.x, p.y - 24, '알을 주웠어요! 🥚', '#fff3e0', 8); fx('snd', 'ach'); fx('say', p.slot, '굴집에서 품어 주자!'); return true;
      case 'key': run.flowerKey = true; fx('banner', '🌸 꽃잎 열쇠', '가장 깊은 곳 너머, 비밀의 문이 열릴 것 같아요…'); fx('snd', 'wish'); return true;
      case 'lampshroom': p.lightTemp = true; p.lightR = Math.max(p.lightR, 80); fx('say', p.slot, '빛 버섯이다! 🍄'); fx('snd', 'pick'); return true;
      case 'pickcrate': p.mineTemp = true; fx('say', p.slot, '곡괭이 획득! ⛏️'); fx('snd', 'pick'); return true;
      case 'lunch': {
        if (k.eaten[p.slot]) return false;
        k.eaten[p.slot] = true;
        Cb.heal(run, p, k.v); p.buff = 0.25; p.buffT = 7;
        fx('txt', p.x, p.y - 26, '냠냠! 힘이 솟아요', '#ffd36b', 7);
        return !!(k.eaten[0] && k.eaten[1]) || !Cb.active(run.players[1 - p.slot]);
      }
    }
    return true;
  }

  // ───────────── 투사체 업데이트
  Cb.updateProjs = function (run, dt) {
    const m = run.map;
    const list = run.projs.slice(), gone = new Set();
    for (const pr of list) {
      if (gone.has(pr)) continue;
      pr.t += dt; pr.life -= dt;
      let dead = false;
      if (pr.lob) {
        // 포물선 (폭탄/바위)
        const k = Math.min(1, pr.t / pr.ft);
        pr.x = U.lerp(pr.sx, pr.tx, k); pr.y = U.lerp(pr.sy, pr.ty, k);
        pr.z = Math.sin(k * Math.PI) * Math.min(40, pr.ft * 50);
        if (k >= 1 && !pr.landed) { pr.landed = true; pr.z = 0; if (pr.owner < 0) { explodeEnemy(run, pr); dead = true; } }
        if (pr.landed && pr.owner >= 0 && pr.life <= 0) { explode(run, pr); dead = true; }
      } else if (pr.still) {
        if (pr.k === 'meteor') pr.z = Math.max(0, pr.life * 150);
        if (pr.life <= 0) { explode(run, pr); dead = true; }
        pr.hot = pr.life < 0.4;
      } else if (pr.swarm) {
        const owner = pr.ownerPos ? null : run.players[pr.owner];
        pr.cd -= dt;
        let tgt = pr.t > 0.4 ? nearestEnemy(run, pr.x, pr.y, 150) : null;
        let tx, ty;
        if (tgt && pr.cd <= 0) { tx = tgt.x; ty = tgt.y - 6; }
        else {
          pr.orbA += dt * 3.5;
          const cx = owner ? owner.x : pr.x, cy = owner ? owner.y : pr.y;
          tx = cx + Math.cos(pr.orbA) * 20; ty = cy - 6 + Math.sin(pr.orbA) * 14;
        }
        const a = U.ang(pr.x, pr.y, tx, ty), sp = tgt ? 200 : 150;
        pr.vx = U.lerp(pr.vx, Math.cos(a) * sp, 0.15); pr.vy = U.lerp(pr.vy, Math.sin(a) * sp, 0.15);
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        if (tgt && pr.cd <= 0 && U.dist(pr.x, pr.y, tgt.x, tgt.y) < tgt.r + 5) {
          Cb.hitEnemy(run, tgt, pr.dmg, { p: run.players[pr.owner], kind: 'proj', x: pr.x, y: pr.y, knock: 20 });
          pr.cd = 0.35;
        }
        if (pr.life <= 0) dead = true;
      } else {
        // 유도
        if (pr.homing && pr.owner >= 0) {
          const tgt = nearestEnemy(run, pr.x, pr.y, 90, Math.atan2(pr.vy, pr.vx), 1.2);
          if (tgt && !pr.hit.has(tgt.id)) {
            const sp = Math.hypot(pr.vx, pr.vy), a = Math.atan2(pr.vy, pr.vx);
            const na = a + U.clamp(U.angDiff(a, U.ang(pr.x, pr.y, tgt.x, tgt.y)), -pr.homing * dt, pr.homing * dt);
            pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
          }
        }
        const b = { x: pr.x, y: pr.y };
        const hitWall = G.World.move(m, b, pr.vx * dt, pr.vy * dt, 1);
        pr.x = b.x; pr.y = b.y;
        if (hitWall) {
          if (pr.bounce > 0) {
            pr.bounce--;
            if (G.World.solidAt(m, pr.x + Math.sign(pr.vx) * 3, pr.y)) pr.vx *= -1; else pr.vy *= -1;
          } else {
            if (pr.explode) explode(run, Object.assign(pr, { rad: pr.explode }));
            fx('burst', pr.x, pr.y - 4, 3, pr.owner >= 0 ? '#fff3a0' : '#ff9eb5', 30, 0.25);
            dead = true;
          }
        }
        if (!dead && pr.owner >= 0) {
          // 적 충돌
          const cands = run.enemies.concat(run.boss && !run.boss.hidden ? [run.boss] : []);
          for (const e of cands) {
            if (e.dead || e.under || pr.hit.has(e.id) || e.id === pr.hit0) continue;
            if (U.dist2(pr.x, pr.y, e.x, e.y - (e.boss ? 10 : 3)) > (e.r + pr.r) * (e.r + pr.r)) continue;
            const ok = Cb.hitEnemy(run, e, pr.dmg, { p: run.players[pr.owner], kind: 'proj', x: pr.x - pr.vx * 0.05, y: pr.y - pr.vy * 0.05, knock: 50, burn: pr.burn });
            pr.hit.add(e.id);
            if (pr.chill && ok) e.slowT = Math.max(e.slowT, pr.chill);
            if (pr.explode) { explode(run, Object.assign(pr, { rad: pr.explode })); dead = true; break; }
            if (pr.k === 'acorn' && pr.bounce > 0 && ok) {
              pr.bounce--;
              const nx = nearestEnemy(run, pr.x, pr.y, 90);
              if (nx && !pr.hit.has(nx.id)) { const a = U.ang(pr.x, pr.y, nx.x, nx.y), sp = Math.hypot(pr.vx, pr.vy); pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; pr.life = Math.max(pr.life, 0.5); continue; }
            }
            if (pr.pierce > 0) { pr.pierce--; continue; }
            dead = true; break;
          }
          // 상자
          for (const o of run.objects) if (o.k === 'chest' && o.st === 0 && U.dist(pr.x, pr.y, o.x, o.y - 4) < 10) { G.Run.openChest(run, o); dead = true; }
        } else if (!dead && pr.owner < 0) {
          for (const o of run.objects) if (o.k === 'dome' && U.dist(o.x, o.y, pr.x, pr.y) < o.ex) { dead = true; fx('burst', pr.x, pr.y, 4, '#c8ffc0', 30, 0.2); }
          if (!dead) for (const p of run.players) {
            if (!Cb.active(p)) continue;
            if (U.dist2(pr.x, pr.y, p.x, p.y - 3) < (p.r + pr.r) * (p.r + pr.r)) { if (Cb.hurt(run, p, pr.dmg, { x: pr.x - pr.vx, y: pr.y - pr.vy }) && pr.slow) p.slowT = pr.slow; dead = true; break; }
          }
        }
        if (pr.life <= 0) { if (pr.explode) explode(run, Object.assign(pr, { rad: pr.explode })); dead = true; }
      }
      if (dead) gone.add(pr);
    }
    if (gone.size) run.projs = run.projs.filter(p => !gone.has(p));
  };

  function explode(run, pr) {
    const rad = pr.rad || 24, p = run.players[pr.owner];
    if (pr.k === 'rune' || pr.k === 'meteor') {
      const rune = pr.k === 'rune';
      fx('ring', pr.x, pr.y - 2, 3, rad, rune ? '#d7a8ff' : '#fff3a0', 0.3);
      fx('burst', pr.x, pr.y - 4, rune ? 8 : 14, ['#d7a8ff', '#ffffff', '#fff3a0'], rad * 3, 0.4);
      fx('snd', rune ? 'hit' : 'boom'); if (!rune) fx('shake', 2);
    } else {
      fx('boom', pr.x, pr.y, rad, pr.big ? 1 : 0);
      fx('snd', pr.big ? 'bigboom' : 'boom'); fx('shake', pr.big ? 6 : 3);
    }
    for (const e of allTargets(run)) {
      if (U.dist(pr.x, pr.y, e.x, e.y) > rad + e.r) continue;
      Cb.hitEnemy(run, e, pr.dmg, { p, kind: 'aoe', x: pr.x, y: pr.y, knock: pr.big ? 180 : 90, mine: true, burn: pr.burn });
    }
    for (const o of run.objects) if (o.k === 'chest' && o.st === 0 && U.dist(pr.x, pr.y, o.x, o.y) < rad) G.Run.openChest(run, o);
    if (pr.k === 'bomb' || pr.k === 'bigbomb') Cb.mineArea(run, pr.x, pr.y, rad * 0.75, pr.big ? 3 : 1.5, p);
    run.hitstop = Math.max(run.hitstop, pr.big ? 0.07 : 0.03);
  }
  function explodeEnemy(run, pr) {
    const rad = pr.rad || 20;
    fx('boom', pr.x, pr.y, rad, 0); fx('snd', 'boom'); fx('shake', 3);
    for (const p of run.players) if (Cb.active(p) && U.dist(pr.x, pr.y, p.x, p.y) < rad + p.r) Cb.hurt(run, p, pr.dmg, { x: pr.x, y: pr.y });
    if (pr.after) G.Run.hazard(run, pr.after, pr.x, pr.y, 14, 4);
  }
  Cb.explodeEnemy = explodeEnemy;

  return Cb;
})();
