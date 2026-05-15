import { randInt, shuffle } from "../../shared/common";

export function resolveCountPickConfig(data) {
  const roundsValue = Number(data?.roundsTotal);
  const allowedRounds = [6, 8, 10];
  const roundsTotal = allowedRounds.includes(roundsValue) ? roundsValue : 6;

  const rawMin = Number(data?.minTarget);
  const rawMax = Number(data?.maxTarget);

  const minTarget = Number.isFinite(rawMin) ? rawMin : 3;
  const maxTarget = Number.isFinite(rawMax) ? rawMax : 6;

  const safeMin = Math.max(1, Math.min(minTarget, maxTarget));
  const safeMax = Math.max(safeMin, maxTarget);

  let level = "EASY";
  if (safeMax >= 10) {
    level = "HARD";
  } else if (safeMax >= 8) {
    level = "MEDIUM";
  }

  return {
    roundsTotal,
    minTarget: safeMin,
    maxTarget: safeMax,
    level,
  };
}

// Compatibilidad con código viejo
export function resolveRoundsTotal(data) {
  return resolveCountPickConfig(data).roundsTotal;
}

export function createCountPickState() {
  return {
    startTime: Date.now(),
    roundStartedAt: null,
    reactionTimes: [],
    round: 0,
    score: 0,
    attempts: 0,
    wrongAnswers: 0,
    target: 0,
    locked: false,
    lastTarget: null,
    lastChoicesKey: null,
  };
}

function roundNumber(value, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function average(values) {
  const clean = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value) && value >= 0
  );

  if (!clean.length) return null;

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function percent(part, total) {
  if (!total || total <= 0) return 0;
  return roundNumber(Math.max(0, Math.min(100, (part / total) * 100)));
}

export function recordCountPickReaction(scene) {
  const startedAt = scene.state.roundStartedAt;

  if (!startedAt) return;

  scene.state.reactionTimes.push(Math.max(0, Date.now() - startedAt));
}

function buildChoicesKey(choices) {
  return [...choices].sort((a, b) => a - b).join("-");
}

function buildRoundOnce(minTarget, maxTarget, blockedTarget = null) {
  const allTargets = [];

  for (let n = minTarget; n <= maxTarget; n++) {
    allTargets.push(n);
  }

  let availableTargets = allTargets;

  if (allTargets.length > 1 && blockedTarget !== null) {
    availableTargets = allTargets.filter((n) => n !== blockedTarget);
  }

  const target =
    availableTargets[randInt(0, availableTargets.length - 1)];

  const distractorsPool = allTargets.filter((n) => n !== target);
  shuffle(distractorsPool);

  const distractors = distractorsPool.slice(0, 2);
  const choices = shuffle([target, ...distractors]);

  return {
    target,
    choices,
    choicesKey: buildChoicesKey(choices),
  };
}

export function createRoundData(
  minTarget = 3,
  maxTarget = 6,
  lastTarget = null,
  lastChoicesKey = null
) {
  let best = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const round = buildRoundOnce(minTarget, maxTarget, lastTarget);

    const repeatsTarget = lastTarget !== null && round.target === lastTarget;
    const repeatsChoices =
      lastChoicesKey !== null && round.choicesKey === lastChoicesKey;

    if (!repeatsTarget && !repeatsChoices) {
      return round;
    }

    if (!best) {
      best = round;
    }
  }

  return best || buildRoundOnce(minTarget, maxTarget, lastTarget);
}

export function buildFinalResult(scene, options = {}) {
  const progressPercent = percent(scene.state.attempts, scene.roundsTotal);
  const successRate = percent(scene.state.score, scene.state.attempts);
  const reactionTimeMs = roundNumber(average(scene.state.reactionTimes));

  return {
    game: "countPick",
    score: scene.state.score,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level: scene.level || "MEDIUM",
    accuracy: percent(scene.state.score, scene.roundsTotal),
    attempts: scene.state.attempts,
    errorsCommitted: scene.state.wrongAnswers,
    reactionTimeMs,
    progressPercent,
    successRate,
    abandoned: Boolean(options.abandoned),
    metadata: {
      roundsTotal: scene.roundsTotal,
      minTarget: scene.minTarget,
      maxTarget: scene.maxTarget,
      correctAnswers: scene.state.score,
      wrongAnswers: scene.state.wrongAnswers,
      errorsCommitted: scene.state.wrongAnswers,
      reactionTimeMs,
      progressPercent,
      successRate,
      abandoned: Boolean(options.abandoned),
    },
  };
}
