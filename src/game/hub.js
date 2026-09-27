// 굴집(허브) — 영구 성장 메뉴들
G.Hub = (function () {
  const H = {};
  const U = G.U, C = G.C, S = C.TILE;
  const fx = (...a) => G.fx(...a);

  H.STATIONS = [
    { k: 'door', name: '원정 문', x: 15 * S + 8, y: 4 * S + 12 },
    { k: 'forge', name: '대장간', x: 5 * S, y: 7 * S },
    { k: 'garden', name: '약초밭', x: 5 * S, y: 13 * S },
    { k: 'skills', name: '별자리 책', x: 10 * S, y: 5 * S + 8 },
    { k: 'codex', name: '도감 책장', x: 20 * S + 8, y: 5 * S + 8 },
    { k: 'album', name: '추억 벽', x: 25 * S, y: 5 * S + 8 },
    { k: 'wardrobe', name: '옷장', x: 25 * S + 8, y: 13 * S },
    { k: 'mirror', name: '캐릭터 거울', x: 20 * S + 8, y: 14 * S },
    { k: 'deco', name: '가구 가게', x: 10 * S, y: 14 * S },
  ];
  H.FUR_POS = {
    rug: [15 * S + 8, 10 * S], plant: [2 * S + 12, 4 * S + 4], lights: [15 * S, 3 * S + 2], bed: [27 * S, 9 * S + 8], fire: [2 * S + 14, 10 * S + 8],
    shelf: [7 * S + 8, 4 * S + 8], fish: [22 * S, 9 * S + 4], table: [15 * S + 8, 13 * S + 8], window: [12 * S + 8, 3 * S], piano: [9 * S, 9 * S + 8],
  };

  H.create = function () {
    const save = G.Save.data;
    const hub = {
      map: G.World.generateHub(), t: 0, ui: null, toasts: [],
      players: [0, 1].map(i => ({ slot: i, c: save.char[i], x: (13 + i * 5) * S, y: 10 * S, vx: 0, vy: 0, f: i ? -1 : 1, a: 0, moving: false, r: 5, hat: save.hat[i], name: save.names[i] || (i ? '2P' : '1P') })),
      camSnap: true,
    };
    hub.map.ver = Math.floor(Math.random() * 1e6);
    if (!save.tutorial.intro) {
      save.tutorial.intro = 1; G.Save.write();
      const [a, b] = hub.players;
      hub.ui = { m: 'dialog', i: 0, lines: [
        '여기는 별빛 숲 아래, 두 사람의 아늑한 굴집이에요. 🏡',
        '어느 날 밤, 숲의 별빛이 땅속 깊은 곳으로 모두 새어 들어가 버렸어요.',
        '별빛을 되찾으려면 반짝이는 동굴의 가장 깊은 곳,\n「잠든 별의 심장」까지 내려가야 해요.',
        `${a.name}의 등불과 ${b.name}의 곡괭이만 있으면…\n분명 해낼 수 있을 거예요! 💞`,
        '위쪽 🚪 원정 문 앞에서 공격 키를 누르면 출발해요.\n굴집의 다른 곳들도 구경해 봐요!',
      ] };
    }
    G.A.music('hub');
    return hub;
  };

  function nearStation(hub, p) {
    let best = null, bd = 24;
    for (const s of H.STATIONS) { const d = U.dist(p.x, p.y, s.x, s.y + 6); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  H.update = function (hub, inputs, dt) {
    hub.t += dt;
    for (let i = hub.toasts.length - 1; i >= 0; i--) { hub.toasts[i].t -= dt; if (hub.toasts[i].t <= 0) hub.toasts.splice(i, 1); }
    if (hub.ui) { updateUI(hub, inputs, dt); return; }
    for (let i = 0; i < 2; i++) {
      const p = hub.players[i], inp = inputs[i];
      p.vx = U.lerp(p.vx, inp.x * 82, 0.3); p.vy = U.lerp(p.vy, inp.y * 82, 0.3);
      p.moving = Math.hypot(inp.x, inp.y) > 0.1;
      if (p.moving) { p.a = Math.atan2(inp.y, inp.x); if (Math.abs(inp.x) > 0.15) p.f = inp.x > 0 ? 1 : -1; }
      G.World.moveSafe(hub.map, p, p.vx * dt, p.vy * dt, p.r);
      if (inp.pa) { const s = nearStation(hub, p); if (s) openStation(hub, s.k, i); else fx('say', i, U.rng.pick(['♪', '헤헤', '💕', '🎵', '오늘도 힘내자!'])); }
    }
  };

  function openStation(hub, k, who) {
    fx('snd', 'nav');
    const save = G.Save.data;
    switch (k) {
      case 'door': hub.ui = { m: 'door', sel: 0, who, star: Math.min(save.starLevel, save.lastStar || 0) }; break;
      case 'skills': hub.ui = { m: 'skills', sel: 0, who }; break;
      case 'codex': hub.ui = { m: 'codex', tab: 0, sel: 0, who }; break;
      case 'album': hub.ui = { m: 'album', tab: 0, sel: Math.max(0, G.Save.album.length - 1), who }; break;
      default: hub.ui = { m: k, sel: 0, who };
    }
  }

  function updateUI(hub, inputs, dt) {
    const ui = hub.ui, save = G.Save.data;
    const inp = inputs[ui.who != null ? ui.who : 0];
    const nav = (n, horiz) => {
      let s = ui.sel;
      if (horiz ? inp.pl : inp.pu) s = (s - 1 + n) % n;
      if (horiz ? inp.pr : inp.pd) s = (s + 1) % n;
      if (s !== ui.sel) fx('snd', 'nav');
      ui.sel = s;
    };
    const close = () => { hub.ui = null; fx('snd', 'back'); };
    const pay = (kind, cost) => { if (save[kind] < cost) { fx('snd', 'deny'); ui.msg = kind === 'gems' ? '광석이 부족해요 💎' : '별조각이 부족해요 ⭐'; return false; } save[kind] -= cost; fx('snd', 'buy'); return true; };
    switch (ui.m) {
      case 'dialog':
        if (inputs[0].pa || inputs[1].pa) { ui.i++; fx('snd', 'nav'); if (ui.i >= ui.lines.length) hub.ui = null; }
        return;
      case 'door': {
        nav(3);
        if (ui.sel === 0 && (inp.pl || inp.pr)) { ui.star = U.clamp(ui.star + (inp.pr ? 1 : -1), 0, save.starLevel); fx('snd', 'nav'); }
        if (inp.ps) return close();
        if (inp.pa) {
          if (ui.sel === 2) return close();
          save.lastStar = ui.star;
          hub.ui = null;
          G.App.startRun({ star: ui.sel === 0 ? ui.star : 0, daily: ui.sel === 1 });
        }
        return;
      }
      case 'forge': case 'garden': {
        const def = ui.m === 'forge' ? G.FORGE : G.GARDEN, lv = save[ui.m];
        if (inp.ps) return close();
        if (inp.pa) {
          if (lv >= def.max) { ui.msg = '최고 단계예요! ✨'; fx('snd', 'deny'); return; }
          if (pay('gems', def.cost[lv])) { save[ui.m]++; ui.msg = `${def.name} ${save[ui.m]}단계! 🎉`; G.Save.write(); fx('burst', hub.players[ui.who].x, hub.players[ui.who].y - 10, 12, '#ffd36b', 50, 0.5); }
        }
        return;
      }
      case 'skills': {
        const n = G.SKILLS.length;
        // 방향키로 별자리 사이를 이동 (가까운 별 찾기)
        const cur = G.SKILLS[ui.sel];
        const dirs = [[inp.pl, -1, 0], [inp.pr, 1, 0], [inp.pu, 0, -1], [inp.pd, 0, 1]];
        for (const [pressed, dx, dy] of dirs) {
          if (!pressed) continue;
          let best = -1, bd = 1e9;
          G.SKILLS.forEach((s, i) => {
            if (i === ui.sel) return;
            const vx = s.x - cur.x, vy = s.y - cur.y;
            const along = vx * dx + vy * dy; if (along <= 0.01) return;
            const perp = Math.abs(vx * dy - vy * dx);
            const score = along + perp * 2.2;
            if (score < bd) { bd = score; best = i; }
          });
          if (best >= 0) { ui.sel = best; fx('snd', 'nav'); }
        }
        if (inp.ps) return close();
        if (inp.pc) { // 초기화
          let refund = 0; for (const id of save.skills) refund += G.SKILL[id].cost;
          if (refund) { save.stars += refund; save.skills = []; ui.msg = `별자리를 초기화했어요 (⭐${refund} 돌려받음)`; fx('snd', 'back'); G.Save.write(); }
          return;
        }
        if (inp.pa) {
          const s = G.SKILLS[ui.sel];
          if (save.skills.includes(s.id)) { ui.msg = '이미 밝힌 별이에요 ✨'; return; }
          if (s.req.length && !s.req.some(r => save.skills.includes(r))) { ui.msg = '이어진 별을 먼저 밝혀요'; fx('snd', 'deny'); return; }
          if (pay('stars', s.cost)) { save.skills.push(s.id); ui.msg = `「${s.name}」 별이 빛나요! ⭐`; G.Save.write(); }
        }
        return;
      }
      case 'codex': {
        if (inp.pl || inp.pr) { ui.tab = (ui.tab + (inp.pr ? 1 : 3)) % 4; ui.sel = 0; fx('snd', 'nav'); }
        const len = [codexEnemies().length, G.CARDS.length, G.RELICS.length, 4][ui.tab];
        if (inp.pu) ui.sel = Math.max(0, ui.sel - 1);
        if (inp.pd) ui.sel = Math.min(len - 1, ui.sel + 1);
        if (inp.ps || inp.pa) { if (inp.ps) return close(); }
        return;
      }
      case 'album': {
        if (inp.pu || inp.pd) { ui.tab = (ui.tab + (inp.pd ? 1 : 2)) % 3; ui.sel = ui.tab === 0 ? Math.max(0, G.Save.album.length - 1) : 0; fx('snd', 'nav'); }
        if (ui.tab === 0) {
          const n = G.Save.album.length;
          if (n && inp.pl) { ui.sel = (ui.sel - 1 + n) % n; fx('snd', 'nav'); }
          if (n && inp.pr) { ui.sel = (ui.sel + 1) % n; fx('snd', 'nav'); }
        } else if (ui.tab === 2) {
          if (inp.pl) ui.sel = Math.max(0, ui.sel - 1);
          if (inp.pr) ui.sel = Math.min(Math.floor((G.ACHIEVEMENTS.length - 1) / 8), ui.sel + 1);
        }
        if (inp.ps || inp.pa) return close();
        return;
      }
      case 'wardrobe': {
        nav(G.HATS.length);
        if (inp.ps) return close();
        if (inp.pa) {
          const h = G.HATS[ui.sel];
          if (!save.hats.includes(h.id)) {
            if (h.ach) { ui.msg = '업적으로 얻을 수 있어요 🏆'; fx('snd', 'deny'); return; }
            if (!pay('gems', h.cost)) return;
            save.hats.push(h.id);
          }
          save.hat[ui.who] = h.id; hub.players[ui.who].hat = h.id; ui.msg = `${h.name} 착용! ${h.icon}`; fx('snd', 'pick'); G.Save.write();
        }
        return;
      }
      case 'mirror': {
        nav(G.CHAR_ORDER.length);
        if (inp.ps) return close();
        if (inp.pa) {
          const id = G.CHAR_ORDER[ui.sel], ch = G.CHARS[id];
          if (!save.chars.includes(id)) {
            if (!unlockMet(ch.unlock)) { ui.msg = `조건: ${ch.unlock.text}`; fx('snd', 'deny'); return; }
            if (!pay('stars', ch.unlock.stars)) return;
            save.chars.push(id); save.stats.charsUnlocked = save.chars.length;
            fx('banner', `${ch.emoji} ${ch.name} 합류!`, `${ch.animal} · ${ch.role}`);
          }
          save.char[ui.who] = id; hub.players[ui.who].c = id; ui.msg = `${ch.name}(으)로 변신! ${ch.emoji}`; fx('snd', 'pick'); G.Save.write();
          fx('burst', hub.players[ui.who].x, hub.players[ui.who].y - 8, 14, ['#ffffff', '#ffd36b'], 60, 0.5);
        }
        return;
      }
      case 'deco': {
        nav(G.FURNITURE.length);
        if (inp.ps) return close();
        if (inp.pa) {
          const f = G.FURNITURE[ui.sel];
          if (save.furniture.includes(f.id)) { ui.msg = '이미 굴집에 있어요 🏡'; return; }
          if (pay('gems', f.cost)) { save.furniture.push(f.id); save.stats.furnitureCount = save.furniture.length; ui.msg = `${f.name}을(를) 들였어요! ${f.icon}`; G.Save.write(); H.checkAch(hub); }
        }
        return;
      }
    }
  }
  const unlockMet = u => {
    if (!u) return true;
    const s = G.Save.data.stats;
    return u.need === 'boss1' ? s.bosses.mushking > 0 : u.need === 'boss2' ? s.bosses.crab > 0 : u.need === 'boss3' ? s.bosses.moleking > 0 : u.need === 'runs5' ? s.runs >= 5 : true;
  };
  H.unlockMet = unlockMet;
  function codexEnemies() { return Object.keys(G.ENEMIES).filter(k => !G.ENEMIES[k].noCodex); }
  H.codexEnemies = codexEnemies;

  // ───────────── 원정 결과 반영
  H.applyRunResult = function (run, win, gems) {
    const save = G.Save.data, s = save.stats;
    save.gems += gems; save.stars += run.team.stars;
    s.runs++; s.playTime += run.time; s.kills += run.stats.kills; s.ores += run.stats.ores; s.gemsTotal += gems;
    s.combos += run.stats.combos; s.revives[0] += run.stats.revives[0]; s.revives[1] += run.stats.revives[1];
    for (const k of run.bossesKilled) { s.bosses[k] = (s.bosses[k] || 0) + 1; save.codex.bosses[k] = (save.codex.bosses[k] || 0) + 1; }
    s.handFloors += run.stats.handFloors; s.bestFloor = Math.max(s.bestFloor, run.floor); s.bestLevel = Math.max(s.bestLevel, run.team.lvl);
    s.nohitBoss += run.stats.nohitBoss; s.telepathy += run.stats.telepathy;
    if (run.daily) s.dailies++;
    if (!win) s.deaths++;
    if (win) { s.clears++; save.cleared = true; save.starLevel = Math.min(10, Math.max(save.starLevel, run.star + 1)); s.bestStar = Math.max(s.bestStar, run.star); }
    for (const k in run.codexKills) save.codex.enemies[k] = (save.codex.enemies[k] || 0) + run.codexKills[k];
    for (const k in run.cardsPicked) save.codex.cards[k] = (save.codex.cards[k] || 0) + run.cardsPicked[k];
    for (const k in run.relicsFound) save.codex.relics[k] = 1;
    for (const k in run.hintFlags) if (k.startsWith('h_')) save.tutorial[k.slice(2)] = 1;
    s.codexFull = codexEnemies().every(k => save.codex.enemies[k] > 0);
    s.charsUnlocked = save.chars.length;
    G.Save.write();
  };

  H.checkAch = function (hub) {
    const save = G.Save.data;
    const got = [];
    for (const a of G.ACHIEVEMENTS) {
      if (save.ach.includes(a.id)) continue;
      let ok = false; try { ok = a.check(save.stats); } catch (e) {}
      if (ok) { save.ach.push(a.id); save.stars += a.reward; got.push(a); }
    }
    for (const h of G.HATS) if (h.ach && save.ach.includes(h.ach) && !save.hats.includes(h.id)) save.hats.push(h.id);
    if (got.length) {
      G.Save.write();
      got.forEach(a => fx('toast', a.name, a.icon));
      fx('snd', 'ach');
    }
    return got;
  };

  H.view = function (hub) {
    const save = G.Save.data;
    const ps = hub.players.map(p => {
      const st = nearStation(hub, p);
      return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, c: p.c, f: p.f, a: Math.round(p.a * 100) / 100, hp: 1, mh: 1, st: 'n', mv: p.moving ? 1 : 0, at: 0, hat: p.hat, nm: p.name, lt: 90, pr: st ? st.name : '', fr: 0, sc: 0 };
    });
    const ui = hub.ui ? Object.assign({}, hub.ui) : null;
    if (ui && ui.m === 'album' && ui.tab === 0) { const ph = G.Save.album[ui.sel]; ui.photo = ph ? { id: ph.id, cap: ph.cap, date: ph.date } : null; ui.n = G.Save.album.length; }
    const v = {
      sc: 'hub', mv: hub.map.ver, ps, ui, t: Math.round(hub.t * 10) / 10, snap: hub.camSnap ? 1 : 0,
      toasts: hub.toasts.map(t => t.a),
      meta: { gems: Math.floor(save.gems), stars: save.stars, forge: save.forge, garden: save.garden, skills: save.skills, fur: save.furniture, hats: save.hats,
        hat: save.hat, chars: save.chars, char: save.char, ach: save.ach, starLevel: save.starLevel, codex: save.codex,
        stats: save.stats, names: save.names, created: save.created, cleared: save.cleared, lastStar: save.lastStar || 0 },
    };
    hub.camSnap = false;
    return v;
  };

  return H;
})();
