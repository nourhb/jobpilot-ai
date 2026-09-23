/**
 * Idempotent local-dev seed. Never run against production.
 *
 * Phase 1 only seeds a demo login account so the auth flow can be
 * exercised end-to-end without registering manually. Job/profile seed
 * data arrives in later phases once those models exist.
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed a production database.");
    process.exit(1);
  }

  const demoEmail = "demo@jobpilot.ai";

  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (existing) {
    console.log(`Seed skipped: ${demoEmail} already exists.`);
    return;
  }

  const passwordHash = await argon2.hash("DemoPassword123");

  await prisma.user.create({
    data: {
      email: demoEmail,
      passwordHash,
      firstName: "Demo",
      lastName: "Candidate",
      city: "Toronto",
      province: "Ontario",
      country: "Canada",
    },
  });

  console.log(`Seeded demo user: ${demoEmail} / DemoPassword123`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
