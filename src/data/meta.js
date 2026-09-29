// 영구 성장: 굴집 시설, 별자리 스킬트리, 가구, 모자, 업적
G.FORGE = { name: '대장간', icon: '🔨', max: 5, cost: [30, 70, 130, 210, 320], desc: l => `공격력 +${l * 8}%` };
G.GARDEN = { name: '약초밭', icon: '🌱', max: 5, cost: [25, 60, 110, 180, 280], desc: l => `최대 체력 +${l}×반 칸, 매 층 회복 +${Math.floor(l / 2)}` };

// 별자리 스킬트리: 3갈래. x,y는 별자리 화면 좌표(0~1)
G.SKILLS = [
  // 함께 (분홍)
  { id: 't1', br: 't', name: '마주 잡은 손', desc: '빛줄기 연결 거리 +15%', cost: 1, x: 0.14, y: 0.78, req: [], apply: t => { t.st.beamRange += 0.15; } },
  { id: 't2', br: 't', name: '따스한 빛', desc: '빛줄기 피해 +30%', cost: 1, x: 0.1, y: 0.6, req: ['t1'], apply: t => { t.st.beamDmg += 0.3; } },
  { id: 't3', br: 't', name: '일으켜 줄게', desc: '부활 속도 +30%', cost: 1, x: 0.22, y: 0.62, req: ['t1'], apply: t => { t.st.reviveSpd += 0.3; } },
  { id: 't4', br: 't', name: '콩닥콩닥', desc: '두근 게이지 획득 +20%', cost: 2, x: 0.13, y: 0.44, req: ['t2'], apply: t => { t.st.heartGain += 0.2; } },
  { id: 't5', br: 't', name: '곁에 있어', desc: '빛줄기 연결 중 무서움 없음', cost: 2, x: 0.25, y: 0.44, req: ['t3'], apply: t => { t.st.beamNoFear = 1; } },
  { id: 't6', br: 't', name: '시작부터 두근', desc: '원정 시작 시 두근 게이지 50%', cost: 2, x: 0.18, y: 0.28, req: ['t4', 't5'], apply: t => { t.st.startHeart = 50; } },
  { id: 't7', br: 't', name: '영원한 약속', desc: '합동기 피해 +50%', cost: 3, x: 0.18, y: 0.12, req: ['t6'], apply: t => { t.st.comboDmg += 0.5; } },
  // 용기 (주황)
  { id: 'b1', br: 'b', name: '씩씩한 마음', desc: '공격력 +5%', cost: 1, x: 0.5, y: 0.8, req: [], apply: (t, ps) => ps.forEach(p => (p.st.dmg += 0.05)) },
  { id: 'b2', br: 'b', name: '튼튼한 몸', desc: '최대 체력 +1칸', cost: 1, x: 0.42, y: 0.63, req: ['b1'], apply: (t, ps) => ps.forEach(p => (p.st.maxHp += 2)) },
  { id: 'b3', br: 'b', name: '날쌘 발', desc: '이동 속도 +6%', cost: 1, x: 0.58, y: 0.63, req: ['b1'], apply: (t, ps) => ps.forEach(p => (p.st.spd += 0.06)) },
  { id: 'b4', br: 'b', name: '예리한 눈', desc: '치명타 +5%', cost: 2, x: 0.42, y: 0.46, req: ['b2'], apply: (t, ps) => ps.forEach(p => (p.st.crit += 0.05)) },
  { id: 'b5', br: 'b', name: '빠른 손놀림', desc: '스킬 쿨타임 -10%', cost: 2, x: 0.58, y: 0.46, req: ['b3'], apply: (t, ps) => ps.forEach(p => (p.st.cdr *= 0.9)) },
  { id: 'b6', br: 'b', name: '버티는 힘', desc: '체력 1칸 이하일 때 공격력 +35%', cost: 2, x: 0.5, y: 0.3, req: ['b4', 'b5'], apply: (t, ps) => ps.forEach(p => (p.st.lastStand = 0.35)) },
  { id: 'b7', br: 'b', name: '용사의 심장', desc: '공격력 +12%, 최대 체력 +1칸', cost: 3, x: 0.5, y: 0.13, req: ['b6'], apply: (t, ps) => ps.forEach(p => { p.st.dmg += 0.12; p.st.maxHp += 2; }) },
  // 호기심 (하늘)
  { id: 'c1', br: 'c', name: '반짝이는 눈', desc: '광석 +15%', cost: 1, x: 0.86, y: 0.78, req: [], apply: t => { t.st.gemMul += 0.15; } },
  { id: 'c2', br: 'c', name: '긴 팔', desc: '줍는 범위 +15', cost: 1, x: 0.78, y: 0.6, req: ['c1'], apply: (t, ps) => ps.forEach(p => (p.st.magnet += 15)) },
  { id: 'c3', br: 'c', name: '겁쟁이 탈출', desc: '무서움 -25%', cost: 1, x: 0.9, y: 0.6, req: ['c1'], apply: (t, ps) => ps.forEach(p => (p.st.fearMul *= 0.75)) },
  { id: 'c4', br: 'c', name: '네잎 찾기', desc: '좋은 카드 확률 증가', cost: 2, x: 0.78, y: 0.44, req: ['c2'], apply: t => { t.st.luck += 1; } },
  { id: 'c5', br: 'c', name: '다시 뽑기', desc: '원정마다 카드 새로고침 2회', cost: 2, x: 0.9, y: 0.44, req: ['c3'], apply: t => { t.st.rerolls += 2; } },
  { id: 'c6', br: 'c', name: '빠른 공부', desc: '경험치 +12%', cost: 2, x: 0.84, y: 0.28, req: ['c4', 'c5'], apply: t => { t.st.xpMul += 0.12; } },
  { id: 'c7', br: 'c', name: '행운의 출발', desc: '원정 시작 시 유물 1개 선택', cost: 3, x: 0.84, y: 0.12, req: ['c6'], apply: t => { t.st.startRelic = 1; } },
];
G.SKILL = {}; G.SKILLS.forEach(s => (G.SKILL[s.id] = s));
G.BRANCH = { t: { name: '함께', color: '#ff7aa8' }, b: { name: '용기', color: '#ffb070' }, c: { name: '호기심', color: '#8fd8ff' } };

