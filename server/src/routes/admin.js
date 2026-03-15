const express = require("express");
const bcrypt = require("bcryptjs");
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
  role: z.enum(["TEACHER", "PARENT", "STUDENT"])
});

function fullName(user) {
  return [user.firstName, user.lastNameP, user.lastNameM].filter(Boolean).join(" ");
}

router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos inválidos" });
  }

  const { firstName, lastNameP, lastNameM, email, password, role } = parsed.data;

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ message: "Ese email ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastNameP,
        lastNameM: lastNameM || null,
        email,
        passwordHash,
        role: Role[role]
      }
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (e) {
    console.error("Create user error:", e);
    return res.status(500).json({ message: "Error interno" });
  }
});

router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastNameP: true,
        lastNameM: true,
        email: true,
        role: true,
        createdAt: true,

        parentLinks: {
          select: {
            relationType: true,
            parent: {
              select: {
                id: true,
                firstName: true,
                lastNameP: true,
                lastNameM: true,
                email: true
              }
            }
          }
        },

        childLinks: {
          select: {
            relationType: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastNameP: true,
                lastNameM: true,
                email: true
              }
            }
          }
        }
      }
    });

    const mapped = users.map((user) => {
      const fatherLink = user.parentLinks.find(
        (link) => link.relationType === "FATHER"
      );

      const motherLink = user.parentLinks.find(
        (link) => link.relationType === "MOTHER"
      );

      const childrenNames = user.childLinks.map((link) => fullName(link.student));

      return {
        id: user.id,
        firstName: user.firstName,
        lastNameP: user.lastNameP,
        lastNameM: user.lastNameM,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,

        fatherName: fatherLink ? fullName(fatherLink.parent) : "—",
        motherName: motherLink ? fullName(motherLink.parent) : "—",

        childrenNames,
        childrenText: childrenNames.length ? childrenNames.join(", ") : "—"
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("GET /admin/users error:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;
