const express = require("express");
const { z } = require("zod");
const { PrismaClient, GameType, Role } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const resultSchema = z.object({
  game: z.enum(["memorama", "countPick", "lights-sequence"]),
  score: z.number().int().min(0),
  moves: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  level: z.string().max(50).optional(),
  accuracy: z.number().min(0).optional(),
  attempts: z.number().int().min(0).optional(),
  metadata: z.any().optional(),
});

function round(value, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function normalizeAccuracy(data) {
  const score = typeof data.score === "number" ? data.score : null;
  const metadata =
    data.metadata && typeof data.metadata === "object" ? data.metadata : {};

  const roundsTotal = Number(metadata.roundsTotal);
  const pairs = Number(metadata.pairs);

  switch (data.game) {
    case "memorama":
      if (pairs > 0 && score !== null) {
        return round((score / pairs) * 100);
      }
      break;

    case "countPick":
      if (roundsTotal > 0 && score !== null) {
        return round((score / roundsTotal) * 100);
      }
      break;

    case "lights-sequence":
      if (roundsTotal > 0 && score !== null) {
        return round((score / roundsTotal) * 100);
      }
      break;

    default:
      break;
  }

  if (typeof data.accuracy === "number") {
    return data.accuracy <= 1
      ? round(data.accuracy * 100)
      : round(data.accuracy);
  }

  return null;
}

function mapGameToGameType(game) {
  switch (game) {
    case "memorama":
      return GameType.MEMORAMA;
    case "countPick":
      return GameType.COUNT_PICK;
    case "lights-sequence":
      return GameType.LIGHTS_SEQUENCE;
    default:
      throw new Error(`Juego no soportado: ${game}`);
  }
}

router.post("/", requireAuth, async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Resultado inválido",
      errors: parsed.error.flatten(),
    });
  }

  try {
    if (req.user.role !== Role.STUDENT) {
      return res.status(403).json({
        message: "Solo los alumnos pueden registrar resultados",
      });
    }

    const data = parsed.data;

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, groupId: true },
    });

    if (!student) {
      return res.status(404).json({ message: "Alumno no encontrado" });
    }

    const created = await prisma.gameResult.create({
      data: {
        studentId: student.id,
        groupId: student.groupId ?? null,
        gameType: mapGameToGameType(data.game),
        score: data.score,
        moves: data.moves,
        durationMs: data.durationMs,
        level: data.level ?? null,
        accuracy: normalizeAccuracy(data),
        attempts: data.attempts ?? null,
        metadata: data.metadata ?? null,
      },
    });

    res.status(201).json({ id: created.id });
  } catch (error) {
    console.error("Error guardando resultado:", error);
    res.status(500).json({ message: "Error guardando resultado" });
  }
});

module.exports = router;
