// ============================================================
// AI 入口 —— 智能 AI（minimax 搜索）+ 启发式 fallback
// ============================================================

const SEARCH_DEPTH = 1;  // 1=单回合 lookahead (快, ~36 sims). 可调到 2 但会慢到 1-3秒

function aiChoose(selfId) {
  const self = state.players[selfId];
  // 眩晕场景由 UI 层处理（不会进来）。激怒下必须选技能，走启发式更稳。
  if (self.rageTurns > 0) return aiHeuristic(selfId);
  try {
    return aiSmart(selfId);
  } catch (e) {
    console.warn('Smart AI error, fallback to heuristic:', e);
    return aiHeuristic(selfId);
  }
}

// ============================================================
// 智能 AI（paranoid minimax）
// ============================================================

function aiSmart(selfId) {
  const simState = cloneState(state);
  const myChoices = enumerateChoices(simState, selfId);
  if (myChoices.length === 0) return aiHeuristic(selfId);

  let bestChoice = myChoices[0];
  let bestScore = -Infinity;

  for (const myChoice of myChoices) {
    const score = minimaxEval(simState, myChoice, selfId, SEARCH_DEPTH);
    if (score > bestScore) {
      bestScore = score;
      bestChoice = myChoice;
    }
  }
  return bestChoice;
}

function minimaxEval(simState, myChoice, selfId, depth) {
  const foeId = 1 - selfId;
  const foeChoices = enumerateChoices(simState, foeId);
  if (foeChoices.length === 0) {
    const next = applySimTurn(simState, [myChoice]);
    return evaluate(next, selfId);
  }

  let worstForMe = Infinity;
  for (const foeChoice of foeChoices) {
    const next = applySimTurn(simState, [myChoice, foeChoice]);

    let leaf;
    if (depth <= 1 || isTerminal(next)) {
      leaf = evaluate(next, selfId);
    } else {
      const myNextChoices = enumerateChoices(next, selfId);
      if (myNextChoices.length === 0) {
        leaf = evaluate(next, selfId);
      } else {
        let bestNext = -Infinity;
        for (const nc of myNextChoices) {
          const s = minimaxEval(next, nc, selfId, depth - 1);
          if (s > bestNext) bestNext = s;
        }
        leaf = bestNext;
      }
    }

    if (leaf < worstForMe) worstForMe = leaf;
  }
  return worstForMe;
}

function enumerateChoices(simState, pid) {
  const p = simState.players[pid];
  if (p.hp <= 0) return [];
  if (p.stunTurns > 0) {
    return [{ playerId: pid, action: 'recover', target: pid, stunned: true }];
  }

  let acts = p.baseActions.filter(a => {
    if (p.lostDefenses.includes(a)) return false;
    if (p.bannedActions.includes(a)) return false;
    const act = ACTIONS[a];
    if (act.canUse && !act.canUse(p)) return false;
    if (act.oncePerGame && p.usedOnceSkills.includes(a)) return false;
    if (act.requiresUnlock && !p.unlockedSkills.includes(a)) return false;
    if (act.cooldownGroup && (p.cooldowns[act.cooldownGroup] || 0) > 0) return false;
    return true;
  }).filter(id => {
    const a = ACTIONS[id];
    if (a.hpCost > 0 && p.hp <= a.hpCost) return false;
    if ((p.freeCharges || {})[id] > 0) return true;
    return p.energy >= a.cost;
  });

  // 激怒下只考虑技能
  if (p.rageTurns > 0) {
    const skills = acts.filter(id => ACTIONS[id].kind === 'skill');
    if (skills.length) acts = skills;
  }

  const out = [];
  const foeId = 1 - pid;
  for (const aid of acts) {
    const a = ACTIONS[aid];
    const target = (a.category === 'attack') ? foeId : pid;
    out.push({ playerId: pid, action: aid, target });
  }
  return out;
}

// ============================================================
// 状态克隆 + 模拟结算（调用真实 resolveTurn）
// ============================================================

function clonePlayer(p) {
  return {
    ...p,
    passives: [...(p.passives || [])],
    baseActions: [...p.baseActions],
    lostDefenses: [...(p.lostDefenses || [])],
    bannedActions: [...(p.bannedActions || [])],
    usedOnceSkills: [...(p.usedOnceSkills || [])],
    unlockedSkills: [...(p.unlockedSkills || [])],
    cooldowns: { ...(p.cooldowns || {}) },
    freeCharges: { ...(p.freeCharges || {}) },
  };
}

function cloneState(s) {
  return {
    turn: s.turn,
    players: s.players.map(clonePlayer),
  };
}

function applySimTurn(simState, choices) {
  const next = cloneState(simState);
  // resolveTurn 只修改传入的 players；读 state.turn 用于日志（我们用 dummy 替身）
  const realStateBackup = { turn: state.turn };
  state.turn = simState.turn;
  try {
    resolveTurn(choices, next.players);
  } finally {
    state.turn = realStateBackup.turn;
  }
  next.turn = simState.turn + 1;
  return next;
}

