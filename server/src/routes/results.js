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
  accuracy: z.number().min(0).max(100).optional(),
  attempts: z.number().int().min(0).optional(),
  metadata: z.any().optional(),
  groupId: z.number().int().positive().optional().nullable(),
});

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

    const created = await prisma.gameResult.create({
      data: {
        studentId: req.user.id,
        groupId: data.groupId ?? null,
        gameType: mapGameToGameType(data.game),
        score: data.score,
        moves: data.moves,
        durationMs: data.durationMs,
        level: data.level ?? null,
        accuracy: data.accuracy ?? null,
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
