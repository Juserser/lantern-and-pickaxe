// 레벨업 카드 / 유물 / 태그 시너지
G.TAGS = {
  fire: { name: '불꽃', icon: '🔥', color: '#ff8a4c' },
  ice: { name: '얼음', icon: '❄️', color: '#8fd8ff' },
  bolt: { name: '번개', icon: '⚡', color: '#ffe36b' },
  leaf: { name: '자연', icon: '🌿', color: '#7dff9a' },
  star: { name: '별', icon: '⭐', color: '#d7a8ff' },
};

G.SYNERGY = {
  fire: '빛줄기가 불타올라요 · 화상 피해 +50%',
  ice: '빛줄기가 적을 얼려요 · 합동기가 적을 꽁꽁',
  bolt: '빛줄기에서 번개가 튀어요 · 연쇄 +10%',
  leaf: '빛줄기 회복 2배 · 둘 다 재생 +1',
  star: '둘 다 치명타 +10% · 두근 게이지 +30%',
};

// rarity: c 일반 / r 희귀 / l 전설 / u 커플
G.CARDS = [
  // ── 일반
  { id: 'claw', name: '반짝 발톱', icon: '🐾', r: 'c', tag: 'star', desc: '공격력 +15%', max: 5, apply: p => { p.st.dmg += 0.15; } },
  { id: 'quick', name: '재빠른 손', icon: '🤚', r: 'c', tag: 'bolt', desc: '공격 속도 +15%', max: 5, apply: p => { p.st.aspd += 0.15; } },
  { id: 'boots', name: '폭신 장화', icon: '👢', r: 'c', tag: 'leaf', desc: '이동 속도 +10%', max: 4, apply: p => { p.st.spd += 0.1; } },
  { id: 'cookie', name: '하트 쿠키', icon: '🍪', r: 'c', tag: 'leaf', desc: '최대 체력 +1칸, 1칸 회복', max: 5, apply: p => { p.st.maxHp += 2; p.hp = Math.min(p.st.maxHp, p.hp + 2); } },
  { id: 'oil', name: '기름 한 병', icon: '🧴', r: 'c', tag: 'star', desc: '빛 반경 +18', max: 4, apply: p => { p.st.light += 18; } },
  { id: 'magnet', name: '자석 주머니', icon: '🧲', r: 'c', tag: 'bolt', desc: '줍는 범위 +20', max: 3, apply: p => { p.st.magnet += 20; } },
  { id: 'lucky', name: '행운의 별', icon: '🌠', r: 'c', tag: 'star', desc: '치명타 확률 +8%', max: 5, apply: p => { p.st.crit += 0.08; } },
  { id: 'ember', name: '불씨', icon: '🕯️', r: 'c', tag: 'fire', desc: '15% 확률로 화상 (3초)', max: 4, apply: p => { p.st.burn += 0.15; } },
  { id: 'frost', name: '서리', icon: '🧊', r: 'c', tag: 'ice', desc: '20% 확률로 둔화', max: 4, apply: p => { p.st.slow += 0.2; } },
  { id: 'static', name: '정전기', icon: '🔌', r: 'c', tag: 'bolt', desc: '12% 확률로 번개 연쇄', max: 4, apply: p => { p.st.chain += 0.12; } },
  { id: 'sprout', name: '새싹', icon: '🌱', r: 'c', tag: 'leaf', desc: '10초마다 반 칸 회복', max: 3, apply: p => { p.st.regen += 1; } },
  { id: 'hourglass', name: '모래시계', icon: '⏳', r: 'c', tag: 'ice', desc: '스킬 쿨타임 -12%', max: 4, apply: p => { p.st.cdr *= 0.88; } },
  { id: 'hammer', name: '뿅망치', icon: '🔨', r: 'c', tag: 'fire', desc: '넉백 +40%, 공격력 +5%', max: 3, apply: p => { p.st.knock += 0.4; p.st.dmg += 0.05; } },
  { id: 'notes', name: '공부 노트', icon: '📒', r: 'c', tag: 'star', desc: '경험치 +15%', max: 3, apply: p => { p.st.xpMul += 0.15; } },
  { id: 'chestnut', name: '밤송이 갑옷', icon: '🌰', r: 'c', tag: 'leaf', desc: '맞으면 주변에 가시 피해 8', max: 3, apply: p => { p.st.thorns += 8; } },
  { id: 'hotpack', name: '핫팩', icon: '♨️', r: 'c', tag: 'fire', desc: '무서움 -35%', max: 2, apply: p => { p.st.fearMul *= 0.65; } },
  // ── 희귀
  { id: 'pierce', name: '관통 화살촉', icon: '🏹', r: 'r', tag: 'bolt', desc: '투사체 관통 +1 / 근접 범위 +15%', max: 3, apply: p => { p.st.pierce += 1; p.st.area += 0.15; } },
  { id: 'twin', name: '쌍둥이 탄', icon: '🎯', r: 'r', tag: 'star', desc: '공격 1회 추가 발사', max: 2, apply: p => { p.st.multi += 1; } },
  { id: 'fireball', name: '화염 구슬', icon: '☄️', r: 'r', tag: 'fire', desc: '4번째 공격마다 화염구 발사', max: 1, apply: p => { p.st.fireball = 1; } },
  { id: 'icering', name: '얼음 고리', icon: '💠', r: 'r', tag: 'ice', desc: '스킬 사용 시 서리 폭발', max: 1, apply: p => { p.st.iceNova = 1; } },
  { id: 'thunder', name: '천둥 발자국', icon: '🌩️', r: 'r', tag: 'bolt', desc: '3초마다 근처 적에게 낙뢰', max: 2, apply: p => { p.st.thunder += 1; } },
  { id: 'vine', name: '덩굴 열매', icon: '🍓', r: 'r', tag: 'leaf', desc: '처치 시 8% 확률로 회복 열매', max: 2, apply: p => { p.st.fruit += 0.08; } },
  { id: 'starshot', name: '별똥별', icon: '💫', r: 'r', tag: 'star', desc: '치명타 시 작은 별 3개 발사', max: 1, apply: p => { p.st.starshot = 1; } },
  { id: 'giant', name: '거대화 버섯', icon: '🍄', r: 'r', tag: 'fire', desc: '공격 범위 +25%, 공격력 +10%', max: 2, apply: p => { p.st.area += 0.25; p.st.dmg += 0.1; } },
  { id: 'mirror', name: '거울 방패', icon: '🪞', r: 'r', tag: 'ice', desc: '12% 확률로 피해 막기', max: 3, apply: p => { p.st.block += 0.12; } },
  { id: 'windshoe', name: '바람 신발', icon: '🌬️', r: 'r', tag: 'bolt', desc: '스킬 쿨타임 -25%', max: 2, apply: p => { p.st.cdr *= 0.75; } },
  { id: 'candy', name: '달콤 사탕', icon: '🍭', r: 'r', tag: 'leaf', desc: '처치 시 10% 확률로 반 칸 회복', max: 2, apply: p => { p.st.vamp += 0.1; } },
  { id: 'orbit', name: '위성 별', icon: '🪐', r: 'r', tag: 'star', desc: '주위를 도는 별 +1', max: 3, apply: p => { p.st.orbit += 1; } },
  { id: 'hotlamp', name: '뜨거운 등불', icon: '🏮', r: 'r', tag: 'fire', desc: '내 빛 속의 적 초당 피해 5', max: 2, apply: p => { p.st.aura += 5; } },
  { id: 'brittle', name: '꽁꽁', icon: '🥶', r: 'r', tag: 'ice', desc: '둔화된 적에게 피해 +30%', max: 2, apply: p => { p.st.brittle += 0.3; } },
  // ── 전설
  { id: 'phoenix', name: '불사조 깃털', icon: '🪶', r: 'l', tag: 'fire', desc: '층마다 한 번, 쓰러지면 바로 부활', max: 1, apply: p => { p.st.phoenix = 1; } },
  { id: 'blizzard', name: '눈보라 왕관', icon: '👑', r: 'l', tag: 'ice', desc: '6초마다 주변을 꽁꽁 얼림', max: 1, apply: p => { p.st.blizzard = 1; } },
  { id: 'storm', name: '폭풍의 눈', icon: '🌀', r: 'l', tag: 'bolt', desc: '연쇄 +30%, 연쇄 대상 +2', max: 1, apply: p => { p.st.chain += 0.3; p.st.chainN += 2; } },
  { id: 'worldtree', name: '세계수 잎', icon: '🍃', r: 'l', tag: 'leaf', desc: '최대 체력 +2칸, 재생 +3', max: 1, apply: p => { p.st.maxHp += 4; p.hp += 4; p.st.regen += 3; } },
  { id: 'supernova', name: '초신성', icon: '🌟', r: 'l', tag: 'star', desc: '치명타 +15%, 치명 피해 +80%', max: 1, apply: p => { p.st.crit += 0.15; p.st.critMul += 0.8; } },
  { id: 'dragon', name: '꼬마 용의 숨결', icon: '🐉', r: 'l', tag: 'fire', desc: '공격할 때마다 불꽃탄 추가', max: 1, apply: p => { p.st.dragon = 1; } },
  // ── 커플 (분홍)
  { id: 'hands', name: '손깍지', icon: '🤝', r: 'u', tag: 'u', desc: '빛줄기 연결 거리 +35%', max: 2, apply: (p, t) => { t.st.beamRange += 0.35; } },
  { id: 'share', name: '같이 먹자', icon: '🍡', r: 'u', tag: 'u', desc: '회복 아이템을 먹으면 상대도 회복', max: 1, apply: (p, t) => { t.st.shareHeal = 1; } },
  { id: 'guard', name: '대신 맞아줄게', icon: '🫂', r: 'u', tag: 'u', desc: '빛줄기 연결 중 받는 피해 30% 감소 (둘 다)', max: 1, apply: (p, t) => { t.st.guard = 1; } },
  { id: 'missyou', name: '보고 싶었어', icon: '💌', r: 'u', tag: 'u', desc: '떨어졌다 다시 만나면 사랑의 폭발', max: 1, apply: (p, t) => { t.st.reunion = 1; } },
  { id: 'doki', name: '두근두근', icon: '💓', r: 'u', tag: 'u', desc: '두근 게이지 획득 +50%', max: 2, apply: (p, t) => { t.st.heartGain += 0.5; } },
  { id: 'hotheart', name: '뜨거운 마음', icon: '❤️‍🔥', r: 'u', tag: 'u', desc: '빛줄기 피해 +60%', max: 3, apply: (p, t) => { t.st.beamDmg += 0.6; } },
  { id: 'coming', name: '금방 갈게', icon: '🏃', r: 'u', tag: 'u', desc: '부활 속도 +60%, 부활 체력 +1칸', max: 1, apply: (p, t) => { t.st.reviveSpd += 0.6; t.st.reviveHp += 2; } },
  { id: 'ring', name: '커플 반지', icon: '💍', r: 'u', tag: 'u', desc: '둘이 가진 커플 카드 1장당 공격력 +6%', max: 1, apply: (p, t) => { t.st.ring = 1; } },
];
G.CARD = {}; G.CARDS.forEach(c => (G.CARD[c.id] = c));

