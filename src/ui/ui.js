// 화면 UI 그리기 도우미 (고해상도 캔버스, 논리 좌표)
G.UI = (function () {
  const UI = {};
  const FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  let ctx = null;
  UI.begin = function () { ctx = G.R.sctx; G.R.uiBegin(); UI.ctx = ctx; };
  UI.font = (size, w) => `${w || 700} ${size}px ${FONT}`;

  UI.text = function (str, x, y, o) {
    o = o || {};
    const size = o.size || 8;
    ctx.font = UI.font(size, o.weight);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'top';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.outline !== false) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.oc || 'rgba(20,10,30,0.92)';
      ctx.lineWidth = o.ow || Math.max(1.5, size * 0.28);
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || G.COLORS.text;
    ctx.fillText(str, x, y);
    ctx.globalAlpha = 1;
  };
  UI.measure = function (str, size, w) { ctx.font = UI.font(size, w); return ctx.measureText(str).width; };
  UI.wrap = function (str, maxW, size) {
    const out = [];
    for (const para of String(str).split('\n')) {
      let line = '';
      for (const ch of para.split(/(\s+)/)) {
        const test = line + ch;
        if (UI.measure(test, size) > maxW && line.trim()) { out.push(line.trim()); line = ch.trimStart(); }
        else line = test;
        // 단어가 너무 길면 글자 단위
        while (UI.measure(line, size) > maxW && line.length > 1) {
          let k = line.length - 1; while (k > 1 && UI.measure(line.slice(0, k), size) > maxW) k--;
          out.push(line.slice(0, k)); line = line.slice(k);
        }
      }
      out.push(line.trim());
    }
    return out;
  };
  UI.textBlock = function (str, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 8, lh = o.lh || size * 1.45;
    const lines = UI.wrap(str, maxW, size);
    lines.forEach((l, i) => UI.text(l, x, y + i * lh, o));
    return lines.length * lh;
  };

  UI.rr = function (x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  UI.panel = function (x, y, w, h, o) {
    o = o || {};
    ctx.save();
    if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; UI.rr(x + 1.5, y + 2.5, w, h, o.r || 6); ctx.fill(); }
    ctx.fillStyle = o.fill || G.COLORS.panel;
    UI.rr(x, y, w, h, o.r || 6); ctx.fill();
    ctx.lineWidth = o.lw || 1.2; ctx.strokeStyle = o.edge || G.COLORS.panelEdge; ctx.stroke();
    ctx.restore();
  };
  UI.bar = function (x, y, w, h, k, color, bg) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.45)'; UI.rr(x, y, w, h, h / 2); ctx.fill();
    if (k > 0) { ctx.fillStyle = color; UI.rr(x, y, Math.max(h, w * Math.min(1, k)), h, h / 2); ctx.fill(); }
  };
  UI.dim = function (a) { ctx.fillStyle = `rgba(10,6,20,${a == null ? 0.6 : a})`; ctx.fillRect(-50, -50, G.C.W + 100, G.C.H + 100); };

  // 하트 (hp: 2 = 한 칸)
  UI.hearts = function (x, y, hp, max, s) {
    s = s || 1;
    const n = Math.ceil(max / 2);
    for (let i = 0; i < n; i++) {
      const v = hp - i * 2;
      const hx = x + (i % 10) * 8 * s, hy = y + Math.floor(i / 10) * 7 * s;
      heart(hx, hy, s, v >= 2 ? 2 : v === 1 ? 1 : 0);
    }
  };
  function heart(x, y, s, fill) {
    const px = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * s, y + b * s, w * s, h * s); };
    const o = '#2a1020';
    px(1, 0, 2, 1, o); px(4, 0, 2, 1, o); px(0, 1, 7, 3, o); px(1, 4, 5, 1, o); px(2, 5, 3, 1, o); px(3, 6, 1, 1, o);
    const e = '#4a2a3a';
    px(1, 1, 2, 1, e); px(4, 1, 2, 1, e); px(1, 2, 5, 2, e); px(2, 4, 3, 1, e); px(3, 5, 1, 1, e);
    if (fill) {
      const c = '#ff5c7a';
      if (fill === 2) { px(1, 1, 2, 1, c); px(4, 1, 2, 1, c); px(1, 2, 5, 2, c); px(2, 4, 3, 1, c); px(3, 5, 1, 1, c); px(1, 1, 1, 1, '#ffc0cf'); }
      else { px(1, 1, 2, 1, c); px(1, 2, 3, 2, c); px(2, 4, 2, 1, c); px(3, 5, 1, 1, c); px(1, 1, 1, 1, '#ffc0cf'); }
    }
  }
  UI.heart = heart;

  UI.sprite = function (ch, x, y, s, flip) {
    const sp = G.SPR.ch[ch]; if (!sp) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(flip ? sp.l[0] : sp.r[0], x, y, 16 * (s || 1), 16 * (s || 1));
  };
  UI.hat = function (ch, hat, x, y, s, flip) {
    if (!hat || hat === 'none' || !G.SPR.hats[hat]) return;
    const sp = G.SPR.ch[ch], hs = G.SPR.hats[hat], img = flip ? hs.l : hs.r;
    const ax = flip ? 15 - sp.hat[0] : sp.hat[0];
    ctx.drawImage(img, x + (ax - img.width / 2) * s, y + (sp.hat[1] - img.height + 1 - hs.float) * s, img.width * s, img.height * s);
  };
  UI.emoji = function (e, x, y, size, align) {
    ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(e, x, y);
  };
  // 선택 커서 (둥근 테두리 반짝)
  UI.select = function (x, y, w, h, color, t) {
    ctx.save();
    ctx.lineWidth = 1.6; ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75 + Math.sin(t * 8) * 0.25;
    UI.rr(x - 1.5, y - 1.5, w + 3, h + 3, 6); ctx.stroke();
    ctx.restore();
  };
  return UI;
})();
