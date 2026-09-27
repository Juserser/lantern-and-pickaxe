// 저장 (방장/로컬 기기의 localStorage)
G.Save = (function () {
  const S = {};
  const KEY = 'dunggok-save', AKEY = 'dunggok-album', SKEY = 'dunggok-settings';

  S.fresh = function () {
    return {
      v: G.C.VERSION, names: ['', ''], created: G.U.today(),
      gems: 0, stars: 0, forge: 0, garden: 0,
      skills: [], furniture: [], hats: ['none'], hat: ['none', 'none'],
      chars: ['toto', 'molly'], char: ['toto', 'molly'],
      ach: [], starLevel: 0, cleared: false,
      codex: { enemies: {}, cards: {}, relics: {}, bosses: {} },
      tutorial: {},
      stats: { runs: 0, playTime: 0, kills: 0, ores: 0, gemsTotal: 0, combos: 0, revives: [0, 0], bosses: { mushking: 0, crab: 0, moleking: 0, whale: 0 },
        handFloors: 0, bestFloor: 0, bestLevel: 0, nohitBoss: 0, telepathy: 0, dailies: 0, bestStar: -1, charsUnlocked: 2, codexFull: false,
        furnitureCount: 0, deaths: 0, clears: 0, lastDaily: '' },
    };
  };
  function migrate(d) {
    const f = S.fresh();
    for (const k in f) if (d[k] === undefined) d[k] = f[k];
    for (const k in f.stats) if (d.stats[k] === undefined) d.stats[k] = f.stats[k];
    for (const k in f.codex) if (!d.codex[k]) d.codex[k] = {};
    d.v = G.C.VERSION;
    return d;
  }
  S.load = function () {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    S.data = d ? migrate(d) : S.fresh();
    try { S.album = JSON.parse(localStorage.getItem(AKEY) || '[]'); } catch (e) { S.album = []; }
    return S.data;
  };
  S.write = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { console.warn('save failed', e); }
  };
  S.writeAlbum = function () {
    for (let i = 0; i < 5; i++) {
      try { localStorage.setItem(AKEY, JSON.stringify(S.album)); return true; }
      catch (e) { if (S.album.length > 10) S.album.splice(0, 1); else return false; }
    }
    return false;
  };
  S.addPhoto = function (img, cap) {
    const p = { id: Date.now() + '' + Math.floor(Math.random() * 1000), img, cap, date: G.U.today() };
    S.album.push(p);
    if (S.album.length > 80) S.album.shift();
    S.writeAlbum();
    return p;
  };
  S.exists = function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

  S.exportFile = function () {
    const blob = new Blob([JSON.stringify({ app: 'dunggok', save: S.data, album: S.album })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `등불과곡괭이_추억_${G.U.today().replace(/\./g, '')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  S.importText = function (txt) {
    const o = JSON.parse(txt);
    if (!o || o.app !== 'dunggok' || !o.save) throw new Error('bad file');
    S.data = migrate(o.save); S.album = Array.isArray(o.album) ? o.album : [];
    S.write(); S.writeAlbum();
  };

  // 기기별 설정
  S.loadSettings = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
    G.settings = Object.assign({ master: 0.8, sfx: 0.8, music: 0.5, shake: true, dmgNum: true, lastCode: '', myName: '' }, s || {});
    G.A.vol.master = G.settings.master; G.A.vol.sfx = G.settings.sfx; G.A.vol.music = G.settings.music;
  };
  S.saveSettings = function () {
    try { localStorage.setItem(SKEY, JSON.stringify(G.settings)); } catch (e) {}
    G.A.vol.master = G.settings.master; G.A.vol.sfx = G.settings.sfx; G.A.vol.music = G.settings.music; G.A.applyVol();
  };
  return S;
})();
