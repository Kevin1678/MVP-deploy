const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const RELATION_LABELS = {
  FATHER: "Padre",
  MOTHER: "Madre",
  TUTOR: "Tutor",
  OTHER: "Familiar"
};

const GAME_LABELS = {
  MEMORAMA: "Memorama",
  COUNT_PICK: "Contar y elegir",
  LIGHTS_SEQUENCE: "Secuencia de luces"
};

function fullName(user) {
  return [user.firstName, user.lastNameP, user.lastNameM]
    .filter(Boolean)
    .join(" ");
}

function round(value, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function average(values) {
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function numberValues(results, key) {
  return results
    .map((item) => item[key])
    .filter((value) => typeof value === "number" && !Number.isNaN(value));
}

function getResultSuccessValue(result) {
  if (typeof result.successRate === "number" && !Number.isNaN(result.successRate)) {
    return result.successRate;
  }

  if (typeof result.accuracy === "number" && !Number.isNaN(result.accuracy)) {
    return result.accuracy;
  }

  if (
    typeof result.progressPercent === "number" &&
    !Number.isNaN(result.progressPercent)
  ) {
    return result.progressPercent;
  }

  return null;
}

function dateKey(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function buildTimeline(results) {
  const map = new Map();

  for (const result of results) {
    const key = dateKey(result.playedAt);
    const successValue = getResultSuccessValue(result);

    if (!key || typeof successValue !== "number") continue;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        successValues: [],
        totalResults: 0
      });
    }

    const entry = map.get(key);
    entry.successValues.push(successValue);
    entry.totalResults += 1;
  }

  return Array.from(map.values())
    .map((entry) => ({
      date: entry.date,
      avgSuccessRate: round(average(entry.successValues)),
      totalResults: entry.totalResults
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function mapResult(result, childName) {
  return {
    id: result.id,
    childName,
    gameType: result.gameType,
    gameLabel: GAME_LABELS[result.gameType] || result.gameType,
    score: result.score,
    accuracy: result.accuracy,
    attempts: result.attempts,
    moves: result.moves,
    durationMs: result.durationMs,
    level: result.level,
    errorsCommitted: result.errorsCommitted,
    reactionTimeMs: result.reactionTimeMs,
    progressPercent: result.progressPercent,
    successRate: result.successRate,
    abandoned: result.abandoned,
    playedAt: result.playedAt
  };
}

function buildChildSummary(link) {
  const student = link.student;
  const results = [...student.results].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  const scores = numberValues(results, "score");
  const accuracies = numberValues(results, "accuracy");
  const durations = numberValues(results, "durationMs");
  const errors = numberValues(results, "errorsCommitted");
  const reactions = numberValues(results, "reactionTimeMs");
  const progressValues = numberValues(results, "progressPercent");
  const successRates = numberValues(results, "successRate");

  const byGameMap = new Map();

  for (const result of results) {
    const key = result.gameType;

    if (!byGameMap.has(key)) {
      byGameMap.set(key, {
        gameType: key,
        gameLabel: GAME_LABELS[key] || key,
        plays: 0,
        scoreValues: [],
        accuracyValues: [],
        progressValues: [],
        successRateValues: [],
        errorValues: [],
        reactionValues: [],
        abandonedCount: 0,
        bestScore: null,
        lastPlayedAt: null,
        results: []
      });
    }

    const entry = byGameMap.get(key);
    entry.plays += 1;
    entry.results.push(result);

    if (typeof result.score === "number") {
      entry.scoreValues.push(result.score);
      entry.bestScore =
        entry.bestScore === null
          ? result.score
          : Math.max(entry.bestScore, result.score);
    }

    if (typeof result.accuracy === "number") {
      entry.accuracyValues.push(result.accuracy);
    }

    if (typeof result.progressPercent === "number") {
      entry.progressValues.push(result.progressPercent);
    }

    if (typeof result.successRate === "number") {
      entry.successRateValues.push(result.successRate);
    }

    if (typeof result.errorsCommitted === "number") {
      entry.errorValues.push(result.errorsCommitted);
    }

    if (typeof result.reactionTimeMs === "number") {
      entry.reactionValues.push(result.reactionTimeMs);
    }

    if (result.abandoned) {
      entry.abandonedCount += 1;
    }

    if (
      !entry.lastPlayedAt ||
      new Date(result.playedAt) > new Date(entry.lastPlayedAt)
    ) {
      entry.lastPlayedAt = result.playedAt;
    }
  }

  const byGame = Array.from(byGameMap.values()).map((entry) => ({
    gameType: entry.gameType,
    gameLabel: entry.gameLabel,
    plays: entry.plays,
    avgScore: round(average(entry.scoreValues)),
    avgAccuracy: round(average(entry.accuracyValues)),
    avgProgressPercent: round(average(entry.progressValues)),
    avgSuccessRate: round(average(entry.successRateValues)),
    avgErrorsCommitted: round(average(entry.errorValues)),
    avgReactionTimeMs: round(average(entry.reactionValues)),
    abandonedCount: entry.abandonedCount,
    bestScore: entry.bestScore,
    lastPlayedAt: entry.lastPlayedAt,
    timeline: buildTimeline(entry.results)
  }));

  byGame.sort((a, b) => b.plays - a.plays || a.gameLabel.localeCompare(b.gameLabel));

  return {
    id: student.id,
    relationType: link.relationType,
    relationLabel: RELATION_LABELS[link.relationType] || link.relationType,
    name: fullName(student),
    email: student.email,
    group: student.group?.name || "Sin grupo",
    summary: {
      totalResults: results.length,
      gamesPlayed: byGame.length,
      avgScore: round(average(scores)),
      avgAccuracy: round(average(accuracies)),
      totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
      avgErrorsCommitted: round(average(errors)),
      avgReactionTimeMs: round(average(reactions)),
      avgProgressPercent: round(average(progressValues)),
      avgSuccessRate: round(average(successRates)),
      abandonedGames: results.filter((result) => result.abandoned).length,
      lastPlayedAt: results[0]?.playedAt || null
    },
    byGame,
    timeline: buildTimeline(results),
    recentResults: results
      .slice(0, 5)
      .map((result) => mapResult(result, fullName(student))),
    allResults: results.map((result) => mapResult(result, fullName(student)))
  };
}

router.get(
  "/dashboard",
  requireAuth,
  requireRole("PARENT"),
  async (req, res) => {
    try {
      const parent = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastNameP: true,
          lastNameM: true,
          childLinks: {
            orderBy: { createdAt: "desc" },
            select: {
              relationType: true,
              student: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastNameP: true,
                  lastNameM: true,
                  group: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  results: {
                    orderBy: { playedAt: "desc" },
                    select: {
                      id: true,
                      gameType: true,
                      score: true,
                      accuracy: true,
                      attempts: true,
                      moves: true,
                      durationMs: true,
                      level: true,
                      errorsCommitted: true,
                      reactionTimeMs: true,
                      progressPercent: true,
                      successRate: true,
                      abandoned: true,
                      playedAt: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!parent) {
        return res.status(404).json({ message: "Padre o madre no encontrado." });
      }

      const children = parent.childLinks.map(buildChildSummary);
      const allResults = children.flatMap((child) => child.allResults);

      allResults.sort(
        (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
      );

      const overallScores = allResults
        .map((result) => result.score)
        .filter((value) => typeof value === "number");

      const overallAccuracies = allResults
        .map((result) => result.accuracy)
        .filter((value) => typeof value === "number");

      const overallErrors = allResults
        .map((result) => result.errorsCommitted)
        .filter((value) => typeof value === "number");

      const overallReactions = allResults
        .map((result) => result.reactionTimeMs)
        .filter((value) => typeof value === "number");

      const overallProgress = allResults
        .map((result) => result.progressPercent)
        .filter((value) => typeof value === "number");

      const overallSuccessRates = allResults
        .map((result) => result.successRate)
        .filter((value) => typeof value === "number");

      const summary = {
        totalChildren: children.length,
        totalResults: allResults.length,
        avgScore: round(average(overallScores)),
        avgAccuracy: round(average(overallAccuracies)),
        avgErrorsCommitted: round(average(overallErrors)),
        avgReactionTimeMs: round(average(overallReactions)),
        avgProgressPercent: round(average(overallProgress)),
        avgSuccessRate: round(average(overallSuccessRates)),
        abandonedGames: allResults.filter((result) => result.abandoned).length,
        lastPlayedAt: allResults[0]?.playedAt || null
      };

      res.json({
        parent: {
          id: parent.id,
          name: fullName(parent),
          email: parent.email
        },
        summary,
        children: children.map(({ allResults: _allResults, ...child }) => child),
        recentActivity: allResults.slice(0, 10)
      });
    } catch (error) {
      console.error("GET /parent/dashboard error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }
);

module.exports = router;