// 굴집 가구 (구매하면 굴집에 나타남)
G.FURNITURE = [
  { id: 'rug', name: '포근한 러그', icon: '🧶', cost: 20 },
  { id: 'plant', name: '몬스테라 화분', icon: '🪴', cost: 30 },
  { id: 'lights', name: '반딧불 전구줄', icon: '💡', cost: 45 },
  { id: 'bed', name: '이층 침대', icon: '🛏️', cost: 60 },
  { id: 'fire', name: '벽난로', icon: '🔥', cost: 80 },
  { id: 'shelf', name: '추억 책장', icon: '📚', cost: 70 },
  { id: 'fish', name: '작은 어항', icon: '🐟', cost: 90 },
  { id: 'table', name: '둘만의 식탁', icon: '🍽️', cost: 100 },
  { id: 'window', name: '별빛 창문', icon: '🪟', cost: 140 },
  { id: 'piano', name: '장난감 피아노', icon: '🎹', cost: 180 },
  // 뽑기 전용
  { id: 'arcade', name: '미니 오락기', icon: '🕹️', gacha: true },
  { id: 'teddy', name: '커다란 곰인형', icon: '🧸', gacha: true },
  { id: 'mushlamp', name: '버섯 스탠드', icon: '🍄', gacha: true },
  { id: 'mobile', name: '별 모빌', icon: '🌙', gacha: true },
];

