// 전역 네임스페이스 & 모든 밸런스 수치
window.G = window.G || {};

G.C = {
  VERSION: 1,
  W: 480, H: 270,            // 내부 해상도 (논리 픽셀)
  TILE: 16,
  TICK: 1 / 60,
  SNAP_EVERY: 2,             // 방장 → 참가자 스냅샷 (틱 단위, 30Hz)
  INTERP_DELAY: 0.085,       // 참가자 보간 지연(초)
  PEER_PREFIX: 'dunggok-v1-',

  MAP_W: 64, MAP_H: 44,
  BOSS_MAP_W: 40, BOSS_MAP_H: 30,
  FLOORS: 12,

  // 플레이어 공통
  PLAYER_R: 5,
  BASE_HP: 10,               // 2 = 하트 1칸
  IFRAMES: 0.9,
  DOWN_TIME: 20,             // 눈물방울 상태 유지 시간
  REVIVE_TIME: 2.0,          // 옆에 서 있어야 하는 시간
  REVIVE_RANGE: 22,
  REVIVE_HP: 4,
  MAGNET: 34,
  SCREEN_MARGIN: 14,         // 화면 밖으로 못 나가게 하는 여백

  // 빛줄기(끈)
  TETHER_RANGE: 76,
  TETHER_FAR: 190,
  TETHER_DPS: 10,
  TETHER_REGEN_EVERY: 5,     // 초마다 1 회복

  // 무서움
  FEAR_DARK: 7,              // 어둠 속 초당 증가
  FEAR_FAR: 10,              // 떨어져 있을 때 추가
  FEAR_LIGHT: 30,            // 빛 속 초당 감소
  FEAR_SLOW: 0.7,

  // 두근 게이지 & 합동기
  HEART_MAX: 100,
  HEART_PER_KILL: 2.2,
  HEART_PER_KILL_TETHER: 4,
  COMBO_WINDOW: 0.5,
  COMBO_DMG: 70,

  // 층
  EXIT_UNSEAL_TIME: 1.5,
  AMBIENT_SPAWN_EVERY: 22,
  ENEMY_CAP_BASE: 34,

  // 성장
  XP_BASE: 8,
  GEM_KEEP_ON_DEATH: 0.7,

  // 난이도(별빛 단계)당
  STAR_HP: 0.14,
  STAR_DMG: 0.08,
  FLOOR_HP: 0.16,

  // 조명
  DARKNESS: { moss: 0.9, crystal: 0.86, lava: 0.78, star: 0.94, ice: 0.8, garden: 0.72, hub: 0.55, duel: 0.35 },

  // 깊은 밤(저주) 보상
  HEAT_GEM: 0.08,            // 저주 1단계당 광석 +8%

  // 무너지는 동굴
  COLLAPSE_AT: 75,
};

G.BIOMES = [
  { id: 'moss', name: '이끼 버섯굴', floors: [1, 2, 3], boss: 'mushking',
    pal: { floor: ['#2d3b2b', '#34442f', '#2a3627'], wall: ['#4a3b33', '#5a4a3e', '#3a2d28'], wallTop: '#6d5a47', edge: '#1c1712', glow: '#9dffb0' },
    enemies: ['mushroom', 'bat', 'snail', 'worm'], music: 'moss' },
  { id: 'crystal', name: '수정 동굴', floors: [4, 5, 6], boss: 'crab',
    pal: { floor: ['#262c45', '#2c3350', '#22283e'], wall: ['#3b3a63', '#484775', '#2f2e52'], wallTop: '#5d5c95', edge: '#15142a', glow: '#8fd8ff' },
    enemies: ['shadow', 'crabling', 'shardfly', 'bat'], music: 'crystal' },
  { id: 'lava', name: '따끈 용암굴', floors: [7, 8, 9], boss: 'moleking',
    pal: { floor: ['#3a2622', '#432b25', '#33211d'], wall: ['#5b3326', '#6d3d2c', '#4a291f'], wallTop: '#86503a', edge: '#1f100b', glow: '#ffb070' },
    enemies: ['salamander', 'golem', 'slime', 'emberbat'], music: 'lava' },
  { id: 'star', name: '잠든 별의 심장', floors: [10, 11, 12], boss: 'whale',
    pal: { floor: ['#221a3a', '#281f45', '#1d1633'], wall: ['#3a2a5e', '#46336f', '#2e2150'], wallTop: '#5e4891', edge: '#0f0a1f', glow: '#d7a8ff' },
    enemies: ['fairy', 'shadow', 'jelly', 'golem'], music: 'star' },
];

G.BIOMES.push(
  { id: 'ice', name: '얼음 호수 동굴', floors: [13, 14, 15], boss: 'yeti',
    pal: { floor: ['#2a3a4c', '#30435a', '#263442'], wall: ['#4a6a8a', '#5a7a9a', '#3a5a7a'], wallTop: '#a8d4f0', edge: '#101a24', glow: '#bfefff' },
    enemies: ['snowman', 'icebat', 'seal', 'shardfly'], music: 'crystal' },
  { id: 'garden', name: '비밀 꽃밭', floors: [13, 14, 15], boss: 'queenbee',
    pal: { floor: ['#2f4a2a', '#365530', '#2a4226'], wall: ['#4a6a3a', '#5a7a44', '#3a5a2e'], wallTop: '#8ac86a', edge: '#142010', glow: '#ffb3c7' },
    enemies: ['bee', 'flowertrap', 'ladybug', 'butterfly'], music: 'moss' },
);

// 무한 모드(13층~) 지역 순서: 꽃잎 열쇠가 있으면 비밀 꽃밭이 먼저 열려요
G.biomeOf = function (floor, garden) {
  if (floor > 12) {
    const seq = garden ? [5, 4, 0, 1, 2, 3] : [4, 0, 1, 2, 3];
    return G.BIOMES[seq[Math.floor((floor - 13) / 3) % seq.length]];
  }
  return G.BIOMES[Math.min(3, Math.floor((floor - 1) / 3))];
};
G.isBossFloor = f => f % 3 === 0;

G.COLORS = {
  p: ['#ff7aa8', '#6fb6ff'],
  pDark: ['#b8406b', '#3a73b8'],
  text: '#fff3e6', muted: '#b7a7cf', gold: '#ffd36b', good: '#7dff9a', bad: '#ff6b6b',
  panel: 'rgba(28,20,44,0.92)', panelEdge: '#4b3d70',
  rarity: { c: '#e8e2f0', r: '#6fb6ff', l: '#ffd36b', g: '#b36bff' },
};
