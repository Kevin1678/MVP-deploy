export function resolvePairs(data) {
  const pairs =
    typeof data?.pairs === "number" && !Number.isNaN(data.pairs)
      ? data.pairs
      : 8;

  return [4, 6, 8].includes(pairs) ? pairs : 8;
}

export function createMemoryState() {
  return {
    first: null,
    locked: false,
    attempts: 0,
    flips: 0,
    matchedPairs: 0,
    startTime: Date.now(),
  };
}

export function buildFinalResult(scene) {
  let level = "MEDIUM";
  if (scene.pairs === 4) level = "EASY";
  if (scene.pairs === 6) level = "MEDIUM";
  if (scene.pairs === 8) level = "HARD";

  return {
    game: "memorama",
    score: scene.state.matchedPairs,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level,
    accuracy: scene.state.matchedPairs,
    attempts: scene.state.attempts,
    metadata: {
      pairs: scene.pairs,
      matchedPairs: scene.state.matchedPairs,
      flips: scene.state.flips,
    },
  };
}
