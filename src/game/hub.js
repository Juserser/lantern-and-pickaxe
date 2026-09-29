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
    { k: 'gacha', name: '광석 뽑기', x: 30 * S + 8, y: 5 * S + 8 },
    { k: 'nest', name: '펫 둥지', x: 35 * S + 8, y: 5 * S + 8 },
    { k: 'pond', name: '낚시터', x: 33 * S + 8, y: 10 * S + 4 },
    { k: 'duel', name: '광석 대결장', x: 29 * S + 8, y: 14 * S + 8 },
  ];
  H.FUR_POS = {
    rug: [15 * S + 8, 10 * S], plant: [2 * S + 12, 4 * S + 4], lights: [15 * S, 3 * S + 2], bed: [27 * S, 9 * S + 8], fire: [2 * S + 14, 10 * S + 8],
    shelf: [7 * S + 8, 4 * S + 8], fish: [22 * S, 9 * S + 4], table: [15 * S + 8, 13 * S + 8], window: [12 * S + 8, 3 * S], piano: [9 * S, 9 * S + 8],
    arcade: [36 * S + 8, 13 * S + 8], teddy: [36 * S + 8, 9 * S + 4], mushlamp: [28 * S + 4, 4 * S + 12], mobile: [33 * S, 3 * S + 2],
  };
  H.POND = { x: 33 * S + 8, y: 12 * S + 12 };

  H.weekly = () => G.WEEKLY[U.hashStr(U.weekKey()) % G.WEEKLY.length];
  const bossCount = () => { const b = G.Save.data.stats.bosses; return ['mushking', 'crab', 'moleking', 'whale'].filter(k => b[k] > 0).length; };
  H.rushOpen = () => bossCount() >= 2;

  H.create = function () {
    const save = G.Save.data;
    const hub = {
      map: G.World.generateHub(), t: 0, ui: null, toasts: [],
      players: [0, 1].map(i => ({ slot: i, c: save.char[i], x: (13 + i * 5) * S, y: 10 * S, vx: 0, vy: 0, f: i ? -1 : 1, a: 0, moving: false, r: 5, hat: save.hat[i], name: save.names[i] || (i ? '2P' : '1P') })),
      camSnap: true, camX: 15 * S, camY: 9 * S,
    };
    hub.map.ver = Math.floor(Math.random() * 1e6);
    hatchEggs(hub);
    hub.pets = G.Pet.hubPets(hub.players);
    const [a, b] = hub.players;
    if (!save.tutorial.intro) {
      save.tutorial.intro = 1; save.tutorial.v2 = 1; G.Save.write();
      hub.ui = { m: 'dialog', i: 0, lines: [
        '여기는 별빛 숲 아래, 두 사람의 아늑한 굴집이에요. 🏡',
        '어느 날 밤, 숲의 별빛이 땅속 깊은 곳으로 모두 새어 들어가 버렸어요.',
        '별빛을 되찾으려면 반짝이는 동굴의 가장 깊은 곳,\n「잠든 별의 심장」까지 내려가야 해요.',
        `${a.name}의 등불과 ${b.name}의 곡괭이만 있으면…\n분명 해낼 수 있을 거예요! 💞`,
        '위쪽 🚪 원정 문 앞에서 공격 키를 누르면 출발해요.\n굴집 오른쪽엔 낚시터, 뽑기 기계, 펫 둥지도 있어요!',
      ] };
    } else if (!save.tutorial.v2) {
      save.tutorial.v2 = 1; G.Save.write();
      hub.ui = { m: 'dialog', i: 0, lines: [
        '🎉 굴집이 넓어졌어요! 오른쪽으로 가 보세요.',
        '🎣 낚시터에서 물고기를 낚아 요리하면\n다음 원정에서 힘이 나요.',
        '🎰 광석 뽑기로 모자·가구·알을 모으고,\n🥚 알은 펫 둥지에서 원정 두 번이면 부화해요.',
        '⚔️ 광석 대결장에선 60초 동안 누가 더 많이 캐나 겨뤄요.\n진 사람은 다음 원정에 벌칙 모자! 🤡',
        '🚪 원정 문에 🌙 깊은 밤(저주), 🗓️ 이번 주 도전,\n👑 보스 러시가 생겼고, 출발 전에 캐릭터를 고를 수 있어요.',
        '동굴 속엔 갈림길, 협동 퍼즐, 광차, 보물 두더지,\n그리고 새 친구 🦉 후후와 🐧 뽀롱이 기다려요!',
      ] };
    }
    G.A.music('hub');
    return hub;
  };

  // 알 부화
  function hatchEggs(hub) {
    const save = G.Save.data;
    const keep = [];
    for (const w of save.eggs) {
      if (w < G.EGG_WARM) { keep.push(w); continue; }
      const owned = new Set(save.pets.map(p => p.sp));
      const fresh = G.PET_ORDER.filter(k => !owned.has(k));
      const sp = U.rng.pick(fresh.length ? fresh : G.PET_ORDER);
      save.pets.push({ sp, xp: 0 });
      save.stats.petsHatched++;
      const idx = save.pets.length - 1;
      for (let s = 0; s < 2; s++) if (save.petOf[s] < 0 && !save.petOf.includes(idx)) { save.petOf[s] = idx; break; }
      fx('banner', `${G.PETS[sp].icon} 알이 부화했어요!`, `${G.PETS[sp].names[0]} — ${G.PETS[sp].desc}`);
      fx('snd', 'ach');
    }
    if (keep.length !== save.eggs.length) { save.eggs = keep; G.Save.write(); }
  }

  function nearStation(hub, p) {
    let best = null, bd = 24;
    for (const s of H.STATIONS) { const d = U.dist(p.x, p.y, s.x, s.y + 6); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  H.update = function (hub, inputs, dt) {
    hub.t += dt;
    for (let i = hub.toasts.length - 1; i >= 0; i--) { hub.toasts[i].t -= dt; if (hub.toasts[i].t <= 0) hub.toasts.splice(i, 1); }
    G.Pet.follow(hub.pets, hub.players, dt);
    if (hub.ui) { updateUI(hub, inputs, dt); return; }
    for (let i = 0; i < 2; i++) {
      const p = hub.players[i], inp = inputs[i];
      p.vx = U.lerp(p.vx, inp.x * 82, 0.3); p.vy = U.lerp(p.vy, inp.y * 82, 0.3);
      p.moving = Math.hypot(inp.x, inp.y) > 0.1;
      if (p.moving) { p.a = Math.atan2(inp.y, inp.x); if (Math.abs(inp.x) > 0.15) p.f = inp.x > 0 ? 1 : -1; }
      G.World.moveSafe(hub.map, p, p.vx * dt, p.vy * dt, p.r);
      if (inp.pe) {
        const dir = Math.abs(inp.x) < 0.3 && Math.abs(inp.y) < 0.3 ? 'none' : Math.abs(inp.x) > Math.abs(inp.y) ? (inp.x > 0 ? 'right' : 'left') : (inp.y > 0 ? 'down' : 'up');
        fx('say', i, G.EMOTES[dir].text);
      }
      if (inp.pa) { const s = nearStation(hub, p); if (s) openStation(hub, s.k, i); else fx('say', i, U.rng.pick(['♪', '헤헤', '💕', '🎵', '오늘도 힘내자!'])); }
    }
    // 카메라: 둘의 가운데, 둘 다 화면 안에
    const m = hub.map, mw = m.w * S;
    let cx = (hub.players[0].x + hub.players[1].x) / 2;
    cx = U.clamp(cx, C.W / 2, mw - C.W / 2);
    hub.camX = cx; hub.camY = m.h * S / 2;
    for (const p of hub.players) {
      const nx = U.clamp(p.x, cx - C.W / 2 + 12, cx + C.W / 2 - 12);
      if (nx !== p.x) { const b = { x: p.x, y: p.y }; G.World.move(m, b, nx - p.x, 0, p.r); p.x = b.x; }
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
      case 'gacha': hub.ui = { m: 'gacha', who, res: null, anim: 0 }; break;
      case 'duel': hub.ui = { m: 'duelask', sel: 0, who }; break;
      default: hub.ui = { m: k, sel: 0, who };
    }
  }

  // 원정 문 → 캐릭터 고르기
  function openCharSel(hub, go) {
    const save = G.Save.data;
    if (go.weekly === 'bombfest') { hub.ui = null; G.App.startRun(go); return; }
    hub.ui = { m: 'charsel', go, sel: [0, 1].map(i => Math.max(0, G.CHAR_ORDER.indexOf(save.char[i]))), done: [false, false], msg: ['', ''] };
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
        nav(6);
        if (ui.sel === 0 && (inp.pl || inp.pr)) { ui.star = U.clamp(ui.star + (inp.pr ? 1 : -1), 0, save.starLevel); fx('snd', 'nav'); }
        if (inp.ps) return close();
        if (inp.pa) {
          save.lastStar = ui.star;
          switch (ui.sel) {
            case 0: return openCharSel(hub, { star: ui.star });
            case 1: hub.ui = { m: 'curse', sel: 0, who: ui.who, on: save.curseSel.filter(id => G.CURSE[id]), star: ui.star }; return;
            case 2: return openCharSel(hub, { daily: true });
            case 3: return openCharSel(hub, { weekly: H.weekly().id });
            case 4:
              if (!H.rushOpen()) { ui.msg = '보스를 두 마리 이상 재우면 열려요 👑'; fx('snd', 'deny'); return; }
              return openCharSel(hub, { rush: true });
            default: return close();
          }
        }
        return;
      }
      case 'curse': {
        const n = G.CURSES.length + 2;
        nav(n);
        if (inp.ps) { hub.ui = { m: 'door', sel: 1, who: ui.who, star: ui.star }; fx('snd', 'back'); return; }
        if (inp.pa) {
          if (ui.sel < G.CURSES.length) {
            const id = G.CURSES[ui.sel].id, i = ui.on.indexOf(id);
            if (i >= 0) ui.on.splice(i, 1); else ui.on.push(id);
            save.curseSel = ui.on.slice(); fx('snd', i >= 0 ? 'back' : 'pick');
          } else if (ui.sel === G.CURSES.length) {
            if (!ui.on.length) { ui.msg = '저주를 하나 이상 골라 주세요 🌙'; fx('snd', 'deny'); return; }
            G.Save.write();
            openCharSel(hub, { star: ui.star, curses: ui.on.slice() });
          } else { hub.ui = { m: 'door', sel: 1, who: ui.who, star: ui.star }; fx('snd', 'back'); }
        }
        return;
      }
      case 'charsel': {
        const n = G.CHAR_ORDER.length;
        for (let i = 0; i < 2; i++) {
          const q = inputs[i];
          if (ui.done[i]) { if (q.ps) { ui.done[i] = false; fx('snd', 'back'); } continue; }
          if (q.ps) { hub.ui = null; fx('snd', 'back'); return; }
          if (q.pl || q.pu) { ui.sel[i] = (ui.sel[i] - 1 + n) % n; ui.msg[i] = ''; fx('snd', 'nav'); }
          if (q.pr || q.pd) { ui.sel[i] = (ui.sel[i] + 1) % n; ui.msg[i] = ''; fx('snd', 'nav'); }
          if (q.pa) {
            const id = G.CHAR_ORDER[ui.sel[i]], ch = G.CHARS[id];
            if (!save.chars.includes(id)) {
              if (!unlockMet(ch.unlock)) { ui.msg[i] = `🔒 ${ch.unlock.text}`; fx('snd', 'deny'); continue; }
              if (save.stars < ch.unlock.stars) { ui.msg[i] = `별조각 ⭐${ch.unlock.stars}개가 필요해요`; fx('snd', 'deny'); continue; }
              save.stars -= ch.unlock.stars; save.chars.push(id); save.stats.charsUnlocked = save.chars.length;
              fx('banner', `${ch.emoji} ${ch.name} 합류!`, `${ch.animal} · ${ch.role}`); fx('snd', 'ach');
            }
            ui.done[i] = true; ui.msg[i] = ''; fx('snd', 'pick');
          }
        }
        if (ui.done[0] && ui.done[1]) {
          for (let i = 0; i < 2; i++) { save.char[i] = G.CHAR_ORDER[ui.sel[i]]; hub.players[i].c = save.char[i]; }
          G.Save.write();
          hub.ui = null;
          G.App.startRun(ui.go);
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
        if (inp.pc) {
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
        const len = [codexEnemies().length, G.CARDS.length, G.RELICS.length, Object.keys(G.BOSSES).length][ui.tab];
        if (inp.pu) ui.sel = Math.max(0, ui.sel - 1);
        if (inp.pd) ui.sel = Math.min(len - 1, ui.sel + 1);
        if (inp.ps) return close();
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
            if (h.gacha) { ui.msg = '광석 뽑기에서 나와요 🎰'; fx('snd', 'deny'); return; }
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
          if (f.gacha) { ui.msg = '광석 뽑기에서 나와요 🎰'; fx('snd', 'deny'); return; }
          if (pay('gems', f.cost)) { save.furniture.push(f.id); save.stats.furnitureCount = save.furniture.length; ui.msg = `${f.name}을(를) 들였어요! ${f.icon}`; G.Save.write(); H.checkAch(hub); }
        }
        return;
      }
      case 'gacha': {
        if (ui.anim > 0) { ui.anim -= dt; return; }
        if (inp.ps) return close();
        if (inp.pa) {
          if (save.gems < G.GACHA_COST) { ui.msg = '광석이 부족해요 💎'; fx('snd', 'deny'); return; }
          save.gems -= G.GACHA_COST;
          ui.res = rollGacha(save); ui.anim = 1.1; ui.n = (ui.n || 0) + 1; ui.msg = '';
          fx('snd', 'buy'); G.Save.write(); H.checkAch(hub);
        }
        return;
      }
      case 'nest': {
        const n = save.pets.length;
        if (n) nav(n);
        if (inp.ps) return close();
        if (inp.pa && n) {
          const who = ui.who, other = 1 - who;
          if (save.petOf[who] === ui.sel) { save.petOf[who] = -1; ui.msg = '둥지에서 쉬게 했어요 💤'; }
          else {
            if (save.petOf[other] === ui.sel) save.petOf[other] = -1;
            save.petOf[who] = ui.sel;
            ui.msg = `${G.Pet.name(save.pets[ui.sel])}가 ${hub.players[who].name}를 따라가요! ${G.PETS[save.pets[ui.sel].sp].icon}`;
          }
          fx('snd', 'pick'); G.Save.write();
          hub.pets = G.Pet.hubPets(hub.players);
        }
        return;
      }
      case 'pond': {
        nav(3);
        if (inp.ps) return close();
        if (inp.pa) {
          if (ui.sel === 0) { hub.ui = { m: 'fish', f: [0, 1].map(() => ({ s: 'idle', t: 0, fish: null, msg: '' })) }; fx('snd', 'splash'); }
          else if (ui.sel === 1) hub.ui = { m: 'cook', sel: 0, who: ui.who };
          else close();
        }
        return;
      }
      case 'fish': {
        for (let i = 0; i < 2; i++) if (inputs[i].ps) { G.Save.write(); H.checkAch(hub); return close(); }
        for (let i = 0; i < 2; i++) updateRod(hub, ui.f[i], inputs[i], dt, i);
        return;
      }
      case 'cook': {
        nav(G.RECIPES.length + 1);
        if (inp.ps) return close();
        if (inp.pa) {
          if (ui.sel === G.RECIPES.length) return close();
          const r = G.RECIPES[ui.sel];
          const ok = Object.entries(r.need).every(([id, c]) => (save.fish[id] || 0) >= c);
          if (!ok) { ui.msg = '재료가 부족해요 🐟'; fx('snd', 'deny'); return; }
          for (const [id, c] of Object.entries(r.need)) save.fish[id] -= c;
          save.meal = r.id; ui.msg = `${r.icon} ${r.name} 완성! 다음 원정 도시락이에요`; fx('snd', 'heal'); G.Save.write();
          fx('burst', hub.players[ui.who].x, hub.players[ui.who].y - 12, 12, ['#ffd36b', '#ffffff'], 50, 0.5);
        }
        return;
      }
      case 'duelask': {
        nav(2);
        if (inp.ps) return close();
        if (inp.pa) { if (ui.sel === 0) { hub.ui = null; G.App.startDuel(); } else close(); }
        return;
      }
    }
  }

  // 낚싯대 하나 (각자 따로)
  function updateRod(hub, r, inp, dt, slot) {
    const save = G.Save.data;
    r.t -= dt;
    switch (r.s) {
      case 'idle':
        if (inp.pa) { r.s = 'wait'; r.t = 1.5 + Math.random() * 3.5; r.msg = ''; fx('snd', 'throw'); }
        break;
      case 'wait':
        if (inp.pa) { r.s = 'miss'; r.t = 1.2; r.msg = '너무 빨랐어요! 물고기가 도망갔어요 💨'; fx('snd', 'comboFail'); break; }
        if (r.t <= 0) { r.s = 'bite'; r.t = 0.6; fx('snd', 'warn'); }
        break;
      case 'bite':
        if (inp.pa) {
          const f = U.rng.weighted(G.FISH, x => x.w);
          r.s = 'got'; r.t = 1.8; r.fish = f.id;
          if (f.junk) { save.gems += 5; r.msg = `${f.icon} ${f.name}… 안에 광석 5개가! 💎`; }
          else { save.fish[f.id] = (save.fish[f.id] || 0) + 1; save.stats.fish++; r.msg = `${f.icon} ${f.name}을(를) 낚았어요!`; }
          fx('snd', f.id === 'golden' || f.id === 'rainbow' ? 'ach' : 'pick'); fx('say', slot, f.junk ? '엥…?' : '잡았다! 🎣');
        } else if (r.t <= 0) { r.s = 'miss'; r.t = 1.2; r.msg = '놓쳤어요… 🐟💨'; fx('snd', 'back'); }
        break;
      default:
        if (r.t <= 0) { r.s = 'idle'; r.fish = null; }
    }
  }

  // 광석 뽑기
  function rollGacha(save) {
    const kind = U.rng.weighted([['hat', 30], ['fur', 20], ['egg', 15], ['stars', 17], ['gems', 18]], x => x[1])[0];
    const refund = () => { save.gems += G.GACHA_DUP_REFUND; return `이미 있어서 광석 ${G.GACHA_DUP_REFUND}개로 돌려받았어요`; };
    if (kind === 'hat') {
      const h = U.rng.pick(G.HATS.filter(x => x.gacha));
      if (save.hats.includes(h.id)) return { icon: h.icon, name: h.name, text: refund() };
      save.hats.push(h.id); return { icon: h.icon, name: h.name, text: '새 모자! 옷장에서 써 봐요', rare: 1 };
    }
    if (kind === 'fur') {
      const f = U.rng.pick(G.FURNITURE.filter(x => x.gacha));
      if (save.furniture.includes(f.id)) return { icon: f.icon, name: f.name, text: refund() };
      save.furniture.push(f.id); save.stats.furnitureCount = save.furniture.length;
      return { icon: f.icon, name: f.name, text: '굴집에 바로 놓였어요!', rare: 1 };
    }
    if (kind === 'egg') { save.eggs.push(0); return { icon: '🥚', name: '신비한 알', text: `펫 둥지에서 원정 ${G.EGG_WARM}번이면 부화해요`, rare: 1 }; }
    if (kind === 'stars') { const n = U.rng.weighted([[1, 60], [2, 30], [3, 10]], x => x[1])[0]; save.stars += n; return { icon: '⭐', name: `별조각 ${n}개`, text: '별자리 책에 쓸 수 있어요' }; }
    const g = U.rng.int(15, 60); save.gems += g; return { icon: '💎', name: `광석 보따리 ${g}개`, text: g >= 40 ? '대박!' : '쏠쏠해요' };
  }

  const unlockMet = u => {
    if (!u) return true;
    const s = G.Save.data.stats;
    switch (u.need) {
      case 'boss1': return s.bosses.mushking > 0;
      case 'boss2': return s.bosses.crab > 0;
      case 'boss3': return s.bosses.moleking > 0;
      case 'boss4': return s.bosses.whale > 0;
      case 'runs5': return s.runs >= 5;
      case 'runs10': return s.runs >= 10;
    }
    return true;
  };
  H.unlockMet = unlockMet;
  function codexEnemies() { return Object.keys(G.ENEMIES).filter(k => !G.ENEMIES[k].noCodex); }
  H.codexEnemies = codexEnemies;

  // ───────────── 원정 결과 반영 (결과 화면에 보여 줄 추가 줄을 돌려줘요)
  H.applyRunResult = function (run, win, gems) {
    const save = G.Save.data, s = save.stats, extra = [];
    save.gems += gems; save.stars += run.team.stars;
    s.runs++; s.playTime += run.time; s.kills += run.stats.kills; s.ores += run.stats.ores; s.gemsTotal += gems;
    s.combos += run.stats.combos; s.revives[0] += run.stats.revives[0]; s.revives[1] += run.stats.revives[1];
    for (const k of run.bossesKilled) { s.bosses[k] = (s.bosses[k] || 0) + 1; save.codex.bosses[k] = (save.codex.bosses[k] || 0) + 1; }
    s.handFloors += run.stats.handFloors; s.bestFloor = Math.max(s.bestFloor, run.floor); s.bestLevel = Math.max(s.bestLevel, run.team.lvl);
    s.nohitBoss += run.stats.nohitBoss; s.telepathy += run.stats.telepathy;
    s.moles += run.stats.moles; s.mimics += run.stats.mimics; s.puzzles += run.stats.puzzles; s.carts += run.stats.carts; s.gambleFloor += run.stats.gambleFloor;
    if (run.stats.garden) s.gardenFound = true;
    if (run.daily) s.dailies++;
    if (!win) s.deaths++;
    if (win && !run.rush) { s.clears++; save.cleared = true; save.starLevel = Math.min(10, Math.max(save.starLevel, run.star + 1)); s.bestStar = Math.max(s.bestStar, run.star); }
    // 깊은 밤
    if (run.heat) {
      extra.push(`🌙 깊은 밤 ${run.heat}단계 · 광석 +${Math.round(run.heat * C.HEAT_GEM * 100)}%`);
      if (win && !run.rush) { save.stars += run.heat; s.bestHeat = Math.max(s.bestHeat, run.heat); extra.push(`🌙 저주를 이겨낸 보너스 ⭐+${run.heat}`); }
    }
    // 보스 러시
    if (run.rush && win) {
      const t = Math.floor(run.time), best = s.rushBest;
      if (!best || t < best) { s.rushBest = t; extra.push(`👑 보스 러시 새 기록! ${U.fmtTime(t)}`); }
      else extra.push(`👑 보스 러시 완주 ${U.fmtTime(t)} (최고 ${U.fmtTime(best)})`);
      save.stars += 2;
    }
    // 이번 주 도전
    if (run.weekly && run.floor >= 6 && save.weeklyDone !== U.weekKey()) {
      save.weeklyDone = U.weekKey(); save.stars += G.WEEKLY_REWARD; s.weeklies++;
      extra.push(`🗓️ 이번 주 도전 보상 ⭐+${G.WEEKLY_REWARD}`);
    }
    // 알 품기 & 새 알
    save.eggs = save.eggs.map(w => w + 1);
    for (let i = 0; i < run.eggsFound; i++) save.eggs.push(0);
    if (run.eggsFound) extra.push(`🥚 알 ${run.eggsFound}개를 둥지로 가져왔어요`);
    if (save.eggs.some(w => w >= G.EGG_WARM)) extra.push('🐣 알이 곧 부화할 것 같아요!');
    // 펫 성장
    for (let slot = 0; slot < 2; slot++) {
      const pd = save.pets[save.petOf[slot]]; if (save.petOf[slot] < 0 || !pd) continue;
      const before = G.petStage(pd.xp); pd.xp++;
      if (G.petStage(pd.xp) > before) extra.push(`✨ ${G.PETS[pd.sp].names[before]}가 ${G.PETS[pd.sp].names[before + 1]}(으)로 진화했어요!`);
    }
    save.penalty = -1;
    for (const k in run.codexKills) save.codex.enemies[k] = (save.codex.enemies[k] || 0) + run.codexKills[k];
    for (const k in run.cardsPicked) save.codex.cards[k] = (save.codex.cards[k] || 0) + run.cardsPicked[k];
    for (const k in run.relicsFound) save.codex.relics[k] = 1;
    for (const k in run.hintFlags) if (k.startsWith('h_')) save.tutorial[k.slice(2)] = 1;
    s.codexFull = codexEnemies().every(k => save.codex.enemies[k] > 0);
    s.charsUnlocked = save.chars.length;
    G.Save.write();
    return extra;
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
    const ps = hub.players.map((p, i) => {
      const st = nearStation(hub, p);
      return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, c: p.c, f: p.f, a: Math.round(p.a * 100) / 100, hp: 1, mh: 1, st: 'n', mv: p.moving ? 1 : 0, at: 0,
        hat: save.penalty === i ? G.PENALTY_HAT : p.hat, nm: p.name, lt: 90, pr: st ? st.name : '', fr: 0, sc: 0 };
    });
    const ui = hub.ui ? Object.assign({}, hub.ui) : null;
    if (ui && ui.m === 'album' && ui.tab === 0) { const ph = G.Save.album[ui.sel]; ui.photo = ph ? { id: ph.id, cap: ph.cap, date: ph.date } : null; ui.n = G.Save.album.length; }
    if (ui && ui.m === 'fish') ui.f = hub.ui.f.map(r => Object.assign({}, r));
    const v = {
      sc: 'hub', mv: hub.map.ver, ps, ui, t: Math.round(hub.t * 10) / 10, snap: hub.camSnap ? 1 : 0, cx: Math.round(hub.camX), cy: Math.round(hub.camY),
      toasts: hub.toasts.map(t => t.a), pt: G.Pet.view(hub.pets),
      meta: { gems: Math.floor(save.gems), stars: save.stars, forge: save.forge, garden: save.garden, skills: save.skills, fur: save.furniture, hats: save.hats,
        hat: save.hat, chars: save.chars, char: save.char, ach: save.ach, starLevel: save.starLevel, codex: save.codex,
        stats: save.stats, names: save.names, created: save.created, cleared: save.cleared, lastStar: save.lastStar || 0,
        pets: save.pets, petOf: save.petOf, eggs: save.eggs, fish: save.fish, meal: save.meal, weeklyDone: save.weeklyDone, week: U.weekKey(),
        weekly: H.weekly().id, rushOpen: H.rushOpen() ? 1 : 0, penalty: save.penalty },
    };
    hub.camSnap = false;
    return v;
  };

  return H;
})();