// 모자
G.HATS = [
  { id: 'none', name: '없음', icon: '·', cost: 0 },
  { id: 'ribbon', name: '분홍 리본', icon: '🎀', cost: 15 },
  { id: 'flower', name: '꽃 핀', icon: '🌼', cost: 25 },
  { id: 'straw', name: '밀짚모자', icon: '👒', cost: 35 },
  { id: 'beret', name: '베레모', icon: '🎨', cost: 45 },
  { id: 'party', name: '고깔모자', icon: '🥳', cost: 50 },
  { id: 'frog', name: '개구리 모자', icon: '🐸', cost: 70 },
  { id: 'santa', name: '산타 모자', icon: '🎅', cost: 80 },
  { id: 'pirate', name: '해적 모자', icon: '🏴‍☠️', cost: 90 },
  { id: 'crown', name: '작은 왕관', icon: '👑', ach: 'ending' },
  { id: 'halo', name: '천사 고리', icon: '😇', ach: 'savior' },
  { id: 'moon', name: '초승달 핀', icon: '🌙', ach: 'heat5' },
  { id: 'horns', name: '꼬마 뿔', icon: '😈', ach: 'heat10' },
  { id: 'mush', name: '버섯 모자', icon: '🍄', gacha: true },
  { id: 'sprout', name: '새싹', icon: '🌱', gacha: true },
  { id: 'catears', name: '고양이 귀', icon: '🐱', gacha: true },
  { id: 'chef', name: '요리사 모자', icon: '👨‍🍳', gacha: true },
  { id: 'witch', name: '마녀 모자', icon: '🧙', gacha: true },
  { id: 'miner', name: '광부 헬멧', icon: '⛑️', gacha: true },
];
// 광석 대결에서 진 사람이 쓰는 벌칙 모자 (옷장에는 안 나와요)
G.PENALTY_HAT = 'dunce';

