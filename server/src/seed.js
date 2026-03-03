// server/src/seed.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Faltan ADMIN_EMAIL o ADMIN_PASSWORD en server/.env");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD muy corta (usa mínimo 8 caracteres).");
  }

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
      role: Role.ADMIN
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
