// 몬스터 정의 (AI 로직은 game/enemyai.js)
G.ENEMIES = {
  mushroom:  { name: '통통 버섯', hp: 16, spd: 30, r: 6, dmg: 1, xp: 1, ai: 'chase', desc: '느릿느릿 다가와요. 쓰러지면 포자를 퍼뜨려요.', col: ['#ff6b8a', '#fff0e0'] },
  bat:       { name: '꼬마 박쥐', hp: 9, spd: 74, r: 5, dmg: 1, xp: 1, ai: 'bat', flying: true, desc: '어둠 속에서만 덤벼들어요. 빛을 무서워해요.', col: ['#8a6bb8', '#ffb3c7'] },
  snail:     { name: '이끼 달팽이', hp: 34, spd: 15, r: 7, dmg: 1, xp: 2, ai: 'chase', trail: 'slime', desc: '끈적한 점액을 남겨요. 밟으면 느려져요.', col: ['#9ccc65', '#d7a86e'] },
  worm:      { name: '땅굴 애벌레', hp: 18, spd: 48, r: 6, dmg: 1, xp: 2, ai: 'burrow', desc: '땅속으로 다니다 불쑥 튀어나와요.', col: ['#ffcf6b', '#b8804a'] },
  shadow:    { name: '그림자 뭉치', hp: 22, spd: 40, r: 6, dmg: 1, xp: 2, ai: 'chase', shadow: true, flying: true, desc: '빛 속에서만 때릴 수 있어요!', col: ['#2a2140', '#ff5c8a'] },
  crabling:  { name: '수정 게', hp: 30, spd: 36, r: 7, dmg: 1, xp: 2, ai: 'charger', front: true, desc: '앞쪽 집게는 단단해요. 뒤를 노리세요!', col: ['#6fb6ff', '#e0f4ff'] },
  shardfly:  { name: '수정 반딧벌레', hp: 14, spd: 52, r: 5, dmg: 1, xp: 2, ai: 'ranged', flying: true, shot: 'shard', desc: '멀리서 수정 조각을 쏴요.', col: ['#b8e0ff', '#6f8cff'] },
  salamander:{ name: '불씨 도롱뇽', hp: 26, spd: 56, r: 6, dmg: 1, xp: 2, ai: 'chase', trail: 'fire', desc: '지나간 자리에 불씨를 남겨요.', col: ['#ff7043', '#ffd36b'] },
  golem:     { name: '바위 골렘', hp: 70, spd: 22, r: 9, dmg: 2, xp: 4, ai: 'slam', mineWeak: true, desc: '느리지만 단단해요. 곡괭이에 약해요.', col: ['#8d7b6a', '#ffb070'] },
  slime:     { name: '용암 슬라임', hp: 30, spd: 34, r: 7, dmg: 1, xp: 2, ai: 'hop', split: 'slimelet', desc: '쓰러지면 둘로 나뉘어요.', col: ['#ff8a4c', '#ffe0a0'] },
  slimelet:  { name: '꼬마 슬라임', hp: 9, spd: 46, r: 4, dmg: 1, xp: 1, ai: 'hop', desc: '말랑말랑.', col: ['#ffa66b', '#fff0c0'], noCodex: true },
  emberbat:  { name: '불똥 박쥐', hp: 13, spd: 80, r: 5, dmg: 2, xp: 2, ai: 'bat', flying: true, trail: 'fire', desc: '뜨거운 박쥐. 불씨를 떨어뜨려요.', col: ['#c0392b', '#ffd36b'] },
  fairy:     { name: '별먼지 요정', hp: 20, spd: 50, r: 5, dmg: 1, xp: 3, ai: 'blink', flying: true, shot: 'star', desc: '순간이동하며 별을 뿌려요.', col: ['#f3c6ff', '#fff6a8'] },
  jelly:     { name: '꿈 해파리', hp: 42, spd: 20, r: 8, dmg: 1, xp: 3, ai: 'pulse', flying: true, desc: '둥실둥실. 주기적으로 파동을 내요.', col: ['#b39dff', '#ffd6f5'] },
  mushling:  { name: '아기 버섯', hp: 8, spd: 38, r: 4, dmg: 1, xp: 0, ai: 'chase', col: ['#ff9eb5', '#fff0e0'], noCodex: true },
};

// 보스 기본 정보 (패턴은 game/bosses.js)
G.BOSSES = {
  mushking: { name: '잠꾸러기 왕버섯', hp: 900, r: 20, title: '이끼 버섯굴의 주인', col: ['#ff6b8a', '#fff0e0'], desc: '졸다 깨면 포자를 뿌려요. 잘 때가 기회!' },
  crab:     { name: '수정 집게 게', hp: 1500, r: 20, title: '수정 동굴의 파수꾼', col: ['#6fb6ff', '#e0f4ff'], desc: '앞은 단단해요. 한 명이 시선을 끌고 한 명이 뒤를 치세요.' },
  moleking: { name: '화난 용암 두더지왕', hp: 2300, r: 20, title: '따끈 용암굴의 왕', col: ['#8d5a44', '#ffb070'], desc: '땅속을 파고 다녀요. 튀어나올 자리를 잘 보세요.' },
  whale:    { name: '어둠 고래', hp: 3400, r: 26, title: '별빛을 삼킨 고래', col: ['#2a2150', '#d7a8ff'], desc: '빛이 사라지면, 둘의 빛줄기만이 길을 밝혀요.' },
};