function isTerminal(simState) {
  const alive = simState.players.filter(p => p.hp > 0);
  return alive.length <= 1;
}

// ============================================================
// 评估函数 —— 局面对 selfId 的好坏
// ============================================================

function evaluate(simState, selfId) {
  const me = simState.players[selfId];
  const foe = simState.players[1 - selfId];

  if (me.hp <= 0 && foe.hp <= 0) return 0;
  if (me.hp <= 0) return -100000;
  if (foe.hp <= 0) return 100000;

  let s = 0;
  // HP 差（最大权重）
  s += (me.hp - foe.hp) * 100;
  // 能量（中权重）
  s += (me.energy - foe.energy) * 12;
  // 护盾
  s += (me.shield - foe.shield) * 10;
  // 气（索隆 —— 3+ 才能转护盾，边际价值递增）
  s += kiValue(me.ki || 0) - kiValue(foe.ki || 0);
  // 投掷待用
  s += ((me.throwCharges || 0) - (foe.throwCharges || 0)) * 18;
  // 可乐（阿宅 —— 顶血）
  s += ((me.cola || 0) - (foe.cola || 0)) * 20;
  // 法师倍率
  s += ((me.skillMultiplier || 1) - (foe.skillMultiplier || 1)) * 8;
  // 法师免费券（不同等级权重不同）
  s += chargesValue(me.freeCharges) - chargesValue(foe.freeCharges);
  // Debuffs
  s -= me.stunTurns * 35;       s += foe.stunTurns * 35;
  s -= me.pendingStunTurns * 30; s += foe.pendingStunTurns * 30;
  s -= me.rageTurns * 20;        s += foe.rageTurns * 20;
  s -= me.pendingRageTurns * 18; s += foe.pendingRageTurns * 18;
  s -= (me.poisonStacks || 0) * 30; s += (foe.poisonStacks || 0) * 30;
  s -= (me.lostDefenses?.length || 0) * 15; s += (foe.lostDefenses?.length || 0) * 15;
  s -= (me.bannedActions?.length || 0) * 20; s += (foe.bannedActions?.length || 0) * 20;
  // 被动即时状态
  if (me.immuneThisTurn) s += 30;
  if (foe.immuneThisTurn) s -= 30;
  return s;
}

function kiValue(k) {
  // 0 → 0, 1 → 2, 2 → 5, 3 → 20, 4 → 35（满气可转大盾）
  if (k >= 4) return 35;
  if (k >= 3) return 20;
  return k * 2;
}

function chargesValue(c) {
  if (!c) return 0;
  return (c.wand || 0) * 12 + (c.miehun || 0) * 22 + (c.shizi || 0) * 40;
}

// ============================================================
// 启发式 AI（保留做 fallback）
// ============================================================

function aiHeuristic(selfId) {
  const self = state.players[selfId];
  const foe = state.players[1 - selfId];
  const available = playerAvailableActions(self);
  let pool = available.filter(id => canPayAction(self, id));

  if (self.rageTurns > 0) {
    const skills = pool.filter(id => ACTIONS[id].kind === 'skill');
    if (skills.length) {
      const pickedId = pickAttack(skills, self);
      const act = ACTIONS[pickedId];
      const tgt = act.category === 'attack' ? (1 - selfId) : selfId;
      return makeChoice(selfId, pickedId, tgt);
    }
  }

  const hasAnyCharge = self.freeCharges && (self.freeCharges.miehun > 0 || self.freeCharges.shizi > 0);
  if (self.energy === 0 && foe.energy === 0 && !hasAnyCharge && pool.includes('recover')) {
    return makeChoice(selfId, 'recover', selfId);
  }
  if (foe.energy === 0) {
    pool = pool.filter(id => ACTIONS[id].category !== 'defend');
  }

  const roll = Math.random();
  const attacks = pool.filter(id => ACTIONS[id].category === 'attack');
  const defs = pool.filter(id => ACTIONS[id].category === 'defend');
  const recs = pool.filter(id => ACTIONS[id].category === 'recover');

  if (foe.hp === 1 && attacks.length && roll < 0.8) return makeChoice(selfId, pickAttack(attacks, self), 1 - selfId);
  if (self.hp === 1 && defs.length && roll < 0.6) return makeChoice(selfId, pick(defs), selfId);
  if (attacks.length && roll < 0.5) return makeChoice(selfId, pickAttack(attacks, self), 1 - selfId);
  if (defs.length && roll < 0.75) return makeChoice(selfId, pick(defs), selfId);
  if (recs.length) return makeChoice(selfId, pick(recs), selfId);
  return makeChoice(selfId, pick(pool), selfId);

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
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
