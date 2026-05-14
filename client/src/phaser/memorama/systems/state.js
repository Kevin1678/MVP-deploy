export function resolvePairs(data) {
  const pairs =
    typeof data?.pairs === "number" && !Number.isNaN(data.pairs)
      ? data.pairs
      : 8;

  return [4, 6, 8].includes(pairs) ? pairs : 8;
}

export function createMemoryState() {
  const now = Date.now();

  return {
    first: null,
    locked: false,
    attempts: 0,
    flips: 0,
    matchedPairs: 0,
    errorsCommitted: 0,
    reactionTimes: [],
    lastInteractionAt: now,
    startTime: now,
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

export function recordMemoryReaction(scene) {
  const now = Date.now();
  const last = scene.state.lastInteractionAt || scene.state.startTime || now;
  const delta = Math.max(0, now - last);

  scene.state.reactionTimes.push(delta);
  scene.state.lastInteractionAt = now;
}

export function resetMemoryReactionTimer(scene) {
  scene.state.lastInteractionAt = Date.now();
}

export function buildFinalResult(scene, options = {}) {
  let level = "MEDIUM";
  if (scene.pairs === 4) level = "EASY";
  if (scene.pairs === 6) level = "MEDIUM";
  if (scene.pairs === 8) level = "HARD";

  const attempts = scene.state.attempts;
  const matchedPairs = scene.state.matchedPairs;
  const errorsCommitted = scene.state.errorsCommitted;
  const reactionTimeMs = round(average(scene.state.reactionTimes));
  const progressPercent = percent(matchedPairs, scene.pairs);
  const successRate = percent(matchedPairs, attempts);

  return {
    game: "memorama",
    score: matchedPairs,
    moves: attempts,
    durationMs: Date.now() - scene.state.startTime,
    level,
    accuracy: progressPercent,
    attempts,
    errorsCommitted,
    reactionTimeMs,
    progressPercent,
    successRate,
    abandoned: Boolean(options.abandoned),
    metadata: {
      pairs: scene.pairs,
      matchedPairs,
      flips: scene.state.flips,
      errorsCommitted,
      reactionTimeMs,
      progressPercent,
      successRate,
      abandoned: Boolean(options.abandoned),
    },
  };
}
