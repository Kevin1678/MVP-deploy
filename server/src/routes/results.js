const express = require("express");
const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const resultSchema = z.object({
  game: z.literal("memorama"),
  score: z.number().int().min(0),
  moves: z.number().int().min(0),
  durationMs: z.number().int().min(0)
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Resultado inválido" });

  const created = await prisma.gameResult.create({
    data: { ...parsed.data, userId: req.user.id }
  });

  res.status(201).json({ id: created.id });
});

module.exports = router;