// HUD & 화면 위 연출
G.HUD = (function () {
  const H = {};
  const UI = G.UI, C = G.C, R = G.R;
  const PC = G.COLORS.p;

  function playerPanel(v, p, slot, t) {
    const right = slot === 1;
    const w = 122, h = 33, x = right ? C.W - w - 4 : 4, y = 4;
    UI.panel(x, y, w, h, { edge: PC[slot], fill: 'rgba(24,16,38,0.82)' });
    const sx = right ? x + w - 26 : x + 3;
    const ctx = UI.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; UI.rr(sx, y + 3, 23, 23, 5); ctx.fill();
    UI.sprite(p.c, sx + 1.5, y + 4.5, 1.25, right);
    UI.hat(p.c, p.hat, sx + 1.5, y + 4.5, 1.25, right);
    const tx = right ? x + w - 30 : x + 29;
    const al = right ? 'right' : 'left';
    UI.text(p.nm || (slot ? '2P' : '1P'), tx, y + 3, { size: 7, color: PC[slot], align: al });
    const nh = Math.ceil(p.mh / 2), hw = Math.min(nh, 10) * 8 * 0.9;
    UI.hearts(right ? tx - hw : tx, y + 12, p.hp, p.mh, 0.9);
    // 스킬
    const sk = G.CHARS[p.c].skill;
    const kx = right ? x + 4 : x + w - 16, ky = y + 21;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(kx + 6, ky + 5, 6.5, 0, Math.PI * 2); ctx.fill();
    UI.emoji(sk.icon, kx + 6, ky + 5.5, 7);
    if (p.sc > 0) {
      ctx.fillStyle = 'rgba(10,6,20,0.7)'; ctx.beginPath(); ctx.moveTo(kx + 6, ky + 5);
      ctx.arc(kx + 6, ky + 5, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.sc); ctx.closePath(); ctx.fill();
    } else { ctx.strokeStyle = 'rgba(255,243,160,' + (0.6 + Math.sin(t * 6) * 0.3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(kx + 6, ky + 5, 6.5, 0, Math.PI * 2); ctx.stroke(); }
    // 무서움
    if (p.fr > 20) {
      const fx = right ? x + 20 : x + w - 44;
      UI.emoji(p.fr >= 99 ? '😱' : '😨', fx, ky + 5, 6);
      UI.bar(fx + 5, ky + 3.5, 18, 3, p.fr / 100, p.fr >= 99 ? '#b388ff' : '#7a6aa8');
    }
    if (p.st === 'x') UI.text('😢 ' + Math.ceil(p.dt) + '초', right ? x + 30 : x + w - 30, ky, { size: 6.5, color: '#8fd8ff', align: 'center' });
    if (p.st === 'g') UI.text('👻 다음 층에서', right ? x + 34 : x + w - 34, ky, { size: 6, color: '#b7a7cf', align: 'center' });
    if (p.bf) UI.emoji('🍱', right ? x + w - 34 : x + 34, ky + 5, 6);
  }

  function heartGauge(v, t) {
    const ctx = UI.ctx;
    const cx = C.W / 2, y = 4;
    UI.panel(cx - 46, y, 92, 24, { fill: 'rgba(24,16,38,0.82)' });
    // 층
    const b = G.BIOMES[Math.max(0, v.bi)];
    const fi = ((v.fl - 1) % 3) + 1;
    UI.text(v.fl > 12 ? `깊은 곳 ${v.fl}층` : `${b.name} ${Math.ceil(v.fl / 3)}-${fi}`, cx, y + 2.5, { size: 6.5, align: 'center', color: '#e8dcff' });
    // 두근 게이지
    const k = v.hg / C.HEART_MAX, full = k >= 1;
    const hx = cx - 7, hy = y + 11, s = 2;
    ctx.save();
    const pulse = full ? 1 + Math.sin(t * 10) * 0.08 : 1;
    ctx.translate(cx, hy + 6); ctx.scale(pulse, pulse); ctx.translate(-cx, -(hy + 6));
    UI.heart(hx, hy, s, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(hx, hy + 7 * s * (1 - k), 7 * s, 7 * s * k + 1); ctx.clip();
    UI.heart(hx, hy, s, 2); ctx.restore();
    ctx.restore();
    if (full) UI.text('합동기!', cx, y + 25, { size: 6.5, align: 'center', color: '#ff9eb5', alpha: 0.7 + Math.sin(t * 8) * 0.3 });
    UI.text('💎' + v.gm, cx - 42, y + 12.5, { size: 7, color: G.COLORS.gold });
    UI.text('⭐' + v.ss, cx + 42, y + 12.5, { size: 7, color: '#fff3a0', align: 'right' });
    // 유물 & 시너지
    let rx = cx - (v.rl.length * 9) / 2 + 4.5;
    v.rl.slice(-10).forEach((id, i) => UI.emoji(G.RELIC[id].icon, rx + i * 9, y + 36, 7));
    v.syn.forEach((s2, i) => UI.text(G.TAGS[s2].icon + ' 시너지', C.W / 2 + (i - (v.syn.length - 1) / 2) * 40, y + 43, { size: 6, align: 'center', color: G.TAGS[s2].color }));
  }

  function xpBar(v) {
    const x = 60, y = C.H - 9, w = C.W - 120;
    UI.bar(x, y, w, 5, v.xp / v.xn, '#e8ff9a', 'rgba(0,0,0,0.55)');
    UI.text('Lv ' + v.lv, x - 4, y - 2, { size: 7, align: 'right', color: '#e8ff9a' });
    if (v.rr) UI.text('🎟️' + v.rr, x + w + 4, y - 2, { size: 6.5 });
  }

  function bossBar(v, t) {
    const b = v.bs; if (!b || !b.act) return;
    const d = G.BOSSES[b.k];
    const w = 200, x = C.W / 2 - w / 2, y = 52;
    UI.text(d.name + (b.ph > 1 ? ' 😡' : ''), C.W / 2, y - 9, { size: 7.5, align: 'center', color: '#ffd6e4' });
    UI.bar(x, y, w, 6, b.hp, b.ph > 1 ? '#ff4d6d' : '#ff7aa8', 'rgba(0,0,0,0.6)');
  }

  function prompts(v, t) {
    v.ps.forEach((p, i) => {
      if (p.st === 'g') return;
      const x = R.sx(p.x), y = R.sy(p.y);
      // 이름표
      UI.text(p.nm, x, y + 6, { size: 5.5, align: 'center', color: PC[i], alpha: 0.85 });
      if (p.pr) {
        const key = G.In.mode === 'local' ? (i === 0 ? 'C' : '.') : 'C';
        const str = `[${key}] ${p.pr}`;
        const w = UI.measure(str, 6.5) + 8;
        UI.panel(x - w / 2, y - 34, w, 11, { r: 4, fill: 'rgba(24,16,38,0.9)', edge: PC[i], shadow: false });
        UI.text(str, x, y - 32.5, { size: 6.5, align: 'center' });
      }
      if (v.tf) UI.text('?', x, y - 30 + Math.sin(t * 6) * 1.5, { size: 10, align: 'center', color: '#b7a7cf' });
    });
    if (v.tf) UI.text('너무 멀어요… 서로 곁으로! 💔', C.W / 2, C.H - 32, { size: 7.5, align: 'center', color: '#ff9eb5', alpha: 0.7 + Math.sin(t * 5) * 0.3 });
  }

  // ───────────── 로컬 연출 상태
  const L = { bubbles: [], banner: null, flash: null, toasts: [] };
  H.L = L;
  H.say = function (who, text) {
    L.bubbles = L.bubbles.filter(b => b.who !== who);
    L.bubbles.push({ who, text, t: 0, life: 2.2 });
  };
  H.banner = function (title, sub) { L.banner = { title, sub, t: 0, life: 2.6 }; };
  H.flash = function (c, a) { L.flash = { c, a, t: 0 }; };
  H.toast = function (text, icon) { L.toasts.push({ text, icon, t: 0, life: 3.5 }); };

  H.update = function (dt) {
    for (let i = L.bubbles.length - 1; i >= 0; i--) { const b = L.bubbles[i]; b.t += dt; if (b.t > b.life) L.bubbles.splice(i, 1); }
    if (L.banner) { L.banner.t += dt; if (L.banner.t > L.banner.life) L.banner = null; }
    if (L.flash) { L.flash.t += dt; if (L.flash.t > 0.35) L.flash = null; }
    for (let i = L.toasts.length - 1; i >= 0; i--) { const b = L.toasts[i]; b.t += dt; if (b.t > b.life) L.toasts.splice(i, 1); }
  };

  function bubbles(v) {
    for (const b of L.bubbles) {
      let x, y;
      if (b.who === 'boss') { if (!v.bs) continue; x = R.sx(v.bs.x); y = R.sy(v.bs.y) - 58; }
      else if (b.who === 'shop') { const o = (v.ob || []).find(o => o[1] === 'shop'); if (!o) continue; x = R.sx(o[2]) + 18; y = R.sy(o[3]) - 26; }
      else { const p = v.ps[b.who]; if (!p) continue; x = R.sx(p.x); y = R.sy(p.y) - (p.st === 'x' ? 26 : 32); }
      const pop = Math.min(1, b.t * 8), fade = b.t > b.life - 0.3 ? (b.life - b.t) / 0.3 : 1;
      const size = 7, w = Math.min(150, UI.measure(b.text, size) + 10), h = 13;
      const ctx = UI.ctx;
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(x, y); ctx.scale(pop, pop);
      ctx.fillStyle = '#fff8f0'; UI.rr(-w / 2, -h, w, h, 5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-3, -0.5); ctx.lineTo(3, -0.5); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = typeof b.who === 'number' ? PC[b.who] : '#b7a7cf'; UI.rr(-w / 2, -h, w, h, 5); ctx.stroke();
      UI.text(b.text, 0, -h + 2.5, { size, align: 'center', color: '#3a2233', outline: false });
      ctx.restore();
    }
  }

  function floatTexts() {
    for (const t of R.texts) {
      const x = R.sx(t.x), y = R.sy(t.y);
      const k = t.t / t.life;
      const s = t.size * (t.pop ? 1 + Math.max(0, 0.4 - t.t * 2) : 1);
      UI.text(t.str, x, y, { size: s, align: 'center', color: t.color, alpha: k > 0.7 ? (1 - k) / 0.3 : 1 });
    }
  }

  function banner(t) {
    const b = L.banner; if (!b) return;
    const k = b.t / b.life;
    const a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
    const ctx = UI.ctx;
    ctx.save(); ctx.globalAlpha = a * 0.75;
    const g = ctx.createLinearGradient(0, 0, C.W, 0);
    g.addColorStop(0, 'rgba(20,10,35,0)'); g.addColorStop(0.5, 'rgba(20,10,35,0.9)'); g.addColorStop(1, 'rgba(20,10,35,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 88, C.W, b.sub ? 44 : 32);
    ctx.restore();
    const slide = k < 0.12 ? (1 - k / 0.12) * 20 : 0;
    UI.text(b.title, C.W / 2 + slide, 92, { size: 16, align: 'center', color: '#fff3e0', alpha: a, ow: 4 });
    if (b.sub) UI.text(b.sub, C.W / 2 - slide, 114, { size: 8, align: 'center', color: '#ffc6da', alpha: a });
  }

  function flash() {
    const f = L.flash; if (!f) return;
    const ctx = UI.ctx;
    ctx.globalAlpha = f.a * (1 - f.t / 0.35);
    ctx.fillStyle = f.c; ctx.fillRect(-50, -50, C.W + 100, C.H + 100);
    ctx.globalAlpha = 1;
  }

  function toasts() {
    L.toasts.forEach((b, i) => {
      const k = b.t / b.life, a = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
      const w = 150, x = C.W / 2 - w / 2, y = C.H - 60 - i * 26;
      UI.ctx.globalAlpha = a;
      UI.panel(x, y, w, 22, { edge: G.COLORS.gold, fill: 'rgba(40,28,20,0.95)' });
      UI.emoji(b.icon || '🏆', x + 12, y + 11, 11);
      UI.text('업적 달성!', x + 24, y + 3, { size: 6, color: G.COLORS.gold });
      UI.text(b.text, x + 24, y + 11, { size: 7.5 });
      UI.ctx.globalAlpha = 1;
    });
  }

  function hintBox(v, t) {
    if (!v.hint) return;
    const w = Math.min(300, UI.measure(v.hint, 7) + 20);
    const x = C.W / 2 - w / 2, y = C.H - 34;
    UI.panel(x, y, w, 15, { fill: 'rgba(40,30,70,0.92)', edge: '#fff3a0' });
    UI.text('💡 ' + v.hint, C.W / 2, y + 3.5, { size: 7, align: 'center' });
  }

  H.minimap = false;
  function minimap(v, t) {
    if (!H.minimap || !R.map) return;
    const m = R.map.map, e = R.map.explored;
    const s = 1.5, w = m.w * s, h = m.h * s, x = C.W - w - 6, y = C.H - h - 16;
    const ctx = UI.ctx;
    ctx.fillStyle = 'rgba(10,6,20,0.75)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      if (!e[j * m.w + i]) continue;
      const tt = m.tiles[j * m.w + i];
      ctx.fillStyle = G.isSolidTile(tt) ? (tt === 3 || tt === 4 || tt === 5 ? '#ffd36b' : 'rgba(150,130,190,0.55)') : tt === 7 ? '#ff7a2e' : 'rgba(60,50,90,0.8)';
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
    for (const o of v.ob || []) {
      const tx = Math.floor(o[2] / 16), ty = Math.floor(o[3] / 16);
      if (!e[ty * m.w + tx] && !(v.tm && o[1] === 'chest')) continue;
      const c = { door: '#fff3a0', chest: '#ffd36b', shop: '#7dff9a', fountain: '#8fd8ff', event: '#ffffff', altar: '#ff5c7a' }[o[1]];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x + tx * s - 1, y + ty * s - 1, 3, 3); }
    }
    v.ps.forEach((p, i) => { ctx.fillStyle = PC[i]; ctx.fillRect(x + (p.x / 16) * s - 1.5, y + (p.y / 16) * s - 1.5, 3, 3); });
  }

  H.run = function (v, t) {
    if (!v.ui || v.ui.m === 'lvl' || v.ui.m === 'relic') {
      bossBar(v, t);
      prompts(v, t);
    }
    floatTexts();
    bubbles(v);
    playerPanel(v, v.ps[0], 0, t); playerPanel(v, v.ps[1], 1, t);
    heartGauge(v, t);
    xpBar(v);
    hintBox(v, t);
    minimap(v, t);
    if (v.ch) UI.text(`⚔️ 도전 ${v.ch}/3`, 8, 42, { size: 7, color: '#ff9eb5' });
    banner(t);
    flash();
    toasts();
    net();
  };

  H.hub = function (v, t) {
    floatTexts();
    if (!v.ui) prompts(v, t);
    bubbles(v);
    const m = G.App.meta || {};
    UI.panel(4, 4, 150, 18, { fill: 'rgba(24,16,38,0.85)' });
    UI.text(`💎 ${m.gems || 0}   ⭐ ${m.stars || 0}`, 10, 8, { size: 8, color: G.COLORS.gold });
    UI.text('우리 굴집 🏡', C.W - 8, 8, { size: 8, align: 'right', color: '#ffe9c7' });
    if (m.names) UI.text(`${m.names[0] || '1P'} 💞 ${m.names[1] || '2P'}`, C.W - 8, 19, { size: 6.5, align: 'right', color: '#ffc6da' });
    banner(t);
    flash();
    toasts();
    net();
  };

  function net() {
    if (!G.Net.role) return;
    const ok = G.Net.open();
    const txt = ok ? (G.Net.role === 'guest' ? `📶 ${G.Net.ping}ms` : '📶 연결됨') : '⚠ 연결 끊김';
    UI.text(txt, C.W - 4, C.H - 9, { size: 5.5, align: 'right', color: ok ? '#9dffb0' : '#ff6b6b', alpha: 0.7 });
  }
  return H;
})();
