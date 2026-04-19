// 基础动作（所有角色可共用）
Object.assign(ACTIONS, {
  recover: {
    id: 'recover', name: '回能', cost: 0, category: 'recover', kind: 'basic',
    tip: '+1 能量',
  },
  defendP: {
    id: 'defendP', name: '物理防御', cost: 0, category: 'defend', kind: 'basic',
    element: ELEMENTS.PHYSICAL,
    tip: '免疫物理攻击',
  },
  defendM: {
    id: 'defendM', name: '魔法防御', cost: 0, category: 'defend', kind: 'basic',
    element: ELEMENTS.MAGIC,
    tip: '免疫魔法攻击',
  },
  attackP: {
    id: 'attackP', name: '物理攻击', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.PHYSICAL, targeting: 'single',
    tip: '1费，1伤害',
  },
  attackM: {
    id: 'attackM', name: '魔法攻击', cost: 1, category: 'attack', kind: 'skill',
    element: ELEMENTS.MAGIC, targeting: 'single',
    tip: '1费，1伤害',
  },
});
