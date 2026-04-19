// 铁皮人
Object.assign(ACTIONS, {
  ironDefend: {
    id: 'ironDefend', name: '铁皮防御', cost: 0, category: 'defend', kind: 'basic',
    ironShield: true,
    tip: '0费，+1 护盾（回合末清零）',
  },
  beng: {
    id: 'beng', name: '崩', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single',
    inflictRageOnTarget: true,
    tip: '1费物理，指向即激怒目标（下回合必须用技能）',
  },
  xi: {
    id: 'xi', name: '吸', cost: 1, category: 'special', kind: 'skill',
    absorbsAll: true,
    tip: '1费，所有束转向自己，下回合解锁投掷',
  },
  tou: {
    id: 'tou', name: '投掷', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.MAGIC, targeting: 'single',
    damageFrom: 'throwCharges',
    canUse: p => p.throwCharges > 0,
    tip: '1费魔法，伤害=上回合吸到的束数',
  },
});

CHARACTERS.iron = {
  id: 'iron',
  name: '铁皮人',
  desc: '铁皮人无普通攻击与普通防御，以【铁皮防御】代替。\n被动「铁皮」：使用任意技能 +1 护盾（护盾回合末清零）。\n技能：崩 / 吸 / 投掷（需先用吸）。',
  maxHp: 3,
  maxEnergy: Infinity,
  actions: ['recover', 'ironDefend', 'beng', 'xi', 'tou'],
  passives: ['ironPassive'],
  shieldDecay: 'full',
};
