const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const {
  PrismaClient,
  Role,
  VisualCondition,
  AuditoryCondition
} = require("@prisma/client");
const { requireAuth, requireRole } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

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

function resultPerformance(result) {
  if (typeof result?.accuracy === "number" && !Number.isNaN(result.accuracy)) {
    return result.accuracy <= 1
      ? round(result.accuracy * 100)
      : round(result.accuracy);
  }

  const metadata =
    result?.metadata && typeof result.metadata === "object"
      ? result.metadata
      : {};

  const score = typeof result?.score === "number" ? result.score : null;

  if (result?.gameType === "MEMORAMA") {
    const pairs = Number(metadata.pairs);
    if (pairs > 0 && score !== null) {
      return round((score / pairs) * 100);
    }
  }

  if (
    result?.gameType === "COUNT_PICK" ||
    result?.gameType === "LIGHTS_SEQUENCE"
  ) {
    const roundsTotal = Number(metadata.roundsTotal);
    if (roundsTotal > 0 && score !== null) {
      return round((score / roundsTotal) * 100);
    }
  }

  return null;
}

const createStudentSchema = z.object({
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6),
  group: z.enum(["1A", "1B", "1C"]).default("1A"),

  visualCondition: z
    .enum(["NONE", "PROTANOPIA", "TRITANOPIA", "LOW_VISION"])
    .default("NONE"),
  auditoryCondition: z
    .enum(["NONE", "HARD_OF_HEARING", "DEAF"])
    .default("NONE"),

  fontScale: z.number().int().min(100).max(200).default(100),
  highContrast: z.boolean().default(false),
  textToSpeechEnabled: z.boolean().default(false),
  voiceInstructions: z.boolean().default(false),
  captionsEnabled: z.boolean().default(true),
  visualAlertsEnabled: z.boolean().default(true)
});

const existingParentSchema = z.object({
  mode: z.literal("link"),
  email: z.string().email()
});

const newParentSchema = z.object({
  mode: z.literal("create"),
  firstName: z.string().min(2),
  lastNameP: z.string().min(2),
  lastNameM: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(6)
});

const parentInputSchema = z.union([existingParentSchema, newParentSchema]);

const linkParentsSchema = z
  .object({
    studentId: z.number().int().positive(),
    father: parentInputSchema.nullable().optional(),
    mother: parentInputSchema.nullable().optional()
  })
  .refine((data) => data.father || data.mother, {
    message: "Debes agregar al menos un padre o madre."
  })
  .refine((data) => {
    if (!data.father || !data.mother) return true;
    return (
      normalizeEmail(data.father.email) !== normalizeEmail(data.mother.email)
    );
  }, {
    message: "Padre y madre no pueden usar el mismo correo."
  });

async function resolveParent(tx, parentData) {
  const email = normalizeEmail(parentData.email);

  if (parentData.mode === "link") {
    const parent = await tx.user.findUnique({
      where: { email }
    });

    if (!parent) {
      throw new Error(`No existe una cuenta registrada con el correo ${email}.`);
    }

    if (parent.role !== Role.PARENT) {
      throw new Error(
        `El correo ${email} ya existe pero no pertenece a una cuenta de padre/madre.`
      );
    }

    return parent;
  }

  const existing = await tx.user.findUnique({
    where: { email }
  });

  if (existing) {
    if (existing.role === Role.PARENT) {
      throw new Error(
        `El correo ${email} ya está registrado como padre/madre. Usa la opción de vincular cuenta existente.`
      );
    }

    throw new Error(
      `El correo ${email} ya existe y no pertenece a una cuenta de padre/madre.`
    );
  }

  const passwordHash = await bcrypt.hash(parentData.password, 10);

  return tx.user.create({
    data: {
      firstName: parentData.firstName.trim(),
      lastNameP: parentData.lastNameP.trim(),
      lastNameM: parentData.lastNameM?.trim() || null,
      email,
      passwordHash,
      role: Role.PARENT
    }
  });
}

