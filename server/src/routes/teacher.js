const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { PrismaClient, Role, VisualCondition, AuditoryCondition } = require("@prisma/client");
const { requireAuth, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

const createStudentSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6),

  visualCondition: z.enum(["NONE", "PROTANOPIA", "TRITANOPIA", "LOW_VISION"]).default("NONE"),
  auditoryCondition: z.enum(["NONE", "HARD_OF_HEARING", "DEAF"]).default("NONE"),

  fontScale: z.number().int().min(100).max(200).default(100),
  highContrast: z.boolean().default(false),
  textToSpeechEnabled: z.boolean().default(false),
  voiceInstructions: z.boolean().default(false),
  captionsEnabled: z.boolean().default(true),
  visualAlertsEnabled: z.boolean().default(true)
});

router.get("/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        createdById: req.user.id
      },
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: true
      }
    });

    res.json(students);
  } catch (error) {
    console.error("GET /teacher/students error:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

router.post("/students", requireAuth, requireRole("TEACHER"), async (req, res) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: parsed.error.flatten()
    });
  }

  const data = parsed.data;

  try {
    const exists = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (exists) {
      return res.status(409).json({ message: "Ese correo ya existe" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const student = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastNameP: data.lastNameP,
        lastNameM: data.lastNameM || null,
        email: data.email,
        passwordHash,
        role: Role.STUDENT,
        createdById: req.user.id,
        studentProfile: {
          create: {
            visualCondition: VisualCondition[data.visualCondition],
            auditoryCondition: AuditoryCondition[data.auditoryCondition],
            fontScale: data.fontScale,
            highContrast: data.highContrast,
            textToSpeechEnabled: data.textToSpeechEnabled,
            voiceInstructions: data.voiceInstructions,
            captionsEnabled: data.captionsEnabled,
            visualAlertsEnabled: data.visualAlertsEnabled
          }
        }
      },
      include: {
        studentProfile: true
      }
    });

    res.status(201).json(student);
  } catch (error) {
    console.error("POST /teacher/students error:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;