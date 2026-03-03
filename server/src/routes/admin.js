const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { PrismaClient, Role } = require("@prisma/client");
const { requireAuth, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const createUserSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["TEACHER", "PARENT", "STUDENT"]) // ADMIN no se crea aquí
});

router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

  const { email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: "Ese email ya existe" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: Role.STUDENT }
  });

  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

router.get("/results", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const results = await prisma.gameResult.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } } }
  });

  res.json(results.map(r => ({
    id: r.id,
    email: r.user.email,
    game: r.game,
    score: r.score,
    moves: r.moves,
    durationMs: r.durationMs,
    createdAt: r.createdAt
  })));
});

module.exports = router;
