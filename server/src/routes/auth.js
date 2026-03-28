const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,      // Render usa HTTPS, en prod debe ser true
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Credenciales incorrectas" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Credenciales incorrectas" });

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, cookieOptions());
  res.json({ id: user.id, email: user.email, role: user.role });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "OK" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastNameP: true,
        lastNameM: true,
        ...(req.user.role === "STUDENT"
          ? {
              studentProfile: {
                select: {
                  visualCondition: true,
                  auditoryCondition: true,
                  fontScale: true,
                  highContrast: true,
                  textToSpeechEnabled: true,
                  voiceInstructions: true,
                  captionsEnabled: true,
                  visualAlertsEnabled: true
                }
              }
            }
          : {})
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("GET /auth/me error:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;
