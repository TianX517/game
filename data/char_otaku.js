// 阿宅
Object.assign(ACTIONS, {
  tongyin: {
    id: 'tongyin', name: '痛饮', cost: 0, category: 'special', kind: 'skill',
    dynamicCost: 'allEnergy',
    tip: '耗尽所有能量换等量可乐',
  },
  drunkRage: {
    id: 'drunkRage', name: '醉"酒?"狂暴', cost: 0, category: 'attack', kind: 'skill',
    element: ELEMENTS.MAGIC, targeting: 'single',
    dynamicCost: 'allCola',
    damageFrom: 'colaConsumed',
    tip: '耗尽可乐，伤害=可乐数（魔法）',
  },
  shotgun: {
    id: 'shotgun', name: '霰弹枪', cost: 0, category: 'attack', kind: 'skill',
    hpCost: 0.5,
    element: ELEMENTS.PHYSICAL, targeting: 'all', baseDamage: 0.5,
    tip: '消耗 0.5HP，群物理 0.5 伤',
  },
});

CHARACTERS.otaku = {
  id: 'otaku',
  name: '阿宅',
  desc: '肥宅生活：初始 2 瓶可乐。可乐优先于 HP 抵伤（1瓶=1HP）。主动消耗 HP 的技能使用后获得等量可乐。\n恰到好处：若 HP = 可乐数，下次技能对目标施加「压制」（目标本回合的非基础动作失效）。\n技能：痛饮（能量→可乐）、醉酒狂暴（可乐→伤害）、霰弹枪（群物理）。',
  maxHp: 3,
  maxEnergy: Infinity,
  actions: ['recover', 'defendP', 'defendM', 'tongyin', 'drunkRage', 'shotgun'],
  passives: ['otakuCola', 'otakuOppression'],
  shieldDecay: 0,
  initialCola: 2,
};