// 업적: check(s) — s는 save.stats (+ 이번 원정 r)
G.ACHIEVEMENTS = [
  { id: 'first', name: '첫 발걸음', icon: '👣', desc: '첫 원정 떠나기', reward: 1, check: s => s.runs >= 1 },
  { id: 'boss1', name: '잘 자요 버섯님', icon: '🍄', desc: '잠꾸러기 왕버섯 처치', reward: 2, check: s => s.bosses.mushking > 0 },
  { id: 'boss2', name: '게 뒤집기', icon: '🦀', desc: '수정 집게 게 처치', reward: 2, check: s => s.bosses.crab > 0 },
  { id: 'boss3', name: '두더지 대 두더지', icon: '🌋', desc: '화난 용암 두더지왕 처치', reward: 3, check: s => s.bosses.moleking > 0 },
  { id: 'ending', name: '별빛을 되찾다', icon: '🌠', desc: '어둠 고래 처치 (엔딩)', reward: 5, check: s => s.bosses.whale > 0 },
  { id: 'revive10', name: '서로를 구해줘', icon: '🩹', desc: '서로 부활시키기 10번', reward: 1, check: s => s.revives[0] + s.revives[1] >= 10 },
  { id: 'savior', name: '생명의 은인', icon: '😇', desc: '한 사람이 30번 부활시키기', reward: 2, check: s => Math.max(s.revives[0], s.revives[1]) >= 30 },
  { id: 'combo1', name: '첫 합동기', icon: '💞', desc: '합동기 성공', reward: 1, check: s => s.combos >= 1 },
  { id: 'combo30', name: '척하면 척', icon: '💘', desc: '합동기 30번 성공', reward: 3, check: s => s.combos >= 30 },
  { id: 'holdhands', name: '손 놓지 마', icon: '🤝', desc: '한 층을 떨어지지 않고 클리어', reward: 2, check: s => s.handFloors >= 1 },
  { id: 'miner', name: '광부의 꿈', icon: '⛏️', desc: '광석 블록 300개 캐기', reward: 2, check: s => s.ores >= 300 },
  { id: 'rich', name: '부자 굴집', icon: '💎', desc: '광석 누적 1000개', reward: 2, check: s => s.gemsTotal >= 1000 },
  { id: 'kill100', name: '용감한 둘', icon: '⚔️', desc: '몬스터 100마리 재우기', reward: 1, check: s => s.kills >= 100 },
  { id: 'kill1000', name: '동굴의 전설', icon: '🏆', desc: '몬스터 1000마리 재우기', reward: 3, check: s => s.kills >= 1000 },
  { id: 'deco5', name: '우리 집 최고', icon: '🏡', desc: '가구 5개 들이기', reward: 2, check: s => s.furnitureCount >= 5 },
  { id: 'level15', name: '쑥쑥 자라요', icon: '🌳', desc: '한 원정에서 15레벨', reward: 2, check: s => s.bestLevel >= 15 },
  { id: 'nohit', name: '털끝 하나', icon: '✨', desc: '피격 없이 보스 처치', reward: 3, check: s => s.nohitBoss >= 1 },
  { id: 'telepathy', name: '텔레파시', icon: '🔮', desc: '별똥별에 같은 소원 빌기', reward: 2, check: s => s.telepathy >= 1 },
  { id: 'daily', name: '오늘의 동굴', icon: '📅', desc: '오늘의 동굴 도전하기', reward: 1, check: s => s.dailies >= 1 },
  { id: 'runs30', name: '단골 원정대', icon: '🎒', desc: '원정 30번', reward: 3, check: s => s.runs >= 30 },
  { id: 'star3', name: '별빛 3단계', icon: '⭐', desc: '별빛 3단계 클리어', reward: 3, check: s => s.bestStar >= 3 },
  { id: 'allchars', name: '모두 친구', icon: '🐾', desc: '모든 캐릭터 해금', reward: 3, check: s => s.charsUnlocked >= G.CHAR_ORDER.length },
  { id: 'codex', name: '동굴 박사', icon: '📖', desc: '몬스터 도감 완성', reward: 3, check: s => s.codexFull },
  { id: 'hours', name: '함께한 시간', icon: '⏰', desc: '함께 5시간 플레이', reward: 3, check: s => s.playTime >= 5 * 3600 },
  { id: 'mole', name: '보물 사냥꾼', icon: '🦫', desc: '보물 두더지 잡기', reward: 1, check: s => s.moles >= 1 },
  { id: 'mimic', name: '속았지롱', icon: '👅', desc: '미믹 상자 물리치기', reward: 1, check: s => s.mimics >= 1 },
  { id: 'puzzle5', name: '척하면 척 퍼즐', icon: '🧩', desc: '협동 퍼즐 5번 풀기', reward: 2, check: s => s.puzzles >= 5 },
  { id: 'cart', name: '광차 질주', icon: '🛒', desc: '광차 끝까지 타기', reward: 1, check: s => s.carts >= 1 },
  { id: 'fish10', name: '낚시왕', icon: '🎣', desc: '물고기 10마리 낚기', reward: 2, check: s => s.fish >= 10 },
  { id: 'pet', name: '새 가족', icon: '🐣', desc: '펫 알 부화시키기', reward: 2, check: s => s.petsHatched >= 1 },
  { id: 'heat5', name: '깊은 밤의 용사', icon: '🌙', desc: '저주 5단계 이상으로 별빛 되찾기', reward: 3, check: s => s.bestHeat >= 5 },
  { id: 'heat10', name: '한밤중의 전설', icon: '😈', desc: '저주 10단계 이상으로 별빛 되찾기', reward: 5, check: s => s.bestHeat >= 10 },
  { id: 'rush', name: '보스 러시 완주', icon: '👑', desc: '보스 러시 끝까지 가기', reward: 3, check: s => s.rushBest > 0 },
  { id: 'duel10', name: '영원한 라이벌', icon: '⚔️', desc: '광석 캐기 대결 10판', reward: 2, check: s => s.duel[0] + s.duel[1] >= 10 },
  { id: 'garden', name: '비밀의 꽃밭', icon: '🌸', desc: '비밀 꽃밭 발견하기', reward: 3, check: s => s.gardenFound },
  { id: 'yeti', name: '눈사람보다 큰', icon: '☃️', desc: '눈뭉치 대장 설인 처치', reward: 3, check: s => s.bosses.yeti > 0 },
  { id: 'weekly', name: '이번 주도 함께', icon: '🗓️', desc: '이번 주 도전 보상 받기', reward: 1, check: s => s.weeklies >= 1 },
  { id: 'gamble', name: '인생은 한 방', icon: '🎲', desc: '도박 카드 3장 들고 층 클리어', reward: 2, check: s => s.gambleFloor >= 1 },
];

