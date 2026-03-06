import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { externalId: "admin" },
    update: {
      username: "admin",
      password: "admin",
    },
    create: {
      externalId: "admin",
      username: "admin",
      password: "admin",
    },
  });

  console.log("[seed] admin user is ready (admin/admin)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
