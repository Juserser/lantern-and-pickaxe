// 픽셀아트 데이터 → 오프스크린 캔버스로 베이크
G.SPR = (function () {
  const S = {};

  const CH = {
    toto: {
      pal: { o: '#3a2233', w: '#fff6f0', p: '#ffb3c7', k: '#2a1a2e', s: '#ff7aa8', h: '#ffe0ea' },
      hat: [8, 3],
      rows: [
        '.....oo..oo.....',
        '....owpoowpo....',
        '....owpoowpo....',
        '....owpoowpo....',
        '...oowwwwwwoo...',
        '..owwwwwwwwwwo..',
        '.owwwwwwwwwwwwo.',
        '.owwwwwwwwwkwwo.',
        '.owwwwwwwwwkwwo.',
        '.owwwwwwwwpwwwo.',
        '..owwwwwwwwwwo..',
        '...oossssssoo...',
        '..owwssswwwwo...',
        '..owwwwwwwwwo...',
        '..owhwwwwwhwo...',
        '...owo..owo.....',
      ],
    },
    molly: {
      pal: { o: '#2e1d17', y: '#ffd24a', l: '#fff6b0', b: '#8a5a3c', k: '#1a0f0a', p: '#ff9eb5', c: '#e8c39e' },
      hat: [7, 1],
      rows: [
        '................',
        '....oooooo......',
        '...oyyyyyyoo....',
        '..oyyyyyyyyyloo.',
        '..oooooooooooo..',
        '.obbbbbbbbbbbbo.',
        '.obbbbbbbbbkbbo.',
        '.obbbbbbbbbbbbpo',
        '.obbbbbbbbbbbbo.',
        '.obbbbcccccbbbo.',
        '.obbbcccccccbbo.',
        '.obbbcccccccbbo.',
        '..obbcccccccbo..',
        '..obbbbbbbbbbo..',
        '...oobbbbbboo...',
        '...ooo...ooo....',
      ],
    },
    nyang: {
      pal: { o: '#3a2218', a: '#ffa94d', d: '#e07b28', k: '#2a1a12', p: '#ff7aa8', r: '#ff4d6d', c: '#fff0dc' },
      hat: [8, 3],
      rows: [
        '................',
        '...o.......o....',
        '..oao.....oao...',
        '..oaaoooooaao...',
        '..oaaaaaaaaaao..',
        '.oaaddaaaaaaaao.',
        '.oaaaaaaaakaaao.',
        '.oaaaaaaaakaaao.',
        '.oaaaaaaaaaapao.',
        '..oaaaaaaaaaao..',
        '...oorrrrrroo...',
        '.o.oaaacccaaao..',
        'oao.oaacccccaao.',
        '.oaoaaaaaaaao...',
        '..ooaaaaaaao....',
        '...oao...oao....',
      ],
    },
    kkobuk: {
      pal: { o: '#1f3322', g: '#8fd18a', k: '#10200f', s: '#6b8f3a', h: '#a5c95b', p: '#ff9eb5', y: '#f5e3a0' },
      hat: [12, 3],
      rows: [
        '................',
        '................',
        '................',
        '...........oooo.',
        '....oooooo.ogggo',
        '...osssshsooggko',
        '..osshsssshsoggo',
        '.ossshssssssogpo',
        '.oshsssshssssoo.',
        '.osssssssssssso.',
        '.oyyyyyyyyyyyyo.',
        '..oyyyyyyyyyyo..',
        '..oggoooooggo...',
        '..ogo.....ogo...',
        '..oo......oo....',
        '................',
      ],
    },
    yeoul: {
      pal: { o: '#3a1a10', f: '#ff8a4c', w: '#fff6ee', k: '#2a120a' },
      hat: [8, 3],
      rows: [
        '................',
        '...o.......o....',
        '..ofo.....ofo...',
        '..offoooooffo...',
        '..offffffffffo..',
        '.offffffffffffo.',
        '.offffffffkffffo',
        '.offfffffwkwwwo.',
        '.offfffwwwwwwwko',
        '..offffwwwwwwo..',
        '...offffffoo....',
        'oo..offwwwffo...',
        'ofo.offwwwffo...',
        'offoofffffffo...',
        '.offfoffffffo...',
        '..ooo.oo..oo....',
      ],
    },
    dotori: {
      pal: { o: '#2e1a10', w: '#ffffff', b: '#c98a5a', k: '#1c0f08', c: '#f7dcc0', p: '#ff9eb5' },
      hat: [8, 0],
      rows: [
        '.....oooo.......',
        '....owwwwo......',
        '...owwwwwwo.....',
        '...oooooooo.....',
        'oo.obbbbbbbo....',
        'obboobbbbbkbo...',
        'obbbobbbbbkbbo..',
        'obbboccbbbbbbpo.',
        '.obbobbbbbbbbo..',
        '.obbboobbbbboo..',
        '..obbobccccbo...',
        '..obbobccccbo...',
        '...ooobccccbo...',
        '....obbbbbbo....',
        '....obo..obo....',
        '....oo....oo....',
      ],
    },
  };

  CH.hoo = {
    pal: { o: '#2a1a30', b: '#9a7ac8', d: '#7a5aa8', w: '#f4e8ff', y: '#ffd24a', k: '#1a1020', r: '#ff9a3c' },
    hat: [8, 1],
    rows: [
      '................',
      '...o........o...',
      '..obo......obo..',
      '..obbooooooobbo.',
      '..obbbbbbbbbbbo.',
      '.obwwwwbbwwwwbo.',
      '.obwwykbbwkywbo.',
      '.obwwwwbrwwwwbo.',
      '.obbbbbrrbbbbbo.',
      '.odbbwwwwwwbbdo.',
      '.odbwwbwwbwwbdo.',
      '..odbwwwwwwbdo..',
      '..odbbwwwwbbdo..',
      '...oddbbbbddo...',
      '....oyyo.oyyo...',
      '....oo....oo....',
    ],
  };
  CH.pengu = {
    pal: { o: '#141a2a', k: '#2a3a5a', w: '#ffffff', y: '#ffb03c', p: '#ff9eb5', e: '#1a1020' },
    hat: [8, 1],
    rows: [
      '................',
      '.....oooooo.....',
      '....okkkkkko....',
      '...okkkkkkkko...',
      '...okkkkwwkko...',
      '..okkkkwwewkko..',
      '..okkkkwwwwyyyo.',
      '..okkkwwwpwwko..',
      '.okkkwwwwwwwkko.',
      '.okkwwwwwwwwwko.',
      'okkkwwwwwwwwwkko',
      '.okkwwwwwwwwwko.',
      '..okkwwwwwwwko..',
      '...okkwwwwwko...',
      '....oyyo.oyyo...',
      '................',
    ],
  };

  const HATS = {
    moon: { pal: { y: '#fff3a0', o: '#c9a14a' }, rows: ['..yy', '.y..', 'y...', 'y...', '.y..', '..yo'] },
    horns: { pal: { r: '#d94a5c', d: '#8a2030' }, rows: ['r......r', 'rr....rr', '.d....d.'] },
    mush: { pal: { r: '#ff5c7a', w: '#ffffff', c: '#fff0e0' }, rows: ['..rrrr..', '.rwrrwr.', 'rrrrrrwr', '...cc...'] },
    sprout: { pal: { g: '#7dff9a', d: '#3a9a5a' }, rows: ['gg.gg', '.ggg.', '..d..', '..d..'] },
    catears: { pal: { b: '#8a6b5a', p: '#ff9eb5' }, rows: ['b......b', 'bb....bb', 'bpb..bpb'] },
    chef: { pal: { w: '#ffffff', g: '#d8d8e8' }, rows: ['.www.', 'wwwww', 'wwwww', 'wwwww', 'ggggg'] },
    witch: { pal: { k: '#3a2a5a', p: '#b36bff', y: '#ffd24a' }, rows: ['....k...', '...kk...', '..kkk...', '..kkkk..', '.ppypp..', 'kkkkkkkk'] },
    miner: { pal: { y: '#ffd24a', d: '#b8860b', l: '#fff8d8' }, rows: ['..yyyy..', '.yyllyy.', 'yyyyyyyy', 'dddddddd'] },
    dunce: { pal: { w: '#ffffff', r: '#ff5c7a', b: '#6fb6ff' }, rows: ['...r...', '..wrw..', '..www..', '.wwbww.', '.wwwww.', 'wbwwwbw'] },
    ribbon: { pal: { o: '#7a1f3d', p: '#ff7aa8', w: '#ffd0e0' }, rows: ['op.oo.po', 'oppwwppo', 'op.oo.po'] },
    flower: { pal: { p: '#ffffff', y: '#ffd24a', g: '#5cb85c' }, rows: ['.p.p..', 'ppypp.', '.p.p..', '..g...'] },
    straw: { pal: { y: '#f2d27a', d: '#c9a14a', r: '#ff5c8a' }, rows: ['...yyyy...', '..yyyyyy..', '..rrrrrr..', 'ydyyyyyydy'] },
    beret: { pal: { r: '#d94a5c', d: '#a83346', o: '#5a1a24' }, rows: ['....o...', '.rrrrrr.', 'rrrrrrrr', '.dddddd.'] },
    party: { pal: { y: '#ffd24a', b: '#6fb6ff', r: '#ff5c8a' }, rows: ['...y...', '...r...', '..rbr..', '..brb..', '.rbrbr.', 'brbrbrb'] },
    frog: { pal: { g: '#7ccf5a', w: '#ffffff', k: '#1a2a12', d: '#4f9a36' }, rows: ['.ww..ww.', 'wkwggwkw', 'gggggggg', 'dddddddd'] },
    santa: { pal: { r: '#e03a3a', w: '#ffffff' }, rows: ['......ww', '...rrrrw', '..rrrrr.', '.rrrrrr.', 'wwwwwwww'] },
    pirate: { pal: { k: '#2a2a33', w: '#ffffff', y: '#ffd24a' }, rows: ['..kkkk..', '.kkwwkk.', 'kkkwwkkk', 'yyyyyyyy'] },
    crown: { pal: { y: '#ffd24a', r: '#ff4d6d', b: '#6fb6ff', o: '#b8860b' }, rows: ['y..y..y', 'yy.y.yy', 'yryybyy', 'ooooooo'] },
    halo: { pal: { y: '#fff3a0' }, rows: ['.yyyyy.', 'y.....y', '.yyyyy.'], float: 3 },
  };

  function bakeRows(rows, pal, flash) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (ch === '.' || ch === ' ') continue;
      x.fillStyle = flash ? (ch === 'o' ? '#ffd6e4' : '#ffffff') : (pal[ch] || '#f0f');
      x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  function flip(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c;
  }
  function walkRows(rows) {
    // 걷기 프레임: 발 줄을 한 칸 옮기고 몸을 살짝 내림
    const r = rows.slice();
    const last = r[r.length - 1];
    r[r.length - 1] = '.' + last.slice(0, -1);
    return r;
  }

  S.ch = {}; S.hats = {};
  S.init = function () {
    for (const id in CH) {
      const d = CH[id];
      const f0 = bakeRows(d.rows, d.pal), f1 = bakeRows(walkRows(d.rows), d.pal), fl = bakeRows(d.rows, d.pal, true);
      S.ch[id] = { r: [f0, f1], l: [flip(f0), flip(f1)], flashR: fl, flashL: flip(fl), hat: d.hat, w: 16, h: 16 };
    }
    for (const id in HATS) {
      const d = HATS[id];
      const c = bakeRows(d.rows, d.pal);
      S.hats[id] = { r: c, l: flip(c), float: d.float || 0 };
    }
  };
  S.CH = CH; S.HATS = HATS;
  return S;
})();
