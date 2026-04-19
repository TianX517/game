function aiChoose(selfId) {
  const self = state.players[selfId];
  const foe = state.players[1 - selfId];
  const available = playerAvailableActions(self);
  let pool = available.filter(id => canPayAction(self, id));

  // —— 激怒：必须选技能 ——
  if (self.rageTurns > 0) {
    const skills = pool.filter(id => ACTIONS[id].kind === 'skill');
    if (skills.length) {
      const pickedId = pickAttack(skills, self);
      const act = ACTIONS[pickedId];
      const tgt = act.category === 'attack' ? (1 - selfId) : selfId;
      return makeChoice(selfId, pickedId, tgt);
    }
  }

  // —— 双方 0 能量 → 回能（除非有免费券） ——
  const hasAnyCharge = self.freeCharges && (self.freeCharges.miehun > 0 || self.freeCharges.shizi > 0);
  if (self.energy === 0 && foe.energy === 0 && !hasAnyCharge && pool.includes('recover')) {
    return makeChoice(selfId, 'recover', selfId);
  }

  // —— 对方 0 能量 → 不防御 ——
  if (foe.energy === 0) {
    pool = pool.filter(id => ACTIONS[id].category !== 'defend');
  }

  const low = self.hp === 1;
  const foeLow = foe.hp === 1;
  const roll = Math.random();

  const attacks = pool.filter(id => ACTIONS[id].category === 'attack');
  const defs = pool.filter(id => ACTIONS[id].category === 'defend');
  const recs = pool.filter(id => ACTIONS[id].category === 'recover');

  // —— 铁皮人 ——
  if (self.characterId === 'iron') {
    const hasXi = pool.includes('xi');
    const hasTou = pool.includes('tou');
    if (hasTou && self.throwCharges > 0) return makeChoice(selfId, 'tou', 1 - selfId);
    if (self.energy >= 1) {
      const r = Math.random();
      if (r < 0.45) return makeChoice(selfId, 'beng', 1 - selfId);
      if (r < 0.7 && hasXi) return makeChoice(selfId, 'xi', selfId);
      if (defs.length && r < 0.9) return makeChoice(selfId, pick(defs), selfId);
      return makeChoice(selfId, 'recover', selfId);
    }
    if (Math.random() < 0.6 || !defs.length) return makeChoice(selfId, 'recover', selfId);
    return makeChoice(selfId, pick(defs), selfId);
  }

  // —— 疯子法师 ——
  if (self.characterId === 'mage') {
    if ((self.freeCharges.shizi || 0) > 0 && pool.includes('shizi')) return makeChoice(selfId, 'shizi', 1 - selfId);
    if ((self.freeCharges.miehun || 0) > 0 && pool.includes('miehun')) return makeChoice(selfId, 'miehun', 1 - selfId);
    const foeBig = foe.throwCharges > 0 || (foe.skillMultiplier && foe.skillMultiplier >= 4) || foe.energy >= 3;
    if (foeBig && pool.includes('shizi') && self.energy >= 3) return makeChoice(selfId, 'shizi', 1 - selfId);
    if (!hasAnyDebuff(foe) && pool.includes('miehun') && self.energy >= 2 && Math.random() < 0.6) {
      return makeChoice(selfId, 'miehun', 1 - selfId);
    }
    if (hasAnyDebuff(foe) && pool.includes('wand') && self.energy >= 1) {
      return makeChoice(selfId, 'wand', 1 - selfId);
    }
    if (self.energy >= 1 && pool.includes('wand') && Math.random() < 0.55) return makeChoice(selfId, 'wand', 1 - selfId);
    if (low && defs.length && Math.random() < 0.55) return makeChoice(selfId, pick(defs), selfId);
    if (recs.length) return makeChoice(selfId, 'recover', selfId);
    return makeChoice(selfId, pick(pool), selfId);
  }

  // —— 通用 ——
  if (foeLow && attacks.length && roll < 0.8) return makeChoice(selfId, pickAttack(attacks, self), 1 - selfId);
  if (low && defs.length && roll < 0.6) return makeChoice(selfId, pick(defs), selfId);
  if (attacks.length && roll < 0.5) return makeChoice(selfId, pickAttack(attacks, self), 1 - selfId);
  if (defs.length && roll < 0.75) return makeChoice(selfId, pick(defs), selfId);
  if (recs.length) return makeChoice(selfId, pick(recs), selfId);
  return makeChoice(selfId, pick(pool), selfId);

  function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
  function pickAttack(arr, selfP) {
    if (selfP.passives && selfP.passives.includes('zoroKi')) {
      if (arr.includes('sanzen') && Math.random() < 0.5) return 'sanzen';
      if (arr.includes('madou') && Math.random() < 0.5) return 'madou';
    }
    return pick(arr);
  }
}

function makeChoice(playerId, actionId, target) {
  return { playerId, action: actionId, target };
}
