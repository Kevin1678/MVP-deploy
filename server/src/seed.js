// server/src/seed.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  // nuevos campos requeridos
  const firstName = process.env.ADMIN_FIRSTNAME;
  const lastNameP = process.env.ADMIN_LASTNAMEP;
  const lastNameM = process.env.ADMIN_LASTNAMEM || null;

  if (!email || !password) throw new Error("Faltan ADMIN_EMAIL o ADMIN_PASSWORD.");
  if (!firstName || !lastNameP) throw new Error("Faltan ADMIN_FIRSTNAME o ADMIN_LASTNAMEP.");

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("✅ Admin ya existe:", email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN,
      firstName,
      lastNameP,
      lastNameM
    }
  });

  console.log("✅ Admin creado:", email);
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
