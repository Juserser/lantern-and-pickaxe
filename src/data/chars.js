// 플레이어 캐릭터 정의
G.CHARS = {
  toto: {
    name: '토토', animal: '토끼', role: '등불지기', emoji: '🐰', color: '#fff0f5',
    hp: 10, spd: 80, light: 94, lightPower: true, miner: false, held: 'lantern',
    atk: { type: 'orb', dmg: 6, cd: 0.36, speed: 170, life: 0.95, homing: 3.2, r: 4 },
    skill: { type: 'wave', name: '빛 파동', cd: 8, dmg: 10, radius: 78, stun: 1.6, icon: '🌟' },
    desc: '빛 반경이 넓어요. 빛 속의 적은 더 아파해요. 어둠 결계를 풀 수 있어요.',
    passive: '빛 속 적 받는 피해 +20%',
  },
  molly: {
    name: '몰리', animal: '두더지', role: '광부', emoji: '⛏️', color: '#b07a52',
    hp: 12, spd: 76, light: 42, lightPower: false, miner: true, held: 'pickaxe',
    atk: { type: 'swing', dmg: 13, cd: 0.42, range: 25, arc: 2.0, knock: 150, mine: 1 },
    skill: { type: 'roll', name: '땅 구르기', cd: 6, dmg: 12, dist: 118, dur: 0.28, icon: '💨' },
    desc: '벽과 광석, 바위를 캘 수 있어요. 근접 공격이 강해요.',
    passive: '광석 캘 때 25% 확률로 보너스',
  },
  nyang: {
    name: '냥폭', animal: '고양이', role: '폭탄공', emoji: '💣', color: '#ffae5c',
    hp: 10, spd: 79, light: 54, lightPower: false, miner: true, held: 'bomb',
    atk: { type: 'bomb', dmg: 11, cd: 0.6, radius: 26, speed: 150, fuse: 0.45 },
    skill: { type: 'bigbomb', name: '왕폭탄', cd: 7.5, dmg: 36, radius: 62, fuse: 1.1, icon: '💥' },
    desc: '폭탄이 터지면 벽도 부서져요. 범위 공격의 달인!',
    passive: '폭발이 벽과 바위를 부숨',
    unlock: { need: 'boss1', stars: 3, text: '잠꾸러기 왕버섯 처치' },
  },
  kkobuk: {
    name: '꼬북', animal: '거북이', role: '방패지기', emoji: '🛡️', color: '#8fd18a',
    hp: 16, spd: 68, light: 50, lightPower: false, miner: false, held: 'shield',
    atk: { type: 'bash', dmg: 12, cd: 0.52, range: 24, arc: 2.5, knock: 230 },
    skill: { type: 'dome', name: '등껍질 요새', cd: 11, dur: 3.5, radius: 36, icon: '🛡️' },
    desc: '튼튼해요. 요새 안의 친구는 다치지 않아요.',
    passive: '받는 피해 20% 확률로 막기',
    unlock: { need: 'boss2', stars: 5, text: '수정 집게 게 처치' },
  },
  yeoul: {
    name: '여울', animal: '여우', role: '반딧불 사냥꾼', emoji: '🦊', color: '#ff8a4c',
    hp: 10, spd: 84, light: 72, lightPower: true, miner: false, held: 'jar',
    atk: { type: 'dart', dmg: 4.5, cd: 0.3, speed: 210, life: 0.75, count: 2, homing: 5, r: 3 },
    skill: { type: 'swarm', name: '반딧불 떼', cd: 10, dur: 6, n: 5, dmg: 5, icon: '✨' },
    desc: '반딧불이 알아서 적을 쫓아가요. 어둠 결계를 풀 수 있어요.',
    passive: '반딧불 공격이 적을 따라감',
    unlock: { need: 'boss3', stars: 6, text: '용암 두더지왕 처치' },
  },
  dotori: {
    name: '도토', animal: '다람쥐', role: '요리사', emoji: '🍙', color: '#c98a5a',
    hp: 11, spd: 82, light: 58, lightPower: false, miner: false, held: 'pan',
    atk: { type: 'acorn', dmg: 8, cd: 0.44, speed: 185, life: 0.9, bounce: 1, r: 3 },
    skill: { type: 'picnic', name: '도시락', cd: 13, heal: 4, buff: 0.25, dur: 7, icon: '🍱' },
    desc: '도시락을 깔면 둘 다 회복하고 힘이 나요.',
    passive: '회복 아이템 효과 +50%',
    unlock: { need: 'runs5', stars: 4, text: '원정 5회' },
  },
  hoo: {
    name: '후후', animal: '부엉이', role: '별 마법사', emoji: '🦉', color: '#b89adf',
    hp: 9, spd: 76, light: 64, lightPower: false, miner: false, held: 'staff',
    atk: { type: 'rune', dmg: 10, cd: 0.62, radius: 20, delay: 0.32, range: 130 },
    skill: { type: 'meteor', name: '별똥별 비', cd: 10, dmg: 20, radius: 28, n: 6, icon: '☄️' },
    desc: '적이 있는 자리에 마법진을 그려 터뜨려요. 뭉친 적에게 강해요.',
    passive: '마법진 범위 +20%',
    unlock: { need: 'boss4', stars: 6, text: '어둠 고래 처치' },
  },
  pengu: {
    name: '뽀롱', animal: '펭귄', role: '얼음 미끄럼꾼', emoji: '🐧', color: '#6fb6ff',
    hp: 11, spd: 78, light: 50, lightPower: false, miner: false, held: 'snow',
    atk: { type: 'snow', dmg: 7, cd: 0.4, speed: 175, life: 0.85, r: 3 },
    skill: { type: 'slide', name: '배 미끄럼', cd: 7, dmg: 14, dist: 170, dur: 0.45, freeze: 1.4, icon: '🧊' },
    desc: '눈덩이로 적을 느리게 하고, 배로 미끄러져 꽁꽁 얼려요.',
    passive: '눈덩이가 적을 느리게 함',
    unlock: { need: 'runs10', stars: 5, text: '원정 10회' },
  },
};
G.CHAR_ORDER = ['toto', 'molly', 'nyang', 'kkobuk', 'yeoul', 'dotori', 'hoo', 'pengu'];

