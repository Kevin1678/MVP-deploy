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
        bestScore: null,
        lastPlayedAt: null
      });
    }

    const entry = byGameMap.get(key);
    entry.plays += 1;

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
    bestScore: entry.bestScore,
    lastPlayedAt: entry.lastPlayedAt
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
      lastPlayedAt: results[0]?.playedAt || null
    },
    byGame,
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

      const summary = {
        totalChildren: children.length,
        totalResults: allResults.length,
        avgScore: round(average(overallScores)),
        avgAccuracy: round(average(overallAccuracies)),
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