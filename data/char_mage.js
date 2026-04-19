// 疯子法师
Object.assign(ACTIONS, {
  wand: {
    id: 'wand', name: '挥舞法杖', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single',
    baseDamage: 1,
    multiplierEffect: 'damage',
    upgradeTo: 'miehun',
    tip: '物理 1 伤害，连击翻倍',
  },
  miehun: {
    id: 'miehun', name: '迷魂术', cost: 2, category: 'attack', kind: 'skill',
    targeting: 'single',
    baseDamage: 0,
    multiplierEffect: 'beamCount',
    baseBeams: { physical: 1, magic: 1 },
    stunPerHit: 1,
    upgradeTo: 'shizi',
    tip: '物+魔各1束，命中眩晕，连击加束',
  },
  shizi: {
    id: 'shizi', name: '十字封禁', cost: 3, category: 'attack', kind: 'skill',
    element: 'neutral', targeting: 'single',
    priority: 'highest',
    voidAndBan: true,
    disableTargetPassives: true,
    tip: '最高优先级，封印目标动作+被动',
  },
});

CHARACTERS.mage = {
  id: 'mage',
  name: '疯子法师',
  desc: '疯子法师无普通攻击，靠三个技能压制。\n被动 1「愤怒连击」：连续使用同一技能 → 下回合该技能效果翻倍（x2 → x4 → x8 …）。换招/未用技能/被眩晕/十字封禁 → 倍率归 1。\n被动 2「啊？我流血啦？」：HP 降至 ≤ 初始一半（1.5）时，获得免费券（轮转：法杖 → 迷魂术 → 十字封禁 → 法杖 …）。回血超过一半后可再次触发。\n被动 3「嗜血」：对带负面状态的目标造成伤害 → 回等量 HP（含护盾吸收）。\n技能：挥舞法杖 / 迷魂术 / 十字封禁。',
  maxHp: 3,
  maxEnergy: Infinity,
  actions: ['recover', 'defendP', 'defendM', 'wand', 'miehun', 'shizi'],
  passives: ['mageMultiplier', 'mageCharges', 'mageLifesteal'],
  shieldDecay: 0,
};