// 합동기 이름 (조합별)
G.comboName = function (a, b) {
  const s = [a, b].sort().join('+');
  const table = {
    'molly+toto': '반짝 대폭발', 'molly+nyang': '광산 불꽃놀이', 'nyang+toto': '폭죽 축제',
    'kkobuk+toto': '등불 요새', 'kkobuk+molly': '바위 굴리기', 'toto+yeoul': '반딧불 은하수',
    'molly+yeoul': '별빛 채굴', 'dotori+toto': '달빛 소풍', 'dotori+molly': '광부의 도시락',
    'kkobuk+nyang': '폭탄 거북선', 'nyang+yeoul': '불꽃 반딧불', 'dotori+nyang': '팝콘 폭발',
    'dotori+kkobuk': '든든한 한 끼', 'kkobuk+yeoul': '반짝 등껍질', 'dotori+yeoul': '별빛 피크닉',
    'hoo+toto': '별자리 대폭발', 'hoo+molly': '운석 채굴', 'hoo+nyang': '마법 불꽃놀이', 'hoo+kkobuk': '마법 요새', 'hoo+yeoul': '별빛 폭풍',
    'dotori+hoo': '마법 도시락', 'pengu+toto': '오로라', 'molly+pengu': '얼음 광산', 'nyang+pengu': '눈꽃 폭죽', 'kkobuk+pengu': '빙하 요새',
    'pengu+yeoul': '겨울 반딧불', 'dotori+pengu': '빙수 파티', 'hoo+pengu': '눈꽃 유성우',
  };
  if (a === b) return '쌍둥이 폭발';
  return table[s] || '두근 폭발';
};
