// 원정(런) 시뮬레이션 — 방장/로컬에서만 실행
G.Run = (function () {
  const RN = {};
  const U = G.U, C = G.C, S = C.TILE;
  const fx = (...a) => G.fx(...a);
  const Cb = G.Cb;
  const xpFor = l => Math.floor(C.XP_BASE + l * 6 + Math.pow(l, 1.5) * 2.2);

  // ───────────── 생성
  RN.create = function (o) {
    const save = G.Save.data;
    const seed = o.daily ? U.hashStr('daily-' + U.today()) : o.weekly ? U.hashStr('weekly-' + U.weekKey()) : (Math.random() * 1e9) >>> 0;
    const run = {
      seed, floor: 0, star: o.star || 0, daily: !!o.daily, endless: false, rush: !!o.rush, weekly: o.weekly || null,
      players: [0, 1].map(i => Cb.newPlayer(i, o.chars[i], o.names[i], o.hats[i], save)),
      team: { st: Cb.teamStats(), xp: 0, lvl: 1, xpNext: xpFor(1), heart: 0, gems: 0, stars: 0, relics: [], rerolls: 0 },
      enemies: [], projs: [], pickups: [], objects: [], hazards: [], tels: [], delayed: [], boss: null,
      ui: null, pendingLv: 0, pendingRelic: false, nextFloorPending: false, relicTurn: 0,
      time: 0, floorTime: 0, hitstop: 0,
      tether: { on: false, far: false, sepT: 0, tickT: 0, regenT: 0 },
      synergy: [], darkMul: 1, beamBoost: 1,
      stats: { kills: 0, dmg: [0, 0], revives: [0, 0], combos: 0, ores: 0, gems: 0, downs: 0, hitsTaken: 0, floors: 0, nohitBoss: 0, handFloors: 0, telepathy: 0,
        moles: 0, mimics: 0, puzzles: 0, carts: 0, gambleFloor: 0, garden: 0 },
      codexKills: {}, cardsPicked: {}, relicsFound: {}, bossesKilled: [],
      hintFlags: {}, hint: null, hintT: 0, sayQ: [],
      camX: 0, camY: 0, spawnT: C.AMBIENT_SPAWN_EVERY, mapVer: 0, flowT: 0, floorHits: 0, floorFar: false,
      // 새 기능
      curse: {}, heat: 0, path: null, pathNow: null, fmod: null, eggsFound: 0, flowerKey: false, garden: false,
      pings: [], pets: [], cart: null, hpMul: 1, enemySpd: 1, shopMul: 1, floorDisc: 0, noBeam: false, downTime: C.DOWN_TIME, collapseT: 0, meal: null,
    };
    for (const id of save.skills) if (G.SKILL[id]) G.SKILL[id].apply(run.team, run.players);
    run.team.st.floorHeal += Math.floor(save.garden / 2);
    // 깊은 밤 저주
    const curses = (o.curses || []).slice();
    if (run.weekly === 'cursed') for (const c of U.RNG(seed).shuffle(G.CURSES).slice(0, 3)) if (!curses.includes(c.id)) curses.push(c.id);
    for (const id of curses) if (G.CURSE[id]) { run.curse[id] = 1; run.heat += G.CURSE[id].heat; }
    applyCurses(run);
    applyWeekly(run);
    applyMeal(run, save);
    run.team.heart = run.team.st.startHeart;
    run.team.rerolls = run.team.st.rerolls;
    for (const p of run.players) { p.hp = p.st.maxHp; p.lightR = p.st.light; }
    if (run.team.st.startRelic) run.pendingRelic = true;
    if (run.rush) { run.pendingLv += 5; run.pendingRelic = true; }
    G.Pet.init(run);
    RN.startFloor(run, run.rush ? 3 : 1);
    return run;
  };

  function applyCurses(run) {
    const cu = run.curse;
    if (cu.dark) run.players.forEach(p => { p.st.light *= 0.7; p.st.fearMul *= 1.5; });
    if (cu.fury) run.enemySpd *= 1.25;
    if (cu.fragile) { run.team.st.reviveSpd *= 0.5; run.downTime = C.DOWN_TIME * 0.5; }
    if (cu.hunger) run.team.st.floorHeal = 0;
    if (cu.poor) run.shopMul *= 1.5;
  }
  function applyWeekly(run) {
    switch (run.weekly) {
      case 'bombfest': run.players.forEach(p => (p.st.area += 0.3)); break;
      case 'glass': run.players.forEach(p => { p.st.maxHp = 2; p.st.dmg += 1; }); break;
      case 'speedy': run.players.forEach(p => (p.st.spd += 0.35)); run.enemySpd *= 1.35; break;
      case 'giant': run.hpMul *= 1.6; run.team.st.xpMul *= 2; break;
      case 'rich': run.team.st.gemMul *= 3; run.shopMul *= 2; break;
      case 'lonely': run.noBeam = true; run.players.forEach(p => (p.st.regen += 2)); break;
    }
  }
  function applyMeal(run, save) {
    const meal = save.meal; if (!meal || !G.RECIPE[meal]) return;
    const all = meal === 'rainbow';
    if (all || meal === 'tempura') run.players.forEach(p => (p.st.maxHp += 2));
    if (all || meal === 'bungeo') run.players.forEach(p => (p.st.dmg += 0.1));
    if (all || meal === 'unagi') run.players.forEach(p => { p.st.spd += 0.1; p.st.cdr *= 0.9; });
    if (all || meal === 'sushi') run.pendingLv += 2;
    run.meal = meal; save.meal = null; G.Save.write();
  }

  // 벽 옆 바위를 광석으로 (황금 층, 보물 굴)
  function goldify(m, rng, chance) {
    const T = G.T;
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const k = y * m.w + x; if (m.tiles[k] !== T.ROCK) continue;
      const adj = m.tiles[k - 1] === T.FLOOR || m.tiles[k + 1] === T.FLOOR || m.tiles[k - m.w] === T.FLOOR || m.tiles[k + m.w] === T.FLOOR;
      if (adj && rng.chance(chance)) m.tiles[k] = rng.chance(0.15) ? T.BIGORE : rng.chance(0.05) ? T.RAINBOW : T.ORE;
    }
  }
  // 벽 속이면 가까운 빈 칸으로
  function freeSpot(run, x, y) { const b = { x, y }; G.World.unstick(run.map, b, 5); return b; }

  // ───────────── 층 시작
  RN.startFloor = function (run, n) {
    run.floor = n;
    const biome = G.biomeOf(n, run.garden);
    const boss = G.isBossFloor(n);
    const gen = boss ? G.World.generateBoss(run.seed + n * 7919, n, biome) : G.World.generate(run.seed + n * 7919, n, biome);
    run.map = gen.map; run.info = gen.info;
    run.map.ver = ++run.mapVer + Math.floor(Math.random() * 1000) * 100;
    run.enemies = []; run.projs = []; run.pickups = []; run.objects = []; run.hazards = []; run.tels = []; run.delayed = [];
    run.boss = null; run.bossFight = false; run.darkMul = 1; run.beamBoost = 1;
    run.floorTime = 0; run.floorHits = 0; run.floorFar = false; run.exitT = 0; run.defeatT = 0; run.challenge = null; run.noFearFloor = false;
    run.spawnT = C.AMBIENT_SPAWN_EVERY;
    run.cart = null; run.pings = []; run.collapseT = 0; run.collapseWarn = false;
    const path = boss ? null : run.path;
    run.path = null; run.pathNow = path;
    run.floorDisc = path === 'shop' ? 0.2 : 0;
    const rng = U.RNG(run.seed + n * 131);
    // 특별한 층
    run.fmod = null;
    if (!boss && !run.rush && n >= 2 && rng.chance(path === 'mystery' ? 0.7 : 0.12)) run.fmod = rng.pick(Object.keys(G.FLOOR_MODS));
    if (run.fmod === 'gold') goldify(run.map, rng, 0.35);
    if (path === 'treasure') goldify(run.map, rng, 0.15);
    if (run.fmod === 'blackout') { run.darkMul = 0.45; run.beamBoost = 2; }
    const st = run.info.start;
    run.players.forEach((p, i) => {
      p.x = st.x + (i ? 9 : -9); p.y = st.y; p.vx = p.vy = 0; p.riding = false;
      G.World.unstick(run.map, p, p.r);
      if (p.state !== 'n') { p.state = 'n'; p.hp = Math.max(p.hp, C.REVIVE_HP); }
      p.phoenixUsed = false; p.featherUsed = false; p.mineTemp = false; p.lightTemp = false;
      p.lightR = p.st.light; p.fear = 0; p.inv = 1.5; p.dashT = 0;
      if (n > 1 && run.team.st.floorHeal) Cb.heal(run, p, run.team.st.floorHeal, true);
      if (path === 'camp') p.hp = p.st.maxHp;
    });
    run.camX = st.x; run.camY = st.y; run.camSnap = true;
    // 문
    if (!boss) run.objects.push({ id: U.id(), k: 'door', x: run.info.exit.x, y: run.info.exit.y, st: 0, prog: 0 });
    // 방
    for (const r of run.info.rooms) {
      if (r.type === 'shop') run.objects.push({ id: U.id(), k: 'shop', x: r.x, y: r.y, st: 0, items: shopItems(run, rng) });
      if (r.type === 'fountain' && !run.curse.poor) run.objects.push({ id: U.id(), k: 'fountain', x: r.x, y: r.y, st: 0 });
      if (r.type === 'altar') run.objects.push({ id: U.id(), k: 'altar', x: r.x, y: r.y, st: 0 });
      if (r.type === 'event') run.objects.push({ id: U.id(), k: 'event', x: r.x, y: r.y, st: 0, ex: rng.pick(EVENT_KEYS) });
      if (r.type === 'plates') {
        const pid = U.id();
        run.objects.push({ id: U.id(), k: 'plate', x: r.x - 30, y: r.y + 8, st: 0, pid }, { id: U.id(), k: 'plate', x: r.x + 30, y: r.y + 8, st: 0, pid });
        run.objects.push({ id: U.id(), k: 'chest', x: r.x, y: r.y - 16, st: 0, locked: pid, bonus: true });
      }
      if (r.type === 'bells') {
        const pid = U.id();
        run.objects.push({ id: U.id(), k: 'bell', x: r.x, y: r.y, st: 0, pid, first: true }, { id: U.id(), k: 'bell', x: r.x2, y: r.y2, st: 0, pid });
      }
    }
    if (run.info.chest) {
      const c = run.info.chest;
      const o = { id: U.id(), k: 'chest', x: c.x, y: c.y, st: 0, hidden: c.hidden };
      if (!c.hidden && n >= 2 && rng.chance(0.15)) o.mimic = true;
      if (c.hidden && (n === 10 || n === 11) && !run.flowerKey && !run.rush && rng.chance(0.5)) o.key = true;
      run.objects.push(o);
    }
    if (run.info.cart) { const c = run.info.cart; run.objects.push({ id: U.id(), k: 'cart', x: c.x0, y: c.y, st: 0, x1: c.x1 }); }
    // 갈림길 보너스: 몬스터 무리 자리를 빌려 배치
    const takePack = () => (run.info.packs.length ? run.info.packs.splice(rng.int(0, run.info.packs.length - 1), 1)[0] : null);
    if (path === 'treasure') for (let i = 0; i < 2; i++) { const pk = takePack(); if (pk) run.objects.push({ id: U.id(), k: 'chest', x: pk.x, y: pk.y, st: 0, bonus: true }); }
    if (path === 'shop' && !run.objects.some(o => o.k === 'shop')) { const pk = takePack(); if (pk) run.objects.push({ id: U.id(), k: 'shop', x: pk.x, y: pk.y, st: 0, items: shopItems(run, rng) }); }
    if (path === 'mystery') for (let i = 0; i < 2; i++) { const pk = takePack(); if (pk) run.objects.push({ id: U.id(), k: 'event', x: pk.x, y: pk.y, st: 0, ex: rng.pick(EVENT_KEYS) }); }
    if (path === 'camp') { const b = freeSpot(run, st.x, st.y - 22); run.objects.push({ id: U.id(), k: 'camp', x: b.x, y: b.y, st: 0 }); }
    // 조합 보조
    if (!boss) {
      if (!run.players.some(p => G.CHARS[p.c].miner)) run.pickups.push({ id: U.id(), k: 'pickcrate', x: st.x + 20, y: st.y + 10, vx: 0, vy: 0, v: 1, t: 0 });
      if (!run.players.some(p => G.CHARS[p.c].lightPower)) run.pickups.push({ id: U.id(), k: 'lampshroom', x: st.x - 20, y: st.y + 10, vx: 0, vy: 0, v: 1, t: 0 });
    }
    // 몬스터
    if (boss) {
      G.Boss.spawn(run, biome.boss, run.info.arena.x, run.info.arena.y);
    } else {
      const packMul = (run.fmod === 'baby' ? 1.8 : 1) * (path === 'battle' ? 1.5 : 1);
      const eliteP = 0.08 + n * 0.012 + (path === 'battle' ? 0.15 : 0) + (run.curse.elite ? 0.25 : 0);
      run.info.packs.forEach((pk, pi) => {
        const cnt = Math.round((2 + rng.int(0, 2) + Math.floor(n / 4)) * packMul);
        let elite = rng.chance(eliteP) || (run.curse.elite && pi === 0);
        for (let i = 0; i < cnt; i++) {
          const type = rng.pick(biome.enemies);
          const a = rng() * Math.PI * 2, r = rng.range(4, 20);
          let x = pk.x + Math.cos(a) * r, y = pk.y + Math.sin(a) * r;
          if (G.World.solidAt(run.map, x, y)) { x = pk.x; y = pk.y; }
          RN.spawnEnemy(run, type, x, y, { elite, noPop: true, dormant: true });
          elite = false;
        }
      });
      // 보물 두더지
      if (!run.rush && run.info.packs.length && rng.chance(0.25)) {
        const pk = rng.pick(run.info.packs);
        RN.spawnEnemy(run, 'goldmole', pk.x, pk.y, { noPop: true, dormant: true });
      }
    }
    RN.computeLight(run);
    G.AI.flow(run);
    G.Pet.place(run);
    fx('music', boss ? 'none' : biome.music);
    const fi = ((n - 1) % 3) + 1;
    const fm = run.fmod && G.FLOOR_MODS[run.fmod], pa = path && G.PATHS[path];
    const sub = boss ? '⚠ 보스의 방 ⚠' : fm ? `${fm.icon} ${fm.name} — ${fm.desc}` : pa ? `${pa.icon} ${pa.name}` :
      (n === 1 ? (run.meal ? `${G.RECIPE[run.meal].icon} ${G.RECIPE[run.meal].name} 먹고 힘내자! — ${G.RECIPE[run.meal].desc}` : '둘이 함께라면 무섭지 않아 💞') : '');
    fx('banner', biome.name + (n > 12 ? ` ${n}층` : ` ${Math.ceil(n / 3)}-${fi}`), sub);
    if (n === 1) RN.hintOnce(run, 'move', 'WASD / 방향키로 이동 · C / . 로 공격!');
    if (n === 2) RN.hintOnce(run, 'emote', '📍 E / \' 키로 신호를 보내요 · 방향키와 같이 누르면 감정표현!');
    if (boss) RN.hintOnce(run, 'boss' + biome.id, G.BOSSES[biome.boss].desc);
    if (n === 13 && run.garden) { run.stats.garden = 1; fx('banner', '🌸 비밀 꽃밭 🌸', '꽃잎 열쇠가 문을 열었어요!'); }
  };

  function shopItems(run, rng) {
    const m = (1 + run.floor * 0.08) * (1 - run.team.st.shopDisc) * run.shopMul * (1 - run.floorDisc);
    const all = [
      { k: 'potion', name: '회복 물약', icon: '🧪', desc: '둘 다 2칸 회복', cost: 12 },
      { k: 'card', name: '보너스 카드', icon: '🃏', desc: '둘 다 카드 한 장씩', cost: 26 },
      { k: 'relic', name: '신비한 유물', icon: '🎁', desc: '유물 하나 고르기', cost: 42 },
      { k: 'hp', name: '하트 사탕', icon: '🍬', desc: '둘 다 최대 체력 +1칸', cost: 30 },
      { k: 'heart', name: '두근 캔디', icon: '💗', desc: '두근 게이지 +50', cost: 14 },
      { k: 'reroll', name: '다시 뽑기 쿠폰', icon: '🎟️', desc: '카드 새로고침 +2', cost: 16 },
    ];
    return rng.shuffle(all).slice(0, 4).map(it => Object.assign(it, { cost: Math.max(5, Math.round(it.cost * m)), sold: false }));
  }

  RN.spawnEnemy = function (run, type, x, y, o) {
    o = o || {};
    const def = G.ENEMIES[type]; if (!def) return null;
    const f = run.floor;
    const baby = run.fmod === 'baby' && type !== 'goldmole' && type !== 'mimic';
    const hpMul = (1 + (f - 1) * C.FLOOR_HP + run.star * C.STAR_HP) * (f > 12 ? 1 + (f - 12) * 0.2 : 1) * run.hpMul * (baby ? 0.45 : 1);
    const elite = !!o.elite && type !== 'goldmole';
    const affix = elite ? U.rng.pick(G.AFFIX_KEYS) : null;
    const e = { id: U.id(), type, def, x, y, r: def.r * (elite ? 1.3 : 1) * (baby ? 0.7 : 1), hp: def.hp * hpMul * (elite ? 3.2 : 1) * (affix === 'tough' ? 1.5 : 1), maxHp: 0,
      spd: def.spd * (1 + f * 0.012) * (elite ? 0.9 : 1) * run.enemySpd * (affix === 'swift' ? 1.6 : 1), dmg: def.dmg + (f >= 10 && def.dmg ? 1 : 0), t: Math.random() * 3,
      affix, baby, harmless: !!def.harmless,
      st: def.ai === 'burrow' ? 'under' : 'walk', stT: 0.5 + Math.random() * 1.5, vx: 0, vy: 0, kvx: 0, kvy: 0, f: 1, fa: 0,
      flash: 0, burn: 0, slowT: 0, stun: 0, frozen: 0, elite, tg: -1, anim: 0, awake: !o.dormant, popT: o.noPop ? 0 : 0.35 };
    e.maxHp = e.hp;
    run.enemies.push(e);
    if (!o.noPop) fx('burst', x, y, 6, '#5a4a6a', 40, 0.4);
    return e;
  };
  RN.hazard = function (run, k, x, y, r, life) {
    if (run.hazards.length > 80) run.hazards.shift();
    run.hazards.push({ id: U.id(), k, x, y, r, life, t: 0 });
  };
  RN.photo = function (run, cap) { fx('photo', cap); };
  RN.hintOnce = function (run, key, text) {
    if (G.Save.data.tutorial[key] || run.hintFlags['h_' + key]) return;
    run.hintFlags['h_' + key] = true;
    run.hint = text; run.hintT = 7;
  };

  // ───────────── 빛
  RN.computeLight = function (run) {
    const m = run.map, grid = new Uint8Array(m.w * m.h);
    const mark = (x, y, r) => {
      const rr = r * 0.8, tx = Math.floor(x / S), ty = Math.floor(y / S), tr = Math.ceil(rr / S);
      for (let j = ty - tr; j <= ty + tr; j++) for (let i = tx - tr; i <= tx + tr; i++) {
        if (i < 0 || j < 0 || i >= m.w || j >= m.h) continue;
        if (U.dist(x, y, i * S + 8, j * S + 8) <= rr) grid[j * m.w + i] = 1;
      }
    };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = m.tiles[y * m.w + x];
      if (t === G.T.LAVA && (x + y * 3) % 3 === 0) mark(x * S + 8, y * S + 8, 46);
      if (t === G.T.CRYSTAL) mark(x * S + 8, y * S + 8, 42);
    }
    for (const d of m.deco) {
      if (d[2] === 'gm') mark(d[0], d[1], 38);
      if (d[2] === 'cr') mark(d[0], d[1], 30);
      if (d[2] === 'lamp') mark(d[0], d[1], 70);
    }
    run.lightGrid = grid; run.lightDirty = false;
  };
  RN.inLight = function (run, x, y, except) {
    const m = run.map;
    const tx = Math.floor(x / S), ty = Math.floor(y / S);
    if (run.darkMul >= 1 && tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && run.lightGrid[ty * m.w + tx]) return true;
    for (const p of run.players) {
      if (p === except || p.state === 'g') continue;
      const r = p.lightR * run.darkMul * 0.8;
      if (U.dist2(p.x, p.y, x, y) < r * r) return true;
    }
    for (const pr of run.projs) if (pr.light && U.dist2(pr.x, pr.y, x, y) < pr.light * pr.light * 0.64) return true;
    for (const h of run.hazards) if ((h.k === 'fire' || h.k === 'lavapool') && U.dist2(h.x, h.y, x, y) < 400) return true;
    if (run.tether.on) { const [a, b] = run.players; if (U.segDist(x, y, a.x, a.y, b.x, b.y) < 16) return true; }
    return false;
  };

  // ───────────── 메인 업데이트
  RN.update = function (run, inputs, dt) {
    if (run.ui) { RN.updateUI(run, inputs, dt); return; }
    // 일시정지
    for (let i = 0; i < 2; i++) if (inputs[i].pp) { openPause(run, i); return; }
    if (run.hitstop > 0) { run.hitstop -= dt; return; }
    run.time += dt; run.floorTime += dt;
    if (run.hintT > 0) { run.hintT -= dt; if (run.hintT <= 0) run.hint = null; }

    for (let i = 0; i < 2; i++) if (inputs[i].pe) emote(run, run.players[i], inputs[i]);
    for (const q of run.pings) q.t += dt;
    if (run.pings.length) run.pings = run.pings.filter(q => q.t < 4);
    updateCart(run, dt);
    for (let i = 0; i < 2; i++) updatePlayer(run, run.players[i], inputs[i], dt);
    updateTether(run, dt);
    G.Pet.update(run, dt);
    updateCollapse(run, dt);
    updateCamera(run);
    if (run.lightDirty) RN.computeLight(run);
    run.flowT -= dt; if (run.flowT <= 0) { run.flowT = 0.4; G.AI.flow(run); }

    // 몬스터
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (!e.awake) {
        e.t += dt;
        if (run.players.some(p => Cb.active(p) && U.dist2(p.x, p.y, e.x, e.y) < 150 * 150) || e.hp < e.maxHp) {
          e.awake = true;
          for (const o of run.enemies) if (!o.awake && U.dist2(o.x, o.y, e.x, e.y) < 60 * 60) o.awake = true;
        }
        continue;
      }
      G.AI.update(run, e, dt);
    }
    separate(run);
    run.enemies = run.enemies.filter(e => !e.dead);
    if (run.boss) G.Boss.update(run, run.boss, dt);
    Cb.updateProjs(run, dt);
    Cb.updatePickups(run, dt);
    updateHazards(run, dt);
    for (let i = run.tels.length - 1; i >= 0; i--) {
      const t = run.tels[i]; t.t += dt;
      if (t.own) { const o = run.enemies.find(e => e.id === t.own); if (!o) { run.tels.splice(i, 1); continue; } if (t.follow) { t.x = o.x; t.y = o.y; if (t.s === 'l') t.ang = o.fa; } }
      if (t.t >= t.T) run.tels.splice(i, 1);
    }
    for (let i = run.delayed.length - 1; i >= 0; i--) { const d = run.delayed[i]; d.t -= dt; if (d.t <= 0) { run.delayed.splice(i, 1); d.fn(); } }
    updateObjects(run, dt);
    ambientSpawn(run, dt);

    // 레벨업
    while (run.team.xp >= run.team.xpNext) {
      run.team.xp -= run.team.xpNext; run.team.lvl++; run.team.xpNext = xpFor(run.team.lvl);
      run.pendingLv++;
      fx('snd', 'levelup'); fx('txt', run.camX, run.camY - 60, 'LEVEL UP! ✨', '#ffd36b', 12, { life: 1.2 });
      for (const p of run.players) if (Cb.active(p)) { fx('ring', p.x, p.y - 6, 4, 26, '#ffd36b', 0.4); }
    }
    if (run.pendingLv > 0 && !run.ui) openLevelUp(run);
    else if (run.pendingRelic && !run.ui) openRelic(run);

    // 패배
    if (!run.players.some(Cb.active)) {
      run.defeatT += dt;
      if (run.defeatT > 2.2) openResult(run, false);
    } else run.defeatT = 0;

    // 힌트
    const [a, b] = run.players;
    if (run.team.heart >= C.HEART_MAX) RN.hintOnce(run, 'combo', '두근 게이지가 가득! 둘이 동시에 합동기 키 (B / ,) 💞');
    if (run.floorTime > 25 && run.floor === 1) RN.hintOnce(run, 'skill', '스킬 키 (V / /) 로 특별한 기술을 써 봐요 ✨');
  };

  function openPause(run, who) { run.ui = { m: 'pause', sel: 0, who }; fx('snd', 'nav'); }

  // ───────────── 신호 & 감정표현
  function emote(run, p, inp) {
    if (p.state === 'g') return;
    const dir = Math.abs(inp.x) < 0.3 && Math.abs(inp.y) < 0.3 ? 'none' : Math.abs(inp.x) > Math.abs(inp.y) ? (inp.x > 0 ? 'right' : 'left') : (inp.y > 0 ? 'down' : 'up');
    const em = G.EMOTES[dir];
    fx('say', p.slot, em.text);
    if (em.ping) {
      run.pings = run.pings.filter(q => q.slot !== p.slot);
      run.pings.push({ slot: p.slot, x: p.x, y: p.y, t: 0, help: dir === 'up' });
      fx('snd', 'tetherOn'); fx('ring', p.x, p.y - 4, 4, 26, G.COLORS.p[p.slot], 0.5);
    }
  }
  RN.emote = emote;

  // ───────────── 광차
  function boardCart(run, o, p) {
    const act = run.players.filter(Cb.active);
    if (act.some(a => U.dist(a.x, a.y, o.x, o.y) > 34)) {
      fx('say', p.slot, '같이 타자! 🛒');
      RN.hintOnce(run, 'cart', '광차는 둘이 함께 옆에 있어야 출발해요 🛒');
      return;
    }
    o.st = 1;
    run.cart = { o, x: o.x, y: o.y, x1: o.x1, lastTx: -1, hit: new Set() };
    act.forEach(a => { a.riding = true; a.state = 'n'; });
    fx('banner', '광차 출발! 🛒💨', '레일 옆 광석을 싹 쓸어 가요'); fx('snd', 'dash');
  }
  function updateCart(run, dt) {
    const c = run.cart; if (!c) return;
    c.x = Math.min(c.x1, c.x + 165 * dt);
    c.o.x = c.x;
    const tx = Math.floor(c.x / S), ty = Math.floor(c.y / S);
    if (tx !== c.lastTx) {
      c.lastTx = tx;
      for (const dy of [-1, 1]) {
        const t = G.World.get(run.map, tx, ty + dy);
        if (t === G.T.ORE || t === G.T.BIGORE || t === G.T.RAINBOW) Cb.mineTile(run, tx, ty + dy, 9, run.players[0]);
      }
    }
    for (const e of Cb.allTargets(run)) {
      if (e.boss || c.hit.has(e.id) || U.dist(c.x, c.y, e.x, e.y) > e.r + 14) continue;
      c.hit.add(e.id);
      Cb.hitEnemy(run, e, 40 * (1 + run.floor * 0.1), { p: run.players[0], kind: 'aoe', x: c.x - 10, y: c.y, knock: 260 });
    }
    if (Math.random() < 0.6) fx('burst', c.x - 10, c.y + 2, 1, '#ffd36b', 40, 0.3);
    if (c.x >= c.x1) {
      c.o.st = 2; run.cart = null; run.stats.carts++;
      run.players.forEach(p => { if (p.riding) { p.riding = false; p.inv = 1; G.World.unstick(run.map, p, p.r); } });
      fx('banner', '광차 도착! 🛒', '신난다~!'); fx('snd', 'win'); fx('shake', 4);
    }
  }

  // ───────────── 무너지는 동굴 (저주)
  function updateCollapse(run, dt) {
    if (!run.curse.collapse || G.isBossFloor(run.floor)) return;
    const T0 = C.COLLAPSE_AT;
    if (run.floorTime > T0 - 15 && !run.collapseWarn) { run.collapseWarn = true; fx('banner', '천장이 흔들려요…', '서둘러 출구로! 🪨'); fx('shake', 3); }
    if (run.floorTime < T0) return;
    run.collapseT -= dt;
    if (run.collapseT > 0) return;
    run.collapseT = Math.max(0.5, 2.4 - (run.floorTime - T0) * 0.03);
    for (const p of run.players) {
      if (!Cb.active(p)) continue;
      const x = p.x + (Math.random() - 0.5) * 70, y = p.y + (Math.random() - 0.5) * 50;
      run.tels.push({ s: 'c', x, y, a: 14, t: 0, T: 1.0 });
      run.delayed.push({ t: 1.0, fn: () => {
        fx('burst', x, y, 10, ['#8d7b6a', '#5a4a3e'], 60, 0.5); fx('snd', 'break'); fx('shake', 2);
        for (const q of run.players) if (Cb.active(q) && U.dist(q.x, q.y, x, y) < 14 + q.r) Cb.hurt(run, q, 1, { x, y });
      } });
    }
  }

  // ───────────── 플레이어
  function updatePlayer(run, p, inp, dt) {
    if (run.fmod === 'reverse') inp = Object.assign({}, inp, { x: -inp.x, y: -inp.y });
    p.ix = inp.x; p.iy = inp.y;
    if (p.inv > 0) p.inv -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.at > 0) p.at = Math.max(0, p.at - dt * 3.5);
    if (p.buffT > 0) p.buffT -= dt;
    if (p.slowT > 0) p.slowT -= dt;
    const q = run.players[1 - p.slot];
    if (p.riding && run.cart) {
      p.x = run.cart.x + (p.slot ? 6 : -6); p.y = run.cart.y - 3; p.vx = p.vy = 0; p.moving = false; p.inv = Math.max(p.inv, 0.1);
      if (Math.abs(inp.x) > 0.15) p.f = inp.x > 0 ? 1 : -1;
      p.atkCd -= dt;
      if (inp.a && p.atkCd <= 0) { Cb.attack(run, p); p.atkCd = G.CHARS[p.c].atk.cd / p.st.aspd; }
      return;
    }
    if (p.state === 'g') {
      const tx = q.x + (p.slot ? 14 : -14), ty = q.y - 10;
      p.x = U.lerp(p.x, tx, 0.05); p.y = U.lerp(p.y, ty, 0.05);
      return;
    }
    if (p.state === 'x') {
      p.downT -= dt;
      if (Cb.active(q) && U.dist(p.x, p.y, q.x, q.y) < C.REVIVE_RANGE + 6) {
        p.rv += dt * run.team.st.reviveSpd / C.REVIVE_TIME;
        if (Math.random() < 0.15) fx('hearts', p.x, p.y - 6, 1);
        if (p.rv >= 1) {
          p.state = 'n'; p.hp = C.REVIVE_HP + run.team.st.reviveHp; p.inv = 1.6; p.rv = 0; p.fear = 0;
          run.stats.revives[q.slot]++;
          fx('snd', 'revive'); fx('hearts', p.x, p.y - 8, 14); fx('ring', p.x, p.y - 6, 4, 34, '#ff7aa8', 0.5);
          fx('say', q.slot, '일어나! 💪'); run.sayQ.push({ t: 0.8, slot: p.slot, text: '고마워 💕' });
        }
      } else p.rv = Math.max(0, p.rv - dt * 0.4);
      RN.hintOnce(run, 'down', '쓰러진 친구 옆에 서 있으면 일으켜 줄 수 있어요 🫶');
      if (p.downT <= 0 && p.state === 'x') { p.state = 'g'; fx('say', p.slot, '다음 층에서 만나… 👻'); }
      return;
    }
    if (p.state === 'd') {
      const hit = G.World.moveSafe(run.map, p, p.dvx * dt, p.dvy * dt, p.r);
      const sk = G.CHARS[p.c].skill;
      if (hit && G.CHARS[p.c].miner) {
        const a = Math.atan2(p.dvy, p.dvx);
        const tx = Math.floor((p.x + Math.cos(a) * (p.r + 4)) / S), ty = Math.floor((p.y + Math.sin(a) * (p.r + 4)) / S);
        if (G.isSolidTile(G.World.get(run.map, tx, ty))) Cb.mineTile(run, tx, ty, 3, p);
      }
      const m = Cb.dmgMul(run, p);
      for (const e of Cb.allTargets(run)) {
        if (p.dashHit.has(e.id) || U.dist(p.x, p.y, e.x, e.y) > e.r + 9) continue;
        p.dashHit.add(e.id);
        Cb.hitEnemy(run, e, sk.dmg * m, { p, kind: 'melee', x: p.x, y: p.y, knock: 160, mine: true });
        if (sk.freeze && !e.boss) e.frozen = Math.max(e.frozen || 0, sk.freeze);
      }
      p.afterT -= dt;
      if (p.afterT <= 0) { p.afterT = 0.035; fx('after', p.c, p.x, p.y, p.f); if (sk.freeze) fx('burst', p.x, p.y + 2, 2, '#bfefff', 20, 0.4); }
      p.dashT -= dt;
      if (p.dashT <= 0) { p.state = 'n'; p.vx = p.dvx * 0.2; p.vy = p.dvy * 0.2; p.inv = Math.max(p.inv, 0.15); }
      return;
    }
    const ch = G.CHARS[p.c];
    let spd = ch.spd * p.st.spd;
    if (p.fear >= 99) spd *= C.FEAR_SLOW;
    if (p.slowT > 0) spd *= 0.6;
    if (p.at > 0.5 && (ch.atk.type === 'swing' || ch.atk.type === 'bash')) spd *= 0.75;
    const mv = Math.hypot(inp.x, inp.y);
    p.moving = mv > 0.1;
    const grip = G.World.tileAt(run.map, p.x, p.y) === G.T.ICE ? 0.035 : 0.28;
    p.vx = U.lerp(p.vx, inp.x * spd, grip); p.vy = U.lerp(p.vy, inp.y * spd, grip);
    if (p.moving) { p.a = Math.atan2(inp.y, inp.x); if (Math.abs(inp.x) > 0.15) p.f = inp.x > 0 ? 1 : -1; }
    G.World.moveSafe(run.map, p, p.vx * dt, p.vy * dt, p.r);

    // 상호작용 우선
    let interacted = false;
    if (inp.pa) { const o = nearInteract(run, p); if (o) { interact(run, p, o); interacted = true; } }
    p.atkCd -= dt;
    if (!interacted && inp.a && p.atkCd <= 0) { Cb.attack(run, p); p.atkCd = ch.atk.cd / p.st.aspd; }
    if (p.echo > 0) { p.echo -= dt; if (p.echo <= 0) { const atk = ch.atk; const m = Cb.dmgMul(run, p); p.at = 1; meleeEcho(run, p, atk, m); } }
    p.skCd -= dt; p.skMax = ch.skill.cd * p.st.cdr;
    if (inp.ps) {
      if (p.skCd <= 0) { Cb.skill(run, p); p.skCd = p.skMax; }
      else if (!p.cdSaid || run.time - p.cdSaid > 1) { p.cdSaid = run.time; fx('txt', p.x, p.y - 24, Math.ceil(p.skCd) + '초 남았어', '#b7a7cf', 6); }
    }
    if (inp.pc) comboPress(run, p);
    if (p.comboT > 0 && run.time - p.comboT > C.COMBO_WINDOW && !p.comboResolved) {
      p.comboResolved = true;
      if (run.team.heart >= C.HEART_MAX && !(q.comboT > 0 && Math.abs(q.comboT - p.comboT) <= C.COMBO_WINDOW)) { fx('say', p.slot, '어…? 같이 누르자!'); fx('snd', 'comboFail'); }
    }
    // 용암
    if (G.World.tileAt(run.map, p.x, p.y) === G.T.LAVA) {
      p.lavaT -= dt;
      if (p.lavaT <= 0) { p.lavaT = 0.9; Cb.hurt(run, p, 1, null); fx('burst', p.x, p.y, 6, '#ff7a2e', 40, 0.4); }
    } else p.lavaT = 0;
    // 재생 & 카드 효과
    if (p.st.regen) { p.regenT += dt; if (p.regenT >= 10 / p.st.regen) { p.regenT = 0; Cb.heal(run, p, 1, true); } }
    const m = Cb.dmgMul(run, p);
    if (p.st.thunder) {
      p.thunderT += dt;
      if (p.thunderT >= 3 / p.st.thunder) {
        p.thunderT = 0;
        const cands = Cb.allTargets(run).filter(e => U.dist(p.x, p.y, e.x, e.y) < 130);
        if (cands.length) { const e = cands[Math.floor(Math.random() * cands.length)]; fx('bolt', e.x, e.y - 90, e.x, e.y - 6); fx('snd', 'crit'); Cb.hitEnemy(run, e, 14 * m, { p, kind: 'aoe', x: e.x, y: e.y - 20 }); }
      }
    }
    if (p.st.blizzard) {
      p.blizT += dt;
      if (p.blizT >= 6) { p.blizT = 0; fx('ring', p.x, p.y - 4, 6, 62, '#bfefff', 0.5); for (const e of Cb.allTargets(run)) if (U.dist(p.x, p.y, e.x, e.y) < 62) { e.frozen = 1.2; Cb.hitEnemy(run, e, 8 * m, { p, kind: 'aoe', x: p.x, y: p.y }); } }
    }
    if (p.st.orbit) {
      p.orbitA += dt * 3.2;
      for (let k = 0; k < p.st.orbit; k++) {
        const a = p.orbitA + k * Math.PI * 2 / p.st.orbit, ox = p.x + Math.cos(a) * 22, oy = p.y - 4 + Math.sin(a) * 15;
        for (const e of Cb.allTargets(run)) {
          if (U.dist2(ox, oy, e.x, e.y - 4) > (e.r + 4) * (e.r + 4)) continue;
          const last = p.orbitHit[e.id] || 0;
          if (run.time - last < 0.5) continue;
          p.orbitHit[e.id] = run.time;
          Cb.hitEnemy(run, e, 6 * m, { p, kind: 'proj', x: ox, y: oy, knock: 40 });
        }
      }
    }
    if (p.st.aura) {
      p.auraT = (p.auraT || 0) + dt;
      if (p.auraT >= 0.5) { p.auraT = 0; for (const e of Cb.allTargets(run)) if (U.dist(p.x, p.y, e.x, e.y) < p.lightR * 0.85) Cb.hitEnemy(run, e, p.st.aura * 0.5 * m, { p, kind: 'dot', x: p.x, y: p.y }); }
    }
    // 무서움
    const ownLight = Cb.lightPower(p) || p.lightR >= 70;
    const lit = RN.inLight(run, p.x, p.y, ownLight ? null : p);
    p.lit = lit;
    let df = lit ? -C.FEAR_LIGHT : C.FEAR_DARK * p.st.fearMul;
    if (run.tether.far) df += C.FEAR_FAR * p.st.fearMul;
    if (run.noFearFloor) df = -C.FEAR_LIGHT;
    if (run.tether.on && run.team.st.beamNoFear) df = -50;
    p.fear = U.clamp(p.fear + df * dt, 0, 100);
    if (p.fear > 55) RN.hintOnce(run, 'dark', '어둠 속에선 무서움이 쌓여요… 등불 곁이나 빛줄기로! 🏮');
    if (p.fear >= 99 && !p.fearSaid) { p.fearSaid = true; fx('say', p.slot, '무, 무서워… 😨'); fx('snd', 'fear'); }
    if (p.fear < 50) p.fearSaid = false;
    // 힌트
    if (G.CHARS[p.c].miner && run.floor === 1 && run.floorTime > 4) RN.hintOnce(run, 'mine', '⛏️ ' + p.name + '(' + G.CHARS[p.c].name + ')는 벽과 광석을 캘 수 있어요 — 반짝이는 광석을 노려봐요!');
  }

  function meleeEcho(run, p, atk, m) {
    const range = atk.range * p.st.area;
    for (const e of Cb.allTargets(run)) {
      const d = U.dist(p.x, p.y, e.x, e.y);
      if (d > range + e.r) continue;
      if (Math.abs(U.angDiff(p.a, U.ang(p.x, p.y, e.x, e.y))) > atk.arc / 2 && d > e.r + 4) continue;
      Cb.hitEnemy(run, e, atk.dmg * m * 0.7, { p, kind: 'melee', x: p.x, y: p.y, knock: atk.knock * 0.6, mine: atk.mine });
    }
    fx('snd', 'swing');
  }

  function comboPress(run, p) {
    const q = run.players[1 - p.slot];
    if (run.team.heart < C.HEART_MAX) {
      if (!p.comboSaid || run.time - p.comboSaid > 1.5) { p.comboSaid = run.time; fx('txt', p.x, p.y - 24, '두근 게이지가 부족해요', '#ff9eb5', 6); }
      return;
    }
    if (!Cb.active(p)) return;
    if (!Cb.active(q)) { fx('say', p.slot, '혼자서는 못 해…'); return; }
    p.comboT = run.time; p.comboResolved = false;
    if (q.comboT > 0 && run.time - q.comboT <= C.COMBO_WINDOW && !q.comboResolved) {
      p.comboResolved = q.comboResolved = true; p.comboT = q.comboT = -9;
      Cb.combo(run);
    } else fx('say', p.slot, '지금이야! 💞');
  }

  // ───────────── 빛줄기
  function updateTether(run, dt) {
    const [a, b] = run.players, T = run.tether;
    const both = Cb.active(a) && Cb.active(b);
    const d = U.dist(a.x, a.y, b.x, b.y);
    const range = C.TETHER_RANGE * run.team.st.beamRange;
    const on = both && d < range && !run.noBeam;
    if (on !== T.on) {
      if (on) {
        fx('snd', 'tetherOn');
        RN.hintOnce(run, 'tether', '가까이 있으면 💞 빛줄기가 생겨요! 적을 태우고 체력이 차올라요');
      } else if (both) fx('snd', 'tetherOff');
      T.on = on;
    }
    T.far = both && d > C.TETHER_FAR && !run.noBeam;
    if (T.far) { T.sepT += dt; run.floorFar = true; } else if (on) T.sepT = 0;
    if (!on) return;
    const syn = run.synergy;
    T.tickT -= dt;
    if (T.tickT <= 0) {
      T.tickT = 0.25;
      const m = (Cb.dmgMul(run, a) + Cb.dmgMul(run, b)) / 2;
      const dmg = C.TETHER_DPS * 0.25 * run.team.st.beamDmg * run.beamBoost * m * (1 + run.floor * 0.06);
      for (const e of Cb.allTargets(run)) {
        if (U.segDist(e.x, e.y - 4, a.x, a.y - 6, b.x, b.y - 6) > e.r + 6) continue;
        Cb.hitEnemy(run, e, dmg, { p: a, kind: 'beam', x: e.x, y: e.y });
        if (syn.includes('fire')) e.burn = Math.max(e.burn, 1.5);
        if (syn.includes('ice')) e.slowT = 1.5;
        if (syn.includes('bolt') && Math.random() < 0.15) Cb.chain(run, e, dmg * 2, 2, a);
      }
    }
    T.regenT += dt;
    if (T.regenT >= (syn.includes('leaf') ? 2.5 : C.TETHER_REGEN_EVERY)) {
      T.regenT = 0;
      for (const p of run.players) if (p.hp < p.st.maxHp) Cb.heal(run, p, 1, true);
    }
  }

  function updateCamera(run) {
    const act = run.players.filter(p => p.state !== 'g');
    const ps = act.length ? act : run.players;
    let cx = 0, cy = 0; for (const p of ps) { cx += p.x; cy += p.y; } cx /= ps.length; cy /= ps.length;
    const m = run.map, mw = m.w * S, mh = m.h * S;
    cx = mw <= C.W ? mw / 2 : U.clamp(cx, C.W / 2, mw - C.W / 2);
    cy = mh <= C.H ? mh / 2 : U.clamp(cy, C.H / 2, mh - C.H / 2);
    run.camX = cx; run.camY = cy;
    const M = C.SCREEN_MARGIN;
    for (const p of run.players) {
      if (!Cb.active(p)) continue;
      const nx = U.clamp(p.x, cx - C.W / 2 + M, cx + C.W / 2 - M), ny = U.clamp(p.y, cy - C.H / 2 + M + 10, cy + C.H / 2 - M);
      if (nx !== p.x || ny !== p.y) {
        const b = { x: p.x, y: p.y };
        G.World.move(m, b, nx - p.x, ny - p.y, p.r);
        p.x = b.x; p.y = b.y;
      }
    }
  }

  function separate(run) {
    const es = run.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i]; if (a.dead || a.under) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j]; if (b.dead || b.under) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r - 2;
        if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < rr) { const push = (rr - d) * 0.25, nx = dx / d, ny = dy / d; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; }
      }
    }
  }

  function updateHazards(run, dt) {
    for (let i = run.hazards.length - 1; i >= 0; i--) {
      const h = run.hazards[i];
      h.life -= dt; h.t += dt;
      if (h.life <= 0) { run.hazards.splice(i, 1); continue; }
      if (h.t < 0.3) continue;
      for (const p of run.players) {
        if (!Cb.active(p) || U.dist(p.x, p.y, h.x, h.y) > h.r + 2) continue;
        if (h.k === 'slime' || h.k === 'honey') p.slowT = h.k === 'honey' ? 0.5 : 0.3;
        else if (h.k === 'fire' || h.k === 'lavapool' || h.k === 'spore') Cb.hurt(run, p, 1, null);
      }
    }
  }

  function ambientSpawn(run, dt) {
    if (run.bossFight || G.isBossFloor(run.floor)) return;
    run.spawnT -= dt;
    if (run.spawnT > 0) return;
    run.spawnT = Math.max(10, C.AMBIENT_SPAWN_EVERY - run.floor * 0.8);
    const cap = C.ENEMY_CAP_BASE + run.floor * 3;
    if (run.enemies.length >= cap) return;
    const m = run.map, biome = G.biomeOf(run.floor);
    for (let k = 0; k < 30; k++) {
      const tx = U.rng.int(1, m.w - 2), ty = U.rng.int(1, m.h - 2);
      if (m.tiles[ty * m.w + tx] !== G.T.FLOOR) continue;
      const x = tx * S + 8, y = ty * S + 8;
      if (Math.abs(x - run.camX) < C.W / 2 + 20 && Math.abs(y - run.camY) < C.H / 2 + 20) continue;
      const d = Math.min(...run.players.map(p => U.dist(p.x, p.y, x, y)));
      if (d < 170 || d > 300) continue;
      if (RN.inLight(run, x, y)) continue;
      const n = 2 + U.rng.int(0, 1) + Math.floor(run.floor / 5);
      for (let i = 0; i < n; i++) RN.spawnEnemy(run, U.rng.pick(biome.enemies), x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16, {});
      break;
    }
  }

  // ───────────── 오브젝트
  const INTERACT = { shop: '상점 🐌', fountain: '소원의 샘 ⛲', event: '살펴보기 ❔', altar: '도전 시작 ⚔️', chest: '상자 열기 🎁', bell: '종 치기 🔔', cart: '광차 타기 🛒', camp: '모닥불 🔥' };
  function nearInteract(run, p) {
    let best = null, bd = 26;
    for (const o of run.objects) {
      if (!INTERACT[o.k]) continue;
      if ((o.k === 'fountain' || o.k === 'event' || o.k === 'altar' || o.k === 'chest' || o.k === 'bell' || o.k === 'cart' || o.k === 'camp') && o.st !== 0) continue;
      const d = U.dist(p.x, p.y, o.x, o.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  RN.nearInteract = nearInteract;
  function interact(run, p, o) {
    fx('snd', 'nav');
    switch (o.k) {
      case 'shop': run.ui = { m: 'shop', oid: o.id, sel: 0, who: p.slot }; fx('say', 'shop', '어서 오세요~ 느릿느릿…'); break;
      case 'fountain': run.ui = { m: 'fount', oid: o.id, sel: 0, who: p.slot }; break;
      case 'event':
        if (o.ex === 'wish') run.ui = { m: 'wish', oid: o.id, sel: [0, 0], done: [false, false], res: null };
        else run.ui = { m: 'event', oid: o.id, id: o.ex, sel: 0, who: p.slot, res: null };
        break;
      case 'altar': startChallenge(run, o); break;
      case 'chest': RN.openChest(run, o); break;
      case 'bell': ringBell(run, o, p); break;
      case 'cart': boardCart(run, o, p); break;
      case 'camp': run.ui = { m: 'camp', oid: o.id, sel: 0, who: p.slot, res: null }; break;
    }
  }
  function ringBell(run, o, p) {
    if (o.st !== 0) return;
    o.rungT = run.time;
    fx('snd', 'unseal'); fx('ring', o.x, o.y - 10, 4, 30, '#ffd36b', 0.5); fx('txt', o.x, o.y - 30, '댕~ 🔔', '#ffd36b', 8);
    const other = run.objects.find(q => q.k === 'bell' && q.pid === o.pid && q !== o);
    if (other && run.time - (other.rungT == null ? -9 : other.rungT) <= 1.0) {
      o.st = other.st = 2;
      const b = o.first ? o : other;
      const c = freeSpot(run, b.x, b.y + 22);
      run.objects.push({ id: U.id(), k: 'chest', x: c.x, y: c.y, st: 0, bonus: true });
      run.stats.puzzles++;
      fx('banner', '종소리가 어우러졌어요! 🔔🔔', '첫 번째 종 옆에 보물 상자가 나타났어요');
      fx('snd', 'win'); fx('hearts', o.x, o.y - 10, 10); fx('hearts', other.x, other.y - 10, 10);
    } else {
      RN.hintOnce(run, 'bells', '멀리 있는 종 두 개를 1초 안에 같이 쳐야 해요! 📍신호로 타이밍을 맞춰 봐요');
      fx('say', p.slot, '저쪽 종도 같이 쳐 줘!');
    }
  }
  RN.openChest = function (run, o) {
    if (o.st !== 0) return;
    if (o.locked) {
      if (!o.lockSaid || run.time - o.lockSaid > 2) { o.lockSaid = run.time; fx('txt', o.x, o.y - 20, '잠겨 있어요 🔒', '#b7a7cf', 7); RN.hintOnce(run, 'plates', '양쪽 발판을 둘이 동시에 밟으면 상자가 열려요! 🧩'); }
      return;
    }
    o.st = 1;
    if (o.mimic) {
      o.gone = true;
      const e = RN.spawnEnemy(run, 'mimic', o.x, o.y, { noPop: true });
      if (e) e.awake = true;
      fx('txt', o.x, o.y - 24, '앗! 미믹이다! 👅', '#ff5c7a', 9); fx('snd', 'roar'); fx('shake', 4);
      return;
    }
    fx('snd', 'chest'); fx('burst', o.x, o.y - 8, 16, ['#ffd36b', '#fff3a0', '#ffffff'], 70, 0.6);
    const mul = run.team.st.chestMul * (o.bonus ? 1.6 : 1);
    Cb.drop(run, 'gem', o.x, o.y, Math.round((6 + run.floor) * mul), 1);
    Cb.drop(run, 'heart', o.x, o.y, 1, 2);
    if (o.hidden || o.bonus) Cb.drop(run, 'star', o.x, o.y, 1, 1);
    if (o.key) Cb.drop(run, 'key', o.x, o.y, 1, 1);
    if (Math.random() < (o.bonus ? 0.35 : o.hidden ? 0.25 : 0.06)) Cb.drop(run, 'egg', o.x, o.y, 1, 1);
    run.pendingLv++;
    fx('txt', o.x, o.y - 24, o.key ? '꽃잎 열쇠가 들어 있어요! 🌸' : o.hidden ? '숨겨진 보물! ✨' : o.bonus ? '협동 보물! 💞' : '보물 상자!', '#ffd36b', 9);
  };
  function startChallenge(run, o) {
    o.st = 1;
    run.challenge = { o, t: 0, wave: 0, ids: [] };
    fx('banner', '도전!', '몰려오는 몬스터를 막아내요 ⚔️'); fx('snd', 'roar');
  }
  function updateObjects(run, dt) {
    for (let i = run.objects.length - 1; i >= 0; i--) {
      const o = run.objects[i];
      if (o.k === 'door') {
        if (o.st === 0) {
          const lighters = run.players.filter(p => Cb.active(p) && Cb.lightPower(p) && U.dist(p.x, p.y, o.x, o.y) < 50);
          if (lighters.length) {
            o.prog = Math.min(1, o.prog + dt / C.EXIT_UNSEAL_TIME);
            if (Math.random() < 0.3) fx('burst', o.x, o.y - 12, 1, '#fff3a0', 30, 0.5);
          } else o.prog = Math.max(0, o.prog - dt * 0.15);
          if (run.players.some(p => Cb.active(p) && U.dist(p.x, p.y, o.x, o.y) < 70)) RN.hintOnce(run, 'door', '바위를 캐고(⛏️), 등불(🏮)로 어둠 결계를 걷어내면 문이 열려요');
          if (o.prog >= 1) { o.st = 1; fx('snd', 'unseal'); fx('ring', o.x, o.y - 12, 4, 60, '#fff3a0', 0.6); fx('txt', o.x, o.y - 40, '문이 열렸어요! ✨', '#fff3a0', 9); }
        } else {
          const act = run.players.filter(Cb.active);
          const inDoor = act.filter(p => U.dist(p.x, p.y, o.x, o.y) < 20);
          if (act.length && inDoor.length === act.length) {
            run.exitT += dt;
            if (run.exitT > 0.6) { floorClear(run); return; }
          } else {
            run.exitT = 0;
            if (inDoor.length && (!o.waitSaid || run.time - o.waitSaid > 4)) { o.waitSaid = run.time; fx('say', inDoor[0].slot, '같이 가자! 🚪'); }
          }
        }
      } else if (o.k === 'dome') {
        o.life -= dt;
        for (const e of run.enemies) { const d = U.dist(o.x, o.y, e.x, e.y); if (d < o.ex + e.r && d > 0.1) { const a = U.ang(o.x, o.y, e.x, e.y); e.kvx += Math.cos(a) * 40; e.kvy += Math.sin(a) * 40; } }
        if (o.life <= 0) run.objects.splice(i, 1);
      } else if (o.k === 'chest' && o.st === 0) {
        for (const p of run.players) if (Cb.active(p) && U.dist(p.x, p.y, o.x, o.y) < 12) RN.openChest(run, o);
      } else if (o.k === 'plate' && o.st !== 2) {
        const on = run.players.some(p => Cb.active(p) && U.dist(p.x, p.y, o.x, o.y) < 10);
        if (on && !o.st) { fx('snd', 'nav'); RN.hintOnce(run, 'plates', '양쪽 발판을 둘이 동시에 밟으면 상자가 열려요! 🧩'); }
        o.st = on ? 1 : 0;
      }
    }
    for (const o of run.objects) if (o.k === 'chest' && o.locked) {
      const pl = run.objects.filter(q => q.k === 'plate' && q.pid === o.locked);
      if (pl.length && pl.every(q => q.st === 1)) {
        o.hold = (o.hold || 0) + dt;
        if (o.hold >= 0.8) {
          o.locked = 0; pl.forEach(q => (q.st = 2)); run.stats.puzzles++;
          fx('snd', 'unseal'); fx('ring', o.x, o.y - 8, 4, 40, '#ffd36b', 0.5); fx('txt', o.x, o.y - 30, '철컥! 열렸어요 🧩', '#ffd36b', 9);
          fx('hearts', o.x, o.y - 10, 10);
        }
      } else o.hold = 0;
    }
    if (run.objects.some(o => o.gone)) run.objects = run.objects.filter(o => !o.gone);
    // 도전
    const ch = run.challenge;
    if (ch) {
      ch.t += dt;
      if (ch.wave < 3 && ch.t >= ch.wave * 7) {
        ch.wave++;
        const biome = G.biomeOf(run.floor);
        for (let k = 0; k < 4 + ch.wave; k++) {
          const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 30;
          let x = ch.o.x + Math.cos(a) * r, y = ch.o.y + Math.sin(a) * r;
          if (G.World.solidAt(run.map, x, y)) { x = ch.o.x + (Math.random() - 0.5) * 20; y = ch.o.y + (Math.random() - 0.5) * 20; }
          const e = RN.spawnEnemy(run, U.rng.pick(biome.enemies), x, y, { elite: ch.wave === 3 && k === 0 });
          if (e) ch.ids.push(e.id);
        }
        fx('txt', ch.o.x, ch.o.y - 30, `${ch.wave} / 3 웨이브`, '#ff9eb5', 9);
      }
      if (ch.wave >= 3 && !run.enemies.some(e => ch.ids.includes(e.id))) {
        ch.o.st = 2;
        run.objects.push({ id: U.id(), k: 'chest', x: ch.o.x, y: ch.o.y + 22, st: 0 });
        Cb.drop(run, 'star', ch.o.x, ch.o.y, 1, 1);
        fx('banner', '도전 성공!', '보상 상자가 나타났어요 🎁'); fx('snd', 'win');
        run.challenge = null;
      }
    }
    // 대기 중인 말풍선
    for (let i = run.sayQ.length - 1; i >= 0; i--) { const s = run.sayQ[i]; s.t -= G.C.TICK; if (s.t <= 0) { fx('say', s.slot, s.text); run.sayQ.splice(i, 1); } }
  }

  function floorClear(run) {
    fx('snd', 'door');
    run.stats.floors = Math.max(run.stats.floors, run.floor);
    if (!run.floorFar) run.stats.handFloors++;
    if (run.players.some(p => Object.keys(p.cards).filter(id => G.CARD[id].r === 'g').length >= 3)) run.stats.gambleFloor++;
    if (run.pathNow === 'battle') { run.pendingLv++; fx('txt', run.camX, run.camY - 40, '전투 굴 보상: 카드 +1 ⚔️', '#ffd36b', 9); }
    if (run.rush) {
      if (run.floor >= 12) { openResult(run, true); return; }
      run.pendingLv += 2;
    } else if (run.floor === 12 && !run.endless) { openEnding(run); return; }
    run.nextFloorPending = true;
    run.pendingRelic = true;
    openRelic(run);
  }
  // 다음 층으로: 보스 층 앞이 아니면 갈림길 고르기
  function goNext(run) {
    run.nextFloorPending = false;
    const n = run.rush ? run.floor + 3 : run.floor + 1;
    if (!run.rush && !G.isBossFloor(n)) openPath(run, n);
    else RN.startFloor(run, n);
  }
  function openPath(run, n) {
    const keys = U.rng.shuffle(Object.keys(G.PATHS)).slice(0, 3);
    run.ui = { m: 'path', c: keys, sel: [1, 1], done: [false, false], n, rps: null, res: null, pick: null, t: 0 };
    fx('snd', 'chest');
  }

  // ───────────── UI (메뉴)
  RN.updateUI = function (run, inputs, dt) {
    const ui = run.ui;
    const nav = (inp, n, key) => { // 한 사람의 선택 이동
      let s = key == null ? ui.sel : ui.sel[key];
      if (inp.pu || inp.pl) s = (s - 1 + n) % n;
      if (inp.pd || inp.pr) s = (s + 1) % n;
      if (inp.pu || inp.pl || inp.pd || inp.pr) fx('snd', 'nav');
      if (key == null) ui.sel = s; else ui.sel[key] = s;
    };
    switch (ui.m) {
      case 'lvl': {
        for (let i = 0; i < 2; i++) {
          const inp = inputs[i];
          if (ui.done[i]) { if (inp.ps) { ui.done[i] = false; fx('snd', 'back'); } continue; }
          if (ui.c[i].length) nav(inp, ui.c[i].length, i);
          if (inp.pa) { ui.done[i] = true; fx('snd', 'pick'); }
          else if (inp.ps && run.team.rerolls > 0) { run.team.rerolls--; ui.c[i] = rollCards(run, run.players[i]); fx('snd', 'buy'); }
        }
        if (ui.done[0] && ui.done[1]) {
          for (let i = 0; i < 2; i++) {
            const p = run.players[i], card = G.CARD[ui.c[i][ui.sel[i]]];
            if (!card) continue;
            p.cards[card.id] = (p.cards[card.id] || 0) + 1;
            card.apply(p, run.team);
            run.cardsPicked[card.id] = (run.cardsPicked[card.id] || 0) + 1;
            p.lightR = Math.max(p.lightR, p.st.light);
          }
          const before = run.synergy.slice();
          run.synergy = Cb.synergies(run);
          const nw = run.synergy.filter(s => !before.includes(s));
          run.ui = null; run.pendingLv--;
          if (nw.length) { const t = G.TAGS[nw[0]]; fx('banner', `${t.icon} ${t.name} 시너지!`, G.SYNERGY[nw[0]]); fx('snd', 'comboReady'); }
          run.hitstop = 0.15;
        }
        break;
      }
      case 'relic': {
        const inp = inputs[ui.who];
        nav(inp, ui.c.length);
        if (inp.pa) {
          const r = G.RELIC[ui.c[ui.sel]];
          r.apply(run.team, run.players);
          run.team.relics.push(r.id); run.relicsFound[r.id] = 1;
          for (const p of run.players) p.lightR = Math.max(p.lightR, p.st.light);
          run.synergy = Cb.synergies(run);
          fx('snd', 'pick'); run.relicTurn++;
          run.ui = null; run.pendingRelic = false;
          if (run.nextFloorPending) goNext(run);
        }
        break;
      }
      case 'shop': {
        const inp = inputs[ui.who], o = run.objects.find(x => x.id === ui.oid);
        const items = o.items;
        nav(inp, items.length + 1);
        if (inp.ps || (inp.pa && ui.sel === items.length)) { run.ui = null; fx('snd', 'back'); break; }
        if (inp.pa) {
          const it = items[ui.sel];
          if (it.sold || run.team.gems < it.cost) { fx('snd', 'deny'); ui.msg = it.sold ? '이미 샀어요' : '광석이 부족해요 💎'; break; }
          run.team.gems -= it.cost; it.sold = true; fx('snd', 'buy'); ui.msg = '고마워요~ 🐌';
          if (it.k === 'potion') run.players.forEach(p => Cb.heal(run, p, 4));
          if (it.k === 'card') run.pendingLv++;
          if (it.k === 'relic') run.pendingRelic = true;
          if (it.k === 'hp') run.players.forEach(p => { p.st.maxHp += 2; p.hp += 2; });
          if (it.k === 'heart') run.team.heart = Math.min(C.HEART_MAX, run.team.heart + 50);
          if (it.k === 'reroll') run.team.rerolls += 2;
          if (it.k === 'card' || it.k === 'relic') run.ui = null;
        }
        break;
      }
      case 'fount': {
        const inp = inputs[ui.who], o = run.objects.find(x => x.id === ui.oid);
        if (ui.res) { if (inp.pa || inp.ps) run.ui = null; break; }
        nav(inp, 3);
        if (inp.ps) { run.ui = null; break; }
        if (inp.pa) {
          if (ui.sel === 0) { o.st = 1; run.players.forEach(p => { if (Cb.active(p)) { p.hp = p.st.maxHp; fx('hearts', p.x, p.y - 8, 8); } }); fx('snd', 'heal'); ui.res = '시원한 물에 둘 다 기운이 났어요! 💧'; }
          else if (ui.sel === 1) {
            if (run.team.gems < 15) { fx('snd', 'deny'); ui.msg = '광석이 부족해요 💎'; break; }
            run.team.gems -= 15; o.st = 1; fx('snd', 'wish');
            const r = Math.floor(Math.random() * 5);
            if (r === 0) { run.players.forEach(p => (p.st.dmg += 0.1)); ui.res = '반짝! 둘 다 공격력 +10% ⚔️'; }
            if (r === 1) { run.players.forEach(p => { p.st.maxHp += 2; p.hp += 2; }); ui.res = '반짝! 둘 다 최대 체력 +1칸 💖'; }
            if (r === 2) { run.team.heart = C.HEART_MAX; ui.res = '반짝! 두근 게이지가 가득 💞'; }
            if (r === 3) { run.players.forEach(p => (p.st.crit += 0.06)); ui.res = '반짝! 둘 다 치명타 +6% 🌠'; }
            if (r === 4) { run.players.forEach(p => (p.st.spd += 0.06)); ui.res = '반짝! 둘 다 이동 속도 +6% 👟'; }
          } else run.ui = null;
        }
        break;
      }
      case 'event': {
        const inp = inputs[ui.who], o = run.objects.find(x => x.id === ui.oid);
        const ev = EVENTS[ui.id];
        if (ui.res) { if (inp.pa || inp.ps) run.ui = null; break; }
        nav(inp, ev.opts.length);
        if (inp.pa) {
          const op = ev.opts[ui.sel];
          if (op.cost && run.team.gems < op.cost) { fx('snd', 'deny'); ui.msg = '광석이 부족해요 💎'; break; }
          if (op.cost) run.team.gems -= op.cost;
          ui.res = op.r ? op.r(run, run.players[ui.who], o) : '그냥 지나가기로 했어요.';
          if (op.r) o.st = 1;
          fx('snd', 'pick');
        }
        break;
      }
      case 'wish': {
        const o = run.objects.find(x => x.id === ui.oid);
        if (ui.res) { if (inputs[0].pa || inputs[1].pa) run.ui = null; break; }
        for (let i = 0; i < 2; i++) {
          const inp = inputs[i];
          if (ui.done[i]) continue;
          nav(inp, 3, i);
          if (inp.pa) { ui.done[i] = true; fx('snd', 'pick'); }
        }
        if (ui.done[0] && ui.done[1]) {
          o.st = 1;
          const same = ui.sel[0] === ui.sel[1];
          const w = ui.sel[0];
          const apply = (k, big) => {
            if (k === 0) run.players.forEach(p => { p.st.maxHp += big ? 2 : 0; p.hp = Math.min(p.st.maxHp, p.hp + (big ? 2 : 1)); });
            if (k === 1) run.team.gems += big ? 40 : 10;
            if (k === 2) run.players.forEach(p => (p.st.dmg += big ? 0.12 : 0.04));
          };
          if (same) {
            apply(w, true); run.team.stars += 1; run.stats.telepathy++;
            ui.res = `텔레파시 성공! 둘 다 「${G.WISHES[w].name}」을(를) 빌었어요 💞\n${G.WISHES[w].text} + 별조각 1개`;
            fx('snd', 'win'); fx('hearts', run.camX, run.camY, 30);
            RN.photo(run, `${U.today()} — 별똥별에 같은 소원을 빈 ${run.players[0].name}와(과) ${run.players[1].name} 🌠`);
          } else {
            apply(ui.sel[0], false); apply(ui.sel[1], false);
            ui.res = `아깝다! 서로 다른 소원을 빌었어요…\n그래도 작은 행운이 찾아왔어요 🍀`;
            fx('snd', 'wish');
          }
        }
        break;
      }
      case 'path': {
        ui.t += dt;
        if (ui.res) {
          if (ui.t > 0.6 && (inputs[0].pa || inputs[1].pa)) { run.path = ui.pick; run.ui = null; RN.startFloor(run, ui.n); }
          break;
        }
        if (!ui.rps) {
          for (let i = 0; i < 2; i++) {
            const inp = inputs[i];
            if (ui.done[i]) { if (inp.ps) { ui.done[i] = false; fx('snd', 'back'); } continue; }
            nav(inp, ui.c.length, i);
            if (inp.pa) { ui.done[i] = true; fx('snd', 'pick'); }
          }
          if (ui.done[0] && ui.done[1]) {
            if (ui.sel[0] === ui.sel[1]) {
              ui.pick = ui.c[ui.sel[0]]; ui.t = 0; fx('snd', 'win');
              ui.res = `둘 다 「${G.PATHS[ui.pick].name}」! 마음이 통했어요 💞`;
            } else { ui.rps = { sel: [0, 0], done: [false, false], round: 1, msg: '', last: null }; fx('snd', 'warn'); }
          }
        } else {
          const r = ui.rps;
          for (let i = 0; i < 2; i++) {
            const inp = inputs[i]; if (r.done[i]) continue;
            if (inp.pl || inp.pu) { r.sel[i] = (r.sel[i] + 2) % 3; fx('snd', 'nav'); }
            if (inp.pr || inp.pd) { r.sel[i] = (r.sel[i] + 1) % 3; fx('snd', 'nav'); }
            if (inp.pa) { r.done[i] = true; fx('snd', 'pick'); }
          }
          if (r.done[0] && r.done[1]) {
            const a = r.sel[0], b = r.sel[1];
            r.last = [a, b];
            if (a === b) { r.done = [false, false]; r.round++; r.msg = `${G.RPS[a].icon} ${G.RPS[b].icon} 비겼다! 한 번 더!`; fx('snd', 'comboFail'); }
            else {
              const w = (a - b + 3) % 3 === 1 ? 0 : 1;
              ui.pick = ui.c[ui.sel[w]]; ui.winner = w; ui.t = 0; fx('snd', 'win');
              ui.res = `${G.RPS[a].icon} vs ${G.RPS[b].icon}  ${run.players[w].name} 승리!\n「${G.PATHS[ui.pick].name}」로 가요!`;
            }
          }
        }
        break;
      }
      case 'camp': {
        const inp = inputs[ui.who], o = run.objects.find(x => x.id === ui.oid);
        if (ui.res) { if (inp.pa || inp.ps) run.ui = null; break; }
        nav(inp, 3);
        if (inp.ps) { run.ui = null; break; }
        if (inp.pa) {
          if (ui.sel === 2) { run.ui = null; break; }
          if (o) o.st = 1;
          run.players.forEach(p => { if (p.state === 'x' || p.state === 'g') { p.state = 'n'; p.hp = C.REVIVE_HP; p.inv = 1.5; } });
          if (ui.sel === 0) { run.players.forEach(p => { p.st.maxHp += 2; p.hp = p.st.maxHp; }); ui.res = '모닥불 앞에서 푹 쉬었어요…\n둘 다 최대 체력 +1칸, 체력 가득 🔥'; fx('snd', 'heal'); }
          else { run.pendingLv += 1; run.team.rerolls += 1; ui.res = '모닥불 앞에서 카드를 다듬었어요!\n카드 한 장씩 + 새로고침 1장 🃏'; fx('snd', 'pick'); }
        }
        break;
      }
      case 'pause': {
        const inp = inputs[ui.who];
        for (let i = 0; i < 2; i++) if (i !== ui.who && inputs[i].pp) { run.ui = null; return; }
        nav(inp, 2);
        if (ui.sel === 0) ui.confirm = false;
        if (inp.pp || inp.ps) { run.ui = null; break; }
        if (inp.pa) {
          if (ui.sel === 0) run.ui = null;
          else if (!ui.confirm) { ui.confirm = true; fx('snd', 'warn'); }
          else openResult(run, false, true);
        }
        break;
      }
      case 'dialog': {
        if (inputs[0].pa || inputs[1].pa) {
          ui.i++; fx('snd', 'nav');
          if (ui.i >= ui.lines.length) { run.ui = null; if (ui.then === 'result') openResult(run, true); }
        }
        break;
      }
      case 'result': {
        ui.t = (ui.t || 0) + dt;
        if (ui.t > 1.2 && (inputs[0].pa || inputs[1].pa)) {
          if (ui.data.more && ui.sel === 1) {
            run.endless = true; run.ui = null; run.resultApplied = false;
            if (run.flowerKey) run.garden = true;
            RN.startFloor(run, 13); break;
          }
          run.finished = true;
        }
        if (ui.data.more) nav(inputs[0].pu || inputs[0].pd ? inputs[0] : inputs[1], 2);
        break;
      }
    }
  };

  function rollCards(run, p) {
    const luck = run.team.st.luck;
    const q = run.players[1 - p.slot];
    const pool = G.CARDS.filter(c => (p.cards[c.id] || 0) < c.max);
    const w = c => {
      let base = { c: 60, r: 26 + luck * 7, l: run.team.lvl >= 4 ? 5 + luck * 3 : 0, g: run.team.lvl >= 3 ? 8 : 0 }[c.r];
      const mine = Cb.tagCount(p, c.tag), theirs = Cb.tagCount(q, c.tag);
      if (mine > 0) base *= 1.5;
      if (theirs > 0) base *= 1.25;
      return base;
    };
    const out = [];
    const rng = U.rng;
    const n = run.curse.narrow ? 2 : 3;
    for (let k = 0; k < n && pool.length; k++) {
      const c = rng.weighted(pool, w);
      out.push(c.id);
      pool.splice(pool.indexOf(c), 1);
    }
    return out;
  }
  function openLevelUp(run) {
    const c = [rollCards(run, run.players[0]), rollCards(run, run.players[1])];
    if (!c[0].length && !c[1].length) { run.pendingLv = 0; run.team.gems += 10; return; }
    run.ui = { m: 'lvl', c, sel: c.map(l => Math.max(0, Math.min(run.curse.narrow ? 0 : 1, l.length - 1))), done: c.map(l => !l.length), lv: run.team.lvl };
    fx('snd', 'levelup');
  }
  function openRelic(run) {
    const owned = new Set(run.team.relics);
    const pool = U.rng.shuffle(G.RELICS.filter(r => !owned.has(r.id)));
    if (!pool.length) { run.pendingRelic = false; if (run.nextFloorPending) goNext(run); return; }
    const c = pool.slice(0, 3).map(r => r.id);
    run.ui = { m: 'relic', c, sel: Math.min(1, c.length - 1), who: run.relicTurn % 2, next: run.nextFloorPending };
    fx('snd', 'chest');
  }
  function openEnding(run) {
    const [a, b] = run.players;
    run.ui = { m: 'dialog', i: 0, then: 'result', lines: [
      '어둠 고래가 스르르 잠들자, 삼켜졌던 별빛이 하나둘 흘러나왔어요.',
      `별빛은 ${a.name}의 ${G.CHARS[a.c].name}와(과) ${b.name}의 ${G.CHARS[b.c].name}를 감싸고 천천히 지상으로 올라갔어요.`,
      '별빛 숲에 다시 반짝이는 밤이 찾아왔어요. ✨',
      '"혼자였다면 절대 못 했을 거야."',
      '"응. 우리 둘이라서 할 수 있었어." 💞',
      '— 등불과 곡괭이, 끝 —\n(하지만 동굴은 아직 더 깊은 곳이 있다는데…?)',
    ] };
    fx('music', 'hub'); fx('snd', 'win');
  }
  function openResult(run, win, gaveUp) {
    if (run.ui && run.ui.m === 'result') return;
    const keep = win ? 1 : C.GEM_KEEP_ON_DEATH;
    const gems = Math.floor(run.team.gems * keep * (1 + run.heat * C.HEAT_GEM));
    let extra = [];
    if (!run.resultApplied) { run.resultApplied = true; extra = G.Hub.applyRunResult(run, win, gems) || []; }
    run.ui = { m: 'result', win, gaveUp: !!gaveUp, sel: 0, t: 0, data: {
      floor: run.floor, time: Math.floor(run.time), kills: run.stats.kills, dmg: run.stats.dmg.map(Math.round), revives: run.stats.revives.slice(),
      combos: run.stats.combos, gems, stars: run.team.stars, lvl: run.team.lvl, names: run.players.map(p => p.name), chars: run.players.map(p => p.c),
      ores: run.stats.ores, star: run.star, daily: run.daily, heat: run.heat, rush: run.rush, weekly: run.weekly, garden: run.garden,
      more: win && !run.endless && !run.rush, key: run.flowerKey, extra,
    } };
    fx('snd', win ? 'win' : 'gameover');
    fx('music', 'hub');
  }

  // ───────────── 이벤트 정의
  const EVENTS = {
    babybat: { title: '울고 있는 아기 박쥐', text: '길을 잃은 아기 박쥐가 훌쩍이고 있어요.', opts: [
      { t: '살살 달래준다 🫶', r: run => { run.team.heart = Math.min(C.HEART_MAX, run.team.heart + 45); return '아기 박쥐가 방긋 웃었어요! 두근 게이지 +45 💓'; } },
      { t: '간식을 나눠 준다 (10💎)', cost: 10, r: run => { run.players.forEach(p => Cb.heal(run, p, 3)); run.pendingLv++; return '냠냠! 보답으로 반짝이는 걸 줬어요. 카드 한 장 + 회복 🍪'; } },
      { t: '조용히 지나간다', r: null },
    ] },
    cricket: { title: '떠돌이 음유시인 귀뚜라미', text: '"찌르르~ 노래 한 곡 들어볼래요?"', opts: [
      { t: '노래를 듣는다 🎵', r: run => { run.noFearFloor = true; run.players.forEach(p => Cb.heal(run, p, 1)); return '마음이 포근해졌어요. 이번 층에선 무섭지 않아요! 🎶'; } },
      { t: '팁을 준다 (15💎)', cost: 15, r: run => { run.team.xp += run.team.xpNext * 0.8; return '"고마워요!" 신나는 노래에 경험치가 쑥쑥! ✨'; } },
      { t: '괜찮아요', r: null },
    ] },
    shroom: { title: '수상한 보라 버섯', text: '보랏빛으로 반짝이는 버섯이에요. 먹어도 될까…?', opts: [
      { t: '한 입 먹어본다 😋', r: (run, p) => {
        if (Math.random() < 0.55) { run.players.forEach(q => { if (Cb.active(q)) q.hp = q.st.maxHp; }); run.team.xp += run.team.xpNext * 0.5; return '맛있다! 체력이 가득 차고 경험치도 올랐어요 🍄✨'; }
        run.players.forEach(q => { if (Cb.active(q)) q.hp = Math.max(1, q.hp - 2); }); run.team.gems += 20; return '으엑… 배가 아파요 (체력 -1칸)\n그런데 버섯 밑에서 광석 20개를 발견! 💎'; } },
      { t: '등불 삼아 챙긴다 🏮', r: run => { run.players.forEach(p => { p.lightR += 24; p.st.light += 24; }); return '둘 다 빛 반경이 넓어졌어요! 🍄💡'; } },
      { t: '건드리지 않는다', r: null },
    ] },
    sign: { title: '오래된 표지판', text: '"두 사람이 함께라면, 어떤 어둠도 두렵지 않으리"', opts: [
      { t: '소리 내어 읽는다 📜', r: run => { run.team.heart = Math.min(C.HEART_MAX, run.team.heart + 30); run.players.forEach(p => (p.fear = 0)); return '용기가 솟아요! 두근 +30, 무서움 사라짐 💪'; } },
      { t: '뒤를 살펴본다 🔍', r: (run, p, o) => {
        if (Math.random() < 0.6) { Cb.drop(run, 'gem', o.x, o.y, 12, 2); return '표지판 뒤에 광석 주머니가! 💎'; }
        RN.spawnEnemy(run, U.rng.pick(G.biomeOf(run.floor).enemies), o.x + 20, o.y, { elite: true }); return '앗, 숨어 있던 몬스터가 튀어나왔어요! ⚔️'; } },
      { t: '지나간다', r: null },
    ] },
  };
  EVENTS.cursedchest = { title: '으스스한 검은 상자', text: '보랏빛 연기가 새어 나오는 상자예요. 열면 좋은 게 있을 것 같은데…', opts: [
    { t: '열어 본다 😈 (유물 + 광석, 대신 저주)', r: (run, p, o) => {
      run.pendingRelic = true; Cb.drop(run, 'gem', o.x, o.y, 15 + run.floor, 1);
      const left = G.CURSES.filter(c => !run.curse[c.id] && c.id !== 'narrow');
      const c = left.length ? U.rng.pick(left) : null;
      if (c) { run.curse[c.id] = 1; run.heat += c.heat; if (c.id === 'dark') run.players.forEach(q => { q.st.light *= 0.7; q.lightR = q.st.light; q.st.fearMul *= 1.5; }); if (c.id === 'fury') run.enemySpd *= 1.25; if (c.id === 'fragile') { run.team.st.reviveSpd *= 0.5; run.downTime = C.DOWN_TIME * 0.5; } if (c.id === 'hunger') run.team.st.floorHeal = 0; if (c.id === 'poor') run.shopMul *= 1.5; }
      return c ? `유물과 광석을 얻었어요! 🎁\n…그런데 「${c.icon} ${c.name}」 저주가 걸렸어요 (광석 보너스 +${Math.round(c.heat * C.HEAT_GEM * 100)}%)` : '유물과 광석을 얻었어요! 🎁'; } },
    { t: '그냥 둔다', r: null },
  ] };
  EVENTS.gambler = { title: '두더지 도박사', text: '"헤헤, 광석 20개 걸고 동전 던지기 한 판 어때? 이기면 두 배~"', opts: [
    { t: '한 판 한다 🪙 (20💎)', cost: 20, r: (run, p, o) => {
      if (Math.random() < 0.5) { run.team.gems += 45; fx('snd', 'win'); return '앞면! 광석 45개를 땄어요! 💰'; }
      fx('snd', 'comboFail'); return '뒷면… 광석을 잃었어요 🥲\n"다음엔 이길 거야~"'; } },
    { t: '크게 한 판 🎲 (50💎)', cost: 50, r: (run, p, o) => {
      if (Math.random() < 0.45) { run.team.gems += 120; run.team.stars += 1; fx('snd', 'win'); return '대박! 광석 120개 + 별조각 1개! 🌟'; }
      fx('snd', 'comboFail'); return '꽝! 도박사가 신나서 춤을 춰요… 🕺'; } },
    { t: '도박은 안 해요', r: null },
  ] };
  EVENTS.onegift = { title: '작은 선물 상자', text: '"딱 한 사람만 받을 수 있는 선물이에요." 누가 받을까요?', opts: [
    { t: '1P가 받는다 🎁', r: run => giftTo(run, 0) },
    { t: '2P가 받는다 🎁', r: run => giftTo(run, 1) },
    { t: '서로 양보한다 🤝 (둘 다 조금씩)', r: run => { run.players.forEach(q => { q.st.dmg += 0.05; Cb.heal(run, q, 2); }); fx('hearts', run.camX, run.camY, 16); return '서로 양보했더니 상자가 반짝! 둘 다 공격력 +5%, 회복 💞'; } },
  ] };
  function giftTo(run, i) {
    const p = run.players[i];
    p.st.dmg += 0.15; p.st.maxHp += 2; p.hp += 2;
    return `${p.name}에게 선물! 공격력 +15%, 최대 체력 +1칸 🎁`;
  }
  const EVENT_KEYS = ['wish', 'babybat', 'cricket', 'shroom', 'sign', 'wish', 'cursedchest', 'gambler', 'onegift'];
  RN.EVENTS = EVENTS;

  // ───────────── 뷰 (렌더 & 네트워크용)
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  RN.view = function (run) {
    const pv = run.players.map(p => {
      const o = nearInteract(run, p);
      return { x: r1(p.x), y: r1(p.y), c: p.c, f: p.f, a: r2(p.a), hp: p.hp, mh: p.st.maxHp, st: p.state, dt: r1(p.downT), rv: r2(p.rv), fr: Math.round(p.fear),
        sc: p.skCd > 0 ? r2(p.skCd / (p.skMax || 1)) : 0, inv: p.inv > 0 ? 1 : 0, mv: p.moving ? 1 : 0, at: r2(p.at), ar: r2(p.ar), fl: p.flash > 0 ? 1 : 0,
        hat: p.hat, nm: p.name, lt: Math.round(p.lightR * run.darkMul), pr: o && Cb.active(p) && !p.riding ? INTERACT[o.k] : '', bf: p.buffT > 0 ? 1 : 0, ob: p.st.orbit, oa: r2(p.orbitA), sp: Math.round(G.CHARS[p.c].spd * p.st.spd * (p.fear >= 99 ? C.FEAR_SLOW : 1) * (p.slowT > 0 ? 0.6 : 1)),
        rd: p.riding ? 1 : 0, sl: p.slowT > 0 ? 1 : 0 };
    });
    const b = run.boss;
    const v = {
      sc: 'run', mv: run.map.ver, fl: run.floor, bi: run.map.bi, cx: r1(run.camX), cy: r1(run.camY), snap: run.camSnap ? 1 : 0,
      ps: pv,
      en: run.enemies.map(e => [e.id, e.type, Math.round(e.x), Math.round(e.y),
        (e.flash > 0 ? 1 : 0) | (e.slowT > 0 ? 2 : 0) | (e.burn > 0 ? 4 : 0) | (e.stun > 0 ? 8 : 0) | (e.elite ? 16 : 0) | (e.frozen > 0 ? 32 : 0) | (e.lit ? 64 : 0) | (e.baby ? 128 : 0),
        r2(Math.max(0, e.hp / e.maxHp)), e.f, e.anim | 0, e.affix ? G.AFFIX_KEYS.indexOf(e.affix) + 1 : 0]),
      pr: run.projs.map(p => [p.id, p.k, Math.round(p.x), Math.round(p.y), r2(Math.atan2(p.vy, p.vx)), Math.round(p.z || 0), p.hot ? 1 : 0]),
      pk: run.pickups.map(k => [k.id, k.k, Math.round(k.x), Math.round(k.y)]),
      ob: run.objects.map(o => [o.id, o.k, Math.round(o.x), Math.round(o.y), o.st, o.k === 'door' ? r2(o.prog || 0) : o.k === 'dome' ? o.ex : o.k === 'event' ? o.ex :
        o.k === 'chest' ? (o.locked ? 1 : 0) : o.k === 'bell' ? (o.rungT != null && run.time - o.rungT < 1 ? 1 : 0) : 0]),
      hz: run.hazards.map(h => [h.id, h.k, Math.round(h.x), Math.round(h.y), h.r, r2(h.life)]),
      tl: run.tels.map(t => [t.s, Math.round(t.x), Math.round(t.y), t.a, t.b || 0, r2(t.ang || 0), r2(Math.min(1, t.t / t.T))]),
      bs: b ? { k: b.k, x: r1(b.x), y: r1(b.y), hp: r2(Math.max(0, b.hp / b.maxHp)), ph: b.ph, s: b.s, z: Math.round(b.z || 0), a: r2(b.a), fl: b.flash > 0 ? 1 : 0, hid: b.hidden ? 1 : 0, act: b.s !== 'dormant' ? 1 : 0 } : null,
      tb: run.tether.on ? 1 : 0, tf: run.tether.far ? 1 : 0, syn: run.synergy, dm: run.darkMul, bb: run.beamBoost,
      hg: Math.round(run.team.heart), xp: Math.round(run.team.xp), xn: run.team.xpNext, lv: run.team.lvl, gm: Math.floor(run.team.gems), ss: run.team.stars,
      rl: run.team.relics, rr: run.team.rerolls, star: run.star, hint: run.hint, t: Math.floor(run.time),
      ch: run.challenge ? run.challenge.wave : 0, tm: run.team.st.treasureMap ? 1 : 0,
      fm: run.fmod, pn: run.pathNow, heat: run.heat, rush: run.rush ? 1 : 0, wk: run.weekly, key: run.flowerKey ? 1 : 0, eg: run.eggsFound,
      cw: run.curse.collapse && !G.isBossFloor(run.floor) && run.floorTime > C.COLLAPSE_AT - 15 ? 1 : 0,
      pg: run.pings.map(q => [q.slot, Math.round(q.x), Math.round(q.y), q.help ? 1 : 0, r2(q.t)]),
      pt: G.Pet.view(run.pets), cu: Object.keys(run.curse),
      ui: RN.uiView(run),
    };
    run.camSnap = false;
    return v;
  };
  RN.uiView = function (run) {
    const ui = run.ui; if (!ui) return null;
    const o = Object.assign({}, ui);
    if (ui.m === 'shop') { const ob = run.objects.find(x => x.id === ui.oid); o.items = ob ? ob.items : []; }
    if (ui.m === 'event') { const ev = EVENTS[ui.id]; o.title = ev.title; o.text = ev.text; o.opts = ev.opts.map(x => x.t); }
    if (ui.m === 'pause') {
      o.curses = Object.keys(run.curse); o.heat = run.heat;
      o.cards = run.players.map(p => Object.entries(p.cards).map(([id, n]) => [id, n]));
      o.tags = run.players.map(p => { const t = {}; for (const k in G.TAGS) t[k] = Cb.tagCount(p, k); return t; });
      o.relics = run.team.relics; o.syn = run.synergy;
    }
    if (ui.m === 'lvl') o.tags = run.players.map(p => { const t = {}; for (const k in G.TAGS) t[k] = Cb.tagCount(p, k); return t; });
    return o;
  };

  return RN;
})();
