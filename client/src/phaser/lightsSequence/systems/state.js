export function resolveLightsConfig(data) {
  const steps = Number.isFinite(data?.steps) ? data.steps : 3;
  const speedMs = Number.isFinite(data?.speedMs) ? data.speedMs : 650;
  const roundsTotal = Number.isFinite(data?.roundsTotal) ? data.roundsTotal : 5;
  const difficulty = data?.difficulty || "easy";

  return {
    steps,
    speedMs,
    roundsTotal,
    difficulty,
  };
}

export function createLightsState() {
  return {
    startTime: Date.now(),
    turnStartedAt: null,
    lastInputAt: null,
    reactionTimes: [],
    round: 0,
    score: 0,
    attempts: 0,
    wrongRounds: 0,
    repeatCount: 0,
    locked: true,
    sequence: [],
    inputIndex: 0,
    focusIndex: 0,
  };
}

function round(value, digits = 1) {
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
  return round(Math.max(0, Math.min(100, (part / total) * 100)));
}

export function markLightsTurnStart(scene) {
  const now = Date.now();
  scene.state.turnStartedAt = now;
  scene.state.lastInputAt = now;
}

export function recordLightsReaction(scene) {
  const now = Date.now();
  const last = scene.state.lastInputAt || scene.state.turnStartedAt || now;
  scene.state.reactionTimes.push(Math.max(0, now - last));
  scene.state.lastInputAt = now;
}

export function buildFinalResult(scene, options = {}) {
  let level = "MEDIUM";
  if (scene.difficulty === "easy") level = "EASY";
  if (scene.difficulty === "medium") level = "MEDIUM";
  if (scene.difficulty === "hard") level = "HARD";

  const totalDecisions = scene.state.score + scene.state.wrongRounds;
  const reactionTimeMs = round(average(scene.state.reactionTimes));
  const progressPercent = percent(scene.state.score, scene.roundsTotal);
  const successRate = percent(scene.state.score, totalDecisions);

  return {
    game: "lights-sequence",
    score: scene.state.score,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level,
    accuracy: progressPercent,
    attempts: scene.state.attempts,
    errorsCommitted: scene.state.wrongRounds,
    reactionTimeMs,
    progressPercent,
    successRate,
    abandoned: Boolean(options.abandoned),
    metadata: {
      steps: scene.steps,
      speedMs: scene.speedMs,
      roundsTotal: scene.roundsTotal,
      wrongRounds: scene.state.wrongRounds,
      repeatCount: scene.state.repeatCount,
      difficulty: scene.difficulty,
      errorsCommitted: scene.state.wrongRounds,
      reactionTimeMs,
      progressPercent,
      successRate,
      abandoned: Boolean(options.abandoned),
    },
  };
}