router.get(
  "/students",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    try {
      const students = await prisma.user.findMany({
        where: {
          role: Role.STUDENT,
          createdById: req.user.id
        },
        orderBy: [
          { firstName: "asc" },
          { lastNameP: "asc" },
          { lastNameM: "asc" }
        ],
        select: {
          id: true,
          firstName: true,
          lastNameP: true,
          lastNameM: true,
          email: true
        }
      });

      res.json(students);
    } catch (error) {
      console.error("GET /teacher/students error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }
);

// AQUÍ VA LA RUTA NUEVA
router.get(
  "/parents/search",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();

      if (q.length < 2) {
        return res.json([]);
      }

      const parents = await prisma.user.findMany({
        where: {
          role: Role.PARENT,
          OR: [
            { firstName: { contains: q } },
            { lastNameP: { contains: q } },
            { lastNameM: { contains: q } },
            { email: { contains: q } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastNameP: true,
          lastNameM: true,
          email: true
        },
        take: 8,
        orderBy: [
          { firstName: "asc" },
          { lastNameP: "asc" }
        ]
      });

      const mapped = parents.map((parent) => ({
        id: parent.id,
        fullName: [parent.firstName, parent.lastNameP, parent.lastNameM]
          .filter(Boolean)
          .join(" "),
        email: parent.email
      }));

      res.json(mapped);
    } catch (error) {
      console.error("GET /teacher/parents/search error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }
);

router.post(
  "/students",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const parsed = createStudentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: parsed.error.flatten()
      });
    }

    const data = parsed.data;

    try {
      const email = normalizeEmail(data.email);

      const existingStudent = await prisma.user.findUnique({
        where: { email }
      });

      if (existingStudent) {
        return res
          .status(409)
          .json({ message: "El correo del alumno ya existe." });
      }

      const studentPasswordHash = await bcrypt.hash(data.password, 10);

      let group = await prisma.group.findFirst({
        where: {
          teacherId: req.user.id,
          name: data.group
        }
      });

      if (!group) {
        group = await prisma.group.create({
          data: {
            name: data.group,
            teacherId: req.user.id
          }
        });
      }

      const student = await prisma.user.create({
        data: {
          firstName: data.firstName.trim(),
          lastNameP: data.lastNameP.trim(),
          lastNameM: data.lastNameM?.trim() || null,
          email,
          passwordHash: studentPasswordHash,
          role: Role.STUDENT,
          createdById: req.user.id,
          groupId: group.id,
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
        }
      });

      res.status(201).json({
        message: "Alumno registrado correctamente.",
        studentId: student.id
      });
    } catch (error) {
      console.error("POST /teacher/students error:", error);
      res.status(500).json({ message: "Error interno" });
    }
  }
);

router.post(
  "/student-parents",
  requireAuth,
  requireRole("TEACHER"),
  async (req, res) => {
    const parsed = linkParentsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: parsed.error.flatten()
      });
    }

    const data = parsed.data;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.user.findFirst({
          where: {
            id: data.studentId,
            role: Role.STUDENT,
            createdById: req.user.id
          }
        });

        if (!student) {
          throw new Error(
            "Alumno no encontrado o no pertenece a este docente."
          );
        }

        const linkedParents = [];

        if (data.father) {
          const father = await resolveParent(tx, data.father);

          await tx.parentStudent.upsert({
            where: {
              parentId_studentId: {
                parentId: father.id,
                studentId: student.id
              }
            },
            update: {
              relationType: "FATHER"
            },
            create: {
              parentId: father.id,
              studentId: student.id,
              relationType: "FATHER"
            }
          });

          linkedParents.push({
            id: father.id,
            email: father.email,
            section: "father"
          });
        }

        if (data.mother) {
          const mother = await resolveParent(tx, data.mother);

          await tx.parentStudent.upsert({
            where: {
              parentId_studentId: {
                parentId: mother.id,
                studentId: student.id
              }
            },
            update: {
              relationType: "MOTHER"
            },
            create: {
              parentId: mother.id,
              studentId: student.id,
              relationType: "MOTHER"
            }
          });

          linkedParents.push({
            id: mother.id,
            email: mother.email,
            section: "mother"
          });
        }

        return {
          studentId: student.id,
          linkedParents
        };
      });

      res.status(201).json({
        message: "Padres vinculados correctamente.",
        ...result
      });
    } catch (error) {
      console.error("POST /teacher/student-parents error:", error);
      res.status(400).json({
        message: error.message || "No se pudieron vincular los padres."
      });
    }
  }
);

module.exports = router;