// ───────────── 깊은 밤: 저주 (heat = 어려움 점수)
G.CURSES = [
  { id: 'dark', name: '짙은 어둠', icon: '🌑', heat: 1, desc: '빛 반경 -30%, 무서움 +50%' },
  { id: 'fury', name: '성난 동굴', icon: '💢', heat: 2, desc: '몬스터 이동 속도 +25%' },
  { id: 'fragile', name: '약한 마음', icon: '💔', heat: 2, desc: '부활이 두 배 느리고, 쓰러진 채 버티는 시간 절반' },
  { id: 'narrow', name: '좁은 선택', icon: '🎴', heat: 1, desc: '레벨업 카드가 3장 → 2장' },
  { id: 'elite', name: '정예 출몰', icon: '👑', heat: 2, desc: '정예 몬스터가 훨씬 자주 나와요' },
  { id: 'bossrage', name: '분노한 보스', icon: '🐉', heat: 2, desc: '보스 체력 +40%, 더 빨리 공격하고 일찍 화내요' },
  { id: 'collapse', name: '무너지는 동굴', icon: '🪨', heat: 2, desc: '한 층에 75초 넘게 있으면 천장이 무너져요' },
  { id: 'poor', name: '텅 빈 지갑', icon: '👛', heat: 1, desc: '상점 가격 +50%, 소원의 샘이 말라요' },
  { id: 'hunger', name: '배고픔', icon: '🍂', heat: 1, desc: '층을 넘어가도 회복 없음, 하트가 덜 나와요' },
];
G.CURSE = {}; G.CURSES.forEach(c => (G.CURSE[c.id] = c));

// ───────────── 층 사이 갈림길
G.PATHS = {
  battle: { icon: '⚔️', name: '전투 굴', desc: '몬스터와 정예가 많아요 · 클리어하면 카드 +1' },
  treasure: { icon: '🎁', name: '보물 굴', desc: '보물 상자 2개 + 광맥이 풍부해요' },
  camp: { icon: '🏕️', name: '모닥불 쉼터', desc: '도착하면 체력 가득 · 모닥불에서 쉬어 가요' },
  shop: { icon: '🐌', name: '상점 굴', desc: '달팽이 상점 확정 · 20% 할인' },
  mystery: { icon: '❓', name: '수상한 굴', desc: '이벤트 가득 · 특별한 층일 확률이 높아요' },
};
G.RPS = [{ icon: '✌️', name: '가위' }, { icon: '✊', name: '바위' }, { icon: '🖐️', name: '보' }];

// ───────────── 특별한 층
G.FLOOR_MODS = {
  gold: { icon: '🌟', name: '황금 층', desc: '광석이 잔뜩, 광석 획득 2배!' },
  reverse: { icon: '🙃', name: '거꾸로 층', desc: '이동 방향이 반대로! 침착하게~' },
  blackout: { icon: '🌑', name: '정전 층', desc: '빛이 약해요… 대신 빛줄기가 두 배로 강해져요' },
  baby: { icon: '🐣', name: '아기 몬스터 층', desc: '작고 약한 몬스터가 잔뜩!' },
};

// ───────────── 이번 주 도전 (주마다 규칙이 바뀌어요)
G.WEEKLY = [
  { id: 'bombfest', icon: '💣', name: '폭탄 축제', desc: '둘 다 냥폭으로! 폭발 범위 +30%' },
  { id: 'glass', icon: '💎', name: '유리 몸', desc: '둘 다 체력 1칸, 대신 공격력 2배' },
  { id: 'speedy', icon: '⚡', name: '빨리빨리', desc: '플레이어도 몬스터도 35% 빨라요' },
  { id: 'giant', icon: '🗿', name: '거인 동굴', desc: '몬스터 체력 1.6배, 경험치 2배' },
  { id: 'rich', icon: '💰', name: '광석 비', desc: '광석 3배, 상점 가격 2배' },
  { id: 'lonely', icon: '🏃', name: '각자도생', desc: '빛줄기가 없어요 · 대신 둘 다 재생 +2' },
  { id: 'cursed', icon: '🌙', name: '저주 3종 세트', desc: '무작위 저주 3개가 걸려요' },
];
G.WEEKLY_REWARD = 3; // 6층 도달 시 별조각 (주 1회)

