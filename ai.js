// ============================================================
// AI 入口 —— 智能 AI（minimax + 角色专属评估）+ 启发式 fallback
// ============================================================

const SEARCH_DEPTH = 2;          // 前瞻回合数
const ACTION_CAP = 5;            // 每层最多考虑的候选动作数（剪枝）
const AI_TIMEOUT_MS = 2500;      // 搜索超时保护

function aiChoose(selfId) {
  const self = state.players[selfId];
  if (self.rageTurns > 0) return aiHeuristic(selfId);
  try {
    return aiSmart(selfId);
  } catch (e) {
    console.warn('Smart AI error, fallback to heuristic:', e);
    return aiHeuristic(selfId);
  }
}

// ============================================================
// 智能 AI（paranoid minimax + 动作剪枝 + 超时）
// ============================================================

function aiSmart(selfId) {
  const simState = cloneState(state);
  const myChoices = enumerateChoices(simState, selfId);
  if (myChoices.length === 0) return aiHeuristic(selfId);

  const deadline = Date.now() + AI_TIMEOUT_MS;
  const scored = [];
  for (const myChoice of myChoices) {
    const score = minimaxEval(simState, myChoice, selfId, SEARCH_DEPTH, deadline);
    scored.push({ choice: myChoice, score });
  }
  // 找到最佳分数后，在"接近最佳"的动作里随机选一个（打破平局 + 增加变化）
  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0].score;
  // 更紧的 tie-breaking：3 分或 2% 内才算同档
  const tol = Math.max(3, Math.abs(bestScore) * 0.02);
  const near = scored.filter(s => bestScore - s.score <= tol);
  return near[Math.floor(Math.random() * near.length)].choice;
}

function minimaxEval(simState, myChoice, selfId, depth, deadline) {
  if (Date.now() > deadline) return evaluate(simState, selfId);  // 超时保护

  const foeId = 1 - selfId;
  const foeChoices = prunedChoices(simState, foeId, ACTION_CAP, selfId);
  if (foeChoices.length === 0) {
    const next = applySimTurn(simState, [myChoice]);
    return evaluate(next, selfId);
  }

  const scores = [];
  for (const foeChoice of foeChoices) {
    if (Date.now() > deadline) break;
    const next = applySimTurn(simState, [myChoice, foeChoice]);

    let leaf;
    if (depth <= 1 || isTerminal(next)) {
      leaf = evaluate(next, selfId);
    } else {
      const myNextChoices = prunedChoices(next, selfId, ACTION_CAP, selfId);
      if (myNextChoices.length === 0) {
        leaf = evaluate(next, selfId);
      } else {
        let bestNext = -Infinity;
        for (const nc of myNextChoices) {
          if (Date.now() > deadline) break;
          const s = minimaxEval(next, nc, selfId, depth - 1, deadline);
          if (s > bestNext) bestNext = s;
        }
        leaf = bestNext !== -Infinity ? bestNext : evaluate(next, selfId);
      }
    }
    scores.push(leaf);
  }

  if (scores.length === 0) return evaluate(simState, selfId);
  // Soft minimax: 更乐观（降低风险厌恶，让 AI 敢打）
  // 权重：worst 30% + 2nd 20% + 3rd 15% + 平均 35%
  scores.sort((a, b) => a - b);
  const avg = scores.reduce((x, y) => x + y, 0) / scores.length;
  return scores[0] * 0.30
    + (scores[1] !== undefined ? scores[1] : scores[0]) * 0.20
    + (scores[2] !== undefined ? scores[2] : scores[0]) * 0.15
    + avg * 0.35;
}

