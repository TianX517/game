// 三刀流侠客（索隆）
Object.assign(ACTIONS, {
  iai: {
    id: 'iai', name: '居合', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single',
    isSword: true,
    onHit: { refundEnergy: 1 },
    tip: '1费物理，命中回1能量',
  },
  shusui: {
    id: 'shusui', name: '秋水', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single',
    isSword: true,
    destroyUsedDefense: true,
    tip: '1费物理，摧毁目标本回合用的防御',
  },
  madou: {
    id: 'madou', name: '魔刀', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'all',
    isSword: true,
    destroyCrossElementOpposing: true,
    onDestroy: { refundEnergy: 1 },
    tip: '1费群物，消灭对向不同属性束（+1能量）',
  },
  sanzen: {
    id: 'sanzen', name: '三千世界', cost: 3, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'all',
    isSword: true,
    onHit: { refundEnergy: 1 },
    destroyUsedDefense: true,
    destroyCrossElementOpposing: true,
    onDestroy: { refundEnergy: 1 },
    kiBonus: 3,
    tip: '3费群物，集合居合+秋水+魔刀，使用积3气',
  },
});

CHARACTERS.zoro = {
  id: 'zoro',
  name: '三刀流侠客',
  desc: '索隆携三把独特的刀，不会普通物/魔攻击。\n被动「气」：使用刀攻击即 +1 气（上限 4）。即将受到 HP 伤害且气≥3 时，全部气转为等量护盾。护盾每回合末 -3。\n技能：居合 / 秋水 / 魔刀 / 三千世界。',
  maxHp: 3,
  maxEnergy: Infinity,
  actions: ['recover', 'defendP', 'defendM', 'iai', 'shusui', 'madou', 'sanzen'],
  passives: ['zoroKi'],
  shieldDecay: 3,
};
