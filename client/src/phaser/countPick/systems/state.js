import { randInt, shuffle } from "../../shared/common";

export function resolveRoundsTotal(data) {
  const rounds =
    typeof data?.roundsTotal === "number" && !Number.isNaN(data.roundsTotal)
      ? data.roundsTotal
      : 5;

  return [5, 10, 15].includes(rounds) ? rounds : 5;
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

export function createRoundData() {
  const target = randInt(1, 5);
  const options = new Set([target]);
  while (options.size < 3) options.add(randInt(1, 5));

  return {
    target,
    choices: shuffle(Array.from(options)),
  };
}

export function buildFinalResult(scene) {
  let level = "MEDIUM";
  if (scene.roundsTotal === 5) level = "EASY";
  if (scene.roundsTotal === 10) level = "MEDIUM";
  if (scene.roundsTotal === 15) level = "HARD";

  return {
    game: "countPick",
    score: scene.state.score,
    moves: scene.state.attempts,
    durationMs: Date.now() - scene.state.startTime,
    level,
    accuracy: scene.state.score,
    attempts: scene.state.attempts,
    metadata: {
      roundsTotal: scene.roundsTotal,
      correctAnswers: scene.state.score,
      wrongAnswers: scene.state.wrongAnswers,
    },
  };
}