G.RELICS = [
  { id: 'jar', name: '반딧불 병', icon: '🫙', desc: '둘 다 줍는 범위 +25', apply: (t, ps) => ps.forEach(p => (p.st.magnet += 25)) },
  { id: 'clover', name: '네잎클로버', icon: '🍀', desc: '좋은 카드가 더 잘 나와요', apply: t => { t.st.luck += 1; } },
  { id: 'scarf', name: '따뜻한 목도리', icon: '🧣', desc: '무서움 -40%', apply: (t, ps) => ps.forEach(p => (p.st.fearMul *= 0.6)) },
  { id: 'acorns', name: '도토리 두 알', icon: '🌰', desc: '새 층에 갈 때마다 1칸 회복', apply: t => { t.st.floorHeal += 2; } },
  { id: 'helmet', name: '튼튼 헬멧', icon: '⛑️', desc: '둘 다 최대 체력 +1칸', apply: (t, ps) => ps.forEach(p => { p.st.maxHp += 2; p.hp += 2; }) },
  { id: 'lamp', name: '마법 등잔', icon: '🪔', desc: '둘 다 빛 반경 +20%', apply: (t, ps) => ps.forEach(p => (p.st.light *= 1.2)) },
  { id: 'song', name: '광부의 노래', icon: '🎵', desc: '채굴 속도 2배, 광석 +50%', apply: t => { t.st.mineMul *= 2; t.st.oreMul += 0.5; } },
  { id: 'candy', name: '별사탕', icon: '🍬', desc: '경험치 +20%', apply: t => { t.st.xpMul += 0.2; } },
  { id: 'pouch', name: '복주머니', icon: '👛', desc: '광석 +40%', apply: t => { t.st.gemMul += 0.4; } },
  { id: 'promise', name: '약속 반지', icon: '💍', desc: '부활 속도 +50%', apply: t => { t.st.reviveSpd += 0.5; } },
  { id: 'bracelet', name: '우정 팔찌', icon: '📿', desc: '빛줄기 연결 거리 +30%', apply: t => { t.st.beamRange += 0.3; } },
  { id: 'choco', name: '두근 초콜릿', icon: '🍫', desc: '두근 게이지 획득 +40%', apply: t => { t.st.heartGain += 0.4; } },
  { id: 'clock', name: '멈춘 시계', icon: '⏱️', desc: '둘 다 스킬 쿨타임 -15%', apply: (t, ps) => ps.forEach(p => (p.st.cdr *= 0.85)) },
  { id: 'cactus', name: '선인장 화분', icon: '🌵', desc: '둘 다 가시 피해 +6', apply: (t, ps) => ps.forEach(p => (p.st.thorns += 6)) },
  { id: 'coin', name: '행운 동전', icon: '🪙', desc: '달팽이 상점 30% 할인', apply: t => { t.st.shopDisc += 0.3; } },
  { id: 'feather', name: '보호 깃털', icon: '🪽', desc: '층마다 첫 피격 무효 (둘 다)', apply: t => { t.st.featherShield = 1; } },
  { id: 'c_fire', name: '불꽃 부적', icon: '🧨', desc: '둘 다 🔥 태그 +1', apply: (t, ps) => ps.forEach(p => (p.tagBonus.fire = (p.tagBonus.fire || 0) + 1)) },
  { id: 'c_ice', name: '얼음 부적', icon: '🧊', desc: '둘 다 ❄️ 태그 +1', apply: (t, ps) => ps.forEach(p => (p.tagBonus.ice = (p.tagBonus.ice || 0) + 1)) },
  { id: 'c_bolt', name: '번개 부적', icon: '🔋', desc: '둘 다 ⚡ 태그 +1', apply: (t, ps) => ps.forEach(p => (p.tagBonus.bolt = (p.tagBonus.bolt || 0) + 1)) },
  { id: 'c_leaf', name: '잎사귀 부적', icon: '🌿', desc: '둘 다 🌿 태그 +1', apply: (t, ps) => ps.forEach(p => (p.tagBonus.leaf = (p.tagBonus.leaf || 0) + 1)) },
  { id: 'c_star', name: '별 부적', icon: '✨', desc: '둘 다 ⭐ 태그 +1', apply: (t, ps) => ps.forEach(p => (p.tagBonus.star = (p.tagBonus.star || 0) + 1)) },
  { id: 'shard', name: '반짝 거울', icon: '🔮', desc: '둘 다 관통 +1', apply: (t, ps) => ps.forEach(p => (p.st.pierce += 1)) },
  { id: 'recipe', name: '할머니 레시피', icon: '📜', desc: '회복량 +50%', apply: t => { t.st.healMul += 0.5; } },
  { id: 'shell', name: '달팽이 껍질', icon: '🐚', desc: '둘 다 10% 확률로 피해 막기', apply: (t, ps) => ps.forEach(p => (p.st.block += 0.1)) },
  { id: 'map', name: '보물 지도', icon: '🗺️', desc: '숨겨진 방이 지도에 보이고 보물 +50%', apply: t => { t.st.treasureMap = 1; t.st.chestMul += 0.5; } },
  { id: 'laces', name: '새 신발 끈', icon: '👟', desc: '둘 다 이동 속도 +8%', apply: (t, ps) => ps.forEach(p => (p.st.spd += 0.08)) },
];
G.RELIC = {}; G.RELICS.forEach(r => (G.RELIC[r.id] = r));
