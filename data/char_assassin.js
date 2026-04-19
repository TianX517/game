// 刺客
Object.assign(ACTIONS, {
  dart: {
    id: 'dart', name: '飞镖', cost: 0, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single', baseDamage: 0.5,
    cooldownGroup: 'dart_poison', cooldownTurns: 2,
    tip: '物理 0.5 伤，共享冷却',
  },
  poisonDart: {
    id: 'poisonDart', name: '撒毒', cost: 0, category: 'attack', kind: 'skill',
    element: ELEMENTS.MAGIC, targeting: 'single', baseDamage: 0.5,
    cooldownGroup: 'dart_poison', cooldownTurns: 2,
    tip: '魔法 0.5 伤，共享冷却',
  },
  shadowStep: {
    id: 'shadowStep', name: '遁入暗影', cost: 1, category: 'special', kind: 'skill',
    oncePerGame: true,
    grantsImmunity: true,
    unlocks: ['deadlyPoison', 'puppet'],
    tip: '一局一次，免疫本回合，解锁新技能',
  },
  deadlyPoison: {
    id: 'deadlyPoison', name: '致命毒药', cost: 0, category: 'attack', kind: 'skill',
    hpCost: 0.5,
    element: ELEMENTS.MAGIC, targeting: 'single', baseDamage: 0,
    nonBeam: true,
    inflictPoison: 1,
    requiresUnlock: true,
    tip: '魔法非束，施加永久中毒（可叠加）',
  },
  puppet: {
    id: 'puppet', name: '木偶操纵', cost: 0, category: 'attack', kind: 'skill',
    hpCost: 0.5,
    element: ELEMENTS.PHYSICAL, targeting: 'single', baseDamage: 0,
    nonBeam: true,
    grantsPuppet: true,
    requiresUnlock: true,
    tip: '物理非束，操纵对方（眩晕+借技能）',
  },
});

CHARACTERS.assassin = {
  id: 'assassin',
  name: '刺客',
  desc: '刺客没有特殊被动，但拥有免费的飞镖/撒毒（共享冷却）以及普通物/魔攻击。\n遁入暗影（一局一次）：本回合免疫一切，解锁致命毒药与木偶操纵。\n致命毒药（0.5HP）：魔法非束，永久内力中毒（每用技能-0.5HP，可叠加）。\n木偶操纵（0.5HP）：物理非束，对方眩晕+你借用对方技能（扣对方能量）。',
  maxHp: 3,
  maxEnergy: Infinity,
  actions: ['recover', 'defendP', 'defendM', 'dart', 'poisonDart', 'attackP', 'attackM', 'shadowStep', 'deadlyPoison', 'puppet'],
  passives: [],
  shieldDecay: 0,
};
