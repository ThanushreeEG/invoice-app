import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import path from "path";
const dbPath = path.join(__dirname, "..", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create the two senders (landlords)
  await prisma.sender.upsert({
    where: { id: "sender-gajendra" },
    update: {},
    create: {
      id: "sender-gajendra",
      name: "E R GAJENDRA NAIDU",
      gstNumber: "29ADQPG0253N1Z5",
      nextInvoiceNum: 47,
    },
  });

  await prisma.sender.upsert({
    where: { id: "sender-krishnaveni" },
    update: {},
    create: {
      id: "sender-krishnaveni",
      name: "G.KRISHNAVENI",
      gstNumber: "29AIBPG7232M1Z2",
      nextInvoiceNum: 18,
    },
  });

  // Create buildings / properties
  await prisma.building.upsert({
    where: { id: "building-svtowers" },
    update: {},
    create: {
      id: "building-svtowers",
      name: "S.V.TOWERS",
      address: "No. 942 16th Main BTM LYT,\n2nd Stage, BANGALORE- 560 076",
    },
  });

  // Create default settings
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
