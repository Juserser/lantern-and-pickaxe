// WebAudio 합성 효과음 & 칩튠 BGM
G.A = (function () {
  const A = {};
  let ac = null, master, sfxBus, musBus;
  A.vol = { master: 0.8, sfx: 0.8, music: 0.5 };

  A.unlock = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.connect(master);
      musBus = ac.createGain(); musBus.connect(master);
      A.applyVol();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (cur) { nextT = ac.currentTime + 0.1; if (!timer) timer = setInterval(schedule, 50); }
    } catch (e) { ac = null; }
  };
  A.applyVol = function () {
    if (!ac) return;
    master.gain.value = A.vol.master; sfxBus.gain.value = A.vol.sfx * 0.55; musBus.gain.value = A.vol.music * 0.32;
  };
  let noiseBuf = null;

  function tone(f, dur, type, vol, slide, delay, bus) {
    if (!ac) return;
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, freq, delay, q) {
    if (!ac || !noiseBuf) return;
    const t0 = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const last = {};
  const SFX = {
    step: () => noise(0.04, 0.03, 500),
    orb: () => tone(880, 0.09, 'sine', 0.12, 1.6),
    dart: () => tone(1320, 0.06, 'triangle', 0.08, 1.3),
    swing: () => noise(0.09, 0.12, 2400, 0, 0.7),
    acorn: () => tone(520, 0.07, 'square', 0.07, 0.7),
    throw: () => tone(400, 0.12, 'triangle', 0.1, 1.8),
    bash: () => { noise(0.1, 0.15, 400); tone(160, 0.1, 'square', 0.1, 0.6); },
    mine: () => { tone(1500, 0.05, 'square', 0.08, 0.8); noise(0.06, 0.1, 3000, 0, 3); },
    break: () => { noise(0.22, 0.2, 700); tone(200, 0.15, 'square', 0.1, 0.5); },
    ore: () => { tone(1568, 0.08, 'square', 0.08); tone(2093, 0.12, 'square', 0.07, 1, 0.06); },
    gem: () => tone(1760 + Math.random() * 300, 0.07, 'sine', 0.08, 1.2),
    xp: () => tone(1200 + Math.random() * 600, 0.05, 'sine', 0.05, 1.3),
    hit: () => { noise(0.06, 0.14, 1800); tone(300, 0.06, 'square', 0.07, 0.6); },
    crit: () => { noise(0.08, 0.18, 2600); tone(900, 0.1, 'square', 0.1, 1.5); },
    kill: () => { tone(660, 0.06, 'square', 0.09); tone(990, 0.1, 'square', 0.08, 1, 0.05); },
    hurt: () => { tone(220, 0.25, 'sawtooth', 0.14, 0.4); noise(0.12, 0.15, 800); },
    block: () => tone(1200, 0.15, 'triangle', 0.1, 0.8),
    down: () => { tone(440, 0.2, 'triangle', 0.15, 0.7); tone(330, 0.3, 'triangle', 0.14, 0.7, 0.18); tone(220, 0.5, 'triangle', 0.13, 0.7, 0.4); },
    revive: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.13, 1, i * 0.07)),
    levelup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.09, 1, i * 0.06)),
    pick: () => { tone(784, 0.08, 'square', 0.09); tone(1175, 0.14, 'square', 0.09, 1, 0.07); },
    nav: () => tone(660, 0.04, 'square', 0.05),
    back: () => tone(440, 0.06, 'square', 0.05, 0.8),
    deny: () => { tone(200, 0.12, 'square', 0.08); tone(160, 0.14, 'square', 0.08, 1, 0.08); },
    buy: () => { tone(988, 0.07, 'square', 0.08); tone(1319, 0.12, 'square', 0.08, 1, 0.06); noise(0.05, 0.06, 5000); },
    boom: () => { noise(0.45, 0.35, 180, 0, 0.6); tone(90, 0.35, 'sine', 0.3, 0.4); },
    bigboom: () => { noise(0.8, 0.45, 120, 0, 0.5); tone(70, 0.6, 'sine', 0.4, 0.4); tone(140, 0.3, 'square', 0.1, 0.4); },
    wave: () => { tone(300, 0.4, 'sine', 0.18, 3); tone(600, 0.35, 'triangle', 0.08, 2, 0.05); },
    dash: () => noise(0.18, 0.12, 900, 0, 0.5),
    tetherOn: () => { tone(880, 0.12, 'sine', 0.06, 1.5); },
    tetherOff: () => { tone(500, 0.15, 'triangle', 0.08, 0.5); },
    comboReady: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.1, 'sine', 0.1, 1, i * 0.05)),
    combo: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, 'square', 0.08, 1, i * 0.04)); noise(0.9, 0.35, 300, 0.2, 0.5); tone(60, 0.8, 'sine', 0.4, 0.5, 0.2); },
    comboFail: () => { tone(400, 0.1, 'square', 0.07, 0.9); tone(300, 0.15, 'square', 0.07, 0.8, 0.1); },
    unseal: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, 1, i * 0.08)),
    door: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, 1, i * 0.1)),
    chest: () => { [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.2, 'square', 0.08, 1, i * 0.08)); },
    heal: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.15, 'sine', 0.1, 1, i * 0.06)),
    shoot: () => tone(700, 0.08, 'square', 0.05, 0.6),
    warn: () => { tone(440, 0.08, 'square', 0.06); tone(440, 0.08, 'square', 0.06, 1, 0.12); },
    slam: () => { noise(0.3, 0.3, 150, 0, 0.8); tone(80, 0.3, 'sine', 0.3, 0.5); },
    roar: () => { tone(120, 0.6, 'sawtooth', 0.15, 0.7); noise(0.5, 0.15, 400); },
    bossdie: () => { for (let i = 0; i < 6; i++) noise(0.3, 0.25, 200 + i * 100, i * 0.12); [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.3, 'square', 0.08, 1, 0.6 + i * 0.08)); },
    photo: () => { noise(0.05, 0.2, 4000); tone(1800, 0.05, 'square', 0.05, 1, 0.04); },
    fear: () => tone(180, 0.3, 'sine', 0.06, 0.8),
    say: () => tone(900 + Math.random() * 400, 0.04, 'square', 0.04),
    ach: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, 1, i * 0.09)),
    wish: () => [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.4, 'sine', 0.07, 1, i * 0.12)),
    gameover: () => [523, 494, 440, 392, 330].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 1, i * 0.22)),
    win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'square', 0.09, 1, i * 0.13)),
    spore: () => noise(0.25, 0.08, 2000, 0, 0.5),
    splash: () => noise(0.2, 0.1, 1200),
    burrow: () => noise(0.3, 0.15, 300),
  };
  A.play = function (name) {
    if (!ac) return;
    const now = performance.now();
    if (last[name] && now - last[name] < 35) return;
    last[name] = now;
    const f = SFX[name]; if (f) f();
  };

  // ───────────── BGM 시퀀서
  // 곡: bpm, 음표 문자열 (한 글자 = 16분음표). 'C4' 형식 대신 숫자 배열(미디 번호), 0=쉼표
  const n = s => s.trim().split(/\s+/).map(x => (x === '.' ? 0 : x === '-' ? -1 : +x));
  const SONGS = {
    hub: { bpm: 92, wave: 'triangle', bassWave: 'sine',
      mel: n('72 . 76 . 79 . 76 . 74 . 72 . 71 . 67 . 69 . 72 . 76 . 74 . 72 . - . . . 72 . 76 . 79 . 81 . 79 . 76 . 74 . 72 . 74 . 76 . 74 . 71 . 72 . - . . .'),
      bass: n('48 . . . 55 . . . 53 . . . 55 . . . 57 . . . 53 . . . 55 . . . 48 . . . 48 . . . 55 . . . 53 . . . 55 . . . 57 . . . 53 . . . 55 . . . 48 . . .'),
      drum: 'k...h...k...h...' },
    moss: { bpm: 104, wave: 'square', bassWave: 'triangle',
      mel: n('69 . 72 . 76 . 72 . 74 . 72 . 69 . . . 67 . 69 . 72 . 69 . 67 . 64 . 67 . . . 69 . 72 . 76 . 79 . 77 . 76 . 74 . 72 . 74 . 72 . 71 . 67 . 69 . . . - . . .'),
      bass: n('45 . 45 . 52 . 45 . 43 . 43 . 50 . 43 . 41 . 41 . 48 . 41 . 43 . 43 . 50 . 43 . 45 . 45 . 52 . 45 . 43 . 43 . 50 . 43 . 41 . 41 . 48 . 41 . 40 . 40 . 47 . 40 .'),
      drum: 'k.h.s.h.k.h.s.hh' },
    crystal: { bpm: 96, wave: 'sine', bassWave: 'triangle',
      mel: n('76 . 83 . 81 . 79 . 76 . . . 74 . 76 . 79 . 76 . 74 . 71 . . . 72 . 76 . 79 . 84 . 83 . 79 . 76 . . . 74 . 71 . 74 . 76 . 79 . . . - . . .'),
      bass: n('40 . . . 47 . . . 45 . . . 43 . . . 40 . . . 47 . . . 45 . . . 47 . . . 36 . . . 43 . . . 40 . . . 43 . . . 38 . . . 45 . . . 43 . . . 47 . . .'),
      drum: 'k...h.h.s...h.h.' },
    lava: { bpm: 124, wave: 'square', bassWave: 'sawtooth',
      mel: n('64 . 64 67 . 69 . 67 64 . 62 . 64 . . . 64 . 64 67 . 69 . 72 71 . 69 . 67 . . . 69 . 69 72 . 74 . 72 69 . 67 . 69 . . . 67 . 64 . 62 . 64 . 67 . 64 . - . . .'),
      bass: n('40 40 . 40 43 . 40 . 40 40 . 40 38 . 38 . 40 40 . 40 43 . 40 . 45 45 . 45 43 . 43 . 45 45 . 45 48 . 45 . 45 45 . 45 43 . 43 . 40 40 . 40 38 . 38 . 40 40 . 40 40 . 40 .'),
      drum: 'k.hsk.hsk.hsk.ss' },
    star: { bpm: 84, wave: 'triangle', bassWave: 'sine',
      mel: n('79 . . . 84 . . . 83 . 81 . 79 . . . 76 . . . 79 . 81 . 83 . . . - . . . 79 . . . 84 . . . 86 . 84 . 83 . . . 81 . 79 . 76 . 79 . 81 . . . - . . .'),
      bass: n('43 . . . . . . . 40 . . . . . . . 36 . . . . . . . 38 . . . . . . . 43 . . . . . . . 40 . . . . . . . 45 . . . . . . . 38 . . . . . . .'),
      drum: 'k.......h.......' },
    boss: { bpm: 140, wave: 'square', bassWave: 'sawtooth',
      mel: n('69 . 72 . 69 . 76 . 75 . 72 . 69 . 68 . 69 . 72 . 69 . 77 . 76 . 72 . 71 . 68 . 69 . 72 . 76 . 81 . 79 . 76 . 72 . 76 . 74 . 71 . 68 . 71 . 69 . . . - . . .'),
      bass: n('45 45 57 45 45 45 57 45 44 44 56 44 44 44 56 44 41 41 53 41 41 41 53 41 40 40 52 40 40 40 52 40 45 45 57 45 45 45 57 45 44 44 56 44 44 44 56 44 41 41 53 41 43 43 55 43 45 45 57 45 44 44 56 44'),
      drum: 'k.hsk.hsk.hsksss' },
  };
  let cur = null, step = 0, nextT = 0, timer = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  A.music = function (name) {
    if (cur === name) return;
    cur = name; step = 0;
    if (!ac) return;
    nextT = ac.currentTime + 0.1;
    if (!timer) timer = setInterval(schedule, 50);
  };
  A.stopMusic = function () { cur = null; };
  function schedule() {
    if (!ac || !cur) return;
    const s = SONGS[cur]; if (!s) return;
    const dt = 60 / s.bpm / 4;
    while (nextT < ac.currentTime + 0.2) {
      const mi = step % s.mel.length, bi = step % s.bass.length;
      const m = s.mel[mi], b = s.bass[bi];
      if (m > 0) {
        let len = 1; while (s.mel[(mi + len) % s.mel.length] === 0 && len < 4) len++;
        mnote(mtof(m), dt * len * 0.9, s.wave, 0.09, nextT);
      }
      if (b > 0) mnote(mtof(b), dt * 1.8, s.bassWave, 0.11, nextT);
      const d = s.drum[step % s.drum.length];
      if (d === 'k') mkick(nextT); else if (d === 'h') mhat(nextT, 0.03); else if (d === 's') mhat(nextT, 0.07, 1800);
      nextT += dt; step++;
    }
  }
  function mnote(f, dur, type, vol, t0) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.setValueAtTime(vol, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(musBus); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function mkick(t0) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
    g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    o.connect(g); g.connect(musBus); o.start(t0); o.stop(t0 + 0.16);
  }
  function mhat(t0, vol, f) {
    if (!noiseBuf) return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = f || 6000;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    s.connect(fl); fl.connect(g); g.connect(musBus); s.start(t0); s.stop(t0 + 0.06);
  }
  return A;
})();
