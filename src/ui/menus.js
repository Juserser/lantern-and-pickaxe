// 메뉴 화면 그리기 (view.ui 기반 — 방장/참가자 동일)
G.Menus = (function () {
  const M = {};
  const UI = G.UI, C = G.C, PC = G.COLORS.p, RC = G.COLORS.rarity;
  const RNAME = { c: '일반', r: '희귀', l: '전설', g: '도박' };
  const keyA = slot => (G.In.mode === 'local' ? (slot === 0 ? 'C' : '.') : 'C');
  const keyS = slot => (G.In.mode === 'local' ? (slot === 0 ? 'V' : '/') : 'V');
  const who = (v, slot) => { const p = v.ps && v.ps[slot]; return (p && p.nm) || (slot ? '2P' : '1P'); };
  const mine = slot => G.In.mode === 'local' || G.App.mySlot === slot;

  function card(c, x, y, w, h, selected, color, t, tags) {
    const col = RC[c.r];
    UI.panel(x, y, w, h, { fill: c.r === 'g' ? 'rgba(12,6,18,0.97)' : 'rgba(30,22,48,0.96)', edge: col, lw: c.r === 'l' || c.r === 'g' ? 2 : 1.2 });
    if (selected) UI.select(x, y, w, h, color, t);
    UI.emoji(c.icon, x + 13, y + h / 2, 13);
    UI.text(c.name, x + 26, y + 4, { size: 8, color: col });
    const tag = G.TAGS[c.tag];
    UI.text(tag.icon + ' ' + RNAME[c.r] + (tags ? `  (${tags[c.tag]}→${tags[c.tag] + 1})` : ''), x + w - 4, y + 4.5, { size: 5.5, align: 'right', color: c.r === 'g' ? '#d7a8ff' : '#b7a7cf' });
    UI.textBlock(c.desc, x + 26, y + 15, w - 30, { size: 6.5, color: '#fff3e6' });
  }

  M.lvl = function (v, ui, t) {
    UI.dim(0.62);
    UI.text(`LEVEL UP!  Lv ${ui.lv}`, C.W / 2, 14, { size: 14, align: 'center', color: '#e8ff9a' });
    UI.text('각자 카드 한 장씩 골라요 ✨', C.W / 2, 32, { size: 7, align: 'center', color: '#b7a7cf' });
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? 14 : C.W / 2 + 6, w = C.W / 2 - 20;
      UI.text(who(v, i), x + w / 2, 44, { size: 8, align: 'center', color: PC[i] });
      ui.c[i].forEach((id, k) => {
        const c = G.CARD[id];
        card(c, x, 56 + k * 52, w, 46, ui.sel[i] === k, PC[i], t, ui.tags && ui.tags[i]);
      });
      if (ui.done[i]) {
        UI.ctx.fillStyle = 'rgba(10,6,20,0.45)'; UI.ctx.fillRect(x - 2, 54, w + 4, 158);
        UI.text('선택 완료 ✓', x + w / 2, 214, { size: 8, align: 'center', color: '#9dffb0' });
        UI.text(`(${keyS(i)}: 다시 고르기)`, x + w / 2, 225, { size: 6, align: 'center', color: '#b7a7cf' });
      } else {
        UI.text(`↑↓ 고르기 · ${keyA(i)} 결정` + (v.rr > 0 ? ` · ${keyS(i)} 새로고침(${v.rr})` : ''), x + w / 2, 216, { size: 6.5, align: 'center', color: '#e8dcff' });
      }
    }
  };

  M.relic = function (v, ui, t) {
    UI.dim(0.62);
    UI.text(ui.next ? '층 클리어! 🎉' : '유물 발견! 🎁', C.W / 2, 22, { size: 14, align: 'center', color: '#ffd36b' });
    UI.text(`${who(v, ui.who)}의 선택 차례예요 — 같이 상의해 봐요 💬`, C.W / 2, 42, { size: 7.5, align: 'center', color: PC[ui.who] });
    const w = 132, gap = 10, x0 = C.W / 2 - (w * 3 + gap * 2) / 2;
    ui.c.forEach((id, k) => {
      const r = G.RELIC[id], x = x0 + k * (w + gap), y = 70;
      UI.panel(x, y, w, 100, { edge: '#ffd36b', fill: 'rgba(40,30,20,0.95)' });
      if (ui.sel === k) UI.select(x, y, w, 100, PC[ui.who], t);
      UI.emoji(r.icon, x + w / 2, y + 26, 24);
      UI.text(r.name, x + w / 2, y + 46, { size: 9, align: 'center', color: '#ffd36b' });
      UI.textBlock(r.desc, x + 8, y + 62, w - 16, { size: 7, align: 'left' });
    });
    UI.text(`←→ 고르기 · ${keyA(ui.who)} 결정`, C.W / 2, 186, { size: 7, align: 'center', color: '#e8dcff' });
  };

  function listMenu(title, sub, items, sel, color, t, x, y, w) {
    x = x == null ? C.W / 2 - 130 : x; y = y == null ? 40 : y; w = w || 260;
    const h = 30 + items.length * 20 + (sub ? 10 : 0);
    UI.panel(x, y, w, h);
    UI.text(title, x + w / 2, y + 6, { size: 10, align: 'center', color: '#ffe9c7' });
    if (sub) UI.text(sub, x + w / 2, y + 20, { size: 6.5, align: 'center', color: '#b7a7cf' });
    const oy = y + (sub ? 34 : 24);
    items.forEach((it, i) => {
      const iy = oy + i * 20;
      if (sel === i) { UI.ctx.fillStyle = 'rgba(255,255,255,0.08)'; UI.rr(x + 6, iy - 2, w - 12, 18, 4); UI.ctx.fill(); UI.select(x + 6, iy - 2, w - 12, 18, color, t); }
      if (it.icon) UI.emoji(it.icon, x + 18, iy + 7, 10);
      UI.text(it.name, x + 30, iy + 1, { size: 7.5, color: it.dim ? '#7a6a8a' : '#fff3e6' });
      if (it.desc) UI.text(it.desc, x + 30, iy + 10, { size: 5.5, color: '#b7a7cf' });
      if (it.right) UI.text(it.right, x + w - 12, iy + 3, { size: 7, align: 'right', color: it.rc || G.COLORS.gold });
    });
    return y + h;
  }

  M.shop = function (v, ui, t) {
    UI.dim(0.5);
    const items = ui.items.map(it => ({ icon: it.icon, name: it.name + (it.sold ? ' (품절)' : ''), desc: it.desc, right: it.sold ? '' : it.cost + '💎', dim: it.sold }));
    items.push({ icon: '👋', name: '나가기' });
    const end = listMenu('🐌 느릿 상점', `가진 광석 💎${v.gm} · 둘이 함께 쓰는 지갑이에요`, items, ui.sel, PC[ui.who], t);
    if (ui.msg) UI.text(ui.msg, C.W / 2, end + 6, { size: 7.5, align: 'center', color: '#ffd36b' });
    UI.text(`${who(v, ui.who)}: ↑↓ 고르기 · ${keyA(ui.who)} 사기 · ${keyS(ui.who)} 나가기`, C.W / 2, C.H - 22, { size: 6.5, align: 'center', color: '#b7a7cf' });
  };

  function dialogBox(title, text, opts, sel, color, t, res, slot) {
    UI.dim(0.5);
    const w = 300, x = C.W / 2 - w / 2, y = 50;
    const th = UI.wrap(res || text, w - 30, 8).length * 12;
    const h = 40 + th + (res ? 20 : opts.length * 18);
    UI.panel(x, y, w, h);
    UI.text(title, x + w / 2, y + 7, { size: 10, align: 'center', color: '#ffe9c7' });
    UI.textBlock(res || text, x + 15, y + 26, w - 30, { size: 8, lh: 12 });
    if (res) { UI.text(`▶ ${keyA(slot)}`, x + w - 12, y + h - 14, { size: 7, align: 'right', color: '#b7a7cf', alpha: 0.6 + Math.sin(t * 5) * 0.4 }); return; }
    opts.forEach((o, i) => {
      const iy = y + 32 + th + i * 18;
      if (sel === i) { UI.ctx.fillStyle = 'rgba(255,255,255,0.08)'; UI.rr(x + 10, iy - 2, w - 20, 16, 4); UI.ctx.fill(); UI.select(x + 10, iy - 2, w - 20, 16, color, t); }
      UI.text(o, x + 18, iy + 1.5, { size: 7.5 });
    });
  }
  M.fount = function (v, ui, t) {
    dialogBox('⛲ 소원의 샘', '맑은 물이 반짝이며 솟아나요.', ['물을 마신다 💧 (둘 다 체력 가득)', '광석을 던진다 🪙 (15💎 · 무작위 축복)', '그냥 간다'], ui.sel, PC[ui.who], t, ui.res, ui.who);
    if (ui.msg && !ui.res) UI.text(ui.msg, C.W / 2, 180, { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  M.event = function (v, ui, t) {
    dialogBox(ui.title, ui.text, ui.opts, ui.sel, PC[ui.who], t, ui.res, ui.who);
    if (ui.msg && !ui.res) UI.text(ui.msg, C.W / 2, 190, { size: 7.5, align: 'center', color: '#ffd36b' });
    if (!ui.res) UI.text(`${who(v, ui.who)}가 골라요`, C.W / 2, 40, { size: 7, align: 'center', color: PC[ui.who] });
  };

  M.wish = function (v, ui, t) {
    UI.dim(0.7);
    UI.text('🌠 별똥별에 소원을 빌어요', C.W / 2, 20, { size: 13, align: 'center', color: '#fff3a0' });
    if (ui.res) {
      UI.textBlock(ui.res, C.W / 2, 100, 360, { size: 9, align: 'center', lh: 15 });
      UI.text('▶ 공격 키', C.W / 2, 200, { size: 7, align: 'center', color: '#b7a7cf' });
      return;
    }
    UI.text('서로 몰래 골라요! 같은 소원이면 텔레파시 성공 💞', C.W / 2, 40, { size: 7.5, align: 'center', color: '#ffc6da' });
    if (G.In.mode === 'local') UI.text('(한 화면이면 서로 화면을 보지 않기로 약속 🙈)', C.W / 2, 51, { size: 6, align: 'center', color: '#b7a7cf' });
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? 30 : C.W / 2 + 10, w = C.W / 2 - 40;
      UI.text(who(v, i), x + w / 2, 66, { size: 8, align: 'center', color: PC[i] });
      if (ui.done[i]) { UI.text('소원 완료 ✓', x + w / 2, 120, { size: 10, align: 'center', color: '#9dffb0' }); continue; }
      G.WISHES.forEach((wsh, k) => {
        const y = 80 + k * 36;
        UI.panel(x, y, w, 30, { fill: 'rgba(40,30,70,0.9)' });
        if (mine(i) && ui.sel[i] === k) UI.select(x, y, w, 30, PC[i], t);
        UI.emoji(wsh.icon, x + 14, y + 15, 13);
        UI.text(wsh.name, x + 28, y + 5, { size: 8 });
        UI.text(wsh.text, x + 28, y + 17, { size: 6, color: '#b7a7cf' });
      });
      if (!mine(i)) UI.text('고르는 중… 🤫', x + w / 2, 196, { size: 7, align: 'center', color: '#b7a7cf' });
    }
  };

  M.path = function (v, ui, t) {
    UI.dim(0.72);
    UI.text('🛤️ 갈림길', C.W / 2, 10, { size: 13, align: 'center', color: '#ffe9c7' });
    if (ui.res) {
      UI.textBlock(ui.res, C.W / 2, 60, 380, { size: 10, align: 'center', lh: 16 });
      if (ui.pick) { const p = G.PATHS[ui.pick]; UI.emoji(p.icon, C.W / 2, 128, 28); UI.text(p.desc, C.W / 2, 150, { size: 7.5, align: 'center', color: '#b7a7cf' }); }
      if (ui.t > 0.6) UI.text('▶ 공격 키로 출발!', C.W / 2, 190, { size: 8, align: 'center', alpha: 0.6 + Math.sin(t * 5) * 0.4 });
      return;
    }
    if (!ui.rps) {
      UI.text('다음엔 어느 굴로 갈까요? 같은 길이면 바로 출발, 다르면 가위바위보! ✌️', C.W / 2, 28, { size: 7, align: 'center', color: '#ffc6da' });
      const w = 136, gap = 10, x0 = C.W / 2 - (w * 3 + gap * 2) / 2, y = 52;
      ui.c.forEach((k, i) => {
        const p = G.PATHS[k], x = x0 + i * (w + gap);
        UI.panel(x, y, w, 108, { fill: 'rgba(40,30,64,0.95)', edge: '#8a7ab0' });
        UI.emoji(p.icon, x + w / 2, y + 22, 22);
        UI.text(p.name, x + w / 2, y + 40, { size: 9, align: 'center', color: '#ffe9c7' });
        UI.textBlock(p.desc, x + 8, y + 56, w - 16, { size: 7 });
        for (let s = 0; s < 2; s++) if (ui.sel[s] === i) {
          UI.select(x - s * 3, y - s * 3, w + s * 6, 108 + s * 6, PC[s], t);
          UI.text((ui.done[s] ? '✓ ' : '▼ ') + who(v, s), x + (s ? w - 4 : 4), y - 11, { size: 6.5, align: s ? 'right' : 'left', color: PC[s] });
        }
      });
      for (let s = 0; s < 2; s++) UI.text(`${who(v, s)}: ${ui.done[s] ? '결정! (' + keyS(s) + ' 취소)' : '←→ 고르기 · ' + keyA(s) + ' 결정'}`, s ? C.W - 20 : 20, 176, { size: 7, color: PC[s], align: s ? 'right' : 'left' });
      return;
    }
    const r = ui.rps;
    UI.text('가고 싶은 길이 달라요! 가위바위보로 정해요 ✌️✊🖐️', C.W / 2, 30, { size: 8.5, align: 'center', color: '#ffc6da' });
    if (r.msg) UI.text(r.msg, C.W / 2, 46, { size: 8, align: 'center', color: '#ffd36b' });
    for (let s = 0; s < 2; s++) {
      const x = s ? C.W / 2 + 14 : 24, w = C.W / 2 - 38, pth = G.PATHS[ui.c[ui.sel[s]]];
      UI.text(`${who(v, s)} → ${pth.icon} ${pth.name}`, x + w / 2, 64, { size: 8, align: 'center', color: PC[s] });
      if (r.done[s] && !mine(s)) { UI.text('골랐어요! 🤫', x + w / 2, 110, { size: 9, align: 'center', color: '#9dffb0' }); continue; }
      G.RPS.forEach((h, k) => {
        const bw = w / 3, bx = x + k * bw, by = 80;
        UI.panel(bx + 3, by, bw - 6, 50, { fill: 'rgba(40,30,70,0.9)' });
        if (r.sel[s] === k && mine(s)) UI.select(bx + 3, by, bw - 6, 50, PC[s], t);
        UI.emoji(h.icon, bx + bw / 2, by + 20, 18); UI.text(h.name, bx + bw / 2, by + 36, { size: 7, align: 'center' });
      });
      UI.text(r.done[s] ? '결정! ✓' : `←→ · ${keyA(s)} 결정`, x + w / 2, 140, { size: 7.5, align: 'center', color: r.done[s] ? '#9dffb0' : '#b7a7cf' });
    }
  };
  M.camp = function (v, ui, t) {
    dialogBox('🔥 모닥불 쉼터', '타닥타닥… 따뜻한 모닥불이에요. 쓰러진 친구도 벌떡 일어나요.', ['푹 쉬기 (둘 다 최대 체력 +1칸, 체력 가득)', '카드 다듬기 (카드 한 장씩 + 새로고침 1장)', '그냥 간다'], ui.sel, PC[ui.who], t, ui.res, ui.who);
    if (!ui.res) UI.text(`${who(v, ui.who)}가 골라요`, C.W / 2, 40, { size: 7, align: 'center', color: PC[ui.who] });
  };

  M.pause = function (v, ui, t) {
    UI.dim(0.72);
    UI.text('⏸ 잠깐 쉬어요', C.W / 2, 12, { size: 12, align: 'center' });
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? 14 : C.W / 2 + 6, w = C.W / 2 - 20, y = 32;
      const p = v.ps[i];
      UI.panel(x, y, w, 150, { edge: PC[i] });
      UI.sprite(p.c, x + 6, y + 6, 1.5, i === 1);
      UI.text(p.nm + ' · ' + G.CHARS[p.c].name, x + 34, y + 8, { size: 8, color: PC[i] });
      const tags = ui.tags[i];
      UI.text(Object.keys(G.TAGS).map(k => G.TAGS[k].icon + tags[k]).join('  '), x + 34, y + 20, { size: 6.5, color: '#e8dcff' });
      const cs = ui.cards[i];
      cs.forEach(([id, n], k) => {
        const c = G.CARD[id], cx = x + 8 + (k % 2) * (w / 2 - 4), cy = y + 38 + Math.floor(k / 2) * 12;
        if (cy > y + 140) return;
        UI.emoji(c.icon, cx + 5, cy + 4, 8);
        UI.text(c.name + (n > 1 ? ' ×' + n : ''), cx + 12, cy, { size: 6.5, color: RC[c.r] });
      });
      if (!cs.length) UI.text('아직 카드가 없어요', x + w / 2, y + 60, { size: 7, align: 'center', color: '#7a6a8a' });
    }
    UI.text('유물: ' + (ui.relics.map(id => G.RELIC[id].icon).join(' ') || '없음') + (ui.syn.length ? '   시너지: ' + ui.syn.map(s => G.TAGS[s].icon).join(' ') : '') +
      (ui.curses && ui.curses.length ? `   저주 ${ui.heat}: ` + ui.curses.map(id => G.CURSE[id].icon).join('') : ''), C.W / 2, 188, { size: 7.5, align: 'center' });
    const opts = ['계속하기', ui.confirm ? '정말 포기할까요? (한 번 더 누르면 포기)' : '원정 포기하기'];
    opts.forEach((o, i) => {
      const y = 204 + i * 16;
      if (ui.sel === i) UI.select(C.W / 2 - 100, y - 2, 200, 14, PC[ui.who], t);
      UI.text(o, C.W / 2, y, { size: 8, align: 'center', color: i === 1 && ui.confirm ? '#ff9eb5' : '#fff3e6' });
    });
    UI.text(`M: 지도 켜기/끄기`, C.W / 2, C.H - 12, { size: 6, align: 'center', color: '#7a6a8a' });
  };

  M.dialog = function (v, ui, t) {
    const line = ui.lines[Math.min(ui.i, ui.lines.length - 1)];
    const w = 360, x = C.W / 2 - w / 2, h = 62, y = C.H - h - 16;
    UI.ctx.fillStyle = 'rgba(10,6,20,0.35)'; UI.ctx.fillRect(0, 0, C.W, C.H);
    UI.panel(x, y, w, h, { fill: 'rgba(28,20,44,0.96)', edge: '#ffd36b' });
    UI.textBlock(line, x + 16, y + 12, w - 32, { size: 8.5, lh: 13 });
    UI.text(`${ui.i + 1}/${ui.lines.length}  ▶`, x + w - 10, y + h - 12, { size: 6.5, align: 'right', color: '#b7a7cf', alpha: 0.6 + Math.sin(t * 5) * 0.4 });
  };

  M.result = function (v, ui, t) {
    UI.dim(0.78);
    const d = ui.data;
    const title = ui.win ? (d.rush ? '👑 보스 러시 완주! 👑' : '🌟 별빛을 되찾았어요! 🌟') : ui.gaveUp ? '오늘은 여기까지 🏕️' : '둘 다 지쳐 잠들었어요… 💤';
    UI.text(title, C.W / 2, 12, { size: 13, align: 'center', color: ui.win ? '#fff3a0' : '#ffc6da' });
    const w = 330, x = C.W / 2 - w / 2, y = 36;
    UI.panel(x, y, w, 170);
    const rows = [
      ['도달한 곳', d.floor > 12 ? `${G.biomeOf(d.floor, d.garden).name} ${d.floor}층` : `${G.biomeOf(d.floor).name} ${Math.ceil(d.floor / 3)}-${((d.floor - 1) % 3) + 1}`],
      ['함께한 시간', G.U.fmtTime(d.time)], ['재운 몬스터', d.kills + '마리'], ['레벨', 'Lv ' + d.lvl],
      ['가져간 광석', '💎 ' + d.gems + (ui.win ? '' : ' (70%)')], ['별조각', '⭐ ' + d.stars], ['합동기', d.combos + '번 💞'], ['캔 블록', d.ores + '개'],
    ];
    rows.forEach(([k, val], i) => {
      const cx = x + 14 + (i % 2) * (w / 2), cy = y + 10 + Math.floor(i / 2) * 15;
      UI.text(k, cx, cy, { size: 7, color: '#b7a7cf' }); UI.text(val, cx + 62, cy, { size: 7.5 });
    });
    for (let i = 0; i < 2; i++) {
      const cx = x + 14 + i * (w / 2), cy = y + 78;
      UI.sprite(d.chars[i], cx, cy, 1.5, i === 1);
      UI.text(d.names[i], cx + 28, cy + 2, { size: 8, color: PC[i] });
      UI.text(`준 피해 ${d.dmg[i]}`, cx + 28, cy + 14, { size: 6.5 });
      UI.text(`살려준 횟수 ${d.revives[i]}번`, cx + 28, cy + 24, { size: 6.5 });
    }
    // MVP
    const lines = [];
    if (d.revives[0] !== d.revives[1]) lines.push(`🩹 ${d.names[d.revives[0] > d.revives[1] ? 0 : 1]} — 든든한 수호천사`);
    if (d.dmg[0] !== d.dmg[1]) lines.push(`⚔️ ${d.names[d.dmg[0] > d.dmg[1] ? 0 : 1]} — 용감한 선봉장`);
    if (d.combos >= 3) lines.push('💞 척척 호흡 — 합동기 장인 커플');
    for (const e of d.extra || []) lines.push(e);
    lines.slice(0, 5).forEach((l, i) => UI.text(l, C.W / 2, y + 116 + i * 10.5, { size: 7, align: 'center', color: i < lines.length - (d.extra || []).length ? '#ffd36b' : '#e8dcff' }));
    if ((ui.t || 0) > 1.2) {
      if (d.more) {
        ['굴집으로 돌아가기 🏡', d.key ? '비밀 꽃밭으로! 🌸' : '더 깊은 곳으로! (무한 모드) 🕳️'].forEach((o, i) => {
          const oy = 212 + i * 15;
          if (ui.sel === i) UI.select(C.W / 2 - 90, oy - 2, 180, 13, '#ffd36b', t);
          UI.text(o, C.W / 2, oy, { size: 8, align: 'center' });
        });
      } else UI.text('▶ 공격 키로 굴집으로', C.W / 2, 216, { size: 8, align: 'center', alpha: 0.6 + Math.sin(t * 5) * 0.4 });
    }
  };

  // ───────────── 굴집 메뉴
  M.door = function (v, ui, t) {
    const m = G.App.meta;
    const wk = G.WEEKLY.find(w => w.id === m.weekly) || G.WEEKLY[0];
    const items = [
      { icon: '🏮', name: `원정 떠나기  ◀ 별빛 ${ui.star} ▶`, desc: ui.star ? `몬스터 체력 +${Math.round(ui.star * 14)}% · 피해 +${Math.round(ui.star * 8)}%` : (m.starLevel ? '←→ 로 별빛 단계를 골라요' : '평범한 동굴') },
      { icon: '🌙', name: '깊은 밤 (저주 고르기)', desc: '저주를 걸수록 어렵지만 보상이 커져요' + (m.stats.bestHeat ? ` · 최고 ${m.stats.bestHeat}단계` : '') },
      { icon: '📅', name: '오늘의 동굴', desc: `${G.U.today()} — 오늘만의 동굴 모양` },
      { icon: wk.icon, name: `이번 주 도전: ${wk.name}`, desc: wk.desc + (m.weeklyDone === m.week ? ' · 보상 받음 ✓' : ` · 6층 도달 시 ⭐+${G.WEEKLY_REWARD}`) },
      { icon: '👑', name: m.rushOpen ? '보스 러시' : '보스 러시 🔒', desc: m.rushOpen ? `보스 4마리 연속! ${m.stats.rushBest ? '최고 기록 ' + G.HUD.clock(m.stats.rushBest) : '아직 기록 없음'}` : '보스를 두 마리 이상 재우면 열려요', dim: !m.rushOpen },
      { icon: '🏡', name: '조금 더 쉴래' },
    ];
    const end = listMenu('🚪 원정 문', m.meal ? `🍱 도시락 준비 완료: ${G.RECIPE[m.meal].name} — ${G.RECIPE[m.meal].desc}` : '준비됐나요? 출발하면 캐릭터를 골라요 🐾', items, ui.sel, PC[ui.who], t, C.W / 2 - 150, 22, 300);
    if (ui.msg) UI.text(ui.msg, C.W / 2, end + 6, { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  M.curse = function (v, ui, t) {
    UI.dim(0.75);
    const heat = ui.on.reduce((a, id) => a + G.CURSE[id].heat, 0);
    const items = G.CURSES.map(c => { const on = ui.on.includes(c.id); return { icon: c.icon, name: (on ? '☑ ' : '☐ ') + c.name, desc: c.desc, right: '+' + c.heat, rc: on ? '#d7a8ff' : '#7a6a8a', dim: !on }; });
    items.push({ icon: '🌙', name: `이 저주로 출발!  (저주 ${heat}단계)`, desc: heat ? `광석 +${Math.round(heat * C.HEAT_GEM * 100)}% · 별빛을 되찾으면 별조각 +${heat}` : '저주를 하나 이상 골라 주세요' });
    items.push({ icon: '↩️', name: '돌아가기' });
    const end = listMenuScroll('🌙 깊은 밤 — 저주 고르기', `별빛 ${ui.star}단계에 더해져요 · 고른 저주는 기억해 둘게요`, items, ui.sel, PC[ui.who], t, C.W / 2 - 160, 4, 320);
    if (ui.msg) UI.text(ui.msg, C.W / 2, Math.min(end + 2, C.H - 12), { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  M.charsel = function (v, ui, t) {
    const m = G.App.meta, go = ui.go;
    UI.dim(0.82);
    const heat = (go.curses || []).reduce((a, id) => a + G.CURSE[id].heat, 0);
    const mode = go.rush ? '👑 보스 러시' : go.weekly ? '🗓️ 이번 주 도전' : go.daily ? '📅 오늘의 동굴' : go.curses ? `🌙 깊은 밤 · 저주 ${heat}단계 · 별빛 ${go.star || 0}` : `🏮 원정 · 별빛 ${go.star || 0}`;
    UI.text('누구로 갈까요? 🐾', C.W / 2, 5, { size: 11, align: 'center', color: '#ffe9c7' });
    UI.text(mode, C.W / 2, 20, { size: 7, align: 'center', color: '#b7a7cf' });
    UI.text(`⭐ ${m.stars}`, C.W - 8, 7, { size: 7, align: 'right', color: '#fff3a0' });
    for (let i = 0; i < 2; i++) {
      const x0 = i ? C.W / 2 + 3 : 7, w = C.W / 2 - 10;
      UI.panel(x0, 31, w, 234, { edge: PC[i], fill: 'rgba(24,16,38,0.92)' });
      UI.text(who(v, i), x0 + w / 2, 35, { size: 8, align: 'center', color: PC[i] });
      const cw = (w - 16) / 4;
      G.CHAR_ORDER.forEach((id, k) => {
        const own = m.chars.includes(id), cx = x0 + 8 + (k % 4) * cw, cy = 48 + Math.floor(k / 4) * 40;
        UI.panel(cx + 2, cy, cw - 4, 36, { fill: own ? 'rgba(40,30,64,0.95)' : 'rgba(20,14,30,0.95)', edge: own ? '#8a7ab0' : '#3a3050', shadow: false });
        if (ui.sel[i] === k) UI.select(cx + 2, cy, cw - 4, 36, PC[i], t);
        UI.ctx.globalAlpha = own ? 1 : 0.3; UI.sprite(id, cx + cw / 2 - 12, cy + 3, 1.5, i === 1); UI.ctx.globalAlpha = 1;
        if (!own) UI.text('🔒', cx + cw - 5, cy + 2, { size: 6, align: 'right' });
        UI.text(own ? G.CHARS[id].name : '???', cx + cw / 2, cy + 28, { size: 5.5, align: 'center' });
      });
      const id = G.CHAR_ORDER[ui.sel[i]], ch = G.CHARS[id], own = m.chars.includes(id), dy = 134;
      UI.text(`${ch.emoji} ${ch.name} — ${ch.animal} · ${ch.role}`, x0 + 8, dy, { size: 8, color: '#ffe9c7' });
      UI.textBlock(ch.desc, x0 + 8, dy + 13, w - 16, { size: 6.5, lh: 9 });
      UI.text(`체력 ${ch.hp / 2}칸 · ${ch.skill.icon} ${ch.skill.name}`, x0 + 8, dy + 34, { size: 6.5, color: '#e8dcff' });
      UI.text(`${ch.miner ? '⛏️채굴 ' : ''}${ch.lightPower ? '🏮결계 해제 ' : ''}${ch.passive}`, x0 + 8, dy + 45, { size: 6, color: '#b7a7cf' });
      if (!own) {
        const met = G.Hub.unlockMet(ch.unlock);
        UI.text(`해금: ${ch.unlock.text} + ⭐${ch.unlock.stars}`, x0 + 8, dy + 57, { size: 6.5, color: met ? '#9dffb0' : '#ff9eb5' });
        if (met) UI.text(`조건 달성! ${keyA(i)} 키로 별조각을 내고 데려가요`, x0 + 8, dy + 67, { size: 6, color: '#9dffb0' });
      }
      if (ui.msg[i]) UI.text(ui.msg[i], x0 + w / 2, dy + 80, { size: 7, align: 'center', color: '#ffd36b' });
      if (ui.done[i]) { UI.ctx.fillStyle = 'rgba(10,6,20,0.5)'; UI.ctx.fillRect(x0 + 3, 46, w - 6, 84); UI.text('준비 완료 ✓', x0 + w / 2, 80, { size: 12, align: 'center', color: '#9dffb0' }); }
      UI.text(ui.done[i] ? `${keyS(i)}: 다시 고르기` : `←→ 고르기 · ${keyA(i)} 결정 · ${keyS(i)} 취소`, x0 + w / 2, 252, { size: 6.5, align: 'center', color: '#e8dcff' });
    }
  };
  function upgradeMenu(def, lv, ui, t) {
    const m = G.App.meta;
    UI.dim(0.5);
    const w = 240, x = C.W / 2 - w / 2, y = 60;
    UI.panel(x, y, w, 110);
    UI.emoji(def.icon, x + 24, y + 26, 22);
    UI.text(def.name, x + 44, y + 12, { size: 11, color: '#ffe9c7' });
    UI.text(`${lv} / ${def.max} 단계`, x + 44, y + 28, { size: 7.5, color: '#b7a7cf' });
    UI.text('지금: ' + (lv ? def.desc(lv) : '아직 없음'), x + 14, y + 50, { size: 7.5 });
    if (lv < def.max) {
      UI.text('다음: ' + def.desc(lv + 1), x + 14, y + 64, { size: 7.5, color: '#9dffb0' });
      UI.text(`${keyA(ui.who)}: 강화하기 (💎${def.cost[lv]} / 가진 💎${m.gems})`, x + w / 2, y + 86, { size: 7.5, align: 'center', color: G.COLORS.gold });
    } else UI.text('최고 단계 달성! ✨', x + w / 2, y + 80, { size: 8, align: 'center', color: '#ffd36b' });
    if (ui.msg) UI.text(ui.msg, C.W / 2, y + 118, { size: 7.5, align: 'center', color: '#ffd36b' });
  }
  M.forge = (v, ui, t) => upgradeMenu(G.FORGE, G.App.meta.forge, ui, t);
  M.garden = (v, ui, t) => upgradeMenu(G.GARDEN, G.App.meta.garden, ui, t);

  M.skills = function (v, ui, t) {
    const m = G.App.meta, ctx = UI.ctx;
    ctx.fillStyle = 'rgba(10,8,30,0.94)'; ctx.fillRect(0, 0, C.W, C.H);
    for (let i = 0; i < 60; i++) { const sx = (i * 97) % C.W, sy = (i * 53) % C.H; ctx.globalAlpha = 0.3 + Math.sin(t * 2 + i) * 0.2; ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 1, 1); }
    ctx.globalAlpha = 1;
    UI.text('✨ 별자리 책', C.W / 2, 6, { size: 11, align: 'center', color: '#fff3a0' });
    UI.text(`가진 별조각 ⭐${m.stars}`, C.W / 2, 21, { size: 7, align: 'center', color: '#e8dcff' });
    const X = s => 30 + s.x * (C.W - 60), Y = s => 34 + s.y * 170;
    for (const s of G.SKILLS) for (const r of s.req) {
      const a = G.SKILL[r]; const lit = m.skills.includes(s.id) && m.skills.includes(r);
      ctx.strokeStyle = lit ? G.BRANCH[s.br].color : 'rgba(180,170,220,0.25)'; ctx.lineWidth = lit ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(s), Y(s)); ctx.stroke();
    }
    for (const b in G.BRANCH) { const n = G.SKILLS.filter(s => s.br === b); const cx = n.reduce((a, s) => a + X(s), 0) / n.length; UI.text(G.BRANCH[b].name, cx, 204, { size: 8, align: 'center', color: G.BRANCH[b].color }); }
    G.SKILLS.forEach((s, i) => {
      const own = m.skills.includes(s.id), avail = !s.req.length || s.req.some(r => m.skills.includes(r));
      const x = X(s), y = Y(s), r = own ? 5 : 4;
      ctx.fillStyle = own ? G.BRANCH[s.br].color : avail ? 'rgba(255,255,255,0.55)' : 'rgba(120,110,150,0.4)';
      ctx.beginPath(); ctx.arc(x, y, r + (own ? Math.sin(t * 4 + i) * 0.6 : 0), 0, Math.PI * 2); ctx.fill();
      if (own) { ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      if (ui.sel === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(t * 6), 0, Math.PI * 2); ctx.stroke(); }
    });
    const s = G.SKILLS[ui.sel];
    const own = m.skills.includes(s.id);
    UI.panel(C.W / 2 - 150, 214, 300, 38, { edge: G.BRANCH[s.br].color });
    UI.text(`${s.name}  ${own ? '✓ 밝힘' : '⭐' + s.cost}`, C.W / 2 - 142, 219, { size: 8, color: G.BRANCH[s.br].color });
    UI.text(s.desc, C.W / 2 - 142, 232, { size: 7 });
    UI.text(ui.msg || `방향키 이동 · ${keyA(ui.who)} 밝히기 · B/, 초기화 · ${keyS(ui.who)} 닫기`, C.W / 2 + 142, 243, { size: 5.5, align: 'right', color: '#b7a7cf' });
  };

  M.codex = function (v, ui, t) {
    const m = G.App.meta;
    UI.dim(0.85);
    const tabs = ['몬스터', '카드', '유물', '보스'];
    tabs.forEach((n, i) => UI.text((ui.tab === i ? '▸ ' : '') + n, 60 + i * 60, 10, { size: 8, color: ui.tab === i ? '#ffd36b' : '#b7a7cf' }));
    UI.text('📖 도감', C.W - 12, 10, { size: 9, align: 'right', color: '#ffe9c7' });
    let list = [];
    if (ui.tab === 0) list = G.Hub.codexEnemies().map(k => { const e = G.ENEMIES[k], n = m.codex.enemies[k] || 0; return { name: n ? e.name : '???', desc: n ? e.desc : '아직 못 만났어요', right: n ? `재운 수 ${n}` : '', c: e.col[0], seen: n > 0 }; });
    if (ui.tab === 1) list = G.CARDS.map(c => { const n = m.codex.cards[c.id] || 0; return { icon: n ? c.icon : '❔', name: n ? c.name : '???', desc: n ? c.desc : '아직 못 골랐어요', right: n ? `${n}번` : '', rc: RC[c.r] }; });
    if (ui.tab === 2) list = G.RELICS.map(r => { const n = m.codex.relics[r.id]; return { icon: n ? r.icon : '❔', name: n ? r.name : '???', desc: n ? r.desc : '아직 못 찾았어요' }; });
    if (ui.tab === 3) list = Object.keys(G.BOSSES).map(k => { const b = G.BOSSES[k], n = m.codex.bosses[k] || 0; return { icon: n ? '👑' : '❔', name: n ? b.name : '???', desc: n ? b.desc : '더 깊은 곳에…', right: n ? `${n}번 재움` : '' }; });
    const seen = list.filter(x => x.name !== '???').length;
    UI.text(`발견 ${seen} / ${list.length}`, 20, 24, { size: 7, color: '#e8dcff' });
    const per = 9, start = Math.max(0, Math.min(ui.sel - 4, list.length - per));
    list.slice(start, start + per).forEach((it, k) => {
      const i = start + k, y = 38 + k * 24;
      UI.panel(20, y, C.W - 40, 21, { fill: 'rgba(30,22,48,0.9)', shadow: false });
      if (ui.sel === i) UI.select(20, y, C.W - 40, 21, '#ffd36b', t);
      if (it.icon) UI.emoji(it.icon, 33, y + 10.5, 11);
      else { UI.ctx.fillStyle = it.seen ? it.c : '#3a3050'; UI.ctx.beginPath(); UI.ctx.arc(33, y + 10.5, 6, 0, Math.PI * 2); UI.ctx.fill(); }
      UI.text(it.name, 46, y + 2.5, { size: 7.5, color: it.rc || '#fff3e6' });
      UI.text(it.desc, 46, y + 12, { size: 6, color: '#b7a7cf' });
      if (it.right) UI.text(it.right, C.W - 28, y + 6, { size: 6.5, align: 'right', color: G.COLORS.gold });
    });
    UI.text(`←→ 탭 · ↑↓ 넘기기 · ${keyS(ui.who)} 닫기`, C.W / 2, C.H - 10, { size: 6, align: 'center', color: '#7a6a8a' });
  };

  const imgCache = {};
  M.album = function (v, ui, t) {
    const m = G.App.meta;
    UI.dim(0.88);
    const tabs = ['📸 사진', '📊 우리의 기록', '🏆 업적'];
    tabs.forEach((n, i) => UI.text(n, 16, 14 + i * 14, { size: 7.5, color: ui.tab === i ? '#ffd36b' : '#7a6a8a' }));
    const x0 = 110, w0 = C.W - x0 - 14;
    if (ui.tab === 0) {
      if (!ui.photo) { UI.textBlock('아직 사진이 없어요.\n보스를 재우거나 합동기를 쓰면\n자동으로 찍혀요 📸', x0 + 20, 100, w0 - 40, { size: 8 }); return; }
      const ph = ui.photo;
      const img = G.App.photoImage(ph.id);
      const pw = 240, phh = 135, px = x0 + (w0 - pw) / 2, py = 16;
      UI.ctx.save(); UI.ctx.translate(px + pw / 2, py + phh / 2); UI.ctx.rotate(Math.sin(ui.sel * 1.7) * 0.02); UI.ctx.translate(-(px + pw / 2), -(py + phh / 2));
      UI.ctx.fillStyle = '#fff8f0'; UI.ctx.fillRect(px - 6, py - 6, pw + 12, phh + 34);
      if (img && img.complete) { UI.ctx.imageSmoothingEnabled = true; UI.ctx.drawImage(img, px, py, pw, phh); UI.ctx.imageSmoothingEnabled = false; }
      else { UI.ctx.fillStyle = '#2a2040'; UI.ctx.fillRect(px, py, pw, phh); UI.text('불러오는 중…', px + pw / 2, py + phh / 2, { size: 8, align: 'center' }); }
      UI.ctx.restore();
      UI.textBlock(ph.cap, px + 2, py + phh + 4, pw - 4, { size: 7, color: '#3a2233', outline: false, lh: 10 });
      UI.text(`◀ ${ui.sel + 1} / ${ui.n} ▶`, x0 + w0 / 2, C.H - 22, { size: 8, align: 'center', color: '#e8dcff' });
    } else if (ui.tab === 1) {
      const s = m.stats, n = m.names;
      const rows = [
        ['우리가 처음 만난 날', m.created], ['함께한 시간', G.U.fmtTime(s.playTime)], ['떠난 원정', s.runs + '번'], ['별빛을 되찾은 횟수', s.clears + '번'],
        ['가장 깊이 간 곳', s.bestFloor ? s.bestFloor + '층' : '-'], ['재운 몬스터', s.kills + '마리'], ['캔 블록', s.ores + '개'], ['모은 광석', s.gemsTotal + '💎'],
        ['합동기', s.combos + '번 💞'], [`${n[0] || '1P'}가 살려준 횟수`, s.revives[0] + '번'], [`${n[1] || '2P'}가 살려준 횟수`, s.revives[1] + '번'],
        ['텔레파시 성공', s.telepathy + '번 🔮'], ['손 놓지 않은 층', s.handFloors + '개 🤝'],
        ['낚은 물고기', (s.fish || 0) + '마리 🎣'], ['광석 대결 전적', `${(s.duel || [0, 0])[0]} : ${(s.duel || [0, 0])[1]}`],
        ['깊은 밤 최고 단계', s.bestHeat ? s.bestHeat + '단계 🌙' : '-'], ['보스 러시 최고 기록', s.rushBest ? G.HUD.clock(s.rushBest) : '-'],
      ];
      rows.forEach(([k, val], i) => { const y = 10 + i * 14.2; UI.text(k, x0 + 10, y, { size: 7.5, color: '#b7a7cf' }); UI.text(val, x0 + w0 - 10, y, { size: 8, align: 'right' }); });
    } else {
      const page = ui.sel || 0, per = 8;
      G.ACHIEVEMENTS.slice(page * per, page * per + per).forEach((a, k) => {
        const got = m.ach.includes(a.id), y = 12 + k * 28;
        UI.panel(x0, y, w0, 24, { fill: got ? 'rgba(60,45,20,0.95)' : 'rgba(30,22,48,0.8)', edge: got ? G.COLORS.gold : '#3a3050', shadow: false });
        UI.emoji(got ? a.icon : '🔒', x0 + 14, y + 12, 12);
        UI.text(a.name, x0 + 28, y + 3, { size: 8, color: got ? '#ffd36b' : '#b7a7cf' });
        UI.text(a.desc, x0 + 28, y + 14, { size: 6.5, color: '#e8dcff' });
        UI.text('⭐' + a.reward, x0 + w0 - 8, y + 8, { size: 7, align: 'right', color: '#fff3a0' });
      });
      UI.text(`◀ ${page + 1} / ${Math.ceil(G.ACHIEVEMENTS.length / per)} ▶   달성 ${m.ach.length}/${G.ACHIEVEMENTS.length}`, x0 + w0 / 2, C.H - 12, { size: 7, align: 'center', color: '#e8dcff' });
    }
    UI.text(`↑↓ 탭 · ${keyS(ui.who)} 닫기`, 16, C.H - 12, { size: 6, color: '#7a6a8a' });
  };

  M.wardrobe = function (v, ui, t) {
    const m = G.App.meta;
    const items = G.HATS.map(h => {
      const own = m.hats.includes(h.id);
      return { icon: h.icon, name: h.name + (m.hat[ui.who] === h.id ? '  (착용 중)' : ''), right: own ? '' : h.ach ? '업적 🏆' : h.gacha ? '뽑기 🎰' : h.cost + '💎', dim: !own && (h.ach || h.gacha) };
    });
    const x = 30;
    listMenuScroll(`👒 옷장 — ${who(v, ui.who)}`, `가진 광석 💎${m.gems}`, items, ui.sel, PC[ui.who], t, x, 14, 250);
    // 미리보기
    const p = v.ps[ui.who];
    UI.panel(300, 60, 150, 120, { edge: PC[ui.who] });
    UI.sprite(p.c, 343, 88, 4, false);
    UI.hat(p.c, G.HATS[ui.sel].id, 343, 88, 4, false);
    if (ui.msg) UI.text(ui.msg, 375, 190, { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  function listMenuScroll(title, sub, items, sel, color, t, x, y, w) {
    const per = 9, start = Math.max(0, Math.min(sel - 4, items.length - per));
    const shown = items.slice(start, start + per);
    const end = listMenu(title, sub, shown, sel - start, color, t, x, y, w);
    if (items.length > per) UI.text(`${sel + 1}/${items.length}`, x + w - 10, end - 10, { size: 6, align: 'right', color: '#7a6a8a' });
    return end;
  }

  M.mirror = function (v, ui, t) {
    const m = G.App.meta;
    UI.dim(0.6);
    UI.text(`🪞 캐릭터 거울 — ${who(v, ui.who)}`, C.W / 2, 10, { size: 10, align: 'center', color: PC[ui.who] });
    const n = G.CHAR_ORDER.length, w = 52, gap = 4, x0 = C.W / 2 - (n * w + (n - 1) * gap) / 2;
    G.CHAR_ORDER.forEach((id, i) => {
      const ch = G.CHARS[id], own = m.chars.includes(id), x = x0 + i * (w + gap), y = 32;
      UI.panel(x, y, w, 84, { edge: own ? '#8a7ab0' : '#3a3050', fill: own ? 'rgba(40,30,64,0.95)' : 'rgba(20,14,30,0.95)' });
      if (ui.sel === i) UI.select(x, y, w, 84, PC[ui.who], t);
      UI.ctx.globalAlpha = own ? 1 : 0.3;
      UI.sprite(id, x + w / 2 - 12, y + 10, 1.5, false);
      UI.ctx.globalAlpha = 1;
      UI.text(own ? ch.name : '???', x + w / 2, y + 46, { size: 8, align: 'center' });
      UI.text(ch.role, x + w / 2, y + 58, { size: 5, align: 'center', color: '#b7a7cf' });
      if (m.char[0] === id) UI.text('1P', x + 6, y + 4, { size: 6, color: PC[0] });
      if (m.char[1] === id) UI.text('2P', x + w - 6, y + 4, { size: 6, color: PC[1], align: 'right' });
      if (!own) UI.text('⭐' + ch.unlock.stars, x + w / 2, y + 70, { size: 7, align: 'center', color: '#fff3a0' });
    });
    const ch = G.CHARS[G.CHAR_ORDER[ui.sel]], own = m.chars.includes(G.CHAR_ORDER[ui.sel]);
    UI.panel(40, 126, C.W - 80, 92);
    UI.text(`${ch.emoji} ${ch.name} — ${ch.animal} · ${ch.role}`, 52, 132, { size: 9, color: '#ffe9c7' });
    UI.textBlock(ch.desc, 52, 148, C.W - 104, { size: 7.5 });
    UI.text(`공격: ${{ orb: '빛 구슬', swing: '곡괭이 휘두르기', bomb: '폭탄 던지기', bash: '등껍질 박치기', dart: '반딧불 화살', acorn: '튕기는 도토리', rune: '마법진', snow: '눈덩이' }[ch.atk.type]} · 스킬: ${ch.skill.icon} ${ch.skill.name} · 패시브: ${ch.passive}`, 52, 172, { size: 6.5, color: '#b7a7cf' });
    UI.text(`체력 ${ch.hp / 2}칸 · 빛 ${ch.light} · ${ch.miner ? '⛏️ 채굴 가능' : ''} ${ch.lightPower ? '🏮 결계 해제' : ''}`, 52, 184, { size: 6.5, color: '#b7a7cf' });
    if (!own) UI.text(`해금 조건: ${ch.unlock.text} + ⭐${ch.unlock.stars}  ${G.Hub.unlockMet(ch.unlock) ? '(조건 달성! ✓)' : ''}`, 52, 198, { size: 7, color: G.Hub.unlockMet(ch.unlock) ? '#9dffb0' : '#ff9eb5' });
    if (ui.msg) UI.text(ui.msg, C.W / 2, 226, { size: 7.5, align: 'center', color: '#ffd36b' });
    UI.text(`←→ 고르기 · ${keyA(ui.who)} 결정 · ${keyS(ui.who)} 닫기`, C.W / 2, C.H - 12, { size: 6.5, align: 'center', color: '#7a6a8a' });
  };

  M.deco = function (v, ui, t) {
    const m = G.App.meta;
    const items = G.FURNITURE.map(f => ({ icon: f.icon, name: f.name, right: m.fur.includes(f.id) ? '✓ 있음' : f.gacha ? '뽑기 🎰' : f.cost + '💎', rc: m.fur.includes(f.id) ? '#9dffb0' : f.gacha ? '#b7a7cf' : G.COLORS.gold, dim: !m.fur.includes(f.id) && f.gacha }));
    const end = listMenuScroll('🛋️ 가구 가게', `가진 광석 💎${m.gems} · 산 가구는 굴집에 바로 놓여요`, items, ui.sel, PC[ui.who], t, C.W / 2 - 130, 14, 260);
    if (ui.msg) UI.text(ui.msg, C.W / 2, Math.min(end + 4, C.H - 14), { size: 7.5, align: 'center', color: '#ffd36b' });
  };

  M.gacha = function (v, ui, t) {
    const m = G.App.meta, x = C.W / 2, y = 34;
    UI.dim(0.7);
    UI.panel(x - 115, y, 230, 180, { edge: '#ff7aa8' });
    UI.text('🎰 광석 뽑기', x, y + 8, { size: 11, align: 'center', color: '#ffe9c7' });
    UI.text(`한 번에 💎${G.GACHA_COST} · 가진 광석 💎${m.gems}`, x, y + 24, { size: 7, align: 'center', color: '#b7a7cf' });
    if (ui.anim > 0) {
      UI.emoji(['🎁', '⭐', '💎', '🥚', '🧸', '🍄', '👒'][Math.floor(t * 14) % 7], x, y + 82, 30 + Math.sin(t * 30) * 2);
      UI.text('두구두구두구…', x, y + 112, { size: 8, align: 'center', color: '#ffc6da' });
    } else if (ui.res) {
      if (ui.res.rare) for (let i = 0; i < 8; i++) { const a = t * 2 + i * 0.785; UI.text('✦', x + Math.cos(a) * 34, y + 78 + Math.sin(a) * 22, { size: 7, align: 'center', color: '#fff3a0', outline: false }); }
      UI.emoji(ui.res.icon, x, y + 78, 32);
      UI.text(ui.res.name, x, y + 104, { size: 10, align: 'center', color: ui.res.rare ? '#ffd36b' : '#fff3e6' });
      UI.text(ui.res.text, x, y + 120, { size: 7, align: 'center', color: '#b7a7cf' });
    } else UI.textBlock('모자 · 가구 · 알 · 별조각 · 광석 보따리가 나와요!\n이미 가진 게 나오면 광석으로 돌려받아요.', x - 95, y + 64, 190, { size: 7.5, lh: 12 });
    if (ui.msg) UI.text(ui.msg, x, y + 140, { size: 7.5, align: 'center', color: '#ff9eb5' });
    UI.text(`${keyA(ui.who)}: 뽑기 · ${keyS(ui.who)}: 나가기`, x, y + 160, { size: 7, align: 'center', color: '#e8dcff' });
  };
  M.nest = function (v, ui, t) {
    const m = G.App.meta;
    UI.dim(0.6);
    const items = (m.pets || []).map((pd, i) => {
      const d = G.PETS[pd.sp], st = G.petStage(pd.xp), owner = m.petOf[0] === i ? 0 : m.petOf[1] === i ? 1 : -1;
      return { icon: d.icon, name: d.names[st] + (st < 2 ? `  (진화까지 원정 ${(st === 0 ? 3 : 8) - pd.xp}번)` : '  ✨최종 진화'), desc: d.desc,
        right: owner >= 0 ? who(v, owner) + ' 따라감' : '쉬는 중', rc: owner >= 0 ? PC[owner] : '#7a6a8a' };
    });
    if (!items.length) items.push({ icon: '🥚', name: '아직 펫이 없어요', desc: '알은 상자·미믹·보스·광석 뽑기에서 나와요', dim: true });
    const end = listMenuScroll('🪺 펫 둥지', `${who(v, ui.who)}: ${keyA(ui.who)} 데려가기 / 쉬게 하기 · 원정을 함께 갈수록 진화해요`, items, ui.sel, PC[ui.who], t, C.W / 2 - 160, 12, 320);
    const eggs = m.eggs || [];
    UI.text(eggs.length ? '품는 중: ' + eggs.map(w => `🥚${Math.min(w, G.EGG_WARM)}/${G.EGG_WARM}`).join(' ') + '  (원정을 다녀오면 따뜻해져요)' : '품는 중인 알이 없어요', C.W / 2, Math.min(end + 6, C.H - 26), { size: 7, align: 'center', color: '#fff3e0' });
    if (ui.msg) UI.text(ui.msg, C.W / 2, C.H - 13, { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  const fishSummary = f => G.FISH.filter(x => !x.junk).map(x => x.icon + (f[x.id] || 0)).join(' ');
  M.pond = function (v, ui, t) {
    const m = G.App.meta;
    UI.dim(0.5);
    listMenu('🎣 굴집 낚시터', '가진 물고기 ' + fishSummary(m.fish || {}), [
      { icon: '🎣', name: '낚시하기', desc: '둘이 같이! 찌가 쏙 들어가면 바로 공격 키' },
      { icon: '🍳', name: '요리하기', desc: '물고기로 다음 원정 도시락을 만들어요' + (m.meal ? ` (지금: ${G.RECIPE[m.meal].name})` : '') },
      { icon: '👋', name: '나가기' },
    ], ui.sel, PC[ui.who], t);
  };
  M.fish = function (v, ui, t) {
    const m = G.App.meta, ctx = UI.ctx;
    UI.dim(0.55);
    UI.text('🎣 굴집 낚시', C.W / 2, 8, { size: 11, align: 'center', color: '#ffe9c7' });
    for (let i = 0; i < 2; i++) {
      const r = ui.f[i], x = i ? C.W / 2 + 8 : 18, w = C.W / 2 - 26, y = 28;
      UI.panel(x, y, w, 160, { edge: PC[i], fill: 'rgba(20,24,48,0.92)' });
      UI.text(who(v, i), x + w / 2, y + 5, { size: 8, align: 'center', color: PC[i] });
      const bx = x + w / 2, by = y + 86;
      ctx.fillStyle = '#23406e'; UI.rr(x + 8, y + 64, w - 16, 50, 6); ctx.fill();
      ctx.fillStyle = '#3a6aa8'; ctx.fillRect(x + 8, y + 64, w - 16, 3);
      if (r.s === 'wait' || r.s === 'bite') {
        const dip = r.s === 'bite' ? 5 + Math.sin(t * 30) * 2 : Math.sin(t * 3);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(bx + 30, y + 30); ctx.lineTo(bx, by - 6 + dip); ctx.stroke();
        ctx.fillStyle = '#ff5c7a'; ctx.fillRect(bx - 3, by - 6 + dip, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 3, by - 2 + dip, 6, 3);
        if (r.s === 'bite') UI.text('!', bx, by - 42, { size: 22, align: 'center', color: '#ffd36b' });
      }
      if (r.s === 'got' && r.fish) UI.emoji(G.FISHD[r.fish].icon, bx, y + 44, 22);
      const txt = r.s === 'idle' ? `${keyA(i)}: 낚싯대 던지기` : r.s === 'wait' ? '두근두근… 기다려요' : r.s === 'bite' ? `지금이야! ${keyA(i)}!!` : r.msg;
      UI.textBlock(txt, x + w / 2, y + 124, w - 16, { size: 7.5, align: 'center', lh: 11, color: r.s === 'bite' ? '#ffd36b' : '#fff3e6' });
    }
    UI.text('가진 물고기 ' + fishSummary(m.fish || {}), C.W / 2, 196, { size: 8, align: 'center' });
    UI.text(`${keyS(0)}${G.In.mode === 'local' ? ' / ' + keyS(1) : ''}: 그만하기`, C.W / 2, 212, { size: 6.5, align: 'center', color: '#b7a7cf' });
  };
  M.cook = function (v, ui, t) {
    const m = G.App.meta, f = m.fish || {};
    UI.dim(0.6);
    const items = G.RECIPES.map(r => {
      const ok = Object.entries(r.need).every(([id, c]) => (f[id] || 0) >= c);
      return { icon: r.icon, name: r.name + (m.meal === r.id ? '  (준비됨 ✓)' : ''), desc: r.desc + ' · 재료 ' + Object.entries(r.need).map(([id, c]) => G.FISHD[id].icon + '×' + c).join(' '),
        right: ok ? '만들기' : '재료 부족', rc: ok ? '#9dffb0' : '#7a6a8a', dim: !ok };
    });
    items.push({ icon: '👋', name: '나가기' });
    const end = listMenuScroll('🍳 동굴 부엌', '다음 원정 도시락 (하나만) · 가진 물고기 ' + fishSummary(f), items, ui.sel, PC[ui.who], t, C.W / 2 - 175, 14, 350);
    if (ui.msg) UI.text(ui.msg, C.W / 2, Math.min(end + 6, C.H - 14), { size: 7.5, align: 'center', color: '#ffd36b' });
  };
  M.duelask = function (v, ui, t) {
    const m = G.App.meta, rec = m.stats.duel || [0, 0];
    UI.dim(0.5);
    listMenu('⚔️ 광석 캐기 대결', '60초 동안 광석을 더 많이 캔 사람이 승리! 진 사람은 다음 원정에 벌칙 모자 🤡', [
      { icon: '⛏️', name: '대결 시작!', desc: `통산 전적  ${who(v, 0)} ${rec[0]} : ${rec[1]} ${who(v, 1)}` },
      { icon: '👋', name: '다음에 하자' },
    ], ui.sel, PC[ui.who], t, C.W / 2 - 160, 60, 320);
  };
  M.duelres = function (v, ui, t) {
    UI.dim(0.75);
    UI.text(ui.w < 0 ? '무승부! 🤝' : `${ui.names[ui.w]} 승리! 🏆`, C.W / 2, 24, { size: 16, align: 'center', color: '#fff3a0' });
    for (let i = 0; i < 2; i++) {
      const x = C.W / 2 + (i ? 70 : -70);
      if (ui.w === i) UI.emoji('👑', x, 58, 16);
      UI.sprite(ui.chars[i], x - 24, 68, 3, i === 1);
      if (ui.w === 1 - i) UI.hat(ui.chars[i], G.PENALTY_HAT, x - 24, 68, 3, i === 1);
      UI.text(ui.names[i], x, 122, { size: 9, align: 'center', color: PC[i] });
      UI.text('💎 ' + ui.score[i], x, 136, { size: 12, align: 'center', color: G.COLORS.gold });
    }
    UI.text(`통산 전적  ${ui.names[0]} ${ui.rec[0]} : ${ui.rec[1]} ${ui.names[1]}`, C.W / 2, 166, { size: 8, align: 'center' });
    if (ui.w >= 0) UI.text(`${ui.names[1 - ui.w]}는 다음 원정에 벌칙 모자를 써요 🤡`, C.W / 2, 182, { size: 7.5, align: 'center', color: '#ff9eb5' });
    if (ui.t > 1.2) UI.text('▶ 공격 키로 굴집으로', C.W / 2, 210, { size: 8, align: 'center', alpha: 0.6 + Math.sin(t * 5) * 0.4 });
  };

  M.draw = function (v, t) {
    const ui = v.ui; if (!ui) return;
    const fn = M[ui.m]; if (fn) fn(v, ui, t);
  };
  return M;
})();
