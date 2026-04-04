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

export function buildFinalResult(scene) {
  let level = "MEDIUM";
  if (scene.difficulty === "easy") level = "EASY";
  if (scene.difficulty === "medium") level = "MEDIUM";
  if (scene.difficulty === "hard") level = "HARD";

  return {
    game: "lights-sequence",
    score: scene.state.score,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level,
    accuracy:
      scene.roundsTotal > 0
        ? Number((scene.state.score / scene.roundsTotal).toFixed(4))
        : 0,
    attempts: scene.state.attempts,
    metadata: {
      steps: scene.steps,
      speedMs: scene.speedMs,
      roundsTotal: scene.roundsTotal,
      wrongRounds: scene.state.wrongRounds,
      repeatCount: scene.state.repeatCount,
      difficulty: scene.difficulty,
    },
  };
}