// ───────────── 감정표현 (신호 키 + 방향)
G.EMOTES = {
  none: { text: '여기야! 📍', ping: true },
  up: { text: '도와줘! 🆘', ping: true },
  down: { text: '잠깐만! ✋' },
  left: { text: 'ㅋㅋㅋ 😆' },
  right: { text: '최고야! 💕' },
};

// ───────────── 펫 (알을 부화시키면 원정에 따라와요)
G.PETS = {
  chick: { names: ['삐약이', '꼬꼬', '황금 꼬꼬'], icon: '🐣', desc: '근처 광석을 주워 와요', col: ['#ffe36b', '#ff9a3c'] },
  slime: { names: ['말랑이', '말랑말랑이', '왕말랑이'], icon: '🟢', desc: '적에게 끈적이를 쏴서 느리게 해요', col: ['#7dff9a', '#3a9a5a'] },
  firefly: { names: ['반짝이', '반짝반짝이', '별빛 반딧불'], icon: '✨', desc: '주인의 빛을 넓혀 줘요', col: ['#d8ff8a', '#fff3a0'] },
  batpet: { names: ['콩이', '콩콩이', '달빛 콩이'], icon: '🦇', desc: '적을 콕콕 깨물어요', col: ['#8a6bb8', '#ffb3c7'] },
  hammy: { names: ['햄찌', '햄햄찌', '왕햄찌'], icon: '🐹', desc: '가끔 주인을 치료해 줘요', col: ['#e8b070', '#fff0dc'] },
};
G.PET_ORDER = Object.keys(G.PETS);
G.petStage = xp => (xp >= 8 ? 2 : xp >= 3 ? 1 : 0);   // 함께 간 원정 수로 진화
G.EGG_WARM = 2;                                        // 원정 2번이면 부화

// ───────────── 굴집 낚시 & 요리
G.FISH = [
  { id: 'minnow', name: '송사리', icon: '🐟', w: 45 },
  { id: 'carp', name: '동굴 붕어', icon: '🐠', w: 30 },
  { id: 'eel', name: '반짝 뱀장어', icon: '🪱', w: 14 },
  { id: 'golden', name: '황금 잉어', icon: '🎏', w: 6.5 },
  { id: 'rainbow', name: '무지개 송어', icon: '🌈', w: 2.5 },
  { id: 'boot', name: '낡은 장화', icon: '👢', w: 2, junk: true },
];
G.FISHD = {}; G.FISH.forEach(f => (G.FISHD[f.id] = f));
G.RECIPES = [
  { id: 'tempura', name: '송사리 튀김', icon: '🍤', need: { minnow: 3 }, desc: '둘 다 최대 체력 +1칸' },
  { id: 'bungeo', name: '붕어빵', icon: '🥮', need: { carp: 2 }, desc: '둘 다 공격력 +10%' },
  { id: 'unagi', name: '장어덮밥', icon: '🍱', need: { eel: 1, minnow: 1 }, desc: '둘 다 이동 속도 +10%, 스킬 쿨타임 -10%' },
  { id: 'sushi', name: '황금 초밥', icon: '🍣', need: { golden: 1 }, desc: '출발하자마자 카드 2장' },
  { id: 'rainbow', name: '무지개 정식', icon: '🍽️', need: { rainbow: 1, carp: 1 }, desc: '위 요리 효과 전부!' },
];
G.RECIPE = {}; G.RECIPES.forEach(r => (G.RECIPE[r.id] = r));

// ───────────── 광석 뽑기 기계
G.GACHA_COST = 30;
G.GACHA_DUP_REFUND = 12;

// 별똥별 소원 (텔레파시 이벤트)
G.WISHES = [
  { icon: '💖', name: '건강', text: '둘 다 최대 체력 +1칸' },
  { icon: '💎', name: '부자', text: '광석 40개' },
  { icon: '⚡', name: '힘', text: '둘 다 공격력 +12%' },
];
