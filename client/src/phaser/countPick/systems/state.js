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

export function createCountPickState() {
  return {
    startTime: Date.now(),
    round: 0,
    score: 0,
    attempts: 0,
    wrongAnswers: 0,
    target: 0,
    locked: false,
  };
}

export function createRoundData(minTarget = 3, maxTarget = 6) {
  const target = randInt(minTarget, maxTarget);

  const candidates = [];
  for (let n = minTarget; n <= maxTarget; n++) {
    if (n !== target) {
      candidates.push(n);
    }
  }

  shuffle(candidates);

  const distractors = candidates.slice(0, 2);

  return {
    target,
    choices: shuffle([target, ...distractors]),
  };
}

export function buildFinalResult(scene) {
  const accuracy =
    scene.state.attempts > 0
      ? Math.round((scene.state.score / scene.state.attempts) * 100)
      : 0;

  return {
    game: "countPick",
    score: scene.state.score,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level: scene.level || "MEDIUM",
    accuracy,
    attempts: scene.state.attempts,
    metadata: {
      roundsTotal: scene.roundsTotal,
      minTarget: scene.minTarget,
      maxTarget: scene.maxTarget,
      correctAnswers: scene.state.score,
      wrongAnswers: scene.state.wrongAnswers,
    },
  };
}
