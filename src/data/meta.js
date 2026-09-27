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
];

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
  { id: 'allchars', name: '모두 친구', icon: '🐾', desc: '모든 캐릭터 해금', reward: 3, check: s => s.charsUnlocked >= 6 },
  { id: 'codex', name: '동굴 박사', icon: '📖', desc: '몬스터 도감 완성', reward: 3, check: s => s.codexFull },
  { id: 'hours', name: '함께한 시간', icon: '⏰', desc: '함께 5시간 플레이', reward: 3, check: s => s.playTime >= 5 * 3600 },
];

// 별똥별 소원 (텔레파시 이벤트)
G.WISHES = [
  { icon: '💖', name: '건강', text: '둘 다 최대 체력 +1칸' },
  { icon: '💎', name: '부자', text: '광석 40개' },
  { icon: '⚡', name: '힘', text: '둘 다 공격력 +12%' },
];