// 剪枝：根据快速启发式打分，保留前 N 个候选
function prunedChoices(simState, pid, cap, perspectiveId) {
  const all = enumerateChoices(simState, pid);
  if (all.length <= cap) return all;
  // 快速打分：对 pid 玩家来说这个动作的立即收益
  const scored = all.map(c => ({ c, s: quickActionScore(simState, c, pid) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, cap).map(x => x.c);
}

function quickActionScore(simState, choice, pid) {
  const a = ACTIONS[choice.action];
  const p = simState.players[pid];
  const foe = simState.players[1 - pid];
  let s = 0;
  // 回能：对方无威胁时低分，有威胁时中分
  if (a.category === 'recover') s += foe.energy === 0 ? 5 : 2;
  // 防御：对方有能量时有价值
  if (a.category === 'defend') s += foe.energy >= 1 ? 6 : 0;
  // 攻击：对方越残血越高分
  if (a.category === 'attack') s += 8 + (3 - foe.hp) * 3;
  // 有特殊效果的技能加分
  if (a.destroyUsedDefense) s += 3;
  if (a.destroyCrossElementOpposing) s += 3;
  if (a.inflictRageOnTarget) s += 4;
  if (a.inflictPoison) s += 5;
  if (a.grantsPuppet) s += 5;
  if (a.grantsImmunity) s += (p.hp <= 1 ? 10 : 3);
  if (a.priority === 'highest') s += 6;
  if (a.absorbsAll && foe.energy >= 1) s += 5;
  if (a.damageFrom === 'throwCharges' && p.throwCharges > 0) s += p.throwCharges * 4;
  // 醉酒狂暴：耗可乐爆发伤害，可乐越多越值
  if (a.dynamicCost === 'allCola' && p.cola >= 2) s += p.cola * 6 + 5;
  // 阿宅霰弹枪：稳定输出，HP 足时主动出
  if (a.id === 'shotgun' && p.hp >= 1.5) s += 8;
  // 痛饮：能量多时转换为可乐（预备爆发）
  if (a.dynamicCost === 'allEnergy' && p.energy >= 2) s += p.energy * 2;
  if (a.hpCost && p.hp <= a.hpCost + 0.5) s -= 10;  // 差点自杀
  // 免费券
  if (p.freeCharges && p.freeCharges[choice.action] > 0) s += 5;
  return s;
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

  if (p.rageTurns > 0) {
    const skills = acts.filter(id => ACTIONS[id].kind === 'skill');
    if (skills.length) acts = skills;
  }

  const foeId = 1 - pid;
  const out = [];
  for (const aid of acts) {
    const a = ACTIONS[aid];
    const target = (a.category === 'attack') ? foeId : pid;
    out.push({ playerId: pid, action: aid, target });
  }

  // 刺客木偶操纵：也可借用对方技能
  if (p.characterId === 'assassin' && p.puppetTarget !== null) {
    const enemy = simState.players[p.puppetTarget];
    const enemySkillIds = enemy.baseActions.filter(a => {
      const act = ACTIONS[a];
      return act.kind === 'skill' && enemy.energy >= act.cost
        && !enemy.lostDefenses.includes(a) && !enemy.bannedActions.includes(a)
        && (!act.canUse || act.canUse(enemy))
        && !(act.oncePerGame && enemy.usedOnceSkills.includes(a))
        && !(act.requiresUnlock && !enemy.unlockedSkills.includes(a))
        && !(act.cooldownGroup && (enemy.cooldowns[act.cooldownGroup] || 0) > 0);
    });
    for (const aid of enemySkillIds) {
      const a = ACTIONS[aid];
      const target = (a.category === 'attack') ? foeId : pid;
      out.push({ playerId: pid, action: aid, target, puppet: true, puppetSource: p.puppetTarget });
    }
  }

  return out;
}

// ============================================================
// 状态克隆 + 模拟
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
  return { turn: s.turn, players: s.players.map(clonePlayer) };
}

function applySimTurn(simState, choices) {
  const next = cloneState(simState);
  const realTurnBackup = state.turn;
  state.turn = simState.turn;
  try {
    resolveTurn(choices, next.players);
  } finally {
    state.turn = realTurnBackup;
  }
  next.turn = simState.turn + 1;
  return next;
}

function isTerminal(simState) {
  return simState.players.filter(p => p.hp > 0).length <= 1;
}

// ============================================================
// 评估函数（含角色专属奖励）
// ============================================================

function evaluate(simState, selfId) {
  const me = simState.players[selfId];
  const foe = simState.players[1 - selfId];

  if (me.hp <= 0 && foe.hp <= 0) return 0;
  if (me.hp <= 0) return -100000;
  if (foe.hp <= 0) return 100000;

  let s = 0;
  s += (me.hp - foe.hp) * 100;
  s += (me.energy - foe.energy) * 12;
  s += (me.shield - foe.shield) * 10;
  s += kiValue(me.ki || 0) - kiValue(foe.ki || 0);
  s += ((me.throwCharges || 0) - (foe.throwCharges || 0)) * 18;
  s += ((me.cola || 0) - (foe.cola || 0)) * 20;
  s += chargesValue(me.freeCharges) - chargesValue(foe.freeCharges);
  s += multiplierValue(me) - multiplierValue(foe);

  // Debuffs
  s -= me.stunTurns * 35;        s += foe.stunTurns * 35;
  s -= me.pendingStunTurns * 30; s += foe.pendingStunTurns * 30;
  s -= me.rageTurns * 20;        s += foe.rageTurns * 20;
  s -= me.pendingRageTurns * 18; s += foe.pendingRageTurns * 18;
  s -= (me.poisonStacks || 0) * 30; s += (foe.poisonStacks || 0) * 30;
  s -= (me.lostDefenses?.length || 0) * 15; s += (foe.lostDefenses?.length || 0) * 15;
  s -= (me.bannedActions?.length || 0) * 20; s += (foe.bannedActions?.length || 0) * 20;
  if (me.immuneThisTurn) s += 30;
  if (foe.immuneThisTurn) s -= 30;

  // 角色专属奖励
  s += characterBonus(me, foe, +1);
  s -= characterBonus(foe, me, -1);

  return s;
}

function kiValue(k) {
  if (k >= 4) return 38;
  if (k >= 3) return 22;
  return k * 2;
}

function chargesValue(c) {
  if (!c) return 0;
  return (c.wand || 0) * 12 + (c.miehun || 0) * 22 + (c.shizi || 0) * 40;
}

function multiplierValue(p) {
  // 非线性：1→0, 2→8, 4→24, 8→56
  const m = p.skillMultiplier || 1;
  if (m <= 1) return 0;
  return (m - 1) * 8;
}

// 角色专属评估 bonus —— sign 为 +1 (自己) 或 -1 (对方)
function characterBonus(me, foe, sign) {
  let b = 0;

  // 阿宅「恰到好处」：HP === cola 极有价值（下一招带压制）
  if (me.passives?.includes('otakuOppression')) {
    if (me.hp === me.cola && me.hp > 0) b += 60;
    // 差 0.5 可达到（容易触发）
    if (Math.abs(me.hp - me.cola) === 0.5) b += 15;
  }
  // 阿宅：囤积太多可乐是浪费（可乐只能抵伤或转伤害，不花掉等于空转）
  if (me.characterId === 'otaku' && me.cola > 3) {
    b -= (me.cola - 3) * 6;  // 4→-6, 5→-12, 6→-18
  }

  // 法师「愤怒连击」：连击已起势（lastSkillUsed 可用）
  if (me.passives?.includes('mageMultiplier') && me.lastSkillUsed) {
    const skill = ACTIONS[me.lastSkillUsed];
    if (skill && me.energy >= (skill.cost || 0)) {
      // 已能继续连击 → 倍率将继续生效
      b += (me.skillMultiplier || 1) * 4;
    }
  }

  // 刺客
  if (me.characterId === 'assassin') {
    // 遁入暗影未用 = 保命符，但不要太高否则 AI 永远不用
    if (!me.usedOnceSkills?.includes('shadowStep')) b += 8;
    // 解锁了强力技能 —— 这些应该比保留未用更值钱
    if (me.unlockedSkills?.includes('puppet')) b += 25;
    if (me.unlockedSkills?.includes('deadlyPoison')) b += 22;
    // 可操纵对方
    if (me.puppetTarget !== null) b += 55;
    // 有内力中毒在对方身上：鼓励叠加（中毒是永久效果）
    if (foe.poisonStacks > 0) b += foe.poisonStacks * 8;
  }

  // 铁皮：已积对方激怒层 = 潜在击杀
  if (me.characterId === 'iron') {
    // foe.rageTurns 已在上面 debuff 中计了 +20，这里再额外加码
    if (foe.rageTurns > 0 && foe.energy === 0) b += 40;  // 对面必自毙
  }

  // 索隆：气到 4 已 max（kiValue 已体现），这里不重复

  return b * sign;
}

// ============================================================
// 启发式 AI（fallback）
// ============================================================

function aiHeuristic(selfId) {
  const self = state.players[selfId];
  const foe = state.players[1 - selfId];
  const available = playerAvailableActions(self);
  let pool = available.filter(id => canPayAction(self, id));

  // 绝对 fallback：pool 为空时强制返回一个合法动作（几乎不可能，但防止崩溃）
  if (pool.length === 0) {
    if (self.baseActions.includes('recover')) return makeChoice(selfId, 'recover', selfId);
    return makeChoice(selfId, self.baseActions[0], selfId);
  }

  if (self.rageTurns > 0) {
    const skills = pool.filter(id => ACTIONS[id].kind === 'skill');
    if (skills.length) {
      const pickedId = pickAttackSmart(skills, self);
      const act = ACTIONS[pickedId];
      const tgt = act.category === 'attack' ? (1 - selfId) : selfId;
      return makeChoice(selfId, pickedId, tgt);
    }
  }

  const hasAnyCharge = self.freeCharges && (self.freeCharges.miehun > 0 || self.freeCharges.shizi > 0);
  if (self.energy === 0 && foe.energy === 0 && !hasAnyCharge && pool.includes('recover')) {
    return makeChoice(selfId, 'recover', selfId);
  }
  if (foe.energy === 0) pool = pool.filter(id => ACTIONS[id].category !== 'defend');
  if (pool.length === 0) return makeChoice(selfId, 'recover', selfId);  // 再保险

  const roll = Math.random();
  const attacks = pool.filter(id => ACTIONS[id].category === 'attack');
  const defs = pool.filter(id => ACTIONS[id].category === 'defend');
  const recs = pool.filter(id => ACTIONS[id].category === 'recover');

  // 更激进的攻击倾向（benchmark 下减少 stall）
  if (foe.hp <= 1 && attacks.length && roll < 0.9) return makeChoice(selfId, pickAttackSmart(attacks, self), 1 - selfId);
  if (self.hp <= 1 && defs.length && roll < 0.5) return makeChoice(selfId, pickRand(defs), selfId);
  if (attacks.length && roll < 0.65) return makeChoice(selfId, pickAttackSmart(attacks, self), 1 - selfId);
  if (defs.length && roll < 0.8) return makeChoice(selfId, pickRand(defs), selfId);
  if (recs.length) return makeChoice(selfId, pickRand(recs), selfId);
  return makeChoice(selfId, pickRand(pool), selfId);
}

function pickRand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickAttackSmart(arr, selfP) {
  if (selfP.passives && selfP.passives.includes('zoroKi')) {
    if (arr.includes('sanzen') && Math.random() < 0.5) return 'sanzen';
    if (arr.includes('madou') && Math.random() < 0.5) return 'madou';
  }
  return pickRand(arr);
}

function makeChoice(playerId, actionId, target) {
  return { playerId, action: actionId, target };
}
